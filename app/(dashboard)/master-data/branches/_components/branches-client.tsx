// ────────────────────────────────
// Branches Client Component
// ────────────────────────────────

"use client";

import { useState } from "react";
import {
  createBranch,
  updateBranch,
  deleteBranch,
  restoreBranch,
} from "@/modules/branch/branch.actions";

interface Branch {
  id: string;
  name: string;
  address: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface BranchesClientProps {
  initialBranches: Branch[];
}

export function BranchesClient({ initialBranches }: BranchesClientProps) {
  const [branches, setBranches] = useState<Branch[]>(initialBranches);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async (data: { name: string; address?: string }) => {
    setLoading(true);
    setError("");
    try {
      const result = await createBranch(data);
      setBranches([result, ...branches]);
      setIsModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create branch");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (data: { name: string; address?: string }) => {
    if (!editingBranch) return;
    setLoading(true);
    setError("");
    try {
      const result = await updateBranch(editingBranch.id, data);
      setBranches(branches.map((b) => (b.id === editingBranch.id ? result : b)));
      setEditingBranch(null);
      setIsModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update branch");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this branch?")) return;
    setLoading(true);
    setError("");
    try {
      await deleteBranch(id);
      setBranches(branches.map((b) => (b.id === id ? { ...b, deletedAt: new Date() } : b)));
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
      await restoreBranch(id);
      setBranches(branches.map((b) => (b.id === id ? { ...b, deletedAt: null } : b)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to restore");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-ink">Branches</h2>
        <button
          onClick={() => {
            setEditingBranch(null);
            setIsModalOpen(true);
          }}
          className="px-4 py-2 bg-brand-red text-white rounded-md hover:bg-brand-red-dark"
        >
          Add Branch
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
              <th className="px-6 py-3 text-left text-body-medium font-semibold">Address</th>
              <th className="px-6 py-3 text-left text-body-medium font-semibold">Status</th>
              <th className="px-6 py-3 text-right text-body-medium font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {branches.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-text-muted">
                  No branches found
                </td>
              </tr>
            ) : (
              branches.map((branch) => (
                <tr key={branch.id} className="hover:bg-bg">
                  <td className="px-6 py-4 font-medium">{branch.name}</td>
                  <td className="px-6 py-4 text-text-muted">{branch.address || "—"}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${branch.deletedAt ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}
                    >
                      {branch.deletedAt ? "Deleted" : "Active"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    {!branch.deletedAt ? (
                      <>
                        <button
                          onClick={() => {
                            setEditingBranch(branch);
                            setIsModalOpen(true);
                          }}
                          className="text-brand-red hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(branch.id)}
                          className="text-status-cancelled hover:underline"
                        >
                          Delete
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleRestore(branch.id)}
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
        <BranchModal
          branch={editingBranch}
          onClose={() => {
            setIsModalOpen(false);
            setEditingBranch(null);
          }}
          onSubmit={editingBranch ? handleUpdate : handleCreate}
          loading={loading}
        />
      )}
    </div>
  );
}

interface BranchModalProps {
  branch: Branch | null;
  onClose: () => void;
  onSubmit: (data: { name: string; address?: string }) => Promise<void>;
  loading: boolean;
}

function BranchModal({ branch, onClose, onSubmit, loading }: BranchModalProps) {
  const [name, setName] = useState(branch?.name || "");
  const [address, setAddress] = useState(branch?.address || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name, address: address || undefined });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface border border-border rounded-lg p-6 w-full max-w-md">
        <h2 className="text-h1 font-bold mb-4">{branch ? "Edit Branch" : "Add Branch"}</h2>
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
            <label className="block text-body-medium font-medium mb-2">Address</label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-border rounded-md"
            />
          </div>
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
              {loading ? "Saving..." : branch ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
