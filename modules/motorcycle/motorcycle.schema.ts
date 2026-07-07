// ────────────────────────────────
// Motorcycle Zod Schemas
// ARCHITECTURE.md Section 5 — validation layer
// BUSINESS_RULE.md Section 5 — motorcycle data fields
// ────────────────────────────────

import { z } from "zod";

export const operationalStatusSchema = z.enum(["AVAILABLE", "MAINTENANCE"]);
export const salesStatusSchema = z.enum(["AVAILABLE", "BOOKED", "SOLD"]);

export const createMotorcycleSchema = z.object({
  brandId: z.string().min(1, "Brand is required"),
  categoryId: z.string().min(1, "Category is required"),
  branchId: z.string().min(1, "Branch is required"),
  licensePlate: z.string().min(1, "License plate is required").max(20),
  chassisNumber: z.string().min(1, "Chassis number is required").max(50),
  engineNumber: z.string().min(1, "Engine number is required").max(50),
  mileage: z.number().int().nonnegative("Mileage must be a positive number"),
  taxExpiration: z.string().optional().nullable(),
  purchasePrice: z.string().min(1, "Purchase price is required"),
  openPrice: z.string().min(1, "Open price is required"),
  sellingPrice: z.string().min(1, "Selling price is required"),
  color: z.string().max(50).optional().nullable(),
  originalPartsInfo: z.string().max(255).optional().nullable(),
  instagramLink: z.string().url("Invalid Instagram URL").optional().nullable(),
  operationalStatus: operationalStatusSchema.default("AVAILABLE"),
  salesStatus: salesStatusSchema.default("AVAILABLE"),
});

export const updateMotorcycleSchema = createMotorcycleSchema.partial().omit({
  brandId: true,
  categoryId: true,
  branchId: true,
});

export type CreateMotorcycleInput = z.infer<typeof createMotorcycleSchema>;
export type UpdateMotorcycleInput = z.infer<typeof updateMotorcycleSchema>;
export type OperationalStatus = z.infer<typeof operationalStatusSchema>;
export type SalesStatus = z.infer<typeof salesStatusSchema>;
