// ────────────────────────────────
// Transaction Repository
// ARCHITECTURE.md Section 5 — only layer allowed to call Prisma directly
// ────────────────────────────────

import { prisma } from "@/lib/prisma";

export interface TransactionWhereInput {
  branchId?: string;
  status?: string;
  search?: string;
}

export interface TransactionListOptions {
  where?: TransactionWhereInput;
  skip?: number;
  take?: number;
  orderBy?: Record<string, "asc" | "desc">;
}

export class TransactionRepository {
  async findAll(options: TransactionListOptions = {}) {
    const { where = {}, skip = 0, take = 10, orderBy = { createdAt: "desc" } } = options;

    const prismaWhere: Record<string, unknown> = {};

    if (where.branchId) prismaWhere.branchId = where.branchId;
    if (where.status) prismaWhere.status = where.status;
    if (where.search) {
      prismaWhere.OR = [{ transactionNumber: { contains: where.search } }];
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where: prismaWhere,
        skip,
        take,
        orderBy,
        include: {
          customer: true,
          branch: true,
          createdBy: { select: { id: true, name: true } },
          items: {
            include: {
              motorcycle: {
                include: { brand: true, category: true, images: { orderBy: { sortOrder: "asc" } } },
              },
            },
          },
        },
      }),
      prisma.transaction.count({ where: prismaWhere }),
    ]);

    return { transactions, total };
  }

  async findById(id: string) {
    return prisma.transaction.findUnique({
      where: { id },
      include: {
        customer: true,
        branch: true,
        createdBy: { select: { id: true, name: true } },
        items: {
          include: {
            motorcycle: {
              include: { brand: true, category: true, images: { orderBy: { sortOrder: "asc" } } },
            },
          },
        },
      },
    });
  }

  async findByNumber(transactionNumber: string) {
    return prisma.transaction.findUnique({ where: { transactionNumber } });
  }

  /**
   * Atomically generate the next transaction number TRX-YYYYMMDD-NNNNN.
   * Uses an upsert on TransactionCounter keyed by date so concurrent requests
   * never produce a duplicate (BUSINESS_RULE.md Section 8).
   */
  async generateTransactionNumber(): Promise<string> {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD
    const counter = await prisma.transactionCounter.upsert({
      where: { date },
      update: { seq: { increment: 1 } },
      create: { date, seq: 1 },
    });
    const seq = String(counter.seq).padStart(5, "0");
    return `TRX-${date}-${seq}`;
  }

  async create(data: {
    transactionNumber: string;
    branchId: string;
    customerId: string;
    status: string;
    createdById: string;
    expiresAt?: Date | null;
    items: Array<{ motorcycleId: string; priceAtSale: string }>;
  }) {
    return prisma.transaction.create({
      data: {
        transactionNumber: data.transactionNumber,
        branchId: data.branchId,
        customerId: data.customerId,
        status: data.status as "SALE" | "BOOKING" | "CANCELLED",
        createdById: data.createdById,
        expiresAt: data.expiresAt,
        items: {
          create: data.items.map((item) => ({
            motorcycleId: item.motorcycleId,
            priceAtSale: item.priceAtSale,
          })),
        },
      },
      include: {
        customer: true,
        branch: true,
        items: { include: { motorcycle: { include: { brand: true, category: true } } } },
      },
    });
  }

  async updateStatus(id: string, status: string, extra?: Record<string, unknown>) {
    return prisma.transaction.update({
      where: { id },
      data: { status: status as "SALE" | "BOOKING" | "CANCELLED", ...extra },
    });
  }

  async setMotorcycleSalesStatus(motorcycleId: string, salesStatus: string) {
    return prisma.motorcycle.update({
      where: { id: motorcycleId },
      data: { salesStatus: salesStatus as "AVAILABLE" | "BOOKED" | "SOLD" },
    });
  }

  async findExpiredBookings(now: Date) {
    return prisma.transaction.findMany({
      where: { status: "BOOKING", expiresAt: { lt: now } },
      include: { items: true },
    });
  }

  async getMotorcycleById(motorcycleId: string) {
    return prisma.motorcycle.findUnique({ where: { id: motorcycleId } });
  }
}

export const transactionRepository = new TransactionRepository();
