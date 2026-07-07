// ────────────────────────────────
// Dashboard Filter Schema
// BUSINESS_RULE.md Section 12 — dashboard reporting
// ────────────────────────────────

import { z } from "zod";

export const dashboardFilterSchema = z.object({
  branchId: z.string().optional(),
});

export type DashboardFilterInput = z.infer<typeof dashboardFilterSchema>;
