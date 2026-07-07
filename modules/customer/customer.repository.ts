// ────────────────────────────────
// Customer Repository
// ARCHITECTURE.md Section 5 — only layer allowed to call Prisma directly
// ────────────────────────────────

import { prisma } from "@/lib/prisma";

export interface CustomerWhereInput {
  deletedAt?: boolean;
  search?: string;
}

export interface CustomerListOptions {
  where?: CustomerWhereInput;
  skip?: number;
  take?: number;
  orderBy?: Record<string, "asc" | "desc">;
}

export class CustomerRepository {
  async findAll(options: CustomerListOptions = {}) {
    const { where = {}, skip = 0, take = 10, orderBy = { createdAt: "desc" } } = options;

    const prismaWhere: Record<string, unknown> = {};

    if (where.deletedAt !== undefined) {
      prismaWhere.deletedAt = where.deletedAt ? { not: null } : null;
    }

    if (where.search) {
      prismaWhere.OR = [
        { name: { contains: where.search } },
        { phone: { contains: where.search } },
        { email: { contains: where.search } },
      ];
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({ where: prismaWhere, skip, take, orderBy }),
      prisma.customer.count({ where: prismaWhere }),
    ]);

    return { customers, total };
  }

  async findById(id: string) {
    return prisma.customer.findUnique({
      where: { id },
      include: { transactions: true },
    });
  }

  async create(data: Record<string, unknown>) {
    return prisma.customer.create({
      data: data as Parameters<typeof prisma.customer.create>[0]["data"],
    });
  }

  async update(id: string, data: Record<string, unknown>) {
    return prisma.customer.update({
      where: { id },
      data: data as Parameters<typeof prisma.customer.update>[0]["data"],
    });
  }

  async softDelete(id: string) {
    return prisma.customer.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async restore(id: string) {
    return prisma.customer.update({ where: { id }, data: { deletedAt: null } });
  }

  async count(options: CustomerListOptions = {}) {
    const { where = {} } = options;
    const prismaWhere: Record<string, unknown> = {};

    if (where.deletedAt !== undefined) {
      prismaWhere.deletedAt = where.deletedAt ? { not: null } : null;
    }

    if (where.search) {
      prismaWhere.OR = [
        { name: { contains: where.search } },
        { phone: { contains: where.search } },
        { email: { contains: where.search } },
      ];
    }

    return prisma.customer.count({ where: prismaWhere });
  }
}

export const customerRepository = new CustomerRepository();
