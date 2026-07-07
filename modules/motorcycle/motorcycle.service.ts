// ────────────────────────────────
// Motorcycle Service
// ARCHITECTURE.md Section 5 — business logic layer
// BUSINESS_RULE.md Section 4.3 — operational/sales status interaction rules
// BUSINESS_RULE.md Section 5 — motorcycle data fields
// ────────────────────────────────

import { auth } from "@/lib/auth";
import { can, enforceBranchScope, isCashier } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { MotorcycleRepository } from "./motorcycle.repository";
import {
  CreateMotorcycleInput,
  UpdateMotorcycleInput,
  OperationalStatus,
  SalesStatus,
} from "./motorcycle.schema";

const motorcycleRepository = new MotorcycleRepository();

export class MotorcycleService {
  /**
   * Get all motorcycles (with pagination, filters, and branch scoping)
   */
  async getAll(options?: {
    search?: string;
    skip?: number;
    take?: number;
    branchId?: string;
    brandId?: string;
    categoryId?: string;
    operationalStatus?: OperationalStatus;
    salesStatus?: SalesStatus;
    includeDeleted?: boolean;
  }) {
    const session = await auth();

    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    // Enforce branch scoping for CASHIER
    let effectiveBranchId = options?.branchId;
    if (isCashier(session)) {
      effectiveBranchId = enforceBranchScope(session, options?.branchId);
    }

    const includeDeleted = options?.includeDeleted && session.user.role === "ADMIN";

    const { motorcycles, total } = await motorcycleRepository.findAll({
      where: {
        deletedAt: includeDeleted ? true : false,
        search: options?.search,
        branchId: effectiveBranchId,
        brandId: options?.brandId,
        categoryId: options?.categoryId,
        operationalStatus: options?.operationalStatus,
        salesStatus: options?.salesStatus,
      },
      skip: options?.skip,
      take: options?.take,
      orderBy: { createdAt: "desc" },
    });

    // Transform for client consumption (convert Date to string for taxExpiration)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const clientMotorcycles = motorcycles.map((motorcycle: any) => ({
      ...motorcycle,
      taxExpiration: motorcycle.taxExpiration
        ? motorcycle.taxExpiration.toISOString().split("T")[0]
        : null,
    }));

    return { motorcycles: clientMotorcycles, total };
  }

  /**
   * Get motorcycle by ID
   */
  async getById(id: string, includeDeleted = false) {
    const session = await auth();

    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    const motorcycle = await motorcycleRepository.findById(id, includeDeleted);

    if (!motorcycle) {
      throw new Error("Motorcycle not found");
    }

    // Enforce branch scoping for CASHIER
    if (isCashier(session)) {
      enforceBranchScope(session, motorcycle.branchId);
    }

    return motorcycle;
  }

  /**
   * Create a new motorcycle
   */
  async create(data: CreateMotorcycleInput) {
    const session = await auth();

    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    // Only ADMIN can create motorcycles
    if (!can(session, "create", "motorcycle")) {
      throw new Error("Forbidden: insufficient permissions");
    }

    // Enforce branch scoping for CASHIER
    const effectiveBranchId = isCashier(session)
      ? enforceBranchScope(session, data.branchId)
      : data.branchId;

    // Check for duplicate license plate
    const existingLicensePlate = await motorcycleRepository.findByLicensePlate(data.licensePlate);
    if (existingLicensePlate) {
      throw new Error("Motorcycle with this license plate already exists");
    }

    // Check for duplicate chassis number
    const existingChassisNumber = await motorcycleRepository.findByChassisNumber(
      data.chassisNumber,
    );
    if (existingChassisNumber) {
      throw new Error("Motorcycle with this chassis number already exists");
    }

    // Check for duplicate engine number
    const existingEngineNumber = await motorcycleRepository.findByEngineNumber(data.engineNumber);
    if (existingEngineNumber) {
      throw new Error("Motorcycle with this engine number already exists");
    }

    // Validate operational status and sales status combination
    this.validateStatusCombination(data.operationalStatus, data.salesStatus);

    // Create motorcycle
    const motorcycle = await motorcycleRepository.create({
      brandId: data.brandId,
      categoryId: data.categoryId,
      branchId: effectiveBranchId,
      licensePlate: data.licensePlate,
      chassisNumber: data.chassisNumber,
      engineNumber: data.engineNumber,
      mileage: data.mileage,
      taxExpiration: data.taxExpiration ? new Date(data.taxExpiration) : null,
      purchasePrice: data.purchasePrice,
      openPrice: data.openPrice,
      sellingPrice: data.sellingPrice,
      color: data.color,
      originalPartsInfo: data.originalPartsInfo,
      instagramLink: data.instagramLink,
      operationalStatus: data.operationalStatus,
      salesStatus: data.salesStatus,
    });

    // Transform for client consumption (convert Date to string for taxExpiration)
    const clientMotorcycle = {
      ...motorcycle,
      taxExpiration: motorcycle.taxExpiration
        ? motorcycle.taxExpiration.toISOString().split("T")[0]
        : null,
    };

    // Write audit log
    await logAudit(session.user.id, "MOTORCYCLE_CREATED", "Motorcycle", motorcycle.id, {
      after: {
        licensePlate: motorcycle.licensePlate,
        chassisNumber: motorcycle.chassisNumber,
        engineNumber: motorcycle.engineNumber,
        branchId: effectiveBranchId,
        operationalStatus: motorcycle.operationalStatus,
        salesStatus: motorcycle.salesStatus,
      },
    });

    return clientMotorcycle;
  }

  /**
   * Update a motorcycle
   */
  async update(id: string, data: UpdateMotorcycleInput) {
    const session = await auth();

    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    // Only ADMIN can update motorcycles
    if (!can(session, "update", "motorcycle")) {
      throw new Error("Forbidden: insufficient permissions");
    }

    // Check if motorcycle exists
    const existingMotorcycle = await motorcycleRepository.findById(id, true);
    if (!existingMotorcycle) {
      throw new Error("Motorcycle not found");
    }

    // Check if motorcycle is deleted
    if (existingMotorcycle.deletedAt) {
      throw new Error("Cannot update a deleted motorcycle");
    }

    // BUSINESS_RULE.md Section 4.3: A SOLD motorcycle is out of the sales pool entirely.
    // Only status transitions (operationalStatus / salesStatus) are blocked on a SOLD
    // motorcycle. Non-status fields (color, taxExpiration, notes, etc.) remain editable by
    // an Administrator, and the change is recorded in the AuditLog below.
    if (existingMotorcycle.salesStatus === "SOLD") {
      const hasStatusChange =
        data.operationalStatus !== undefined || data.salesStatus !== undefined;
      if (hasStatusChange) {
        throw new Error(
          "Cannot update status of a sold motorcycle. It is out of the sales pool permanently.",
        );
      }
    }

    // Enforce branch scoping for CASHIER
    if (isCashier(session)) {
      enforceBranchScope(session, existingMotorcycle.branchId);
    }

    // Check for duplicate license plate (if being updated)
    if (data.licensePlate && data.licensePlate !== existingMotorcycle.licensePlate) {
      const duplicate = await motorcycleRepository.findByLicensePlate(data.licensePlate);
      if (duplicate) {
        throw new Error("Motorcycle with this license plate already exists");
      }
    }

    // Check for duplicate chassis number (if being updated)
    if (data.chassisNumber && data.chassisNumber !== existingMotorcycle.chassisNumber) {
      const duplicate = await motorcycleRepository.findByChassisNumber(data.chassisNumber);
      if (duplicate) {
        throw new Error("Motorcycle with this chassis number already exists");
      }
    }

    // Check for duplicate engine number (if being updated)
    if (data.engineNumber && data.engineNumber !== existingMotorcycle.engineNumber) {
      const duplicate = await motorcycleRepository.findByEngineNumber(data.engineNumber);
      if (duplicate) {
        throw new Error("Motorcycle with this engine number already exists");
      }
    }

    // Determine the new status values
    const newOperationalStatus = data.operationalStatus ?? existingMotorcycle.operationalStatus;
    const newSalesStatus = data.salesStatus ?? existingMotorcycle.salesStatus;

    // Validate status combination
    this.validateStatusCombination(newOperationalStatus, newSalesStatus);

    // Prepare update data
    const updateData: Record<string, unknown> = {};

    if (data.mileage !== undefined) updateData.mileage = data.mileage;
    if (data.taxExpiration !== undefined)
      updateData.taxExpiration = data.taxExpiration ? new Date(data.taxExpiration) : null;
    if (data.purchasePrice !== undefined) updateData.purchasePrice = data.purchasePrice;
    if (data.openPrice !== undefined) updateData.openPrice = data.openPrice;
    if (data.sellingPrice !== undefined) updateData.sellingPrice = data.sellingPrice;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.originalPartsInfo !== undefined) updateData.originalPartsInfo = data.originalPartsInfo;
    if (data.instagramLink !== undefined) updateData.instagramLink = data.instagramLink;
    if (data.operationalStatus !== undefined) updateData.operationalStatus = data.operationalStatus;
    if (data.salesStatus !== undefined) updateData.salesStatus = data.salesStatus;

    // Update motorcycle
    const updatedMotorcycle = await motorcycleRepository.update(id, updateData);

    // Write audit log
    await logAudit(session.user.id, "MOTORCYCLE_UPDATED", "Motorcycle", id, {
      before: {
        licensePlate: existingMotorcycle.licensePlate,
        chassisNumber: existingMotorcycle.chassisNumber,
        engineNumber: existingMotorcycle.engineNumber,
        mileage: existingMotorcycle.mileage,
        operationalStatus: existingMotorcycle.operationalStatus,
        salesStatus: existingMotorcycle.salesStatus,
      },
      after: {
        licensePlate: updatedMotorcycle.licensePlate,
        chassisNumber: updatedMotorcycle.chassisNumber,
        engineNumber: updatedMotorcycle.engineNumber,
        mileage: updatedMotorcycle.mileage,
        operationalStatus: updatedMotorcycle.operationalStatus,
        salesStatus: updatedMotorcycle.salesStatus,
      },
    });

    return updatedMotorcycle;
  }

  /**
   * Soft delete a motorcycle
   */
  async delete(id: string) {
    const session = await auth();

    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    // Only ADMIN can delete motorcycles
    if (!can(session, "delete", "motorcycle")) {
      throw new Error("Forbidden: insufficient permissions");
    }

    // Check if motorcycle exists
    const motorcycle = await motorcycleRepository.findById(id, true);
    if (!motorcycle) {
      throw new Error("Motorcycle not found");
    }

    // Check if motorcycle is already deleted
    if (motorcycle.deletedAt) {
      throw new Error("Motorcycle is already deleted");
    }

    // Check if motorcycle has active transactions
    const hasActiveTransactions = await motorcycleRepository.hasActiveTransactions(id);
    if (hasActiveTransactions) {
      throw new Error(
        "Cannot delete motorcycle with active transactions. Please cancel transactions first.",
      );
    }

    // Soft delete motorcycle
    await motorcycleRepository.softDelete(id);

    // Write audit log
    await logAudit(session.user.id, "MOTORCYCLE_DELETED", "Motorcycle", id, {
      before: {
        licensePlate: motorcycle.licensePlate,
        chassisNumber: motorcycle.chassisNumber,
        engineNumber: motorcycle.engineNumber,
        operationalStatus: motorcycle.operationalStatus,
        salesStatus: motorcycle.salesStatus,
      },
    });

    return { success: true };
  }

  /**
   * Restore a soft-deleted motorcycle
   */
  async restore(id: string) {
    const session = await auth();

    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    // Only ADMIN can restore motorcycles
    if (!can(session, "delete", "motorcycle")) {
      throw new Error("Forbidden: insufficient permissions");
    }

    // Check if motorcycle exists (including deleted)
    const motorcycle = await motorcycleRepository.findById(id, true);
    if (!motorcycle) {
      throw new Error("Motorcycle not found");
    }

    // Check if motorcycle is not deleted
    if (!motorcycle.deletedAt) {
      throw new Error("Motorcycle is not deleted");
    }

    // Restore motorcycle
    await motorcycleRepository.restore(id);

    // Write audit log
    await logAudit(session.user.id, "MOTORCYCLE_UPDATED", "Motorcycle", id, {
      after: {
        licensePlate: motorcycle.licensePlate,
        chassisNumber: motorcycle.chassisNumber,
        engineNumber: motorcycle.engineNumber,
        restored: true,
      },
    });

    return { success: true };
  }

  /**
   * Validate operational status and sales status combination
   * BUSINESS_RULE.md Section 4.3
   */
  private validateStatusCombination(
    operationalStatus: OperationalStatus,
    salesStatus: SalesStatus,
  ): void {
    // A motorcycle with Operational Status MAINTENANCE cannot be BOOKED or SOLD
    if (
      operationalStatus === "MAINTENANCE" &&
      (salesStatus === "BOOKED" || salesStatus === "SOLD")
    ) {
      throw new Error(
        "A motorcycle under maintenance cannot be booked or sold. Please set operational status to AVAILABLE first.",
      );
    }

    // Sales Status AVAILABLE requires Operational Status AVAILABLE
    if (salesStatus === "AVAILABLE" && operationalStatus === "MAINTENANCE") {
      throw new Error(
        "A motorcycle with sales status AVAILABLE must have operational status AVAILABLE.",
      );
    }
  }
}

export const motorcycleService = new MotorcycleService();
