"use client";

import { useState } from "react";
import { createBrand, updateBrand, deleteBrand, restoreBrand } from "@/modules/brand/brand.actions";

interface Brand {
  id: string;
  name: string;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface BrandsClientProps {
  initialBrands: Brand[];
}

export function BrandsClient({ initialBrands }: BrandsClientProps) {
  const [brands, setBrands] = useState<Brand[]>(initialBrands);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async (data: { name: string }) => {
    setLoading(true);
    setError("");
    try {
      const result = await createBrand(data);
      setBrands([result, ...brands]);
      setIsModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create brand");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (data: { name: string }) => {
    if (!editingBrand) return;
    setLoading(true);
    setError("");
    try {
      const result = await updateBrand(editingBrand.id, data);
      setBrands(brands.map((b) => (b.id === editingBrand.id ? result : b)));
      setEditingBrand(null);
      setIsModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update brand");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this brand?")) return;
    setLoading(true);
    setError("");
    try {
      await deleteBrand(id);
      setBrands(brands.map((b) => (b.id === id ? { ...b, deletedAt: new Date() } : b)));
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
      await restoreBrand(id);
      setBrands(brands.map((b) => (b.id === id ? { ...b, deletedAt: null } : b)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to restore");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-ink">Brands</h2>
        <button
          onClick={() => {
            setEditingBrand(null);
            setIsModalOpen(true);
          }}
          className="px-4 py-2 bg-brand-red text-white rounded-md hover:bg-brand-red-dark"
        >
          Add Brand
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
            {brands.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-text-muted">
                  No brands found
                </td>
              </tr>
            ) : (
              brands.map((brand) => (
                <tr key={brand.id} className="hover:bg-bg">
                  <td className="px-6 py-4 font-medium">{brand.name}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${brand.deletedAt ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}
                    >
                      {brand.deletedAt ? "Deleted" : "Active"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    {!brand.deletedAt ? (
                      <>
                        <button
                          onClick={() => {
                            setEditingBrand(brand);
                            setIsModalOpen(true);
                          }}
                          className="text-brand-red hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(brand.id)}
                          className="text-status-cancelled hover:underline"
                        >
                          Delete
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleRestore(brand.id)}
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
        <BrandModal
          brand={editingBrand}
          onClose={() => {
            setIsModalOpen(false);
            setEditingBrand(null);
          }}
          onSubmit={editingBrand ? handleUpdate : handleCreate}
          loading={loading}
        />
      )}
    </div>
  );
}

interface BrandModalProps {
  brand: Brand | null;
  onClose: () => void;
  onSubmit: (data: { name: string }) => Promise<void>;
  loading: boolean;
}

function BrandModal({ brand, onClose, onSubmit, loading }: BrandModalProps) {
  const [name, setName] = useState(brand?.name || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface border border-border rounded-lg p-6 w-full max-w-md">
        <h2 className="text-h1 font-bold mb-4">{brand ? "Edit Brand" : "Add Brand"}</h2>
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
              {loading ? "Saving..." : brand ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
