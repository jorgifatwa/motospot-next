// ────────────────────────────────
// Transaction Service
// ARCHITECTURE.md Section 5 — business logic layer
// BUSINESS_RULE.md Section 6, 7, 9 — status mapping, cancellation, branch scoping
// ────────────────────────────────

import { auth } from "@/lib/auth";
import { can, enforceBranchScope, isCashier } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { transactionRepository } from "./transaction.repository";
import { CreateTransactionInput } from "./transaction.schema";

const BOOKING_EXPIRATION_KEY = "BOOKING_EXPIRATION_DAYS";
const DEFAULT_BOOKING_EXPIRATION_DAYS = 7;

type TransactionItemShape = { motorcycleId: string };

export class TransactionService {
  // ────────────────────────────────
  // Status Mapping (BUSINESS_RULE.md Section 7.2)
  // Single source of truth for motorcycle sales status side effects.
  // ────────────────────────────────
  private mapStatusToSalesStatus(
    transactionStatus: "SALE" | "BOOKING" | "CANCELLED",
  ): "SOLD" | "BOOKED" | "AVAILABLE" {
    switch (transactionStatus) {
      case "SALE":
        return "SOLD";
      case "BOOKING":
        return "BOOKED";
      case "CANCELLED":
        return "AVAILABLE";
    }
  }

