// ────────────────────────────────
// Transaction Server Actions
// ARCHITECTURE.md Section 5 — thin layer that validates session/role, parses input, calls service
// BUSINESS_RULE.md Section 9.1 — branch-scoped cancel/convert for Cashier
// ────────────────────────────────

"use server";

import { auth } from "@/lib/auth";
import { can, isCashier, enforceBranchScope } from "@/lib/rbac";
import { transactionService } from "./transaction.service";
import { CreateTransactionInput } from "./transaction.schema";

export async function getTransactions(options?: {
  branchId?: string;
  status?: "SALE" | "BOOKING" | "CANCELLED";
  search?: string;
  skip?: number;
  take?: number;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return transactionService.getAll(options);
}

export async function getTransactionById(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return transactionService.getById(id);
}

export async function createTransaction(data: CreateTransactionInput) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  if (!can(session, "create", "transaction"))
    throw new Error("Forbidden: insufficient permissions");
  return transactionService.create(data);
}

export async function cancelTransaction(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  if (!can(session, "manage_transactions", "transaction")) {
    throw new Error("Forbidden: insufficient permissions");
  }

  // Branch scoping: Cashier may only cancel within their own branch.
  if (isCashier(session)) {
    const tx = await transactionService.getById(id);
    enforceBranchScope(session, tx.branchId);
  }

  return transactionService.cancel(id, session.user.id);
}

export async function convertBookingToSale(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  if (!can(session, "manage_bookings", "booking")) {
    throw new Error("Forbidden: insufficient permissions");
  }

  // Branch scoping: Cashier may only convert within their own branch.
  if (isCashier(session)) {
    const tx = await transactionService.getById(id);
    enforceBranchScope(session, tx.branchId);
  }

  return transactionService.convertBookingToSale(id, session.user.id);
}

export async function getBookingExpirationDays() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return transactionService.getBookingExpirationDays();
}

export async function setBookingExpirationDays(days: number) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  if (!can(session, "manage_settings", "settings")) {
    throw new Error("Forbidden: insufficient permissions");
  }
  return transactionService.setBookingExpirationDays(days);
}
