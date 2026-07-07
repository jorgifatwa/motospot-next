// ────────────────────────────────
// Dashboard Layout
// UI_GUIDELINE.md Section 8 — persistent left sidebar
// ────────────────────────────────

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { can, isAdmin } from "@/lib/rbac";
import { type ReactNode } from "react";

// ────────────────────────────────
// Navigation Items (placeholder per ROADMAP.md Phase 1)
// ────────────────────────────────

const navigationItems = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: "📊",
    action: "view_dashboard" as const,
    resource: "dashboard" as const,
  },
  {
    name: "Motorcycles",
    href: "/dashboard/motorcycles",
    icon: "🏍️",
    action: "read" as const,
    resource: "motorcycle" as const,
  },
  {
    name: "Transactions",
    href: "/dashboard/transactions",
    icon: "💰",
    action: "manage_transactions" as const,
    resource: "transaction" as const,
  },
  {
    name: "Bookings",
    href: "/dashboard/bookings",
    icon: "📅",
    action: "manage_bookings" as const,
    resource: "booking" as const,
  },
  {
    name: "Master Data",
    href: "/dashboard/master-data",
    icon: "📁",
    action: "manage_master_data" as const,
    resource: "branch" as const,
    adminOnly: true,
  },
  {
    name: "Users",
    href: "/dashboard/users",
    icon: "👥",
    action: "manage_users" as const,
    resource: "user" as const,
    adminOnly: true,
  },
  {
    name: "Settings",
    href: "/dashboard/settings",
    icon: "⚙️",
    action: "manage_settings" as const,
    resource: "settings" as const,
    adminOnly: true,
  },
];

// ────────────────────────────────
// Layout Component
// ────────────────────────────────

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Filter navigation items based on user permissions
  const visibleNavItems = navigationItems.filter((item) => {
    // Skip admin-only items for non-admin users
    if (item.adminOnly && !isAdmin(session)) {
      return false;
    }
    // Check if user has permission for this action
    return can(session, item.action, item.resource);
  });

  return (
    <div className="min-h-screen bg-bg flex">
      {/* Sidebar */}
      <aside className="w-64 bg-ink text-white flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-white/10">
          <h1 className="font-display text-2xl font-extrabold text-brand-red">RNJ Motospot</h1>
          <p className="text-sm text-white/60 mt-1">Dealership Management</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {visibleNavItems.map((item) => (
            <a
              key={item.name}
              href={item.href}
              className="flex items-center gap-3 px-4 py-3 rounded-md text-white/80 hover:bg-white/10 hover:text-white transition-colors"
            >
              <span className="text-xl">{item.icon}</span>
              <span className="font-medium">{item.name}</span>
            </a>
          ))}
        </nav>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-white/10">
          <div className="mb-3">
            <p className="text-sm font-medium text-white">{session.user.name}</p>
            <p className="text-xs text-white/60">{session.user.email}</p>
            <p className="text-xs text-brand-red mt-1 font-medium">{session.user.role}</p>
          </div>
          <form
            action={async () => {
              "use server";
              const { signOut } = await import("@/lib/auth");
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="w-full px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-md transition-colors"
            >
              Sign Out
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Top Bar */}
        <header className="bg-surface border-b border-border px-8 py-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-h1 font-bold text-ink">Dashboard</h2>
            {isAdmin(session) && (
              <span className="text-sm text-text-muted">Admin Access — All Branches</span>
            )}
          </div>
        </header>

        {/* Page Content */}
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
