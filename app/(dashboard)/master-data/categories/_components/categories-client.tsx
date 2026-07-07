"use client";

import { useState } from "react";
import {
  createCategory,
  updateCategory,
  deleteCategory,
  restoreCategory,
} from "@/modules/category/category.actions";

interface Category {
  id: string;
  name: string;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface CategoriesClientProps {
  initialCategories: Category[];
}

export function CategoriesClient({ initialCategories }: CategoriesClientProps) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async (data: { name: string }) => {
    setLoading(true);
    setError("");
    try {
      const result = await createCategory(data);
      setCategories([result, ...categories]);
      setIsModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create category");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (data: { name: string }) => {
    if (!editingCategory) return;
    setLoading(true);
    setError("");
    try {
      const result = await updateCategory(editingCategory.id, data);
      setCategories(categories.map((c) => (c.id === editingCategory.id ? result : c)));
      setEditingCategory(null);
      setIsModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update category");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this category?")) return;
    setLoading(true);
    setError("");
    try {
      await deleteCategory(id);
      setCategories(categories.map((c) => (c.id === id ? { ...c, deletedAt: new Date() } : c)));
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
      await restoreCategory(id);
      setCategories(categories.map((c) => (c.id === id ? { ...c, deletedAt: null } : c)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to restore");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-ink">Categories</h2>
        <button
          onClick={() => {
            setEditingCategory(null);
            setIsModalOpen(true);
          }}
          className="px-4 py-2 bg-brand-red text-white rounded-md hover:bg-brand-red-dark"
        >
          Add Category
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
              <th className="px-6 py-3 text-left text-body-medium font-semibold">Status</th>
              <th className="px-6 py-3 text-right text-body-medium font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {categories.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-text-muted">
                  No categories found
                </td>
              </tr>
            ) : (
              categories.map((category) => (
                <tr key={category.id} className="hover:bg-bg">
                  <td className="px-6 py-4 font-medium">{category.name}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${category.deletedAt ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}
                    >
                      {category.deletedAt ? "Deleted" : "Active"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    {!category.deletedAt ? (
                      <>
                        <button
                          onClick={() => {
                            setEditingCategory(category);
                            setIsModalOpen(true);
                          }}
                          className="text-brand-red hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(category.id)}
                          className="text-status-cancelled hover:underline"
                        >
                          Delete
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleRestore(category.id)}
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
        <CategoryModal
          category={editingCategory}
          onClose={() => {
            setIsModalOpen(false);
            setEditingCategory(null);
          }}
          onSubmit={editingCategory ? handleUpdate : handleCreate}
          loading={loading}
        />
      )}
    </div>
  );
}

interface CategoryModalProps {
  category: Category | null;
  onClose: () => void;
  onSubmit: (data: { name: string }) => Promise<void>;
  loading: boolean;
}

function CategoryModal({ category, onClose, onSubmit, loading }: CategoryModalProps) {
  const [name, setName] = useState(category?.name || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface border border-border rounded-lg p-6 w-full max-w-md">
        <h2 className="text-h1 font-bold mb-4">{category ? "Edit Category" : "Add Category"}</h2>
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
              {loading ? "Saving..." : category ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
