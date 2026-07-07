import { prisma } from "@/lib/prisma";

export interface CategoryWhereInput {
  deletedAt?: boolean;
  search?: string;
}

export interface CategoryListOptions {
  where?: CategoryWhereInput;
  skip?: number;
  take?: number;
  orderBy?: Record<string, "asc" | "desc">;
}

export class CategoryRepository {
  async findAll(options: CategoryListOptions = {}) {
    const { where = {}, skip = 0, take = 10, orderBy = { createdAt: "desc" } } = options;
    const prismaWhere: Record<string, unknown> = {};

    if (where.deletedAt !== undefined) {
      prismaWhere.deletedAt = where.deletedAt ? { not: null } : null;
    }

    if (where.search) {
      prismaWhere.OR = [{ name: { contains: where.search } }];
    }

    const [categories, total] = await Promise.all([
      prisma.category.findMany({ where: prismaWhere, skip, take, orderBy }),
      prisma.category.count({ where: prismaWhere }),
    ]);

    return { categories, total };
  }

  async findById(id: string, includeDeleted = false) {
    return prisma.category.findUnique({
      where: { id },
      include: { motorcycles: { where: includeDeleted ? {} : { deletedAt: null } } },
    });
  }

  async findByName(name: string, includeDeleted = false) {
    const where: Record<string, unknown> = { name };
    if (!includeDeleted) where.deletedAt = null;
    return prisma.category.findFirst({ where });
  }

  async create(data: Record<string, unknown>) {
    return prisma.category.create({
      data: data as Parameters<typeof prisma.category.create>[0]["data"],
    });
  }

  async update(id: string, data: Record<string, unknown>) {
    return prisma.category.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    return prisma.category.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async restore(id: string) {
    return prisma.category.update({ where: { id }, data: { deletedAt: null } });
  }

  async count(options: CategoryListOptions = {}) {
    const { where = {} } = options;
    const prismaWhere: Record<string, unknown> = {};

    if (where.deletedAt !== undefined) {
      prismaWhere.deletedAt = where.deletedAt ? { not: null } : null;
    }

    if (where.search) {
      prismaWhere.OR = [{ name: { contains: where.search } }];
    }

    return prisma.category.count({ where: prismaWhere });
  }
}
