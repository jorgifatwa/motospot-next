import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { BrandRepository } from "./brand.repository";
import { CreateBrandInput, UpdateBrandInput } from "./brand.schema";

const brandRepository = new BrandRepository();

export class BrandService {
  async getAll(options?: {
    search?: string;
    skip?: number;
    take?: number;
    includeDeleted?: boolean;
  }) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const includeDeleted = options?.includeDeleted && session.user.role === "ADMIN";

    const { brands, total } = await brandRepository.findAll({
      where: { deletedAt: includeDeleted ? true : false, search: options?.search },
      skip: options?.skip,
      take: options?.take,
    });

    return { brands, total };
  }

  async getById(id: string) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const brand = await brandRepository.findById(id);
    if (!brand) throw new Error("Brand not found");

    return brand;
  }

  async create(data: CreateBrandInput) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");
    if (!can(session, "create", "brand")) throw new Error("Forbidden");

    const existing = await brandRepository.findByName(data.name);
    if (existing) throw new Error("Brand with this name already exists");

    const brand = await brandRepository.create({ name: data.name });

    await logAudit(session.user.id, "BRAND_CREATED", "Brand", brand.id, {
      after: { name: brand.name },
    });

    return brand;
  }

  async update(id: string, data: UpdateBrandInput) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");
    if (!can(session, "update", "brand")) throw new Error("Forbidden");

    const existing = await brandRepository.findById(id);
    if (!existing) throw new Error("Brand not found");
    if (existing.deletedAt) throw new Error("Cannot update a deleted brand");

    if (data.name && data.name !== existing.name) {
      const duplicate = await brandRepository.findByName(data.name);
      if (duplicate) throw new Error("Brand with this name already exists");
    }

    const updated = await brandRepository.update(id, data);

    await logAudit(session.user.id, "BRAND_UPDATED", "Brand", id, {
      before: { name: existing.name },
      after: { name: updated.name },
    });

    return updated;
  }

  async delete(id: string) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");
    if (!can(session, "delete", "brand")) throw new Error("Forbidden");

    const brand = await brandRepository.findById(id);
    if (!brand) throw new Error("Brand not found");
    if (brand.deletedAt) throw new Error("Brand is already deleted");

    await brandRepository.softDelete(id);

    await logAudit(session.user.id, "BRAND_DELETED", "Brand", id, {
      before: { name: brand.name },
    });

    return { success: true };
  }

  async restore(id: string) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");
    if (!can(session, "delete", "brand")) throw new Error("Forbidden");

    const brand = await brandRepository.findById(id, true);
    if (!brand) throw new Error("Brand not found");
    if (!brand.deletedAt) throw new Error("Brand is not deleted");

    await brandRepository.restore(id);

    await logAudit(session.user.id, "BRAND_UPDATED", "Brand", id, {
      after: { name: brand.name, restored: true },
    });

    return { success: true };
  }
}

export const brandService = new BrandService();
