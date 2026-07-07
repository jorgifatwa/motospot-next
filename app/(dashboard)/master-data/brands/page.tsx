import { getBrands } from "@/modules/brand/brand.actions";
import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { BrandsClient } from "./_components/brands-client";

export default async function BrandsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!can(session, "manage_master_data", "brand")) redirect("/dashboard");

  const { brands } = await getBrands({ take: 100 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-h1 font-bold text-ink">Brand Management</h1>
        <p className="text-text-muted text-body mt-1">Manage motorcycle brands</p>
      </div>
      <BrandsClient initialBrands={brands} />
    </div>
  );
}
