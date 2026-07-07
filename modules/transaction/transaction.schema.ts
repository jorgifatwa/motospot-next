// ────────────────────────────────
// Transaction Zod Schemas
// ARCHITECTURE.md Section 5 — validation layer
// BUSINESS_RULE.md Section 6, 7, 8 — transaction creation, status mapping, number format
// ────────────────────────────────

import { z } from "zod";

export const transactionStatusSchema = z.enum(["SALE", "BOOKING", "CANCELLED"]);

export const transactionItemSchema = z.object({
  motorcycleId: z.string().min(1, "Motorcycle is required"),
  priceAtSale: z.string().min(1, "Price is required"),
});

export const createTransactionSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  branchId: z.string().min(1, "Branch is required"),
  status: transactionStatusSchema,
  items: z.array(transactionItemSchema).min(1, "At least one motorcycle is required"),
});

export const updateTransactionSchema = createTransactionSchema.partial();

export type TransactionStatus = z.infer<typeof transactionStatusSchema>;
export type TransactionItemInput = z.infer<typeof transactionItemSchema>;
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
