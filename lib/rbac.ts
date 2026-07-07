// ────────────────────────────────
// RBAC Permission Helper
// ARCHITECTURE.md Section 7 — single source of truth for authorization
// ────────────────────────────────

import { type Session } from "next-auth";

// Define UserRole locally to avoid Prisma client generation dependency
type UserRole = "ADMIN" | "CASHIER";

// ────────────────────────────────
// Type Definitions
// ────────────────────────────────

export type Action =
  | "create"
  | "read"
  | "update"
  | "delete"
  | "manage_users"
  | "manage_master_data"
  | "view_all_branches"
  | "manage_transactions"
  | "manage_bookings"
  | "view_dashboard"
  | "manage_settings";

export type Resource =
  | "user"
  | "branch"
  | "brand"
  | "category"
  | "motorcycle"
  | "transaction"
  | "booking"
  | "dashboard"
  | "settings"
  | "employee";

// ────────────────────────────────
// Permission Matrix
// ────────────────────────────────

const rolePermissions: Record<UserRole, Action[]> = {
  ADMIN: [
    "create",
    "read",
    "update",
    "delete",
    "manage_users",
    "manage_master_data",
    "view_all_branches",
    "manage_transactions",
    "manage_bookings",
    "view_dashboard",
    "manage_settings",
  ],
  CASHIER: ["create", "read", "update", "manage_transactions", "manage_bookings", "view_dashboard"],
};

// ────────────────────────────────
// Helper Functions
// ────────────────────────────────

/**
 * Check if a user has permission to perform an action on a resource
 * @param session - NextAuth session with user role
 * @param action - The action to perform
 * @param resource - The resource to perform action on
 * @returns true if user has permission, false otherwise
 */
export function can(session: Session | null, action: Action, resource: Resource): boolean {
  if (!session?.user) {
    return false;
  }

  const userRole = session.user.role as UserRole;
  const permissions = rolePermissions[userRole];

  if (!permissions) {
    return false;
  }

  // ADMIN has all permissions
  if (userRole === "ADMIN") {
    return true;
  }

  // Check if the action is in the role's permission list
  return permissions.includes(action);
}

/**
 * Check if user is ADMIN
 * @param session - NextAuth session
 * @returns true if user is ADMIN
 */
export function isAdmin(session: Session | null): boolean {
  return session?.user?.role === "ADMIN";
}

/**
 * Check if user is CASHIER
 * @param session - NextAuth session
 * @returns true if user is CASHIER
 */
export function isCashier(session: Session | null): boolean {
  return session?.user?.role === "CASHIER";
}

/**
 * Get user's branch ID from session
 * @param session - NextAuth session
 * @returns branchId or null
 */
export function getUserBranchId(session: Session | null): string | null {
  return session?.user?.branchId ?? null;
}

/**
 * Verify that a cashier can only access their own branch
 * Throws error if trying to access another branch
 * @param session - NextAuth session
 * @param requestedBranchId - Branch ID from request
 * @returns the branch ID to use (either from session or requested)
 */
export function enforceBranchScope(session: Session | null, requestedBranchId?: string): string {
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  // ADMIN can access all branches
  if (session.user.role === "ADMIN") {
    return requestedBranchId ?? "";
  }

  // CASHIER can only access their own branch
  if (session.user.role === "CASHIER") {
    const userBranchId = session.user.branchId;

    if (!userBranchId) {
      throw new Error("Cashier must be assigned to a branch");
    }

    // If a branchId is requested, ensure it matches the user's branch
    if (requestedBranchId && requestedBranchId !== userBranchId) {
      throw new Error("Access denied: cannot access other branches");
    }

    return userBranchId;
  }

  throw new Error("Invalid role");
}
