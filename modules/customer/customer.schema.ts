// ────────────────────────────────
// Customer Zod Schemas
// ARCHITECTURE.md Section 5 — validation layer
// BUSINESS_RULE.md Section 10 — customer stored separately from transactions
// ────────────────────────────────

import { z } from "zod";

export const createCustomerSchema = z.object({
  name: z.string().min(1, "Customer name is required").max(100),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().email("Invalid email").max(100).optional().nullable(),
  address: z.string().max(255).optional().nullable(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