  // ────────────────────────────────
  // Booking expiration config (BUSINESS_RULE.md Section 9.2)
  // ────────────────────────────────
  async getBookingExpirationDays(): Promise<number> {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: BOOKING_EXPIRATION_KEY },
    });
    if (!setting) return DEFAULT_BOOKING_EXPIRATION_DAYS;
    const parsed = parseInt(setting.value, 10);
    return Number.isNaN(parsed) || parsed <= 0 ? DEFAULT_BOOKING_EXPIRATION_DAYS : parsed;
  }

  async setBookingExpirationDays(days: number): Promise<void> {
    if (!Number.isInteger(days) || days <= 0) {
      throw new Error("Booking expiration days must be a positive integer");
    }
    await prisma.systemSetting.upsert({
      where: { key: BOOKING_EXPIRATION_KEY },
      update: { value: String(days) },
      create: { key: BOOKING_EXPIRATION_KEY, value: String(days) },
    });
  }

  // ────────────────────────────────
  // List / read
  // ────────────────────────────────
  async getAll(options?: {
    branchId?: string;
    status?: "SALE" | "BOOKING" | "CANCELLED";
    search?: string;
    skip?: number;
    take?: number;
  }) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    let effectiveBranchId = options?.branchId;
    if (isCashier(session)) {
      effectiveBranchId = enforceBranchScope(session, options?.branchId);
    }

    const { transactions, total } = await transactionRepository.findAll({
      where: {
        branchId: effectiveBranchId || undefined,
        status: options?.status,
        search: options?.search,
      },
      skip: options?.skip,
      take: options?.take,
    });

    return { transactions, total };
  }

  async getById(id: string) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const transaction = await transactionRepository.findById(id);
    if (!transaction) throw new Error("Transaction not found");

    if (isCashier(session)) {
      enforceBranchScope(session, transaction.branchId);
    }

    return transaction;
  }

  // ────────────────────────────────
  // Create transaction (SALE or BOOKING)
  // BUSINESS_RULE.md Section 6.1 / 6.2
  // ────────────────────────────────
  async create(data: CreateTransactionInput) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");
    if (!can(session, "create", "transaction"))
      throw new Error("Forbidden: insufficient permissions");

    // Branch scoping: Cashier can only create within their own branch.
    const effectiveBranchId = isCashier(session)
      ? enforceBranchScope(session, data.branchId)
      : data.branchId;

    // Validate all motorcycles belong to the branch and are sellable/bookable.
    const motorcycleIds = data.items.map((i) => i.motorcycleId);
    if (new Set(motorcycleIds).size !== motorcycleIds.length) {
      throw new Error("A motorcycle cannot appear twice in the same transaction");
    }

    const motorcycles = await Promise.all(
      motorcycleIds.map((id) => transactionRepository.getMotorcycleById(id)),
    );

    for (const m of motorcycles) {
      if (!m) throw new Error("One or more motorcycles no longer exist");
      if (m.branchId !== effectiveBranchId) {
        throw new Error("All motorcycles must belong to the transaction's branch");
      }
      if (m.deletedAt) throw new Error("Cannot transact a deleted motorcycle");
      if (m.operationalStatus === "MAINTENANCE") {
        throw new Error("A motorcycle under maintenance cannot be sold or booked");
      }
    }

    const transactionNumber = await transactionRepository.generateTransactionNumber();
    const salesStatus = this.mapStatusToSalesStatus(data.status);

    const expiresAt =
      data.status === "BOOKING"
        ? new Date(Date.now() + (await this.getBookingExpirationDays()) * 24 * 60 * 60 * 1000)
        : null;

    // Atomic: create transaction + items, then update motorcycle statuses.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const created = await prisma.$transaction(async (tx: any) => {
      const createdTx = await tx.transaction.create({
        data: {
          transactionNumber,
          branchId: effectiveBranchId,
          customerId: data.customerId,
          status: data.status,
          createdById: session.user.id,
          expiresAt,
          items: {
            create: data.items.map((item) => ({
              motorcycleId: item.motorcycleId,
              priceAtSale: item.priceAtSale,
            })),
          },
        },
        include: { items: true },
      });

      // Atomic salesStatus check + update inside the transaction.
      // updateMany with a WHERE guard on salesStatus ensures we only update
      // motorcycles that are still AVAILABLE. If count === 0, the motorcycle
      // was just booked/sold by another concurrent transaction — rollback.
      for (const motorcycleId of motorcycleIds) {
        const result = await tx.motorcycle.updateMany({
          where: { id: motorcycleId, salesStatus: "AVAILABLE" },
          data: { salesStatus },
        });
        if (result.count === 0) {
          throw new Error(
            `Motorcycle ${motorcycleId} is no longer available — it may have just been booked or sold by another transaction.`,
          );
        }
      }

      return createdTx;
    });

    await logAudit(session.user.id, "TRANSACTION_CREATED", "Transaction", created.id, {
      after: {
        transactionNumber,
        status: data.status,
        branchId: effectiveBranchId,
        motorcycleCount: motorcycleIds.length,
        expiresAt: expiresAt ? expiresAt.toISOString() : null,
      },
    });

    return transactionRepository.findById(created.id);
  }

  // ────────────────────────────────
  // Cancel transaction (restores ALL motorcycles)
  // BUSINESS_RULE.md Section 6.2 / 7.2
  // cancelledById may be null for system-initiated (expiration) cancellations.
  // ────────────────────────────────
  async cancel(id: string, cancelledById: string | null) {
    const transaction = await transactionRepository.findById(id);
    if (!transaction) throw new Error("Transaction not found");
    if (transaction.status === "CANCELLED") {
      throw new Error("Transaction is already cancelled");
    }

    // Restore every motorcycle only if its operationalStatus is AVAILABLE.
    const restoreResults = await Promise.all(
      transaction.items.map(async (item: TransactionItemShape) => {
        const m = await transactionRepository.getMotorcycleById(item.motorcycleId);
        if (m && m.operationalStatus === "AVAILABLE") {
          await transactionRepository.setMotorcycleSalesStatus(item.motorcycleId, "AVAILABLE");
          return item.motorcycleId;
        }
        return null;
      }),
    );
    const restored = restoreResults.filter(Boolean) as string[];

    await transactionRepository.updateStatus(id, "CANCELLED", {
      cancelledAt: new Date(),
      cancelledById,
    });

    await logAudit(cancelledById, "TRANSACTION_CANCELLED", "Transaction", id, {
      before: { status: transaction.status },
      after: { status: "CANCELLED", restoredMotorcycles: restored },
    });

    return { success: true, restored };
  }

  // ────────────────────────────────
  // Convert booking → sale
  // BUSINESS_RULE.md Section 9.1
  // ────────────────────────────────
  async convertBookingToSale(id: string, convertedById: string) {
    const transaction = await transactionRepository.findById(id);
    if (!transaction) throw new Error("Transaction not found");
    if (transaction.status !== "BOOKING") {
      throw new Error("Only a booking can be converted to a sale");
    }

    // All motorcycles move to SOLD together.
    for (const item of transaction.items) {
      const m = await transactionRepository.getMotorcycleById(item.motorcycleId);
      if (!m) throw new Error("One or more motorcycles no longer exist");
      if (m.operationalStatus === "MAINTENANCE") {
        throw new Error("A motorcycle under maintenance cannot be sold");
      }
    }

    await transactionRepository.updateStatus(id, "SALE", { expiresAt: null });
    for (const item of transaction.items) {
      await transactionRepository.setMotorcycleSalesStatus(item.motorcycleId, "SOLD");
    }

    await logAudit(convertedById, "BOOKING_CONVERTED", "Transaction", id, {
      before: { status: "BOOKING" },
      after: { status: "SALE" },
    });

    return { success: true };
  }

  // ────────────────────────────────
  // Booking expiration job (ARCHITECTURE.md Section 11)
  // Calls the same cancellation logic. Returns count processed.
  // ────────────────────────────────
  async expireOverdueBookings(): Promise<number> {
    const now = new Date();
    const expired = await transactionRepository.findExpiredBookings(now);
    let count = 0;

    for (const booking of expired) {
      try {
        await this.cancel(booking.id, null);
        count++;
      } catch (error) {
        console.error(`Failed to expire booking ${booking.id}:`, error);
      }
    }

    return count;
  }
}

export const transactionService = new TransactionService();
