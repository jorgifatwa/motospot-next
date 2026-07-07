"use server";

import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { brandService } from "./brand.service";
import { CreateBrandInput, UpdateBrandInput } from "./brand.schema";

export async function getBrands(options?: {
  search?: string;
  skip?: number;
  take?: number;
  includeDeleted?: boolean;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const includeDeleted = options?.includeDeleted && session.user.role === "ADMIN";
  return brandService.getAll({ ...options, includeDeleted });
}

export async function getBrandById(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return brandService.getById(id);
}

export async function createBrand(data: CreateBrandInput) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  if (!can(session, "create", "brand")) throw new Error("Forbidden");
  return brandService.create(data);
}

export async function updateBrand(id: string, data: UpdateBrandInput) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  if (!can(session, "update", "brand")) throw new Error("Forbidden");
  return brandService.update(id, data);
}

export async function deleteBrand(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  if (!can(session, "delete", "brand")) throw new Error("Forbidden");
  return brandService.delete(id);
}

export async function restoreBrand(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  if (!can(session, "delete", "brand")) throw new Error("Forbidden");
  return brandService.restore(id);
}
