import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { EmployeeRepository } from "./employee.repository";
import { CreateEmployeeInput, UpdateEmployeeInput } from "./employee.schema";

const employeeRepository = new EmployeeRepository();

export class EmployeeService {
  async getAll(options?: {
    search?: string;
    skip?: number;
    take?: number;
    branchId?: string;
    includeDeleted?: boolean;
  }) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const includeDeleted = options?.includeDeleted && session.user.role === "ADMIN";

    const { employees, total } = await employeeRepository.findAll({
      where: {
        deletedAt: includeDeleted ? true : false,
        search: options?.search,
        branchId: options?.branchId,
      },
      skip: options?.skip,
      take: options?.take,
    });

    return { employees, total };
  }

  async getById(id: string) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const employee = await employeeRepository.findById(id);
    if (!employee) throw new Error("Employee not found");

    return employee;
  }

  async create(data: CreateEmployeeInput) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");
    if (!can(session, "create", "employee")) throw new Error("Forbidden");

    // Check for duplicate email
    if (data.email) {
      const existing = await employeeRepository.findByEmail(data.email);
      if (existing) throw new Error("Employee with this email already exists");
    }

    // Hash password (bcrypt 12 rounds per SECURITY.md Section 5)
    const passwordHash = await hash(data.password, 12);

    // Atomic operation: create Employee and User together
    // Per BUSINESS_RULE.md Section 11 and DATABASE.md Section 4.7
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await prisma.$transaction(async (tx: any) => {
      // Create Employee first
      const employee = await tx.employee.create({
        data: {
          name: data.name,
          email: data.email,
          phone: data.phone,
          address: data.address,
          branchId: data.branchId,
        },
      });

      // Create linked User account
      const user = await tx.user.create({
        data: {
          name: data.name,
          email: data.email || `${employee.id}@no-email.local`,
          passwordHash,
          role: data.role,
          branchId: data.branchId,
          employeeId: employee.id,
        },
      });

      return { employee, user };
    });

    // Write audit log
    await logAudit(session.user.id, "EMPLOYEE_CREATED", "Employee", result.employee.id, {
      after: {
        name: result.employee.name,
        email: result.employee.email,
        role: data.role,
        branchId: data.branchId,
      },
    });

    return result.employee;
  }

  async update(id: string, data: UpdateEmployeeInput) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");
    if (!can(session, "update", "employee")) throw new Error("Forbidden");

    const existing = await employeeRepository.findById(id, true);
    if (!existing) throw new Error("Employee not found");
    if (existing.deletedAt) throw new Error("Cannot update a deleted employee");

    // Check for duplicate email (if email is being updated)
    if (data.email && data.email !== existing.email) {
      const duplicate = await employeeRepository.findByEmail(data.email);
      if (duplicate) throw new Error("Employee with this email already exists");
    }

    // Update Employee
    const updatedEmployee = await employeeRepository.update(id, {
      name: data.name,
      email: data.email,
      phone: data.phone,
      address: data.address,
      branchId: data.branchId,
    });

    // Update linked User if it exists
    if (existing.user) {
      const userData: Record<string, unknown> = {};
      if (data.name) userData.name = data.name;
      if (data.email !== undefined) userData.email = data.email || `${id}@no-email.local`;
      if (data.role) userData.role = data.role;
      if (data.branchId) userData.branchId = data.branchId;

      if (Object.keys(userData).length > 0) {
        await prisma.user.update({
          where: { id: existing.user.id },
          data: userData,
        });
      }
    }

    // Write audit log
    await logAudit(session.user.id, "EMPLOYEE_UPDATED", "Employee", id, {
      before: {
        name: existing.name,
        email: existing.email,
        role: existing.user?.role,
        branchId: existing.branchId,
      },
      after: {
        name: updatedEmployee.name,
        email: updatedEmployee.email,
        role: data.role || existing.user?.role,
        branchId: data.branchId || existing.branchId,
      },
    });

    return updatedEmployee;
  }

  async delete(id: string) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");
    if (!can(session, "delete", "employee")) throw new Error("Forbidden");

    const employee = await employeeRepository.findById(id, true);
    if (!employee) throw new Error("Employee not found");
    if (employee.deletedAt) throw new Error("Employee is already deleted");

    // Soft delete Employee and linked User atomically
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await prisma.$transaction(async (tx: any) => {
      await tx.employee.update({ where: { id }, data: { deletedAt: new Date() } });

      if (employee.user) {
        await tx.user.update({ where: { id: employee.user.id }, data: { deletedAt: new Date() } });
      }
    });

    // Write audit log
    await logAudit(session.user.id, "EMPLOYEE_DELETED", "Employee", id, {
      before: {
        name: employee.name,
        email: employee.email,
      },
    });

    return { success: true };
  }

  async restore(id: string) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");
    if (!can(session, "delete", "employee")) throw new Error("Forbidden");

    const employee = await employeeRepository.findById(id, true);
    if (!employee) throw new Error("Employee not found");
    if (!employee.deletedAt) throw new Error("Employee is not deleted");

    // Restore Employee and linked User atomically
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await prisma.$transaction(async (tx: any) => {
      await tx.employee.update({ where: { id }, data: { deletedAt: null } });

      if (employee.user) {
        await tx.user.update({ where: { id: employee.user.id }, data: { deletedAt: null } });
      }
    });

    // Write audit log
    await logAudit(session.user.id, "EMPLOYEE_UPDATED", "Employee", id, {
      after: {
        name: employee.name,
        email: employee.email,
        restored: true,
      },
    });

    return { success: true };
  }
}

export const employeeService = new EmployeeService();
