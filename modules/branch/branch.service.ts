// ────────────────────────────────
// Branch Service
// ARCHITECTURE.md Section 5 — business logic layer
// BUSINESS_RULE.md Section 3 — branch management rules
// ────────────────────────────────

import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { BranchRepository } from "./branch.repository";
import { CreateBranchInput, UpdateBranchInput } from "./branch.schema";

const branchRepository = new BranchRepository();

export class BranchService {
  /**
   * Get all branches (with pagination and search)
   */
  async getAll(options?: {
    search?: string;
    skip?: number;
    take?: number;
    includeDeleted?: boolean;
  }) {
    const session = await auth();

    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    // Only ADMIN can view deleted branches
    const includeDeleted = options?.includeDeleted && session.user.role === "ADMIN";

    const { branches, total } = await branchRepository.findAll({
      where: {
        deletedAt: includeDeleted ? true : false,
        search: options?.search,
      },
      skip: options?.skip,
      take: options?.take,
      orderBy: { createdAt: "desc" },
    });

    return { branches, total };
  }

  /**
   * Get branch by ID
   */
  async getById(id: string, includeDeleted = false) {
    const session = await auth();

    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    const branch = await branchRepository.findById(id, includeDeleted);

    if (!branch) {
      throw new Error("Branch not found");
    }

    return branch;
  }

  /**
   * Create a new branch
   */
  async create(data: CreateBranchInput) {
    const session = await auth();

    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    // Only ADMIN can create branches
    if (!can(session, "create", "branch")) {
      throw new Error("Forbidden: insufficient permissions");
    }

    // Check for duplicate branch name
    const existingBranch = await branchRepository.findByName(data.name);
    if (existingBranch) {
      throw new Error("Branch with this name already exists");
    }

    // Create branch
    const branch = await branchRepository.create({
      name: data.name,
      address: data.address,
    });

    // Write audit log
    await logAudit(session.user.id, "BRANCH_CREATED", "Branch", branch.id, {
      after: {
        name: branch.name,
        address: branch.address,
      },
    });

    return branch;
  }

  /**
   * Update a branch
   */
  async update(id: string, data: UpdateBranchInput) {
    const session = await auth();

    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    // Only ADMIN can update branches
    if (!can(session, "update", "branch")) {
      throw new Error("Forbidden: insufficient permissions");
    }

    // Check if branch exists
    const existingBranch = await branchRepository.findById(id);
    if (!existingBranch) {
      throw new Error("Branch not found");
    }

    // Check if branch is deleted
    if (existingBranch.deletedAt) {
      throw new Error("Cannot update a deleted branch");
    }

    // Check for duplicate name (if name is being updated)
    if (data.name && data.name !== existingBranch.name) {
      const duplicateBranch = await branchRepository.findByName(data.name);
      if (duplicateBranch) {
        throw new Error("Branch with this name already exists");
      }
    }

    // Update branch
    const updatedBranch = await branchRepository.update(id, data);

    // Write audit log
    await logAudit(session.user.id, "BRANCH_UPDATED", "Branch", id, {
      before: {
        name: existingBranch.name,
        address: existingBranch.address,
      },
      after: {
        name: updatedBranch.name,
        address: updatedBranch.address,
      },
    });

    return updatedBranch;
  }

  /**
   * Soft delete a branch
   */
  async delete(id: string) {
    const session = await auth();

    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    // Only ADMIN can delete branches
    if (!can(session, "delete", "branch")) {
      throw new Error("Forbidden: insufficient permissions");
    }

    // Check if branch exists
    const branch = await branchRepository.findById(id);
    if (!branch) {
      throw new Error("Branch not found");
    }

    // Check if branch is already deleted
    if (branch.deletedAt) {
      throw new Error("Branch is already deleted");
    }

    // Check if branch has active motorcycles
    const hasActiveMotorcycles = await branchRepository.hasActiveMotorcycles(id);
    if (hasActiveMotorcycles) {
      throw new Error(
        "Cannot delete branch with active motorcycles. Please reassign or delete motorcycles first.",
      );
    }

    // Check if branch has active employees
    const hasActiveEmployees = await branchRepository.hasActiveEmployees(id);
    if (hasActiveEmployees) {
      throw new Error(
        "Cannot delete branch with active employees. Please reassign or delete employees first.",
      );
    }

    // Soft delete branch
    await branchRepository.softDelete(id);

    // Write audit log
    await logAudit(session.user.id, "BRANCH_DELETED", "Branch", id, {
      before: {
        name: branch.name,
        address: branch.address,
      },
    });

    return { success: true };
  }

  /**
   * Restore a soft-deleted branch
   */
  async restore(id: string) {
    const session = await auth();

    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    // Only ADMIN can restore branches
    if (!can(session, "delete", "branch")) {
      throw new Error("Forbidden: insufficient permissions");
    }

    // Check if branch exists (including deleted)
    const branch = await branchRepository.findById(id, true);
    if (!branch) {
      throw new Error("Branch not found");
    }

    // Check if branch is not deleted
    if (!branch.deletedAt) {
      throw new Error("Branch is not deleted");
    }

    // Restore branch
    await branchRepository.restore(id);

    // Write audit log
    await logAudit(
      session.user.id,
      "BRANCH_UPDATED", // Reusing UPDATED for restore
      "Branch",
      id,
      {
        after: {
          name: branch.name,
          address: branch.address,
          restored: true,
        },
      },
    );

    return { success: true };
  }
}

export const branchService = new BranchService();
