import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDownToLine,
  Boxes,
  Package,
  Search,
  TriangleAlert,
  XCircle,
} from "lucide-react";

import api from "../../services/api";

const Inventory = () => {
  const [products, setProducts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("all");

  const [showAdjustmentModal, setShowAdjustmentModal] =
    useState(false);

  const [selectedProduct, setSelectedProduct] =
    useState(null);

  const [adjustmentType, setAdjustmentType] =
    useState("add");

  const [adjustmentQuantity, setAdjustmentQuantity] =
    useState("");

  const [adjustmentReason, setAdjustmentReason] =
    useState("");

  const [saving, setSaving] = useState(false);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/products", {
        params: {
          search: search || undefined,
          isActive: true,
        },
      });

      setProducts(response.data.products || []);
    } catch (err) {
      console.error("Failed to load inventory:", err);

      setError(
        err.response?.data?.message ||
          "Failed to load inventory."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  const inventoryStats = useMemo(() => {
    const trackedProducts = products.filter(
      (product) => product.trackStock
    );

    const totalUnits = trackedProducts.reduce(
      (total, product) =>
        total + Number(product.stockQuantity || 0),
      0
    );

    const inventoryValue = trackedProducts.reduce(
      (total, product) =>
        total +
        Number(product.stockQuantity || 0) *
          Number(product.buyingPrice || 0),
      0
    );

    const lowStock = trackedProducts.filter(
      (product) =>
        Number(product.stockQuantity || 0) > 0 &&
        Number(product.stockQuantity || 0) <=
          Number(product.minimumStock || 0)
    );

    const outOfStock = trackedProducts.filter(
      (product) =>
        Number(product.stockQuantity || 0) <= 0
    );

    return {
      products: trackedProducts.length,
      totalUnits,
      inventoryValue,
      lowStock: lowStock.length,
      outOfStock: outOfStock.length,
    };
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const quantity = Number(product.stockQuantity || 0);
      const minimum = Number(product.minimumStock || 0);

      if (stockFilter === "low") {
        return quantity > 0 && quantity <= minimum;
      }

      if (stockFilter === "out") {
        return quantity <= 0;
      }

      if (stockFilter === "healthy") {
        return quantity > minimum;
      }

      return true;
    });
  }, [products, stockFilter]);

  const formatMoney = (amount) => {
    return new Intl.NumberFormat("en-UG", {
      style: "currency",
      currency: "UGX",
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const getStockStatus = (product) => {
    const quantity = Number(product.stockQuantity || 0);
    const minimum = Number(product.minimumStock || 0);

    if (quantity <= 0) {
      return {
        label: "Out of stock",
        className: "bg-red-50 text-red-700",
      };
    }

    if (quantity <= minimum) {
      return {
        label: "Low stock",
        className: "bg-amber-50 text-amber-700",
      };
    }

    return {
      label: "Healthy",
      className: "bg-green-50 text-green-700",
    };
  };

  const openAdjustmentModal = (product) => {
    setSelectedProduct(product);
    setAdjustmentType("add");
    setAdjustmentQuantity("");
    setAdjustmentReason("");
    setShowAdjustmentModal(true);
  };

  const closeAdjustmentModal = () => {
    if (saving) return;

    setShowAdjustmentModal(false);
    setSelectedProduct(null);
    setAdjustmentQuantity("");
    setAdjustmentReason("");
  };

  const handleAdjustment = async (event) => {
    event.preventDefault();

    if (!selectedProduct) return;

    const quantity = Number(adjustmentQuantity);

    if (!quantity || quantity <= 0) {
      setError("Enter a quantity greater than zero.");
      return;
    }

    if (!adjustmentReason.trim()) {
      setError("Please provide a reason for the adjustment.");
      return;
    }

    const currentStock = Number(
      selectedProduct.stockQuantity || 0
    );

    if (
      adjustmentType === "remove" &&
      quantity > currentStock
    ) {
      setError(
        "You cannot remove more stock than is currently available."
      );
      return;
    }

    const newStock =
      adjustmentType === "add"
        ? currentStock + quantity
        : currentStock - quantity;

    try {
      setSaving(true);
      setError("");

      await api.patch(
        `/products/${selectedProduct._id}`,
        {
          stockQuantity: newStock,
        }
      );

      closeAdjustmentModal();

      await fetchProducts();
    } catch (err) {
      console.error("Stock adjustment failed:", err);

      setError(
        err.response?.data?.message ||
          "Failed to adjust stock."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="mb-2 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
            <Boxes size={22} />
          </div>

          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-blue-600">
              Stock Management
            </p>

            <h1 className="text-3xl font-black tracking-tight text-slate-950">
              Inventory
            </h1>
          </div>
        </div>

        <p className="max-w-2xl text-sm leading-6 text-slate-500">
          Monitor stock levels, identify products that need
          attention, and make stock adjustments.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle
            size={18}
            className="mt-0.5 shrink-0"
          />

          <span>{error}</span>

          <button
            onClick={() => setError("")}
            className="ml-auto"
          >
            <XCircle size={17} />
          </button>
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Products
              </p>

              <p className="mt-2 text-2xl font-black text-slate-950">
                {inventoryStats.products}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Package size={20} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Stock Units
              </p>

              <p className="mt-2 text-2xl font-black text-slate-950">
                {inventoryStats.totalUnits.toLocaleString()}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Boxes size={20} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Inventory Value
              </p>

              <p className="mt-2 text-xl font-black text-slate-950">
                {formatMoney(
                  inventoryStats.inventoryValue
                )}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-50 text-green-600">
              <Package size={20} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Needs Attention
              </p>

              <p className="mt-2 text-2xl font-black text-amber-600">
                {inventoryStats.lowStock +
                  inventoryStats.outOfStock}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                {inventoryStats.lowStock} low ·{" "}
                {inventoryStats.outOfStock} out
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <TriangleAlert size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Search / filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px]">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search products..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            />
          </div>

          <select
            value={stockFilter}
            onChange={(event) =>
              setStockFilter(event.target.value)
            }
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
          >
            <option value="all">All stock</option>
            <option value="healthy">Healthy stock</option>
            <option value="low">Low stock</option>
            <option value="out">Out of stock</option>
          </select>
        </div>
      </div>

      {/* Inventory table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-black text-slate-900">
            Stock Overview
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {filteredProducts.length} product
            {filteredProducts.length === 1 ? "" : "s"}
          </p>
        </div>

        {loading ? (
          <div className="flex min-h-64 items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

              <p className="mt-3 text-sm font-medium text-slate-500">
                Loading inventory...
              </p>
            </div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Boxes size={25} />
            </div>

            <h3 className="mt-4 font-bold text-slate-900">
              No inventory found
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Try changing your search or stock filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[950px] w-full">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs font-black uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-4">
                    Product
                  </th>

                  <th className="px-5 py-4">
                    SKU
                  </th>

                  <th className="px-5 py-4">
                    Current Stock
                  </th>

                  <th className="px-5 py-4">
                    Minimum
                  </th>

                  <th className="px-5 py-4">
                    Stock Value
                  </th>

                  <th className="px-5 py-4">
                    Status
                  </th>

                  <th className="px-5 py-4 text-right">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((product) => {
                  const status = getStockStatus(product);

                  const stockValue =
                    Number(product.stockQuantity || 0) *
                    Number(product.buyingPrice || 0);

                  return (
                    <tr
                      key={product._id}
                      className="transition hover:bg-slate-50/70"
                    >
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-900">
                          {product.name}
                        </p>

                        {product.trackStock === false && (
                          <p className="mt-1 text-xs text-slate-400">
                            Stock tracking disabled
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs font-bold text-slate-600">
                          {product.sku}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`text-lg font-black ${
                            status.label === "Out of stock"
                              ? "text-red-600"
                              : status.label ===
                                  "Low stock"
                                ? "text-amber-600"
                                : "text-slate-900"
                          }`}
                        >
                          {Number(
                            product.stockQuantity || 0
                          ).toLocaleString()}
                        </span>

                        <span className="ml-1 text-xs text-slate-400">
                          {product.unit}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-sm font-semibold text-slate-600">
                        {Number(
                          product.minimumStock || 0
                        ).toLocaleString()}
                      </td>

                      <td className="px-5 py-4 text-sm font-bold text-slate-800">
                        {formatMoney(stockValue)}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() =>
                            openAdjustmentModal(product)
                          }
                          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                        >
                          <ArrowDownToLine
                            size={16}
                          />
                          Adjust
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Adjustment Modal */}
      {showAdjustmentModal && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="text-xl font-black text-slate-950">
                  Adjust Stock
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {selectedProduct.name}
                </p>
              </div>

              <button
                onClick={closeAdjustmentModal}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleAdjustment}
              className="space-y-5 p-6"
            >
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Current stock
                </p>

                <p className="mt-1 text-2xl font-black text-slate-900">
                  {selectedProduct.stockQuantity}{" "}
                  {selectedProduct.unit}
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Adjustment type
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setAdjustmentType("add")
                    }
                    className={`rounded-xl border px-4 py-3 text-sm font-bold ${
                      adjustmentType === "add"
                        ? "border-green-500 bg-green-50 text-green-700"
                        : "border-slate-200 text-slate-600"
                    }`}
                  >
                    Add Stock
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setAdjustmentType("remove")
                    }
                    className={`rounded-xl border px-4 py-3 text-sm font-bold ${
                      adjustmentType === "remove"
                        ? "border-red-500 bg-red-50 text-red-700"
                        : "border-slate-200 text-slate-600"
                    }`}
                  >
                    Remove Stock
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Quantity
                </label>

                <input
                  type="number"
                  min="1"
                  value={adjustmentQuantity}
                  onChange={(event) =>
                    setAdjustmentQuantity(
                      event.target.value
                    )
                  }
                  placeholder="Enter quantity"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Reason
                </label>

                <textarea
                  value={adjustmentReason}
                  onChange={(event) =>
                    setAdjustmentReason(
                      event.target.value
                    )
                  }
                  rows="3"
                  placeholder="e.g. New stock received, damaged goods, stock count correction..."
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeAdjustmentModal}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className={`rounded-xl px-6 py-3 text-sm font-bold text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-60 ${
                    adjustmentType === "add"
                      ? "bg-green-600 shadow-green-600/20 hover:bg-green-700"
                      : "bg-red-600 shadow-red-600/20 hover:bg-red-700"
                  }`}
                >
                  {saving
                    ? "Saving..."
                    : adjustmentType === "add"
                      ? "Add Stock"
                      : "Remove Stock"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;