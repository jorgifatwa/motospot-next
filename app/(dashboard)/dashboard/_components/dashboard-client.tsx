// ────────────────────────────────
// Dashboard Client Component
// ROADMAP.md Phase 5 — Dashboard & Reporting
// UI_GUIDELINE.md Section 5 — bold KPI typography, tabular-nums
// BUSINESS_RULE.md Section 12 — branch filter for Admin
// ────────────────────────────────

"use client";

import { useState, useTransition } from "react";
import { getDashboardMetrics } from "@/modules/dashboard/dashboard.actions";
import type { DashboardMetrics } from "@/modules/dashboard/dashboard.service";

// ────────────────────────────────
// Types
// ────────────────────────────────

interface BranchOption {
  id: string;
  name: string;
}

interface DashboardClientProps {
  initialMetrics: DashboardMetrics;
  branches: BranchOption[];
  isAdmin: boolean;
  userName: string;
}

// ────────────────────────────────
// Helpers
// ────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat("id-ID").format(n);
}

// ────────────────────────────────
// KPI Card Component (per UI_GUIDELINE.md Section 5)
// ────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string;
  valueColor?: string; // Tailwind color class for the value text
}

function KpiCard({ label, value, valueColor = "text-ink" }: KpiCardProps) {
  return (
    <div className="bg-surface border border-border rounded-lg p-6">
      <p className="text-caption font-medium text-text-muted uppercase tracking-wide mb-2">
        {label}
      </p>
      <p className={`font-display text-display font-extrabold font-tabular-nums ${valueColor}`}>
        {value}
      </p>
    </div>
  );
}

// ────────────────────────────────
// Client Component
// ────────────────────────────────

export function DashboardClient({
  initialMetrics,
  branches,
  isAdmin,
  userName,
}: DashboardClientProps) {
  const [metrics, setMetrics] = useState<DashboardMetrics>(initialMetrics);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  const handleBranchChange = (branchId: string) => {
    setSelectedBranchId(branchId);
    startTransition(async () => {
      try {
        const newMetrics = await getDashboardMetrics(branchId || undefined);
        setMetrics(newMetrics);
      } catch {
        // Metrics remain unchanged on error
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-display font-extrabold text-ink">
            Welcome back, {userName}!
          </h2>
          <p className="text-body text-text-muted mt-1">
            {"Here's what's happening with your dealership today."}
          </p>
        </div>

        {/* Branch Filter (Admin only) — BUSINESS_RULE.md Section 12 */}
        {isAdmin && (
          <div className="flex items-center gap-3">
            <label
              htmlFor="branch-filter"
              className="text-caption font-medium text-text-muted uppercase tracking-wide"
            >
              Branch
            </label>
            <select
              id="branch-filter"
              value={selectedBranchId}
              onChange={(e) => handleBranchChange(e.target.value)}
              className="px-4 py-2 border border-border rounded-md bg-bg text-ink text-body font-medium focus:outline-none focus:ring-2 focus:ring-brand-red"
            >
              <option value="">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Loading indicator */}
      {isPending && <div className="text-caption text-text-muted italic">Updating metrics...</div>}

      {/* KPI Cards Grid — BUSINESS_RULE.md Section 12 */}
      {/* Row 1: Motorcycle inventory metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard label="Total Motorcycles" value={formatNumber(metrics.totalMotorcycles)} />
        <KpiCard
          label="Available"
          value={formatNumber(metrics.availableMotorcycles)}
          valueColor="text-status-ok"
        />
        <KpiCard
          label="Under Maintenance"
          value={formatNumber(metrics.maintenanceMotorcycles)}
          valueColor="text-status-maintenance"
        />
        <KpiCard
          label="Booked"
          value={formatNumber(metrics.bookedMotorcycles)}
          valueColor="text-status-booked"
        />
      </div>

      {/* Row 2: Sales & Revenue metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard
          label="Sold"
          value={formatNumber(metrics.soldMotorcycles)}
          valueColor="text-status-sold"
        />
        <KpiCard label="Total Sales" value={formatNumber(metrics.totalSales)} />
        <KpiCard label="Monthly Revenue" value={formatCurrency(metrics.monthlyRevenue)} />
        <KpiCard label="Yearly Revenue" value={formatCurrency(metrics.yearlyRevenue)} />
      </div>
    </div>
  );
}
