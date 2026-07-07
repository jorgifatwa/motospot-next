import { z } from "zod";

export const createEmployeeSchema = z.object({
  name: z.string().min(1, "Employee name is required").max(100),
  email: z.string().email("Invalid email").optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  address: z.string().max(255).optional().nullable(),
  branchId: z.string().min(1, "Branch is required"),
  role: z.enum(["ADMIN", "CASHIER"]),
  password: z.string().min(10, "Password must be at least 10 characters"),
});

export const updateEmployeeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  address: z.string().max(255).optional().nullable(),
  branchId: z.string().min(1).optional(),
  role: z.enum(["ADMIN", "CASHIER"]).optional(),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
