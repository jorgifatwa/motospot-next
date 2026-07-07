"use client";

import { useState, useEffect, useCallback } from "react";
import {
  createMotorcycle,
  updateMotorcycle,
  deleteMotorcycle,
  restoreMotorcycle,
  getMotorcycles,
} from "@/modules/motorcycle/motorcycle.actions";
import {
  deleteMotorImage,
  setMainMotorImage,
  uploadMotorcycleImage,
} from "@/modules/motorcycle/motorimage.actions";

interface Motorcycle {
  id: string;
  brandId: string;
  categoryId: string;
  branchId: string;
  licensePlate: string;
  chassisNumber: string;
  engineNumber: string;
  mileage: number;
  taxExpiration: Date | null;
  purchasePrice: string;
  openPrice: string;
  sellingPrice: string;
  color: string | null;
  originalPartsInfo: string | null;
  instagramLink: string | null;
  operationalStatus: "AVAILABLE" | "MAINTENANCE";
  salesStatus: "AVAILABLE" | "BOOKED" | "SOLD";
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  brand: { id: string; name: string };
  category: { id: string; name: string };
  branch: { id: string; name: string };
  images: Array<{
    id: string;
    path: string;
    isMain: boolean;
    sortOrder: number;
  }>;
}

interface Brand {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
}

interface Branch {
  id: string;
  name: string;
}

interface MotorcyclesClientProps {
  initialMotorcycles: Motorcycle[];
  brands: Brand[];
  categories: Category[];
  branches: Branch[];
  userBranchId?: string;
  isAdmin: boolean;
  initialFilters?: {
    branchId?: string;
    brandId?: string;
    categoryId?: string;
    operationalStatus?: string;
    salesStatus?: string;
  };
}

