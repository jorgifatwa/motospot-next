"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createTransaction } from "@/modules/transaction/transaction.actions";
import { createCustomer } from "@/modules/customer/customer.actions";

interface Motorcycle {
  id: string;
  brandId: string;
  categoryId: string;
  branchId: string;
  licensePlate: string;
  sellingPrice: string;
  salesStatus: "AVAILABLE" | "BOOKED" | "SOLD";
  brand: { id: string; name: string };
  category: { id: string; name: string };
  branch: { id: string; name: string };
  images: Array<{ id: string; path: string; isMain: boolean }>;
}

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
}

interface Branch {
  id: string;
  name: string;
}

interface Props {
  availableMotorcycles: Motorcycle[];
  customers: Customer[];
  branches: Branch[];
  userBranchId?: string;
  isAdmin: boolean;
}

interface CartItem {
  motorcycleId: string;
  priceAtSale: string;
}

export function CreateTransactionClient({
  availableMotorcycles,
  customers,
  branches,
  userBranchId,
  isAdmin,
}: Props) {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerEmail, setNewCustomerEmail] = useState("");
  const [status, setStatus] = useState<"SALE" | "BOOKING">("SALE");
  const [branchId, setBranchId] = useState(userBranchId || "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Cashier is locked to their own branch; Admin may pick.
  const effectiveBranchId = isAdmin ? branchId : userBranchId || "";

  const filteredMotorcycles = useMemo(() => {
    const q = search.toLowerCase();
    return availableMotorcycles.filter((m) => {
      if (effectiveBranchId && m.branchId !== effectiveBranchId) return false;
      if (!q) return true;
      return (
        m.licensePlate.toLowerCase().includes(q) ||
        m.brand.name.toLowerCase().includes(q) ||
        m.category.name.toLowerCase().includes(q)
      );
    });
  }, [availableMotorcycles, search, effectiveBranchId]);

  const cartMotorcycles = cart
    .map((c) => availableMotorcycles.find((m) => m.id === c.motorcycleId))
    .filter((m): m is Motorcycle => Boolean(m));

  const total = cartMotorcycles.reduce((sum, m) => sum + (parseInt(m.sellingPrice, 10) || 0), 0);

  const inCart = (id: string) => cart.some((c) => c.motorcycleId === id);

  const addToCart = (m: Motorcycle) => {
    if (inCart(m.id)) return;
    setCart((prev) => [...prev, { motorcycleId: m.id, priceAtSale: m.sellingPrice }]);
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((c) => c.motorcycleId !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (cart.length === 0) throw new Error("Add at least one motorcycle to the cart");
      if (!effectiveBranchId) throw new Error("Branch is required");

      let finalCustomerId = customerId;
      if (!finalCustomerId) {
        if (!newCustomerName.trim()) throw new Error("Customer name is required");
        const created = await createCustomer({
          name: newCustomerName.trim(),
          phone: newCustomerPhone || null,
          email: newCustomerEmail || null,
          address: null,
        });
        finalCustomerId = created.id;
      }

      await createTransaction({
        customerId: finalCustomerId,
        branchId: effectiveBranchId,
        status,
        items: cart,
      });

      router.push("/dashboard/transactions");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create transaction");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (s: string) => {
    const colors: Record<string, string> = {
      AVAILABLE: "bg-status-ok text-white",
      MAINTENANCE: "bg-status-maintenance text-white",
      BOOKED: "bg-status-booked text-white",
      SOLD: "bg-status-sold text-white",
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[s] || "bg-gray-100"}`}>
        {s}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-ink">New Transaction</h2>
        <button
          onClick={() => router.push("/dashboard/transactions")}
          className="px-4 py-2 border border-border rounded-md"
        >
          Back
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Available motorcycles */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-surface border border-border rounded-lg p-4">
            <input
              type="text"
              placeholder="Search available motorcycles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2 border border-border rounded-md"
            />
            {isAdmin && (
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="mt-3 w-full px-4 py-2 border border-border rounded-md"
              >
                <option value="">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-1">
            {filteredMotorcycles.length === 0 ? (
              <div className="col-span-full text-center py-12 text-text-muted">
                No available motorcycles found
              </div>
            ) : (
              filteredMotorcycles.map((m) => {
                const mainImage = m.images.find((img) => img.isMain) || m.images[0];
                return (
                  <div
                    key={m.id}
                    className="bg-surface border border-border rounded-lg overflow-hidden flex flex-col"
                  >
                    <div className="relative aspect-video bg-bg">
                      {mainImage ? (
                        <img
                          src={`/${mainImage.path}`}
                          alt={`${m.brand.name} ${m.category.name}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-text-muted">
                          No Image
                        </div>
                      )}
                      <div className="absolute top-2 right-2">{getStatusBadge(m.salesStatus)}</div>
                    </div>
                    <div className="p-3 flex-1 flex flex-col">
                      <h3 className="font-bold">
                        {m.brand.name} {m.category.name}
                      </h3>
                      <p className="text-sm text-text-muted">{m.licensePlate}</p>
                      <p className="text-lg font-bold text-ink font-display mt-1">
                        Rp {parseInt(m.sellingPrice).toLocaleString("id-ID")}
                      </p>
                      <button
                        type="button"
                        disabled={inCart(m.id)}
                        onClick={() => addToCart(m)}
                        className="mt-3 px-3 py-2 bg-brand-red text-white rounded-md hover:bg-brand-red-dark disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        {inCart(m.id) ? "In Cart" : "Add to Cart"}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Cart + customer + status */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-surface border border-border rounded-lg p-4">
            <h3 className="font-bold mb-3">Cart ({cart.length})</h3>
            {cartMotorcycles.length === 0 ? (
              <p className="text-sm text-text-muted">No motorcycles selected</p>
            ) : (
              <ul className="space-y-2">
                {cartMotorcycles.map((m) => (
                  <li key={m.id} className="flex items-center justify-between text-sm">
                    <span>
                      {m.brand.name} {m.category.name}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="font-medium font-tabular-nums">
                        Rp {parseInt(m.sellingPrice).toLocaleString("id-ID")}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFromCart(m.id)}
                        className="text-red-500"
                      >
                        ×
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3 pt-3 border-t border-border flex justify-between font-bold">
              <span>Total</span>
              <span className="font-tabular-nums">Rp {total.toLocaleString("id-ID")}</span>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-lg p-4 space-y-3">
            <h3 className="font-bold">Customer</h3>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full px-4 py-2 border border-border rounded-md"
            >
              <option value="">Select existing customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <p className="text-center text-text-muted text-sm">— or create new —</p>
            <input
              type="text"
              placeholder="New customer name"
              value={newCustomerName}
              onChange={(e) => setNewCustomerName(e.target.value)}
              className="w-full px-4 py-2 border border-border rounded-md"
            />
            <input
              type="text"
              placeholder="Phone (optional)"
              value={newCustomerPhone}
              onChange={(e) => setNewCustomerPhone(e.target.value)}
              className="w-full px-4 py-2 border border-border rounded-md"
            />
            <input
              type="email"
              placeholder="Email (optional)"
              value={newCustomerEmail}
              onChange={(e) => setNewCustomerEmail(e.target.value)}
              className="w-full px-4 py-2 border border-border rounded-md"
            />
          </div>

          <div className="bg-surface border border-border rounded-lg p-4 space-y-3">
            <h3 className="font-bold">Transaction Type</h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStatus("SALE")}
                className={`flex-1 px-4 py-2 rounded-md ${
                  status === "SALE" ? "bg-brand-red text-white" : "border border-border bg-bg"
                }`}
              >
                Sale
              </button>
              <button
                type="button"
                onClick={() => setStatus("BOOKING")}
                className={`flex-1 px-4 py-2 rounded-md ${
                  status === "BOOKING"
                    ? "bg-status-booked text-white"
                    : "border border-border bg-bg"
                }`}
              >
                Booking
              </button>
            </div>
            {status === "BOOKING" && (
              <p className="text-xs text-text-muted">
                Booking will auto-expire after the configured period if not converted to a sale.
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-3 bg-brand-red text-white rounded-md hover:bg-brand-red-dark font-medium disabled:opacity-50"
          >
            {loading ? "Creating..." : `Create ${status === "SALE" ? "Sale" : "Booking"}`}
          </button>
        </form>
      </div>
    </div>
  );
}
