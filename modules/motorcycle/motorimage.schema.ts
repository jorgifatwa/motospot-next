// ────────────────────────────────
// MotorImage Zod Schemas
// ARCHITECTURE.md Section 5 — validation layer
// BUSINESS_RULE.md Section 5.1 — image upload rules
// SECURITY.md Section 9 — file upload security
// ────────────────────────────────

import { z } from "zod";

export const createMotorImageSchema = z.object({
  motorcycleId: z.string().min(1, "Motorcycle is required"),
  path: z.string().min(1, "Image path is required"),
  isMain: z.boolean().default(false),
  sortOrder: z.number().int().nonnegative().default(0),
});

export const updateMotorImageSchema = z.object({
  isMain: z.boolean().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
});

export type CreateMotorImageInput = z.infer<typeof createMotorImageSchema>;
export type UpdateMotorImageInput = z.infer<typeof updateMotorImageSchema>;

// Image upload validation schema (for multipart/form-data)
export const imageUploadSchema = z.object({
  file: z
    .instanceof(File)
    .refine((file) => file.size <= 5 * 1024 * 1024, "File size must be less than 5MB")
    .refine(
      (file) => ["image/jpeg", "image/png", "image/webp"].includes(file.type),
      "Only JPEG, PNG, and WebP images are allowed",
    ),
});
