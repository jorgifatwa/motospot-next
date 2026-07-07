// ────────────────────────────────
// Dashboard Server Actions
// ROADMAP.md Phase 5 — Dashboard & Reporting
// Thin layer: validates session/role, calls service.
// BUSINESS_RULE.md Section 12 — branch-filtered reporting
// ────────────────────────────────

"use server";

import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { dashboardService } from "./dashboard.service";

/**
 * Get dashboard metrics, optionally filtered by branch.
 * Cashier is automatically scoped to their own branch (handled in service).
 */
export async function getDashboardMetrics(branchId?: string) {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  if (!can(session, "view_dashboard", "dashboard")) {
    throw new Error("Forbidden: insufficient permissions");
  }

  return dashboardService.getMetrics(branchId);
}
