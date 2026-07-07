// ────────────────────────────────
// Bookings List Page (Server Component)
// ROADMAP.md Phase 4 — booking management
// ────────────────────────────────

import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/rbac";
import { getBookings } from "@/modules/booking/booking.actions";
import { getBranches } from "@/modules/branch/branch.actions";
import { BookingsClient } from "./_components/bookings-client";

export const dynamic = "force-dynamic";

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string; search?: string }>;
}) {
  const session = await auth();
  const admin = isAdmin(session);
  const params = await searchParams;

  const [result, branchesResult] = await Promise.all([
    getBookings({ branchId: params?.branchId, search: params?.search, take: 100 }),
    getBranches(),
  ]);

  return (
    <BookingsClient
      bookings={result.transactions}
      branches={branchesResult.branches}
      userBranchId={session?.user?.branchId || undefined}
      isAdmin={admin}
    />
  );
}
