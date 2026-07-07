// ────────────────────────────────
// Branches Page
// UI_GUIDELINE.md — Bold & Modern design
// ARCHITECTURE.md Section 5 — Server Component calling Server Actions
// ────────────────────────────────

import { getBranches } from "@/modules/branch/branch.actions";
import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BranchesClient } from "./_components/branches-client";

export default async function BranchesPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Only ADMIN can access master data management
  if (!can(session, "manage_master_data", "branch")) {
    redirect("/dashboard");
  }

  // Fetch branches server-side
  const { branches } = await getBranches({ take: 100 });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-h1 font-bold text-ink">Branch Management</h1>
        <p className="text-text-muted text-body mt-1">Manage dealership branches and locations</p>
      </div>

      {/* Branches Table - Client Component handles everything */}
      <BranchesClient initialBranches={branches} />
    </div>
  );
}
