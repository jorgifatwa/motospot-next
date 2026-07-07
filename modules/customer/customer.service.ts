// ────────────────────────────────
// Customer Service
// ARCHITECTURE.md Section 5 — business logic layer
// BUSINESS_RULE.md Section 10 — customer stored separately, soft delete only
// ────────────────────────────────

import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { customerRepository } from "./customer.repository";
import { CreateCustomerInput, UpdateCustomerInput } from "./customer.schema";

export class CustomerService {
  async getAll(options?: {
    search?: string;
    skip?: number;
    take?: number;
    includeDeleted?: boolean;
  }) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const includeDeleted = options?.includeDeleted && session.user.role === "ADMIN";

    const { customers, total } = await customerRepository.findAll({
      where: { deletedAt: includeDeleted ? true : false, search: options?.search },
      skip: options?.skip,
      take: options?.take,
    });

    return { customers, total };
  }

  async getById(id: string) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const customer = await customerRepository.findById(id);
    if (!customer) throw new Error("Customer not found");
    return customer;
  }

  async create(data: CreateCustomerInput) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");
    if (!can(session, "create", "transaction"))
      throw new Error("Forbidden: insufficient permissions");

    const customer = await customerRepository.create({
      name: data.name,
      phone: data.phone,
      email: data.email,
      address: data.address,
    });

    await logAudit(session.user.id, "CUSTOMER_CREATED", "Customer", customer.id, {
      after: { name: customer.name, phone: customer.phone, email: customer.email },
    });

    return customer;
  }

  async update(id: string, data: UpdateCustomerInput) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");
    if (!can(session, "update", "transaction"))
      throw new Error("Forbidden: insufficient permissions");

    const existing = await customerRepository.findById(id);
    if (!existing) throw new Error("Customer not found");
    if (existing.deletedAt) throw new Error("Cannot update a deleted customer");

    const updated = await customerRepository.update(id, {
      name: data.name,
      phone: data.phone,
      email: data.email,
      address: data.address,
    });

    await logAudit(session.user.id, "CUSTOMER_UPDATED", "Customer", id, {
      before: { name: existing.name },
      after: { name: updated.name },
    });

    return updated;
  }

  async delete(id: string) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");
    if (!can(session, "delete", "transaction"))
      throw new Error("Forbidden: insufficient permissions");

    const customer = await customerRepository.findById(id);
    if (!customer) throw new Error("Customer not found");
    if (customer.deletedAt) throw new Error("Customer is already deleted");

    await customerRepository.softDelete(id);

    await logAudit(session.user.id, "CUSTOMER_DELETED", "Customer", id, {
      before: { name: customer.name },
    });

    return { success: true };
  }

  async restore(id: string) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");
    if (!can(session, "delete", "transaction"))
      throw new Error("Forbidden: insufficient permissions");

    const customer = await customerRepository.findById(id);
    if (!customer) throw new Error("Customer not found");
    if (!customer.deletedAt) throw new Error("Customer is not deleted");

    await customerRepository.restore(id);

    await logAudit(session.user.id, "CUSTOMER_UPDATED", "Customer", id, {
      after: { name: customer.name, restored: true },
    });

    return { success: true };
  }
}

export const customerService = new CustomerService();
