// ────────────────────────────────
// Motorcycle Server Actions
// ARCHITECTURE.md Section 5 — thin layer that validates session/role, parses input, calls service
// ────────────────────────────────

"use server";

import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { motorcycleService } from "./motorcycle.service";
import { CreateMotorcycleInput, UpdateMotorcycleInput } from "./motorcycle.schema";

/**
 * Get all motorcycles
 */
export async function getMotorcycles(options?: {
  search?: string;
  skip?: number;
  take?: number;
  branchId?: string;
  brandId?: string;
  categoryId?: string;
  operationalStatus?: "AVAILABLE" | "MAINTENANCE";
  salesStatus?: "AVAILABLE" | "BOOKED" | "SOLD";
  includeDeleted?: boolean;
}) {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  // Only ADMIN can view deleted motorcycles
  const includeDeleted = options?.includeDeleted && session.user.role === "ADMIN";

  return motorcycleService.getAll({
    ...options,
    includeDeleted,
  });
}

/**
 * Get motorcycle by ID
 */
export async function getMotorcycleById(id: string, includeDeleted = false) {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  return motorcycleService.getById(id, includeDeleted);
}

/**
 * Create a new motorcycle
 */
export async function createMotorcycle(data: CreateMotorcycleInput) {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  if (!can(session, "create", "motorcycle")) {
    throw new Error("Forbidden: insufficient permissions");
  }

  return motorcycleService.create(data);
}

/**
 * Update a motorcycle
 */
export async function updateMotorcycle(id: string, data: UpdateMotorcycleInput) {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  if (!can(session, "update", "motorcycle")) {
    throw new Error("Forbidden: insufficient permissions");
  }

  return motorcycleService.update(id, data);
}

/**
 * Delete a motorcycle (soft delete)
 */
export async function deleteMotorcycle(id: string) {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  if (!can(session, "delete", "motorcycle")) {
    throw new Error("Forbidden: insufficient permissions");
  }

  return motorcycleService.delete(id);
}

/**
 * Restore a soft-deleted motorcycle
 */
export async function restoreMotorcycle(id: string) {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  if (!can(session, "delete", "motorcycle")) {
    throw new Error("Forbidden: insufficient permissions");
  }

  return motorcycleService.restore(id);
}
