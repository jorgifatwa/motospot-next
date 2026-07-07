"use server";

import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { categoryService } from "./category.service";
import { CreateCategoryInput, UpdateCategoryInput } from "./category.schema";

export async function getCategories(options?: {
  search?: string;
  skip?: number;
  take?: number;
  includeDeleted?: boolean;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const includeDeleted = options?.includeDeleted && session.user.role === "ADMIN";
  return categoryService.getAll({ ...options, includeDeleted });
}

export async function getCategoryById(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return categoryService.getById(id);
}

export async function createCategory(data: CreateCategoryInput) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  if (!can(session, "create", "category")) throw new Error("Forbidden");
  return categoryService.create(data);
}

export async function updateCategory(id: string, data: UpdateCategoryInput) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  if (!can(session, "update", "category")) throw new Error("Forbidden");
  return categoryService.update(id, data);
}

export async function deleteCategory(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  if (!can(session, "delete", "category")) throw new Error("Forbidden");
  return categoryService.delete(id);
}

export async function restoreCategory(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  if (!can(session, "delete", "category")) throw new Error("Forbidden");
  return categoryService.restore(id);
}
