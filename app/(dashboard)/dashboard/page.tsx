// ────────────────────────────────
// Dashboard Page (Placeholder)
// ROADMAP.md Phase 1 — placeholder content
// ────────────────────────────────

import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/rbac";

export default async function DashboardPage() {
  const session = await auth();

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h2 className="font-display text-display font-extrabold text-ink mb-2">
          Welcome back, {session?.user?.name}!
        </h2>
        <p className="text-body text-text-muted">
          {"Here's what's happening with your dealership today."}
        </p>
      </div>

      {/* KPI Cards (Placeholder) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-surface border border-border rounded-lg p-6">
          <p className="text-caption font-medium text-text-muted uppercase tracking-wide mb-2">
            Total Motorcycles
          </p>
          <p className="font-display text-display font-extrabold text-ink font-tabular-nums">—</p>
        </div>

        <div className="bg-surface border border-border rounded-lg p-6">
          <p className="text-caption font-medium text-text-muted uppercase tracking-wide mb-2">
            Available
          </p>
          <p className="font-display text-display font-extrabold text-status-ok font-tabular-nums">
            —
          </p>
        </div>

        <div className="bg-surface border border-border rounded-lg p-6">
          <p className="text-caption font-medium text-text-muted uppercase tracking-wide mb-2">
            Sold This Month
          </p>
          <p className="font-display text-display font-extrabold text-ink font-tabular-nums">—</p>
        </div>

        <div className="bg-surface border border-border rounded-lg p-6">
          <p className="text-caption font-medium text-text-muted uppercase tracking-wide mb-2">
            Revenue
          </p>
          <p className="font-display text-display font-extrabold text-ink font-tabular-nums">—</p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-surface border border-border rounded-lg p-8 text-center">
        <p className="text-body text-text-muted">
          {isAdmin(session) ? "Admin" : "Cashier"} dashboard — Phase 1 complete.
          <br />
          Master data and motorcycle management coming in Phase 2.
        </p>
      </div>
    </div>
  );
}
