import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { CategoryRepository } from "./category.repository";
import { CreateCategoryInput, UpdateCategoryInput } from "./category.schema";

const categoryRepository = new CategoryRepository();

export class CategoryService {
  async getAll(options?: {
    search?: string;
    skip?: number;
    take?: number;
    includeDeleted?: boolean;
  }) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const includeDeleted = options?.includeDeleted && session.user.role === "ADMIN";

    const { categories, total } = await categoryRepository.findAll({
      where: { deletedAt: includeDeleted ? true : false, search: options?.search },
      skip: options?.skip,
      take: options?.take,
    });

    return { categories, total };
  }

  async getById(id: string) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const category = await categoryRepository.findById(id);
    if (!category) throw new Error("Category not found");

    return category;
  }

  async create(data: CreateCategoryInput) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");
    if (!can(session, "create", "category")) throw new Error("Forbidden");

    const existing = await categoryRepository.findByName(data.name);
    if (existing) throw new Error("Category with this name already exists");

    const category = await categoryRepository.create({ name: data.name });

    await logAudit(session.user.id, "CATEGORY_CREATED", "Category", category.id, {
      after: { name: category.name },
    });

    return category;
  }

  async update(id: string, data: UpdateCategoryInput) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");
    if (!can(session, "update", "category")) throw new Error("Forbidden");

    const existing = await categoryRepository.findById(id);
    if (!existing) throw new Error("Category not found");
    if (existing.deletedAt) throw new Error("Cannot update a deleted category");

    if (data.name && data.name !== existing.name) {
      const duplicate = await categoryRepository.findByName(data.name);
      if (duplicate) throw new Error("Category with this name already exists");
    }

    const updated = await categoryRepository.update(id, data);

    await logAudit(session.user.id, "CATEGORY_UPDATED", "Category", id, {
      before: { name: existing.name },
      after: { name: updated.name },
    });

    return updated;
  }

  async delete(id: string) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");
    if (!can(session, "delete", "category")) throw new Error("Forbidden");

    const category = await categoryRepository.findById(id);
    if (!category) throw new Error("Category not found");
    if (category.deletedAt) throw new Error("Category is already deleted");

    await categoryRepository.softDelete(id);

    await logAudit(session.user.id, "CATEGORY_DELETED", "Category", id, {
      before: { name: category.name },
    });

    return { success: true };
  }

  async restore(id: string) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");
    if (!can(session, "delete", "category")) throw new Error("Forbidden");

    const category = await categoryRepository.findById(id, true);
    if (!category) throw new Error("Category not found");
    if (!category.deletedAt) throw new Error("Category is not deleted");

    await categoryRepository.restore(id);

    await logAudit(session.user.id, "CATEGORY_UPDATED", "Category", id, {
      after: { name: category.name, restored: true },
    });

    return { success: true };
  }
}

export const categoryService = new CategoryService();
