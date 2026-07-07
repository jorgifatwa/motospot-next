// ────────────────────────────────
// Create Transaction Page (Server Component)
// ROADMAP.md Phase 4 — Create Transaction flow
// ────────────────────────────────

import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/rbac";
import { getMotorcycles } from "@/modules/motorcycle/motorcycle.actions";
import { getCustomers } from "@/modules/customer/customer.actions";
import { getBranches } from "@/modules/branch/branch.actions";
import { CreateTransactionClient } from "./_components/create-transaction-client";

export const dynamic = "force-dynamic";

export default async function NewTransactionPage() {
  const session = await auth();
  const admin = isAdmin(session);

  // Available motorcycles: Operational AVAILABLE + Sales AVAILABLE, branch-scoped for Cashier.
  const [motorcyclesResult, customersResult, branchesResult] = await Promise.all([
    getMotorcycles({
      operationalStatus: "AVAILABLE",
      salesStatus: "AVAILABLE",
      take: 200,
    }),
    getCustomers({ take: 200 }),
    getBranches(),
  ]);

  return (
    <CreateTransactionClient
      availableMotorcycles={motorcyclesResult.motorcycles}
      customers={customersResult.customers}
      branches={branchesResult.branches}
      userBranchId={session?.user?.branchId || undefined}
      isAdmin={admin}
    />
  );
}
