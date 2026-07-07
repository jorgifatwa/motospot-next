"use server";

import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { employeeService } from "./employee.service";
import { CreateEmployeeInput, UpdateEmployeeInput } from "./employee.schema";

export async function getEmployees(options?: {
  search?: string;
  skip?: number;
  take?: number;
  branchId?: string;
  includeDeleted?: boolean;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const includeDeleted = options?.includeDeleted && session.user.role === "ADMIN";
  return employeeService.getAll({ ...options, includeDeleted });
}

export async function getEmployeeById(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return employeeService.getById(id);
}

export async function createEmployee(data: CreateEmployeeInput) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  if (!can(session, "create", "employee")) throw new Error("Forbidden");
  return employeeService.create(data);
}

export async function updateEmployee(id: string, data: UpdateEmployeeInput) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  if (!can(session, "update", "employee")) throw new Error("Forbidden");
  return employeeService.update(id, data);
}

export async function deleteEmployee(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  if (!can(session, "delete", "employee")) throw new Error("Forbidden");
  return employeeService.delete(id);
}

export async function restoreEmployee(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  if (!can(session, "delete", "employee")) throw new Error("Forbidden");
  return employeeService.restore(id);
}
