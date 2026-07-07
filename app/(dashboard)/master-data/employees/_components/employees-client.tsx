"use client";

import { useState } from "react";
import {
  createEmployee,
  updateEmployee,
  deleteEmployee,
  restoreEmployee,
} from "@/modules/employee/employee.actions";

interface Employee {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  branchId: string;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    role: string;
  } | null;
}

interface EmployeesClientProps {
  initialEmployees: Employee[];
}

export function EmployeesClient({ initialEmployees }: EmployeesClientProps) {
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleCreate = async (data: any) => {
    setLoading(true);
    setError("");
    try {
      const result = await createEmployee(data);
      setEmployees([result, ...employees]);
      setIsModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create employee");
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleUpdate = async (data: any) => {
    if (!editingEmployee) return;
    setLoading(true);
    setError("");
    try {
      const result = await updateEmployee(editingEmployee.id, data);
      // Merge result with existing employee data to preserve user relation
      setEmployees(employees.map((e) => (e.id === editingEmployee.id ? { ...e, ...result } : e)));
      setEditingEmployee(null);
      setIsModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update employee");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this employee? This will also deactivate their user account.")) return;
    setLoading(true);
    setError("");
    try {
      await deleteEmployee(id);
      setEmployees(employees.map((e) => (e.id === id ? { ...e, deletedAt: new Date() } : e)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (id: string) => {
    setLoading(true);
    setError("");
    try {
      await restoreEmployee(id);
      setEmployees(employees.map((e) => (e.id === id ? { ...e, deletedAt: null } : e)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to restore");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-ink">Employees</h2>
        <button
          onClick={() => {
            setEditingEmployee(null);
            setIsModalOpen(true);
          }}
          className="px-4 py-2 bg-brand-red text-white rounded-md hover:bg-brand-red-dark"
        >
          Add Employee
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700">{error}</div>
      )}

      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-bg border-b border-border">
            <tr>
              <th className="px-6 py-3 text-left text-body-medium font-semibold">Name</th>
              <th className="px-6 py-3 text-left text-body-medium font-semibold">Email</th>
              <th className="px-6 py-3 text-left text-body-medium font-semibold">Role</th>
              <th className="px-6 py-3 text-left text-body-medium font-semibold">Status</th>
              <th className="px-6 py-3 text-right text-body-medium font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {employees.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-text-muted">
                  No employees found
                </td>
              </tr>
            ) : (
              employees.map((employee) => (
                <tr key={employee.id} className="hover:bg-bg">
                  <td className="px-6 py-4 font-medium">{employee.name}</td>
                  <td className="px-6 py-4 text-text-muted">{employee.email || "—"}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700">
                      {employee.user?.role || "N/A"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${employee.deletedAt ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}
                    >
                      {employee.deletedAt ? "Deleted" : "Active"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    {!employee.deletedAt ? (
                      <>
                        <button
                          onClick={() => {
                            setEditingEmployee(employee);
                            setIsModalOpen(true);
                          }}
                          className="text-brand-red hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(employee.id)}
                          className="text-status-cancelled hover:underline"
                        >
                          Delete
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleRestore(employee.id)}
                        className="text-status-confirmed hover:underline"
                      >
                        Restore
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <EmployeeModal
          employee={editingEmployee}
          onClose={() => {
            setIsModalOpen(false);
            setEditingEmployee(null);
          }}
          onSubmit={editingEmployee ? handleUpdate : handleCreate}
          loading={loading}
        />
      )}
    </div>
  );
}

interface EmployeeModalProps {
  employee: Employee | null;
  onClose: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSubmit: (data: any) => Promise<void>;
  loading: boolean;
}

function EmployeeModal({ employee, onClose, onSubmit, loading }: EmployeeModalProps) {
  const [name, setName] = useState(employee?.name || "");
  const [email, setEmail] = useState(employee?.email || "");
  const [phone, setPhone] = useState(employee?.phone || "");
  const [address, setAddress] = useState(employee?.address || "");
  const [branchId, setBranchId] = useState(employee?.branchId || "");
  const [role, setRole] = useState<"ADMIN" | "CASHIER">(
    employee?.user?.role === "CASHIER" ? "CASHIER" : "ADMIN",
  );
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {
      name,
      email: email || null,
      phone: phone || null,
      address: address || null,
      branchId,
      role,
    };
    if (!employee && password) data.password = password;
    onSubmit(data);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface border border-border rounded-lg p-6 w-full max-w-md">
        <h2 className="text-h1 font-bold mb-4">{employee ? "Edit Employee" : "Add Employee"}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-body-medium font-medium mb-2">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-2 border border-border rounded-md"
            />
          </div>
          <div>
            <label className="block text-body-medium font-medium mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-border rounded-md"
            />
          </div>
          <div>
            <label className="block text-body-medium font-medium mb-2">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-2 border border-border rounded-md"
            />
          </div>
          <div>
            <label className="block text-body-medium font-medium mb-2">Address</label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={2}
              className="w-full px-4 py-2 border border-border rounded-md"
            />
          </div>
          <div>
            <label className="block text-body-medium font-medium mb-2">Branch</label>
            <input
              type="text"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              required
              className="w-full px-4 py-2 border border-border rounded-md"
            />
          </div>
          <div>
            <label className="block text-body-medium font-medium mb-2">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "ADMIN" | "CASHIER")}
              className="w-full px-4 py-2 border border-border rounded-md"
            >
              <option value="ADMIN">ADMIN</option>
              <option value="CASHIER">CASHIER</option>
            </select>
          </div>
          {!employee && (
            <div>
              <label className="block text-body-medium font-medium mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={10}
                className="w-full px-4 py-2 border border-border rounded-md"
              />
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-border rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-brand-red text-white rounded-md hover:bg-brand-red-dark"
            >
              {loading ? "Saving..." : employee ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
