import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  Edit3,
  Package,
  Plus,
  Search,
  ToggleLeft,
  ToggleRight,
  X,
} from "lucide-react";

import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

const emptyForm = {
  name: "",
  sku: "",
  barcode: "",
  description: "",
  categoryId: "",
  buyingPrice: "",
  sellingPrice: "",
  stockQuantity: "",
  minimumStock: "",
  unit: "piece",
  trackStock: true,
};

const Products = () => {
  const { user } = useAuth();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");

  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const [form, setForm] = useState(emptyForm);

  const canManageProducts = [
    "OWNER",
    "ADMIN",
    "MANAGER",
    "INVENTORY_MANAGER",
  ].includes(user?.role);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/products", {
        params: {
          search: search || undefined,
          categoryId: categoryFilter || undefined,
          isActive:
            statusFilter === "all"
              ? undefined
              : statusFilter === "active",
        },
      });

      setProducts(response.data.products || []);
    } catch (err) {
      console.error("Failed to load products:", err);

      setError(
        err.response?.data?.message ||
          "Failed to load products."
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get("/categories");

      setCategories(response.data.categories || []);
    } catch (err) {
      console.error("Failed to load categories:", err);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
    }, 300);

    return () => clearTimeout(timer);
  }, [search, categoryFilter, statusFilter]);

  const openAddModal = () => {
    setEditingProduct(null);
    setForm(emptyForm);
    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);

    setForm({
      name: product.name || "",
      sku: product.sku || "",
      barcode: product.barcode || "",
      description: product.description || "",
      categoryId: product.categoryId?._id || product.categoryId || "",
      buyingPrice: product.buyingPrice ?? "",
      sellingPrice: product.sellingPrice ?? "",
      stockQuantity: product.stockQuantity ?? "",
      minimumStock: product.minimumStock ?? "",
      unit: product.unit || "piece",
      trackStock: product.trackStock ?? true,
    });

    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setEditingProduct(null);
    setForm(emptyForm);
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!form.name.trim()) {
      setError("Product name is required.");
      return;
    }

    if (!form.sku.trim()) {
      setError("SKU/product code is required.");
      return;
    }

    if (form.buyingPrice === "" || Number(form.buyingPrice) < 0) {
      setError("Enter a valid buying price.");
      return;
    }

    if (form.sellingPrice === "" || Number(form.sellingPrice) < 0) {
      setError("Enter a valid selling price.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name: form.name.trim(),
        sku: form.sku.trim().toUpperCase(),
        barcode: form.barcode.trim(),
        description: form.description.trim(),
        categoryId: form.categoryId || null,
        buyingPrice: Number(form.buyingPrice),
        sellingPrice: Number(form.sellingPrice),
        stockQuantity: Number(form.stockQuantity || 0),
        minimumStock: Number(form.minimumStock || 0),
        unit: form.unit.trim() || "piece",
        trackStock: form.trackStock,
      };

      if (editingProduct) {
        await api.patch(
          `/products/${editingProduct._id}`,
          payload
        );

        setSuccess("Product updated successfully.");
      } else {
        await api.post("/products", payload);

        setSuccess("Product added successfully.");
      }

      await fetchProducts();

      setTimeout(() => {
        closeModal();
        setSuccess("");
      }, 700);
    } catch (err) {
      console.error("Failed to save product:", err);

      setError(
        err.response?.data?.message ||
          "Failed to save product."
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleProductStatus = async (product) => {
    try {
      setError("");
      setSuccess("");

      const action = product.isActive
        ? "deactivate"
        : "activate";

      await api.patch(
        `/products/${product._id}/${action}`
      );

      setSuccess(
        product.isActive
          ? "Product deactivated."
          : "Product activated."
      );

      await fetchProducts();

      setTimeout(() => setSuccess(""), 2000);
    } catch (err) {
      console.error("Failed to update product status:", err);

      setError(
        err.response?.data?.message ||
          "Failed to update product status."
      );
    }
  };

  const getCategoryName = (product) => {
    if (product.categoryId?.name) {
      return product.categoryId.name;
    }

    const category = categories.find(
      (item) => item._id === product.categoryId
    );

    return category?.name || "Uncategorized";
  };

  const formatMoney = (amount) => {
    return new Intl.NumberFormat("en-UG", {
      style: "currency",
      currency: "UGX",
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const statistics = useMemo(() => {
    const activeProducts = products.filter(
      (product) => product.isActive
    );

    const lowStock = activeProducts.filter(
      (product) =>
        product.trackStock &&
        product.stockQuantity <= product.minimumStock
    );

    const totalStockValue = activeProducts.reduce(
      (total, product) =>
        total +
        Number(product.buyingPrice || 0) *
          Number(product.stockQuantity || 0),
      0
    );

    return {
      total: products.length,
      active: activeProducts.length,
      lowStock: lowStock.length,
      stockValue: totalStockValue,
    };
  }, [products]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
              <Package size={22} />
            </div>

            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-blue-600">
                Product Management
              </p>

              <h1 className="text-3xl font-black tracking-tight text-slate-950">
                Products
              </h1>
            </div>
          </div>

          <p className="max-w-2xl text-sm leading-6 text-slate-500">
            Manage your products, prices, stock levels, categories,
            and product availability from one place.
          </p>
        </div>

        {canManageProducts && (
          <button
            onClick={openAddModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
          >
            <Plus size={18} />
            Add Product
          </button>
        )}
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 shrink-0" size={18} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-700">
          <Check size={18} />
          {success}
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Products
          </p>
          <p className="mt-2 text-2xl font-black text-slate-950">
            {statistics.total}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Active Products
          </p>
          <p className="mt-2 text-2xl font-black text-green-600">
            {statistics.active}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Low Stock
          </p>
          <p className="mt-2 text-2xl font-black text-amber-600">
            {statistics.lowStock}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Stock Value
          </p>
          <p className="mt-2 text-xl font-black text-slate-950">
            {formatMoney(statistics.stockValue)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px_180px]">
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
              placeholder="Search by product name, SKU or barcode..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(event) =>
              setCategoryFilter(event.target.value)
            }
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
          >
            <option value="">All categories</option>

            {categories.map((category) => (
              <option
                key={category._id}
                value={category._id}
              >
                {category.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value)
            }
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
          >
            <option value="active">Active</option>
            <option value="all">All products</option>
          </select>
        </div>
      </div>

      {/* Products table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-black text-slate-900">
            Product Catalogue
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {products.length} product
            {products.length === 1 ? "" : "s"} found
          </p>
        </div>

        {loading ? (
          <div className="flex min-h-64 items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
              <p className="mt-3 text-sm font-medium text-slate-500">
                Loading products...
              </p>
            </div>
          </div>
        ) : products.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Package size={25} />
            </div>

            <h3 className="mt-4 font-bold text-slate-900">
              No products found
            </h3>

            <p className="mt-1 max-w-md text-sm text-slate-500">
              Add your first product or change the search/filter
              options.
            </p>

            {canManageProducts && (
              <button
                onClick={openAddModal}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
              >
                <Plus size={17} />
                Add Product
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1000px] w-full">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs font-black uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-4">Product</th>
                  <th className="px-5 py-4">SKU</th>
                  <th className="px-5 py-4">Category</th>
                  <th className="px-5 py-4">Buying</th>
                  <th className="px-5 py-4">Selling</th>
                  <th className="px-5 py-4">Stock</th>
                  <th className="px-5 py-4">Status</th>
                  {canManageProducts && (
                    <th className="px-5 py-4 text-right">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {products.map((product) => {
                  const lowStock =
                    product.trackStock &&
                    product.stockQuantity <=
                      product.minimumStock;

                  return (
                    <tr
                      key={product._id}
                      className="transition hover:bg-slate-50/70"
                    >
                      <td className="px-5 py-4">
                        <div>
                          <p className="font-bold text-slate-900">
                            {product.name}
                          </p>

                          {product.barcode && (
                            <p className="mt-1 text-xs text-slate-400">
                              Barcode: {product.barcode}
                            </p>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs font-bold text-slate-600">
                          {product.sku}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-sm font-medium text-slate-600">
                        {getCategoryName(product)}
                      </td>

                      <td className="px-5 py-4 text-sm font-semibold text-slate-700">
                        {formatMoney(product.buyingPrice)}
                      </td>

                      <td className="px-5 py-4 text-sm font-bold text-slate-900">
                        {formatMoney(product.sellingPrice)}
                      </td>

                      <td className="px-5 py-4">
                        {product.trackStock ? (
                          <div>
                            <span
                              className={`font-bold ${
                                lowStock
                                  ? "text-amber-600"
                                  : "text-slate-800"
                              }`}
                            >
                              {product.stockQuantity}
                            </span>

                            <span className="ml-1 text-xs text-slate-400">
                              {product.unit}
                            </span>

                            {lowStock && (
                              <p className="mt-1 text-xs font-semibold text-amber-600">
                                Low stock
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs font-semibold text-slate-400">
                            Not tracked
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                            product.isActive
                              ? "bg-green-50 text-green-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {product.isActive
                            ? "Active"
                            : "Inactive"}
                        </span>
                      </td>

                      {canManageProducts && (
                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() =>
                                openEditModal(product)
                              }
                              className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                              title="Edit product"
                            >
                              <Edit3 size={16} />
                            </button>

                            <button
                              onClick={() =>
                                toggleProductStatus(product)
                              }
                              className={`rounded-lg border p-2 transition ${
                                product.isActive
                                  ? "border-red-200 text-red-500 hover:bg-red-50"
                                  : "border-green-200 text-green-600 hover:bg-green-50"
                              }`}
                              title={
                                product.isActive
                                  ? "Deactivate product"
                                  : "Activate product"
                              }
                            >
                              {product.isActive ? (
                                <ToggleRight size={17} />
                              ) : (
                                <ToggleLeft size={17} />
                              )}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-5">
              <div>
                <h2 className="text-xl font-black text-slate-950">
                  {editingProduct
                    ? "Edit Product"
                    : "Add Product"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {editingProduct
                    ? "Update this product's information."
                    : "Add a new product to your catalogue."}
                </p>
              </div>

              <button
                onClick={closeModal}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-6 p-6"
            >
              {error && (
                <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  <AlertCircle size={18} />
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Product name *
                  </label>

                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="e.g. Premium Sugar 1KG"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    SKU / Product Code *
                  </label>

                  <input
                    name="sku"
                    value={form.sku}
                    onChange={handleChange}
                    placeholder="e.g. SUG-001"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 uppercase outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Barcode
                  </label>

                  <input
                    name="barcode"
                    value={form.barcode}
                    onChange={handleChange}
                    placeholder="Scan or enter barcode"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Category
                  </label>

                  <select
                    name="categoryId"
                    value={form.categoryId}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  >
                    <option value="">
                      Uncategorized
                    </option>

                    {categories.map((category) => (
                      <option
                        key={category._id}
                        value={category._id}
                      >
                        {category.name}
                      </option>
                    ))}
                  </select>

                  {categories.length === 0 && (
                    <p className="mt-2 text-xs text-amber-600">
                      No categories are available yet.
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Unit
                  </label>

                  <input
                    name="unit"
                    value={form.unit}
                    onChange={handleChange}
                    placeholder="piece, kg, litre..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Buying price *
                  </label>

                  <input
                    name="buyingPrice"
                    type="number"
                    min="0"
                    value={form.buyingPrice}
                    onChange={handleChange}
                    placeholder="3500"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Selling price *
                  </label>

                  <input
                    name="sellingPrice"
                    type="number"
                    min="0"
                    value={form.sellingPrice}
                    onChange={handleChange}
                    placeholder="4500"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Current stock
                  </label>

                  <input
                    name="stockQuantity"
                    type="number"
                    min="0"
                    value={form.stockQuantity}
                    onChange={handleChange}
                    placeholder="50"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Minimum stock
                  </label>

                  <input
                    name="minimumStock"
                    type="number"
                    min="0"
                    value={form.minimumStock}
                    onChange={handleChange}
                    placeholder="10"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Description
                  </label>

                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    rows="3"
                    placeholder="Describe the product..."
                    className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>

                <label className="md:col-span-2 flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <input
                    name="trackStock"
                    type="checkbox"
                    checked={form.trackStock}
                    onChange={handleChange}
                    className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />

                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      Track inventory for this product
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      MOVA will monitor stock and generate low-stock
                      alerts.
                    </p>
                  </div>
                </label>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : editingProduct
                      ? "Update Product"
                      : "Add Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;