import { getEmployees } from "@/modules/employee/employee.actions";
import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { EmployeesClient } from "./_components/employees-client";

export default async function EmployeesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!can(session, "manage_master_data", "employee")) redirect("/dashboard");

  const { employees } = await getEmployees({ take: 100 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-h1 font-bold text-ink">Employee Management</h1>
        <p className="text-text-muted text-body mt-1">Manage employees and user accounts</p>
      </div>
      <EmployeesClient initialEmployees={employees} />
    </div>
  );
}
