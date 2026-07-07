// ────────────────────────────────
// Branch Zod Schemas
// ARCHITECTURE.md Section 5 — validation layer
// ────────────────────────────────

import { z } from "zod";

export const createBranchSchema = z.object({
  name: z.string().min(1, "Branch name is required").max(100),
  address: z.string().max(255).optional().nullable(),
});

export const updateBranchSchema = createBranchSchema.partial();

export type CreateBranchInput = z.infer<typeof createBranchSchema>;
export type UpdateBranchInput = z.infer<typeof updateBranchSchema>;
