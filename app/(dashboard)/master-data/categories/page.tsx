import { getCategories } from "@/modules/category/category.actions";
import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { CategoriesClient } from "./_components/categories-client";

export default async function CategoriesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!can(session, "manage_master_data", "category")) redirect("/dashboard");

  const { categories } = await getCategories({ take: 100 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-h1 font-bold text-ink">Category Management</h1>
        <p className="text-text-muted text-body mt-1">Manage motorcycle categories</p>
      </div>
      <CategoriesClient initialCategories={categories} />
    </div>
  );
}
