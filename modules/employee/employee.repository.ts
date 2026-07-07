import { prisma } from "@/lib/prisma";

export interface EmployeeWhereInput {
  deletedAt?: boolean;
  search?: string;
  branchId?: string;
}

export interface EmployeeListOptions {
  where?: EmployeeWhereInput;
  skip?: number;
  take?: number;
  orderBy?: Record<string, "asc" | "desc">;
}

export class EmployeeRepository {
  async findAll(options: EmployeeListOptions = {}) {
    const { where = {}, skip = 0, take = 10, orderBy = { createdAt: "desc" } } = options;
    const prismaWhere: Record<string, unknown> = {};

    if (where.deletedAt !== undefined) {
      prismaWhere.deletedAt = where.deletedAt ? { not: null } : null;
    }

    if (where.search) {
      prismaWhere.OR = [
        { name: { contains: where.search } },
        { email: { contains: where.search } },
      ];
    }

    if (where.branchId) {
      prismaWhere.branchId = where.branchId;
    }

    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where: prismaWhere,
        skip,
        take,
        orderBy,
        include: { user: true },
      }),
      prisma.employee.count({ where: prismaWhere }),
    ]);

    return { employees, total };
  }

  async findById(id: string, includeDeleted = false) {
    return prisma.employee.findUnique({
      where: { id },
      include: { user: includeDeleted ? {} : { where: { deletedAt: null } } },
    });
  }

  async findByEmail(email: string) {
    return prisma.employee.findFirst({ where: { email } });
  }

  async create(data: Record<string, unknown>) {
    return prisma.employee.create({
      data: data as Parameters<typeof prisma.employee.create>[0]["data"],
    });
  }

  async update(id: string, data: Record<string, unknown>) {
    return prisma.employee.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    return prisma.employee.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async restore(id: string) {
    return prisma.employee.update({ where: { id }, data: { deletedAt: null } });
  }

  async count(options: EmployeeListOptions = {}) {
    const { where = {} } = options;
    const prismaWhere: Record<string, unknown> = {};

    if (where.deletedAt !== undefined) {
      prismaWhere.deletedAt = where.deletedAt ? { not: null } : null;
    }

    if (where.search) {
      prismaWhere.OR = [
        { name: { contains: where.search } },
        { email: { contains: where.search } },
      ];
    }

    if (where.branchId) {
      prismaWhere.branchId = where.branchId;
    }

    return prisma.employee.count({ where: prismaWhere });
  }
}
