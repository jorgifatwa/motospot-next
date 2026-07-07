// ────────────────────────────────
// Branch Repository
// ARCHITECTURE.md Section 5 — only layer allowed to call Prisma directly
// ────────────────────────────────

import { prisma } from "@/lib/prisma";

export interface BranchWhereInput {
  deletedAt?: boolean;
  search?: string;
}

export interface BranchListOptions {
  where?: BranchWhereInput;
  skip?: number;
  take?: number;
  orderBy?: Record<string, "asc" | "desc">;
}

export interface BranchCountOptions {
  where?: BranchWhereInput;
}

export class BranchRepository {
  /**
   * Find all branches with pagination
   */
  async findAll(options: BranchListOptions = {}) {
    const { where = {}, skip = 0, take = 10, orderBy = { createdAt: "desc" } } = options;

    const prismaWhere: Record<string, unknown> = {};

    // Soft delete filter
    if (where.deletedAt !== undefined) {
      if (where.deletedAt) {
        prismaWhere.deletedAt = { not: null };
      } else {
        prismaWhere.deletedAt = null;
      }
    }

    // Search filter
    if (where.search) {
      prismaWhere.OR = [
        { name: { contains: where.search } },
        { address: { contains: where.search } },
      ];
    }

    const [branches, total] = await Promise.all([
      prisma.branch.findMany({
        where: prismaWhere,
        skip,
        take,
        orderBy,
      }),
      prisma.branch.count({ where: prismaWhere }),
    ]);

    return { branches, total };
  }

  /**
   * Find branch by ID
   */
  async findById(id: string, includeDeleted = false) {
    return prisma.branch.findUnique({
      where: { id },
      include: {
        users: {
          where: includeDeleted ? {} : { deletedAt: null },
        },
        employees: {
          where: includeDeleted ? {} : { deletedAt: null },
        },
        motorcycles: {
          where: includeDeleted ? {} : { deletedAt: null },
        },
      },
    });
  }

  /**
   * Find branch by name
   */
  async findByName(name: string, includeDeleted = false) {
    const where: Record<string, unknown> = { name };

    if (!includeDeleted) {
      where.deletedAt = null;
    }

    return prisma.branch.findFirst({ where });
  }

  /**
   * Create a new branch
   */
  async create(data: Record<string, unknown>) {
    return prisma.branch.create({
      data: data as Parameters<typeof prisma.branch.create>[0]["data"],
    });
  }

  /**
   * Update a branch
   */
  async update(id: string, data: Record<string, unknown>) {
    return prisma.branch.update({
      where: { id },
      data,
    });
  }

  /**
   * Soft delete a branch
   */
  async softDelete(id: string) {
    return prisma.branch.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Restore a soft-deleted branch
   */
  async restore(id: string) {
    return prisma.branch.update({
      where: { id },
      data: { deletedAt: null },
    });
  }

  /**
   * Count branches
   */
  async count(options: BranchCountOptions = {}) {
    const { where = {} } = options;

    const prismaWhere: Record<string, unknown> = {};

    if (where.deletedAt !== undefined) {
      if (where.deletedAt) {
        prismaWhere.deletedAt = { not: null };
      } else {
        prismaWhere.deletedAt = null;
      }
    }

    if (where.search) {
      prismaWhere.OR = [
        { name: { contains: where.search } },
        { address: { contains: where.search } },
      ];
    }

    return prisma.branch.count({ where: prismaWhere });
  }

  /**
   * Check if branch has active motorcycles
   */
  async hasActiveMotorcycles(branchId: string): Promise<boolean> {
    const count = await prisma.motorcycle.count({
      where: {
        branchId,
        deletedAt: null,
      },
    });
    return count > 0;
  }

  /**
   * Check if branch has active employees
   */
  async hasActiveEmployees(branchId: string): Promise<boolean> {
    const count = await prisma.employee.count({
      where: {
        branchId,
        deletedAt: null,
      },
    });
    return count > 0;
  }
}
