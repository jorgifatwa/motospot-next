// ────────────────────────────────
// Motorcycle Repository
// ARCHITECTURE.md Section 5 — only layer allowed to call Prisma directly
// ────────────────────────────────

import { prisma } from "@/lib/prisma";

export interface MotorcycleWhereInput {
  deletedAt?: boolean;
  search?: string;
  branchId?: string;
  brandId?: string;
  categoryId?: string;
  operationalStatus?: string;
  salesStatus?: string;
}

export interface MotorcycleListOptions {
  where?: MotorcycleWhereInput;
  skip?: number;
  take?: number;
  orderBy?: Record<string, "asc" | "desc">;
}

export interface MotorcycleCountOptions {
  where?: MotorcycleWhereInput;
}

export class MotorcycleRepository {
  /**
   * Find all motorcycles with pagination and filters
   */
  async findAll(options: MotorcycleListOptions = {}) {
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

    // Search filter (license plate, chassis number, engine number)
    if (where.search) {
      prismaWhere.OR = [
        { licensePlate: { contains: where.search } },
        { chassisNumber: { contains: where.search } },
        { engineNumber: { contains: where.search } },
      ];
    }

    // Branch filter
    if (where.branchId) {
      prismaWhere.branchId = where.branchId;
    }

    // Brand filter
    if (where.brandId) {
      prismaWhere.brandId = where.brandId;
    }

    // Category filter
    if (where.categoryId) {
      prismaWhere.categoryId = where.categoryId;
    }

    // Operational status filter
    if (where.operationalStatus) {
      prismaWhere.operationalStatus = where.operationalStatus;
    }

    // Sales status filter
    if (where.salesStatus) {
      prismaWhere.salesStatus = where.salesStatus;
    }

    const [motorcycles, total] = await Promise.all([
      prisma.motorcycle.findMany({
        where: prismaWhere,
        skip,
        take,
        orderBy,
        include: {
          brand: true,
          category: true,
          branch: true,
          images: {
            orderBy: { sortOrder: "asc" },
          },
        },
      }),
      prisma.motorcycle.count({ where: prismaWhere }),
    ]);

    return { motorcycles, total };
  }

  /**
   * Find motorcycle by ID
   */
  async findById(id: string, includeDeleted = false) {
    return prisma.motorcycle.findUnique({
      where: { id },
      include: {
        brand: true,
        category: true,
        branch: true,
        images: {
          orderBy: { sortOrder: "asc" },
        },
        transactionItems: includeDeleted ? {} : { where: {} },
      },
    });
  }

  /**
   * Find motorcycle by license plate
   */
  async findByLicensePlate(licensePlate: string, includeDeleted = false) {
    const where: Record<string, unknown> = { licensePlate };

    if (!includeDeleted) {
      where.deletedAt = null;
    }

    return prisma.motorcycle.findFirst({ where });
  }

  /**
   * Find motorcycle by chassis number
   */
  async findByChassisNumber(chassisNumber: string, includeDeleted = false) {
    const where: Record<string, unknown> = { chassisNumber };

    if (!includeDeleted) {
      where.deletedAt = null;
    }

    return prisma.motorcycle.findFirst({ where });
  }

  /**
   * Find motorcycle by engine number
   */
  async findByEngineNumber(engineNumber: string, includeDeleted = false) {
    const where: Record<string, unknown> = { engineNumber };

    if (!includeDeleted) {
      where.deletedAt = null;
    }

    return prisma.motorcycle.findFirst({ where });
  }

  /**
   * Create a new motorcycle
   */
  async create(data: Record<string, unknown>) {
    return prisma.motorcycle.create({
      data: data as Parameters<typeof prisma.motorcycle.create>[0]["data"],
      include: {
        brand: true,
        category: true,
        branch: true,
        images: true,
      },
    });
  }

  /**
   * Update a motorcycle
   */
  async update(id: string, data: Record<string, unknown>) {
    return prisma.motorcycle.update({
      where: { id },
      data: data as Parameters<typeof prisma.motorcycle.update>[0]["data"],
      include: {
        brand: true,
        category: true,
        branch: true,
        images: true,
      },
    });
  }

  /**
   * Soft delete a motorcycle
   */
  async softDelete(id: string) {
    return prisma.motorcycle.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Restore a soft-deleted motorcycle
   */
  async restore(id: string) {
    return prisma.motorcycle.update({
      where: { id },
      data: { deletedAt: null },
    });
  }

  /**
   * Count motorcycles
   */
  async count(options: MotorcycleCountOptions = {}) {
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
        { licensePlate: { contains: where.search } },
        { chassisNumber: { contains: where.search } },
        { engineNumber: { contains: where.search } },
      ];
    }

    if (where.branchId) {
      prismaWhere.branchId = where.branchId;
    }

    if (where.brandId) {
      prismaWhere.brandId = where.brandId;
    }

    if (where.categoryId) {
      prismaWhere.categoryId = where.categoryId;
    }

    if (where.operationalStatus) {
      prismaWhere.operationalStatus = where.operationalStatus;
    }

    if (where.salesStatus) {
      prismaWhere.salesStatus = where.salesStatus;
    }

    return prisma.motorcycle.count({ where: prismaWhere });
  }

  /**
   * Check if motorcycle has active transactions
   */
  async hasActiveTransactions(motorcycleId: string): Promise<boolean> {
    const count = await prisma.transactionItem.count({
      where: {
        motorcycleId,
        transaction: {
          status: {
            in: ["SALE", "BOOKING"],
          },
        },
      },
    });
    return count > 0;
  }

  /**
   * Check if license plate already exists
   */
  async existsByLicensePlate(licensePlate: string, excludeId?: string): Promise<boolean> {
    const where: Record<string, unknown> = { licensePlate };

    if (excludeId) {
      where.id = { not: excludeId };
    }

    const count = await prisma.motorcycle.count({ where });
    return count > 0;
  }

  /**
   * Check if chassis number already exists
   */
  async existsByChassisNumber(chassisNumber: string, excludeId?: string): Promise<boolean> {
    const where: Record<string, unknown> = { chassisNumber };

    if (excludeId) {
      where.id = { not: excludeId };
    }

    const count = await prisma.motorcycle.count({ where });
    return count > 0;
  }

  /**
   * Check if engine number already exists
   */
  async existsByEngineNumber(engineNumber: string, excludeId?: string): Promise<boolean> {
    const where: Record<string, unknown> = { engineNumber };

    if (excludeId) {
      where.id = { not: excludeId };
    }

    const count = await prisma.motorcycle.count({ where });
    return count > 0;
  }
}
