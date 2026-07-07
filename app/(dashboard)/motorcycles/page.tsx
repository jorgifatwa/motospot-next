import { Suspense } from "react";
import { getMotorcycles } from "@/modules/motorcycle/motorcycle.actions";
import { getBrands } from "@/modules/brand/brand.actions";
import { getCategories } from "@/modules/category/category.actions";
import { getBranches } from "@/modules/branch/branch.actions";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/rbac";
import { MotorcyclesClient } from "./_components/motorcycles-client";

export const dynamic = "force-dynamic";

export default async function MotorcyclesPage({
  searchParams,
}: {
  searchParams: Promise<{
    branchId?: string;
    brandId?: string;
    categoryId?: string;
    operationalStatus?: string;
    salesStatus?: string;
  }>;
}) {
  const session = await auth();
  const admin = isAdmin(session);
  const params = await searchParams;

  // Fetch initial data
  const [motorcyclesResult, brandsResult, categoriesResult, branchesResult] = await Promise.all([
    getMotorcycles({
      branchId: params?.branchId,
      brandId: params?.brandId,
      categoryId: params?.categoryId,
      operationalStatus: params?.operationalStatus as "AVAILABLE" | "MAINTENANCE" | undefined,
      salesStatus: params?.salesStatus as "AVAILABLE" | "BOOKED" | "SOLD" | undefined,
      take: 50,
    }),
    getBrands(),
    getCategories(),
    getBranches(),
  ]);

  const brands = brandsResult.brands;
  const categories = categoriesResult.categories;
  const branches = branchesResult.branches;

  return (
    <Suspense
      fallback={<div className="text-center py-12 text-text-muted">Loading motorcycles...</div>}
    >
      <MotorcyclesClient
        initialMotorcycles={motorcyclesResult.motorcycles}
        brands={brands}
        categories={categories}
        branches={branches}
        userBranchId={session?.user?.branchId || undefined}
        isAdmin={admin}
        initialFilters={{
          branchId: params?.branchId,
          brandId: params?.brandId,
          categoryId: params?.categoryId,
          operationalStatus: params?.operationalStatus,
          salesStatus: params?.salesStatus,
        }}
      />
    </Suspense>
  );
}