export function MotorcyclesClient({
  initialMotorcycles,
  brands,
  categories,
  branches,
  userBranchId,
  isAdmin,
  initialFilters,
}: MotorcyclesClientProps) {
  const [motorcycles, setMotorcycles] = useState<Motorcycle[]>(initialMotorcycles);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMotorcycle, setEditingMotorcycle] = useState<Motorcycle | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [uploadingImages, setUploadingImages] = useState(false);

  // Filters (initialized from URL search params passed by the server page)
  const [search, setSearch] = useState("");
  const [filterBranchId, setFilterBranchId] = useState(
    initialFilters?.branchId ?? userBranchId ?? "",
  );
  const [filterBrandId, setFilterBrandId] = useState(initialFilters?.brandId ?? "");
  const [filterCategoryId, setFilterCategoryId] = useState(initialFilters?.categoryId ?? "");
  const [filterOperationalStatus, setFilterOperationalStatus] = useState(
    initialFilters?.operationalStatus ?? "",
  );
  const [filterSalesStatus, setFilterSalesStatus] = useState(initialFilters?.salesStatus ?? "");

  // Form state
  const [formData, setFormData] = useState({
    brandId: "",
    categoryId: "",
    branchId: userBranchId || "",
    licensePlate: "",
    chassisNumber: "",
    engineNumber: "",
    mileage: 0,
    taxExpiration: "",
    purchasePrice: "",
    openPrice: "",
    sellingPrice: "",
    color: "",
    originalPartsInfo: "",
    instagramLink: "",
    operationalStatus: "AVAILABLE" as "AVAILABLE" | "MAINTENANCE",
    salesStatus: "AVAILABLE" as "AVAILABLE" | "BOOKED" | "SOLD",
  });

  const [selectedImages, setSelectedImages] = useState<FileList | null>(null);
  const [imagePreview, setImagePreview] = useState<string[]>([]);

  // Fetch motorcycles with filters (used by form handlers / image actions)
  const fetchMotorcycles = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await getMotorcycles({
        search: search || undefined,
        branchId: filterBranchId || undefined,
        brandId: filterBrandId || undefined,
        categoryId: filterCategoryId || undefined,
        operationalStatus: filterOperationalStatus as "AVAILABLE" | "MAINTENANCE" | undefined,
        salesStatus: filterSalesStatus as "AVAILABLE" | "BOOKED" | "SOLD" | undefined,
        take: 50,
      });
      setMotorcycles(result.motorcycles);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch motorcycles");
    } finally {
      setLoading(false);
    }
  }, [
    search,
    filterBranchId,
    filterBrandId,
    filterCategoryId,
    filterOperationalStatus,
    filterSalesStatus,
  ]);

  // Data fetching on mount and whenever filters change.
  // State is only updated inside the async callback (after `await`), which is the
  // React-recommended pattern for syncing with an external system and avoids
  // calling setState synchronously within the effect body.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const result = await getMotorcycles({
          search: search || undefined,
          branchId: filterBranchId || undefined,
          brandId: filterBrandId || undefined,
          categoryId: filterCategoryId || undefined,
          operationalStatus: filterOperationalStatus as "AVAILABLE" | "MAINTENANCE" | undefined,
          salesStatus: filterSalesStatus as "AVAILABLE" | "BOOKED" | "SOLD" | undefined,
          take: 50,
        });
        if (!active) return;
        setMotorcycles(result.motorcycles);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch motorcycles");
      }
    })();
    return () => {
      active = false;
    };
  }, [
    search,
    filterBranchId,
    filterBrandId,
    filterCategoryId,
    filterOperationalStatus,
    filterSalesStatus,
  ]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await createMotorcycle(formData);

      // Handle image uploads
      if (selectedImages && selectedImages.length > 0) {
        setUploadingImages(true);
        for (let i = 0; i < selectedImages.length; i++) {
          const file = selectedImages[i];
          const isMain = i === 0; // First image is main
          await uploadMotorcycleImage(result.id, file, isMain);
        }
        setUploadingImages(false);
      }

      await fetchMotorcycles();
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create motorcycle");
    } finally {
      setLoading(false);
      setUploadingImages(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMotorcycle) return;
    setLoading(true);
    setError("");
    try {
      const result = await updateMotorcycle(editingMotorcycle.id, formData);

      // Handle new image uploads
      if (selectedImages && selectedImages.length > 0) {
        setUploadingImages(true);
        for (let i = 0; i < selectedImages.length; i++) {
          const file = selectedImages[i];
          const isMain = i === 0 && !editingMotorcycle.images.some((img) => img.isMain);
          await uploadMotorcycleImage(result.id, file, isMain);
        }
        setUploadingImages(false);
      }

      await fetchMotorcycles();
      setIsModalOpen(false);
      setEditingMotorcycle(null);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update motorcycle");
    } finally {
      setLoading(false);
      setUploadingImages(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this motorcycle? This action can be undone.")) return;
    setLoading(true);
    setError("");
    try {
      await deleteMotorcycle(id);
      setMotorcycles(motorcycles.map((m) => (m.id === id ? { ...m, deletedAt: new Date() } : m)));
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
      await restoreMotorcycle(id);
      setMotorcycles(motorcycles.map((m) => (m.id === id ? { ...m, deletedAt: null } : m)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to restore");
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setSelectedImages(files);
      // Create previews
      const previews: string[] = [];
      Array.from(files).forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            previews.push(e.target.result as string);
            setImagePreview([...previews]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!confirm("Delete this image?")) return;
    try {
      await deleteMotorImage(imageId);
      await fetchMotorcycles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete image");
    }
  };

  const handleSetMainImage = async (imageId: string, motorcycleId: string) => {
    try {
      await setMainMotorImage(imageId, motorcycleId);
      await fetchMotorcycles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set main image");
    }
  };

  const openCreateModal = () => {
    resetForm();
    setEditingMotorcycle(null);
    setIsModalOpen(true);
  };

  const openEditModal = (motorcycle: Motorcycle) => {
    setEditingMotorcycle(motorcycle);
    setFormData({
      brandId: motorcycle.brandId,
      categoryId: motorcycle.categoryId,
      branchId: motorcycle.branchId,
      licensePlate: motorcycle.licensePlate,
      chassisNumber: motorcycle.chassisNumber,
      engineNumber: motorcycle.engineNumber,
      mileage: motorcycle.mileage,
      taxExpiration: motorcycle.taxExpiration
        ? motorcycle.taxExpiration.toISOString().split("T")[0]
        : "",
      purchasePrice: motorcycle.purchasePrice,
      openPrice: motorcycle.openPrice,
      sellingPrice: motorcycle.sellingPrice,
      color: motorcycle.color || "",
      originalPartsInfo: motorcycle.originalPartsInfo || "",
      instagramLink: motorcycle.instagramLink || "",
      operationalStatus: motorcycle.operationalStatus,
      salesStatus: motorcycle.salesStatus,
    });
    setSelectedImages(null);
    setImagePreview([]);
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      brandId: "",
      categoryId: "",
      branchId: userBranchId || "",
      licensePlate: "",
      chassisNumber: "",
      engineNumber: "",
      mileage: 0,
      taxExpiration: "",
      purchasePrice: "",
      openPrice: "",
      sellingPrice: "",
      color: "",
      originalPartsInfo: "",
      instagramLink: "",
      operationalStatus: "AVAILABLE",
      salesStatus: "AVAILABLE",
    });
    setSelectedImages(null);
    setImagePreview([]);
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      AVAILABLE: "bg-status-ok text-white",
      MAINTENANCE: "bg-status-maintenance text-white",
      BOOKED: "bg-status-booked text-white",
      SOLD: "bg-status-sold text-white",
    };
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || "bg-gray-100 text-gray-700"}`}
      >
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-ink">Motorcycles</h2>
        {isAdmin && (
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-brand-red text-white rounded-md hover:bg-brand-red-dark"
          >
            Add Motorcycle
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700">{error}</div>
      )}

      {/* Filters */}
      <div className="bg-surface border border-border rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2 border border-border rounded-md"
          />
          {isAdmin && (
            <select
              value={filterBranchId}
              onChange={(e) => setFilterBranchId(e.target.value)}
              className="px-4 py-2 border border-border rounded-md"
            >
              <option value="">All Branches</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          )}
          <select
            value={filterBrandId}
            onChange={(e) => setFilterBrandId(e.target.value)}
            className="px-4 py-2 border border-border rounded-md"
          >
            <option value="">All Brands</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </select>
          <select
            value={filterCategoryId}
            onChange={(e) => setFilterCategoryId(e.target.value)}
            className="px-4 py-2 border border-border rounded-md"
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <select
            value={filterOperationalStatus}
            onChange={(e) => setFilterOperationalStatus(e.target.value)}
            className="px-4 py-2 border border-border rounded-md"
          >
            <option value="">All Operational</option>
            <option value="AVAILABLE">Available</option>
            <option value="MAINTENANCE">Maintenance</option>
          </select>
          <select
            value={filterSalesStatus}
            onChange={(e) => setFilterSalesStatus(e.target.value)}
            className="px-4 py-2 border border-border rounded-md"
          >
            <option value="">All Sales</option>
            <option value="AVAILABLE">Available</option>
            <option value="BOOKED">Booked</option>
            <option value="SOLD">Sold</option>
          </select>
        </div>
      </div>

      {/* Motorcycle Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {motorcycles.length === 0 ? (
          <div className="col-span-full text-center py-12 text-text-muted">
            No motorcycles found
          </div>
        ) : (
          motorcycles.map((motorcycle) => {
            const mainImage = motorcycle.images.find((img) => img.isMain) || motorcycle.images[0];

            return (
              <div
                key={motorcycle.id}
                className="bg-surface border border-border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
              >
                {/* Main Image */}
                <div className="relative aspect-video bg-bg">
                  {mainImage ? (
                    <img
                      src={`/${mainImage.path}`}
                      alt={`${motorcycle.brand.name} ${motorcycle.category.name}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-text-muted">
                      No Image
                    </div>
                  )}
                  {/* Status Badges */}
                  <div className="absolute top-2 right-2 flex flex-col gap-1">
                    {getStatusBadge(motorcycle.operationalStatus)}
                    {getStatusBadge(motorcycle.salesStatus)}
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="text-h2 font-bold mb-1">
                    {motorcycle.brand.name} {motorcycle.category.name}
                  </h3>
                  <p className="text-sm text-text-muted mb-2">{motorcycle.licensePlate}</p>
                  <p className="text-sm text-text-muted mb-3">{motorcycle.branch.name}</p>

                  {/* Price */}
                  <div className="mb-3">
                    <p className="text-2xl font-bold text-ink font-display">
                      Rp {parseInt(motorcycle.sellingPrice).toLocaleString("id-ID")}
                    </p>
                  </div>

                  {/* Details */}
                  <div className="text-sm space-y-1 mb-4">
                    <p>
                      <span className="text-text-muted">Engine:</span> {motorcycle.engineNumber}
                    </p>
                    <p>
                      <span className="text-text-muted">Mileage:</span>{" "}
                      {motorcycle.mileage.toLocaleString()} km
                    </p>
                    {motorcycle.color && (
                      <p>
                        <span className="text-text-muted">Color:</span> {motorcycle.color}
                      </p>
                    )}
                  </div>

                  {/* Gallery Count */}
                  {motorcycle.images.length > 0 && (
                    <p className="text-xs text-text-muted mb-3">
                      {motorcycle.images.length} image{motorcycle.images.length > 1 ? "s" : ""}
                    </p>
                  )}

                  {/* Actions */}
                  {!motorcycle.deletedAt ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditModal(motorcycle)}
                        className="flex-1 px-3 py-2 bg-brand-red text-white rounded-md hover:bg-brand-red-dark text-sm"
                      >
                        Edit
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(motorcycle.id)}
                          className="px-3 py-2 border border-border rounded-md hover:bg-bg text-sm"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => handleRestore(motorcycle.id)}
                      className="w-full px-3 py-2 border border-border rounded-md hover:bg-bg text-sm"
                    >
                      Restore
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-surface border border-border rounded-lg p-6 w-full max-w-4xl my-8">
            <h2 className="text-h1 font-bold mb-4">
              {editingMotorcycle ? "Edit Motorcycle" : "Add Motorcycle"}
            </h2>
            <form onSubmit={editingMotorcycle ? handleUpdate : handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Brand */}
                <div>
                  <label className="block text-body-medium font-medium mb-2">Brand *</label>
                  <select
                    value={formData.brandId}
                    onChange={(e) => setFormData({ ...formData, brandId: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-border rounded-md"
                  >
                    <option value="">Select Brand</option>
                    {brands.map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-body-medium font-medium mb-2">Category *</label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-border rounded-md"
                  >
                    <option value="">Select Category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Branch */}
                {isAdmin && (
                  <div>
                    <label className="block text-body-medium font-medium mb-2">Branch *</label>
                    <select
                      value={formData.branchId}
                      onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-border rounded-md"
                    >
                      <option value="">Select Branch</option>
                      {branches.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* License Plate */}
                <div>
                  <label className="block text-body-medium font-medium mb-2">License Plate *</label>
                  <input
                    type="text"
                    value={formData.licensePlate}
                    onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value })}
                    required
                    maxLength={20}
                    className="w-full px-4 py-2 border border-border rounded-md"
                  />
                </div>

                {/* Chassis Number */}
                <div>
                  <label className="block text-body-medium font-medium mb-2">
                    Chassis Number *
                  </label>
                  <input
                    type="text"
                    value={formData.chassisNumber}
                    onChange={(e) => setFormData({ ...formData, chassisNumber: e.target.value })}
                    required
                    maxLength={50}
                    className="w-full px-4 py-2 border border-border rounded-md"
                  />
                </div>

                {/* Engine Number */}
                <div>
                  <label className="block text-body-medium font-medium mb-2">Engine Number *</label>
                  <input
                    type="text"
                    value={formData.engineNumber}
                    onChange={(e) => setFormData({ ...formData, engineNumber: e.target.value })}
                    required
                    maxLength={50}
                    className="w-full px-4 py-2 border border-border rounded-md"
                  />
                </div>

                {/* Mileage */}
                <div>
                  <label className="block text-body-medium font-medium mb-2">Mileage (km) *</label>
                  <input
                    type="number"
                    value={formData.mileage}
                    onChange={(e) =>
                      setFormData({ ...formData, mileage: parseInt(e.target.value) || 0 })
                    }
                    required
                    min="0"
                    className="w-full px-4 py-2 border border-border rounded-md"
                  />
                </div>

                {/* Tax Expiration */}
                <div>
                  <label className="block text-body-medium font-medium mb-2">Tax Expiration</label>
                  <input
                    type="date"
                    value={formData.taxExpiration}
                    onChange={(e) => setFormData({ ...formData, taxExpiration: e.target.value })}
                    className="w-full px-4 py-2 border border-border rounded-md"
                  />
                </div>

                {/* Purchase Price */}
                <div>
                  <label className="block text-body-medium font-medium mb-2">
                    Purchase Price (Rp) *
                  </label>
                  <input
                    type="text"
                    value={formData.purchasePrice}
                    onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-border rounded-md"
                  />
                </div>

                {/* Open Price */}
                <div>
                  <label className="block text-body-medium font-medium mb-2">
                    Open Price (Rp) *
                  </label>
                  <input
                    type="text"
                    value={formData.openPrice}
                    onChange={(e) => setFormData({ ...formData, openPrice: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-border rounded-md"
                  />
                </div>

                {/* Selling Price */}
                <div>
                  <label className="block text-body-medium font-medium mb-2">
                    Selling Price (Rp) *
                  </label>
                  <input
                    type="text"
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-border rounded-md"
                  />
                </div>

                {/* Color */}
                <div>
                  <label className="block text-body-medium font-medium mb-2">Color</label>
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    maxLength={50}
                    className="w-full px-4 py-2 border border-border rounded-md"
                  />
                </div>

                {/* Original Parts Info */}
                <div className="md:col-span-2">
                  <label className="block text-body-medium font-medium mb-2">
                    Original Parts Information
                  </label>
                  <textarea
                    value={formData.originalPartsInfo}
                    onChange={(e) =>
                      setFormData({ ...formData, originalPartsInfo: e.target.value })
                    }
                    maxLength={255}
                    rows={2}
                    className="w-full px-4 py-2 border border-border rounded-md"
                  />
                </div>

                {/* Instagram Link */}
                <div className="md:col-span-2">
                  <label className="block text-body-medium font-medium mb-2">Instagram Link</label>
                  <input
                    type="url"
                    value={formData.instagramLink}
                    onChange={(e) => setFormData({ ...formData, instagramLink: e.target.value })}
                    className="w-full px-4 py-2 border border-border rounded-md"
                  />
                </div>

                {/* Operational Status */}
                <div>
                  <label className="block text-body-medium font-medium mb-2">
                    Operational Status *
                  </label>
                  <select
                    value={formData.operationalStatus}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        operationalStatus: e.target.value as "AVAILABLE" | "MAINTENANCE",
                      })
                    }
                    required
                    className="w-full px-4 py-2 border border-border rounded-md"
                  >
                    <option value="AVAILABLE">Available</option>
                    <option value="MAINTENANCE">Maintenance</option>
                  </select>
                </div>

                {/* Sales Status */}
                <div>
                  <label className="block text-body-medium font-medium mb-2">Sales Status *</label>
                  <select
                    value={formData.salesStatus}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        salesStatus: e.target.value as "AVAILABLE" | "BOOKED" | "SOLD",
                      })
                    }
                    required
                    className="w-full px-4 py-2 border border-border rounded-md"
                  >
                    <option value="AVAILABLE">Available</option>
                    <option value="BOOKED">Booked</option>
                    <option value="SOLD">Sold</option>
                  </select>
                </div>
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-body-medium font-medium mb-2">
                  Images (JPEG, PNG, WebP - Max 5MB each)
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handleImageChange}
                  className="w-full px-4 py-2 border border-border rounded-md"
                />
                {imagePreview.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {imagePreview.map((preview, index) => (
                      <img
                        key={index}
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-24 object-cover rounded"
                      />
                    ))}
                  </div>
                )}
                {editingMotorcycle && editingMotorcycle.images.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium mb-2">Current Images:</p>
                    <div className="grid grid-cols-4 gap-2">
                      {editingMotorcycle.images.map((image) => (
                        <div key={image.id} className="relative">
                          <img
                            src={`/${image.path}`}
                            alt="Motorcycle"
                            className="w-full h-24 object-cover rounded"
                          />
                          <div className="absolute top-1 right-1 flex gap-1">
                            <button
                              type="button"
                              onClick={() => handleSetMainImage(image.id, editingMotorcycle.id)}
                              className={`px-2 py-1 text-xs rounded ${image.isMain ? "bg-green-500 text-white" : "bg-white text-ink"}`}
                            >
                              {image.isMain ? "Main" : "Set Main"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteImage(image.id)}
                              className="px-2 py-1 bg-red-500 text-white text-xs rounded"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingMotorcycle(null);
                    resetForm();
                  }}
                  disabled={loading}
                  className="flex-1 px-4 py-2 border border-border rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || uploadingImages}
                  className="flex-1 px-4 py-2 bg-brand-red text-white rounded-md hover:bg-brand-red-dark"
                >
                  {loading || uploadingImages
                    ? "Saving..."
                    : editingMotorcycle
                      ? "Update"
                      : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
