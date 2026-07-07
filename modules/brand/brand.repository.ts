import { prisma } from "@/lib/prisma";

export interface BrandWhereInput {
  deletedAt?: boolean;
  search?: string;
}

export interface BrandListOptions {
  where?: BrandWhereInput;
  skip?: number;
  take?: number;
  orderBy?: Record<string, "asc" | "desc">;
}

export class BrandRepository {
  async findAll(options: BrandListOptions = {}) {
    const { where = {}, skip = 0, take = 10, orderBy = { createdAt: "desc" } } = options;
    const prismaWhere: Record<string, unknown> = {};

    if (where.deletedAt !== undefined) {
      prismaWhere.deletedAt = where.deletedAt ? { not: null } : null;
    }

    if (where.search) {
      prismaWhere.OR = [{ name: { contains: where.search } }];
    }

    const [brands, total] = await Promise.all([
      prisma.brand.findMany({ where: prismaWhere, skip, take, orderBy }),
      prisma.brand.count({ where: prismaWhere }),
    ]);

    return { brands, total };
  }

  async findById(id: string, includeDeleted = false) {
    return prisma.brand.findUnique({
      where: { id },
      include: { motorcycles: { where: includeDeleted ? {} : { deletedAt: null } } },
    });
  }

  async findByName(name: string, includeDeleted = false) {
    const where: Record<string, unknown> = { name };
    if (!includeDeleted) where.deletedAt = null;
    return prisma.brand.findFirst({ where });
  }

  async create(data: Record<string, unknown>) {
    return prisma.brand.create({
      data: data as Parameters<typeof prisma.brand.create>[0]["data"],
    });
  }

  async update(id: string, data: Record<string, unknown>) {
    return prisma.brand.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    return prisma.brand.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async restore(id: string) {
    return prisma.brand.update({ where: { id }, data: { deletedAt: null } });
  }

  async count(options: BrandListOptions = {}) {
    const { where = {} } = options;
    const prismaWhere: Record<string, unknown> = {};

    if (where.deletedAt !== undefined) {
      prismaWhere.deletedAt = where.deletedAt ? { not: null } : null;
    }

    if (where.search) {
      prismaWhere.OR = [{ name: { contains: where.search } }];
    }

    return prisma.brand.count({ where: prismaWhere });
  }
}
