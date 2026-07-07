// ────────────────────────────────
// Audit Log Helper
// ARCHITECTURE.md Section 10 — single source for audit trail writes
// SECURITY.md Section 10 — login events must be logged
// ────────────────────────────────

import { prisma } from "./prisma";

export type AuditAction =
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILED"
  | "LOGOUT"
  | "BRANCH_CREATED"
  | "BRANCH_UPDATED"
  | "BRANCH_DELETED"
  | "BRAND_CREATED"
  | "BRAND_UPDATED"
  | "BRAND_DELETED"
  | "CATEGORY_CREATED"
  | "CATEGORY_UPDATED"
  | "CATEGORY_DELETED"
  | "EMPLOYEE_CREATED"
  | "EMPLOYEE_UPDATED"
  | "EMPLOYEE_DELETED"
  | "USER_CREATED"
  | "USER_UPDATED"
  | "USER_DELETED"
  | "MOTORCYCLE_CREATED"
  | "MOTORCYCLE_UPDATED"
  | "MOTORCYCLE_DELETED"
  | "CUSTOMER_CREATED"
  | "CUSTOMER_UPDATED"
  | "CUSTOMER_DELETED"
  | "TRANSACTION_CREATED"
  | "TRANSACTION_CANCELLED"
  | "BOOKING_CONVERTED"
  | "BOOKING_EXPIRED";

export type EntityType =
  | "User"
  | "Branch"
  | "Brand"
  | "Category"
  | "Employee"
  | "Motorcycle"
  | "Customer"
  | "Transaction"
  | "Booking";

export interface AuditMetadata {
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Write an audit log entry
 * @param userId - The user performing the action (null for system actions or failed logins)
 * @param action - The audit action type
 * @param entityType - The type of entity being acted upon
 * @param entityId - The ID of the entity
 * @param metadata - Optional metadata (before/after snapshots, additional context)
 */
export async function logAudit(
  userId: string | null,
  action: AuditAction,
  entityType: EntityType,
  entityId: string,
  metadata?: AuditMetadata,
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        metadata: metadata as any,
      },
    });
  } catch (error) {
    // Audit logging should never break the main operation
    // Log to console in development, but don't throw
    console.error("Failed to write audit log:", error);
  }
}

/**
 * Convenience function to log authentication events
 */
export async function logAuthEvent(
  userId: string | null,
  action: "LOGIN_SUCCESS" | "LOGIN_FAILED" | "LOGOUT",
  email?: string,
  metadata?: AuditMetadata,
): Promise<void> {
  await logAudit(userId, action, "User", userId || "unknown", {
    email,
    ...metadata,
  });
}
