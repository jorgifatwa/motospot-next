// ────────────────────────────────
// Customer Server Actions
// ARCHITECTURE.md Section 5 — thin layer that validates session/role, parses input, calls service
// ────────────────────────────────

"use server";

import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { customerService } from "./customer.service";
import { CreateCustomerInput, UpdateCustomerInput } from "./customer.schema";

export async function getCustomers(options?: {
  search?: string;
  skip?: number;
  take?: number;
  includeDeleted?: boolean;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return customerService.getAll(options);
}

export async function getCustomerById(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return customerService.getById(id);
}

export async function createCustomer(data: CreateCustomerInput) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  if (!can(session, "create", "transaction"))
    throw new Error("Forbidden: insufficient permissions");
  return customerService.create(data);
}

export async function updateCustomer(id: string, data: UpdateCustomerInput) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  if (!can(session, "update", "transaction"))
    throw new Error("Forbidden: insufficient permissions");
  return customerService.update(id, data);
}

export async function deleteCustomer(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  if (!can(session, "delete", "transaction"))
    throw new Error("Forbidden: insufficient permissions");
  return customerService.delete(id);
}

export async function restoreCustomer(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  if (!can(session, "delete", "transaction"))
    throw new Error("Forbidden: insufficient permissions");
  return customerService.restore(id);
}
