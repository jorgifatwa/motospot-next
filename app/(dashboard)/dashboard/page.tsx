// ────────────────────────────────
// Dashboard Page
// ROADMAP.md Phase 5 — Dashboard & Reporting
// BUSINESS_RUDE.md Section 12 — dashboard metrics
// UI_GUIDELINE.md Section 5 — bold KPI typography (tabular-nums, display-scale font)
// ────────────────────────────────

import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { dashboardService } from "@/modules/dashboard/dashboard.service";
import { DashboardClient } from "./_components/dashboard-client";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const userIsAdmin = isAdmin(session);
  const userBranchId = session.user.branchId ?? null;

  // Fetch initial metrics — Cashier sees their own branch, Admin sees all (no filter initially).
  const initialMetrics = await dashboardService.getMetrics(
    userIsAdmin ? undefined : (userBranchId ?? undefined),
  );

  // Fetch branches for the Admin filter dropdown (only active branches).
  let branches: { id: string; name: string }[] = [];
  if (userIsAdmin) {
    branches = await prisma.branch.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
  }

  return (
    <DashboardClient
      initialMetrics={initialMetrics}
      branches={branches}
      isAdmin={userIsAdmin}
      userName={session.user.name ?? "User"}
    />
  );
}
