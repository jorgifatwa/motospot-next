// ────────────────────────────────
// Branch Server Actions
// ARCHITECTURE.md Section 5 — thin layer that validates session/role, parses input, calls service
// ────────────────────────────────

"use server";

import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { branchService } from "./branch.service";
import { CreateBranchInput, UpdateBranchInput } from "./branch.schema";

/**
 * Get all branches
 */
export async function getBranches(options?: {
  search?: string;
  skip?: number;
  take?: number;
  includeDeleted?: boolean;
}) {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  // Only ADMIN can view deleted branches
  const includeDeleted = options?.includeDeleted && session.user.role === "ADMIN";

  return branchService.getAll({
    ...options,
    includeDeleted,
  });
}

/**
 * Get branch by ID
 */
export async function getBranchById(id: string, includeDeleted = false) {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  return branchService.getById(id, includeDeleted);
}

/**
 * Create a new branch
 */
export async function createBranch(data: CreateBranchInput) {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  if (!can(session, "create", "branch")) {
    throw new Error("Forbidden: insufficient permissions");
  }

  return branchService.create(data);
}

/**
 * Update a branch
 */
export async function updateBranch(id: string, data: UpdateBranchInput) {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  if (!can(session, "update", "branch")) {
    throw new Error("Forbidden: insufficient permissions");
  }

  return branchService.update(id, data);
}

/**
 * Delete a branch (soft delete)
 */
export async function deleteBranch(id: string) {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  if (!can(session, "delete", "branch")) {
    throw new Error("Forbidden: insufficient permissions");
  }

  return branchService.delete(id);
}

/**
 * Restore a soft-deleted branch
 */
export async function restoreBranch(id: string) {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  if (!can(session, "delete", "branch")) {
    throw new Error("Forbidden: insufficient permissions");
  }

  return branchService.restore(id);
}
