// ────────────────────────────────
// Dashboard Service
// ROADMAP.md Phase 5 — Dashboard & Reporting
// BUSINESS_RULE.md Section 12 — dashboard metrics
// Uses Prisma aggregations (_count, _sum) exclusively — no N+1 queries.
// Revenue uses TransactionItem.priceAtSale snapshots, NOT live Motorcycle.sellingPrice.
// ────────────────────────────────

import { auth } from "@/lib/auth";
import { isCashier, enforceBranchScope } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export interface DashboardMetrics {
  totalMotorcycles: number;
  availableMotorcycles: number;
  maintenanceMotorcycles: number;
  bookedMotorcycles: number;
  soldMotorcycles: number;
  totalSales: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
}

export class DashboardService {
  /**
   * Get all dashboard metrics in a single service call.
   * Every metric uses a Prisma aggregation (_count or _sum) — no fetching of
   * individual records, no N+1 queries.
   *
   * Revenue is computed from TransactionItem.priceAtSale (the snapshot taken
   * at transaction time), NOT from Motorcycle.sellingPrice. This ensures
   * historical revenue remains accurate even if a motorcycle's listed price
   * is edited after the sale.
   */
  async getMetrics(branchId?: string): Promise<DashboardMetrics> {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    // Branch scoping: Cashier sees only their own branch.
    // Admin can optionally filter by branch.
    let effectiveBranchId = branchId;
    if (isCashier(session)) {
      effectiveBranchId = enforceBranchScope(session, branchId);
    }

    // Build the branch filter for motorcycle queries.
    // Motorcycles have a direct branchId field.
    const motorcycleBranchFilter = effectiveBranchId ? { branchId: effectiveBranchId } : {};

    // Build the branch filter for transaction queries.
    // Transactions have a direct branchId field.
    const transactionBranchFilter = effectiveBranchId ? { branchId: effectiveBranchId } : {};

    // ────────────────────────────────
    // Motorcycle counts — each is a single Prisma _count aggregation.
    // No fetching of individual records.
    // ────────────────────────────────

    const [
      totalMotorcycles,
      availableMotorcycles,
      maintenanceMotorcycles,
      bookedMotorcycles,
      soldMotorcycles,
      totalSales,
      monthlyRevenueAgg,
      yearlyRevenueAgg,
    ] = await Promise.all([
      // 1. Total motorcycles (excluding soft-deleted)
      prisma.motorcycle.count({
        where: {
          deletedAt: null,
          ...motorcycleBranchFilter,
        },
      }),

      // 2. Available: Operational AVAILABLE + Sales AVAILABLE
      prisma.motorcycle.count({
        where: {
          deletedAt: null,
          operationalStatus: "AVAILABLE",
          salesStatus: "AVAILABLE",
          ...motorcycleBranchFilter,
        },
      }),

      // 3. Under maintenance
      prisma.motorcycle.count({
        where: {
          deletedAt: null,
          operationalStatus: "MAINTENANCE",
          ...motorcycleBranchFilter,
        },
      }),

      // 4. Booked (salesStatus = BOOKED, regardless of operationalStatus)
      prisma.motorcycle.count({
        where: {
          deletedAt: null,
          salesStatus: "BOOKED",
          ...motorcycleBranchFilter,
        },
      }),

      // 5. Sold (salesStatus = SOLD, regardless of operationalStatus)
      prisma.motorcycle.count({
        where: {
          deletedAt: null,
          salesStatus: "SOLD",
          ...motorcycleBranchFilter,
        },
      }),

      // 6. Total sales (count of SALE transactions)
      prisma.transaction.count({
        where: {
          status: "SALE",
          ...transactionBranchFilter,
        },
      }),

      // 7. Monthly revenue — sum of TransactionItem.priceAtSale snapshots
      //    for SALE transactions in the current calendar month.
      //    Uses _sum aggregation on the TransactionItem model, filtered
      //    through the transaction relation for status + branch + date.
      //    CRITICAL: priceAtSale is the snapshot, NOT Motorcycle.sellingPrice.
      prisma.transactionItem.aggregate({
        _sum: { priceAtSale: true },
        where: {
          transaction: {
            status: "SALE",
            ...transactionBranchFilter,
            createdAt: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
              lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
            },
          },
        },
      }),

      // 8. Yearly revenue — sum of TransactionItem.priceAtSale snapshots
      //    for SALE transactions in the current calendar year.
      prisma.transactionItem.aggregate({
        _sum: { priceAtSale: true },
        where: {
          transaction: {
            status: "SALE",
            ...transactionBranchFilter,
            createdAt: {
              gte: new Date(new Date().getFullYear(), 0, 1),
              lt: new Date(new Date().getFullYear() + 1, 0, 1),
            },
          },
        },
      }),
    ]);

    // Convert Decimal to number. Prisma's _sum returns Decimal | null.
    const monthlyRevenue = monthlyRevenueAgg._sum.priceAtSale
      ? Number(monthlyRevenueAgg._sum.priceAtSale)
      : 0;
    const yearlyRevenue = yearlyRevenueAgg._sum.priceAtSale
      ? Number(yearlyRevenueAgg._sum.priceAtSale)
      : 0;

    return {
      totalMotorcycles,
      availableMotorcycles,
      maintenanceMotorcycles,
      bookedMotorcycles,
      soldMotorcycles,
      totalSales,
      monthlyRevenue,
      yearlyRevenue,
    };
  }
}

export const dashboardService = new DashboardService();
