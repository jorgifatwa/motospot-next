// ────────────────────────────────
// Settings Page (Server Component)
// BUSINESS_RULE.md Section 9.2 — configurable booking expiration (Admin only)
// ────────────────────────────────

import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { getBookingExpirationDays } from "@/modules/transaction/transaction.actions";
import { SettingsClient } from "./_components/settings-client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user || !isAdmin(session)) {
    redirect("/dashboard");
  }

  const days = await getBookingExpirationDays();

  return <SettingsClient defaultDays={days} />;
}
