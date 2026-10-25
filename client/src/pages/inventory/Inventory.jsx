import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Boxes,
  Camera,
  Eye,
  Package,
  RefreshCw,
  Search,
  X,
} from "lucide-react";

import api from "../../services/api";
import ProductImage from "../../components/products/ProductImage";
import BarcodeScanner from "../../components/POS/BarcodeScanner";
import {
  enqueueOfflineInventoryAdjustment,
  readPosCatalog,
  savePosCatalog,
} from "../../offline/database";
import { syncOfflineSales } from "../../offline/syncManager";

const readOfflineIdentity = () => {
  try {
    const user = JSON.parse(localStorage.getItem("mova_user") || "null");
    const business = JSON.parse(localStorage.getItem("mova_business") || "null");
    const branch = JSON.parse(localStorage.getItem("mova_branch") || "null");
    return {
      userId: String(user?._id || user?.id || ""),
      businessId: String(user?.businessId?._id || user?.businessId || business?._id || business?.id || ""),
      branchId: String(branch?._id || branch?.id || user?.activeBranchId || user?.branchId || ""),
    };
  } catch {
    return { userId: "", businessId: "", branchId: "" };
  }
};

const Inventory = () => {
  const [products, setProducts] = useState([]);
  const [transactions, setTransactions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");

  const [adjustmentModal, setAdjustmentModal] =
    useState(null);

  const [historyProduct, setHistoryProduct] =
    useState(null);

  const [adjustmentForm, setAdjustmentForm] = useState({
    quantity: "",
    type: "STOCK_RECEIVED",
    reason: "",
    notes: "",
  });

  const [savingAdjustment, setSavingAdjustment] =
    useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const offlineIdentity = readOfflineIdentity();

  /*
   * =====================================================
   * LOAD PRODUCTS
   * =====================================================
   */

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError("");

      if (!navigator.onLine) {
        const cached = await readPosCatalog(offlineIdentity);
        if (Array.isArray(cached?.products)) setProducts(cached.products);
        else setError("This device has no saved stock list yet. Connect once before managing stock offline.");
        return;
      }

      const response = await api.get("/products");

      const loaded = response.data.products || [];
      setProducts(loaded);
      if (offlineIdentity.businessId && offlineIdentity.branchId) {
        const cached = await readPosCatalog(offlineIdentity).catch(() => null);
        await savePosCatalog({ ...offlineIdentity, products: loaded, customers: cached?.customers || [] }).catch((cacheError) => console.warn("Unable to cache inventory for offline use:", cacheError));
      }
    } catch (error) {
      console.error(
        "Failed to load inventory:",
        error
      );

      const cached = await readPosCatalog(offlineIdentity).catch(() => null);
      if (Array.isArray(cached?.products) && cached.products.length) setProducts(cached.products);
      else setError(error.response?.data?.message || "Failed to load inventory.");
    } finally {
      setLoading(false);
    }
  };

  /*
   * =====================================================
   * LOAD INVENTORY HISTORY
   * =====================================================
   */

  const loadTransactions = async () => {
    try {
      const response = await api.get(
        "/inventory-transactions",
        {
          params: {
            limit: 100,
          },
        }
      );

      setTransactions(
        response.data.transactions || []
      );
    } catch (error) {
      console.error(
        "Failed to load inventory history:",
        error
      );
    }
  };

  /*
   * =====================================================
   * INITIAL LOAD
   * =====================================================
   */

  useEffect(() => {
    const loadInventory = async () => {
      await Promise.all([
        loadProducts(),
        loadTransactions(),
      ]);
    };

    loadInventory();
  }, []);

  useEffect(() => {
    const handleOnline = async () => {
      await syncOfflineSales(api, offlineIdentity.userId).catch((syncError) => console.warn("Stock changes will retry syncing:", syncError));
      await Promise.all([loadProducts(), loadTransactions()]);
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [offlineIdentity.userId]);

  /*
   * =====================================================
   * CALCULATE INVENTORY STATISTICS
   * =====================================================
   */

  const statistics = useMemo(() => {
    const totalProducts = products.length;

    const totalStockUnits = products.reduce(
      (total, product) =>
        total +
        Number(product.stockQuantity || 0),
      0
    );

    const inventoryValue = products.reduce(
      (total, product) =>
        total +
        Number(product.stockQuantity || 0) *
          Number(product.buyingPrice || 0),
      0
    );

    const lowStockProducts = products.filter(
      (product) =>
        Number(product.stockQuantity || 0) > 0 &&
        Number(product.stockQuantity || 0) <=
          Number(product.minimumStock || 0)
    );

    const outOfStockProducts = products.filter(
      (product) =>
        Number(product.stockQuantity || 0) === 0
    );

    return {
      totalProducts,
      totalStockUnits,
      inventoryValue,
      lowStockProducts:
        lowStockProducts.length,
      outOfStockProducts:
        outOfStockProducts.length,
    };
  }, [products]);

  /*
   * =====================================================
   * FILTER PRODUCTS
   * =====================================================
   */

  const filteredProducts = useMemo(() => {
    const searchValue =
      search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        !searchValue ||
        product.name
          ?.toLowerCase()
          .includes(searchValue) ||
        product.sku
          ?.toLowerCase()
          .includes(searchValue) ||
        product.barcode
          ?.toLowerCase()
          .includes(searchValue);

      const stock =
        Number(product.stockQuantity || 0);

      const minimum =
        Number(product.minimumStock || 0);

      let matchesFilter = true;

      if (filter === "HEALTHY") {
        matchesFilter =
          stock > minimum;
      }

      if (filter === "LOW") {
        matchesFilter =
          stock > 0 &&
          stock <= minimum;
      }

      if (filter === "OUT") {
        matchesFilter = stock === 0;
      }

      return (
        matchesSearch &&
        matchesFilter
      );
    });
  }, [products, search, filter]);

  /*
   * =====================================================
   * OPEN ADJUSTMENT MODAL
   * =====================================================
   */

  const openAdjustment = (
    product,
    type = "STOCK_RECEIVED"
  ) => {
    setError("");
    setSuccess("");

    setAdjustmentModal(product);

    setAdjustmentForm({
      quantity: "",
      type,
      reason: "",
      notes: "",
    });
  };

  const handleBarcodeDetected = (value) => {
    const normalized = String(value || "").trim().toLowerCase();
    const product = products.find((item) =>
      [item.barcode, item.sku].some((code) => String(code || "").trim().toLowerCase() === normalized)
    );
    if (!product) {
      setSearch(String(value || ""));
      setError(`No product matches barcode ${value}. Add the product first, then scan it again to stock it.`);
      return;
    }
    openAdjustment(product, "STOCK_RECEIVED");
    setAdjustmentForm({ quantity: "", type: "STOCK_RECEIVED", reason: "Barcode stock intake", notes: `Scanned code: ${value}` });
  };

  /*
   * =====================================================
   * CLOSE ADJUSTMENT MODAL
   * =====================================================
   */

  const closeAdjustment = () => {
    if (savingAdjustment) {
      return;
    }

    setAdjustmentModal(null);

    setAdjustmentForm({
      quantity: "",
      type: "STOCK_RECEIVED",
      reason: "",
      notes: "",
    });
  };

  /*
   * =====================================================
   * HANDLE ADJUSTMENT FORM
   * =====================================================
   */

  const handleAdjustmentChange = (event) => {
    const { name, value } = event.target;

    setAdjustmentForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  /*
   * =====================================================
   * SUBMIT INVENTORY ADJUSTMENT
   * =====================================================
   */

  const handleAdjustmentSubmit = async (
    event
  ) => {
    event.preventDefault();

    if (!adjustmentModal) {
      return;
    }

    const quantity = Number(
      adjustmentForm.quantity
    );

    if (
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {
      setError(
        "Quantity must be a whole number greater than zero."
      );
      return;
    }

    if (!adjustmentForm.reason.trim()) {
      setError(
        "Please provide a reason for the adjustment."
      );
      return;
    }

    const removalTypes = [
      "ADJUSTMENT_OUT",
      "DAMAGE",
      "LOSS",
    ];

    if (
      removalTypes.includes(
        adjustmentForm.type
      ) &&
      quantity >
        Number(
          adjustmentModal.stockQuantity || 0
        )
    ) {
      setError(
        `You cannot remove ${quantity} units. Current stock is ${adjustmentModal.stockQuantity}.`
      );
      return;
    }

    try {
      setSavingAdjustment(true);
      setError("");
      setSuccess("");

      const clientAdjustmentId = globalThis.crypto?.randomUUID?.() || `mova-adjustment-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const payload = {
        productId: adjustmentModal._id,
        quantity,
        type: adjustmentForm.type,
        reason: adjustmentForm.reason.trim(),
        notes: adjustmentForm.notes.trim(),
        clientAdjustmentId,
        branchId: offlineIdentity.branchId,
      };
      const saveLocally = async () => {
        if (!offlineIdentity.userId || !offlineIdentity.businessId || !offlineIdentity.branchId) {
          throw new Error("Offline stock updates need a saved user, business, and branch. Reconnect and open MOVA once before managing stock offline.");
        }
        await enqueueOfflineInventoryAdjustment({ ...payload, ...offlineIdentity });
        const increases = ["OPENING_STOCK", "STOCK_RECEIVED", "ADJUSTMENT_IN"].includes(payload.type);
        const delta = increases ? quantity : -quantity;
        const updatedProducts = products.map((product) => String(product._id || product.id) === String(payload.productId)
          ? { ...product, stockQuantity: Number(product.stockQuantity || 0) + delta, branchStockQuantity: Number(product.stockQuantity || 0) + delta }
          : product);
        setProducts(updatedProducts);
        const cached = await readPosCatalog(offlineIdentity).catch(() => null);
        await savePosCatalog({ ...offlineIdentity, products: updatedProducts, customers: cached?.customers || [] });
        setSuccess(`${adjustmentModal.name} stock change saved on this device. It will sync automatically when internet returns.`);
        if (navigator.onLine) {
          syncOfflineSales(api, offlineIdentity.userId)
            .then(() => Promise.all([loadProducts(), loadTransactions()]))
            .catch((syncError) => console.warn("Queued stock change will retry:", syncError));
        }
      };

      if (!navigator.onLine) {
        await saveLocally();
      } else {
        try {
          await api.post("/inventory-transactions/adjust", payload);
          setSuccess(`${adjustmentModal.name} inventory updated successfully.`);
          await Promise.all([loadProducts(), loadTransactions()]);
        } catch (requestError) {
          if (!requestError?.response) await saveLocally();
          else throw requestError;
        }
      }

      closeAdjustment();
    } catch (error) {
      console.error(
        "Inventory adjustment failed:",
        error
      );

      setError(error.response?.data?.message || error.message || "Failed to adjust inventory.");
    } finally {
      setSavingAdjustment(false);
    }
  };

  /*
   * =====================================================
   * LOAD PRODUCT HISTORY
   * =====================================================
   */

  const openHistory = async (product) => {
    try {
      setHistoryLoading(true);
      setError("");

      const response = await api.get(
        `/inventory-transactions/product/${product._id}`
      );

      setHistoryProduct({
        product:
          response.data.product,
        transactions:
          response.data.transactions || [],
      });
    } catch (error) {
      console.error(
        "Failed to load product history:",
        error
      );

      setError(
        error.response?.data?.message ||
          "Failed to load product history."
      );
    } finally {
      setHistoryLoading(false);
    }
  };

  /*
   * =====================================================
   * FORMAT CURRENCY
   * =====================================================
   */

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat(
      "en-UG",
      {
        style: "currency",
        currency: "UGX",
        maximumFractionDigits: 0,
      }
    ).format(Number(amount || 0));
  };

  /*
   * =====================================================
   * FORMAT DATE
   * =====================================================
   */

  const formatDate = (date) => {
    if (!date) {
      return "-";
    }

    return new Date(date).toLocaleString(
      "en-UG",
      {
        dateStyle: "medium",
        timeStyle: "short",
      }
    );
  };

  /*
   * =====================================================
   * TRANSACTION LABEL
   * =====================================================
   */

  const getTransactionLabel = (type) => {
    const labels = {
      OPENING_STOCK: "Opening Stock",
      STOCK_RECEIVED: "Stock Received",
      SALE: "Sale",
      RETURN: "Return",
      ADJUSTMENT_IN: "Adjustment In",
      ADJUSTMENT_OUT: "Adjustment Out",
      DAMAGE: "Damage",
      LOSS: "Loss",
      TRANSFER_IN: "Transfer In",
      TRANSFER_OUT: "Transfer Out",
    };

    return labels[type] || type;
  };

  /*
   * =====================================================
   * TRANSACTION IS STOCK IN?
   * =====================================================
   */

  const isStockIncrease = (type) => {
    return [
      "OPENING_STOCK",
      "STOCK_RECEIVED",
      "RETURN",
      "ADJUSTMENT_IN",
      "TRANSFER_IN",
    ].includes(type);
  };

  return (
    <div className="space-y-6">
      {/* =================================================
          PAGE HEADER
      ================================================= */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-bold text-blue-600">
            Inventory
          </p>

          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">
            Stock Management
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Track stock levels, make adjustments,
            and monitor every inventory movement.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            loadProducts();
            loadTransactions();
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <RefreshCw size={17} />
          Refresh
        </button>
      </div>

      {/* =================================================
          ALERTS
      ================================================= */}

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertTriangle
            size={19}
            className="mt-0.5 shrink-0"
          />

          <p>{error}</p>

          <button
            type="button"
            onClick={() => setError("")}
            className="ml-auto text-red-400 hover:text-red-700"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-700">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-600 text-xs font-black text-white">
            ✓
          </div>

          <p>{success}</p>

          <button
            type="button"
            onClick={() => setSuccess("")}
            className="ml-auto text-green-500 hover:text-green-700"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {/* =================================================
          STATISTICS
      ================================================= */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Package size={21} />
            </div>

            <span className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Products
            </span>
          </div>

          <p className="mt-5 text-2xl font-black text-slate-950">
            {statistics.totalProducts}
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Active products
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Boxes size={21} />
            </div>

            <span className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Units
            </span>
          </div>

          <p className="mt-5 text-2xl font-black text-slate-950">
            {statistics.totalStockUnits.toLocaleString()}
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Units currently in stock
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Package size={21} />
            </div>

            <span className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Value
            </span>
          </div>

          <p className="mt-5 text-xl font-black text-slate-950">
            {formatCurrency(
              statistics.inventoryValue
            )}
          </p>

          <p className="mt-1 text-sm text-slate-500">
            At buying price
          </p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
              <AlertTriangle size={21} />
            </div>

            <span className="text-xs font-bold uppercase tracking-wide text-amber-600">
              Attention
            </span>
          </div>

          <p className="mt-5 text-2xl font-black text-amber-700">
            {statistics.lowStockProducts}
          </p>

          <p className="mt-1 text-sm text-amber-700/70">
            Low stock products
          </p>
        </div>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-100 text-red-600">
              <AlertTriangle size={21} />
            </div>

            <span className="text-xs font-bold uppercase tracking-wide text-red-600">
              Critical
            </span>
          </div>

          <p className="mt-5 text-2xl font-black text-red-700">
            {statistics.outOfStockProducts}
          </p>

          <p className="mt-1 text-sm text-red-700/70">
            Out of stock
          </p>
        </div>
      </div>

      {/* =================================================
          FILTERS
      ================================================= */}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="flex min-w-0 flex-1 gap-2">
            <div className="relative min-w-0 flex-1">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, SKU or barcode..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              />
            </div>
            <button
              type="button"
              onClick={() => setScannerOpen(true)}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm font-bold text-blue-700 hover:bg-blue-100 sm:px-4"
              title="Scan barcode to stock a product"
            >
              <Camera size={18} /> <span className="hidden sm:inline">Scan to stock</span><span className="sm:hidden">Scan</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              ["ALL", "All"],
              ["HEALTHY", "Healthy"],
              ["LOW", "Low Stock"],
              ["OUT", "Out of Stock"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() =>
                  setFilter(value)
                }
                className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                  filter === value
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* =================================================
          PRODUCT TABLE
      ================================================= */}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-black text-slate-950">
                Stock Overview
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                {filteredProducts.length} product
                {filteredProducts.length === 1
                  ? ""
                  : "s"} displayed
              </p>
            </div>
          </div>
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
              <Package size={25} />
            </div>

            <h3 className="mt-4 font-black text-slate-800">
              No products found
            </h3>

            <p className="mt-1 max-w-sm text-sm text-slate-500">
              Try changing your search or inventory
              filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left">
                  <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-slate-400">
                    Product
                  </th>

                  <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-slate-400">
                    SKU
                  </th>

                  <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-slate-400">
                    Buying Price
                  </th>

                  <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-slate-400">
                    Stock
                  </th>

                  <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-slate-400">
                    Minimum
                  </th>

                  <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-slate-400">
                    Status
                  </th>

                  <th className="px-5 py-4 text-right text-xs font-black uppercase tracking-wider text-slate-400">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredProducts.map(
                  (product) => {
                    const stock = Number(
                      product.stockQuantity || 0
                    );

                    const minimum = Number(
                      product.minimumStock || 0
                    );

                    const isOut =
                      stock === 0;

                    const isLow =
                      !isOut &&
                      stock <= minimum;

                    return (
                      <tr
                        key={product._id}
                        className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <ProductImage product={product} className="h-11 w-11 shrink-0 rounded-xl object-cover" />

                            <div>
                              <p className="font-bold text-slate-900">
                                {product.name}
                              </p>

                              <p className="text-xs text-slate-400">
                                {product.unit ||
                                  "piece"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-sm font-semibold text-slate-600">
                          {product.sku}
                        </td>

                        <td className="px-5 py-4 text-sm font-semibold text-slate-700">
                          {formatCurrency(
                            product.buyingPrice
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span className="text-lg font-black text-slate-950">
                            {stock}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-sm font-semibold text-slate-600">
                          {minimum}
                        </td>

                        <td className="px-5 py-4">
                          {isOut ? (
                            <span className="inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-600">
                              Out of stock
                            </span>
                          ) : isLow ? (
                            <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-600">
                              Low stock
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-green-50 px-3 py-1 text-xs font-black text-green-600">
                              Healthy
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                openHistory(
                                  product
                                )
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-100"
                            >
                              <Eye
                                size={15}
                              />
                              History
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                openAdjustment(
                                  product,
                                  "STOCK_RECEIVED"
                                )
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-700"
                            >
                              <ArrowUp
                                size={15}
                              />
                              Adjust
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =================================================
          RECENT INVENTORY ACTIVITY
      ================================================= */}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-black text-slate-950">
            Recent Inventory Activity
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            The latest stock movements recorded by
            MOVA.
          </p>
        </div>

        {transactions.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No inventory transactions have been
            recorded yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {transactions
              .slice(0, 10)
              .map((transaction) => {
                const increase =
                  isStockIncrease(
                    transaction.type
                  );

                return (
                  <div
                    key={transaction._id}
                    className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                          increase
                            ? "bg-green-50 text-green-600"
                            : "bg-red-50 text-red-600"
                        }`}
                      >
                        {increase ? (
                          <ArrowUp size={18} />
                        ) : (
                          <ArrowDown
                            size={18}
                          />
                        )}
                      </div>

                      <div>
                        <p className="font-bold text-slate-900">
                          {transaction
                            .productId
                            ?.name ||
                            "Product"}
                        </p>

                        <p className="text-xs text-slate-500">
                          {getTransactionLabel(
                            transaction.type
                          )}{" "}
                          •{" "}
                          {transaction.userId
                            ?.name ||
                            "System"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-6 sm:justify-end">
                      <div className="text-right">
                        <p
                          className={`font-black ${
                            increase
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {increase
                            ? "+"
                            : "-"}
                          {
                            transaction.quantity
                          }
                        </p>

                        <p className="text-[11px] text-slate-400">
                          {
                            transaction.stockBefore
                          }{" "}
                          →{" "}
                          {
                            transaction.stockAfter
                          }
                        </p>
                      </div>

                      <p className="text-xs text-slate-400">
                        {formatDate(
                          transaction.createdAt
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* =================================================
          ADJUSTMENT MODAL
      ================================================= */}

      {adjustmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="text-lg font-black text-slate-950">
                  Adjust Inventory
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {adjustmentModal.name}
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeAdjustment
                }
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={
                handleAdjustmentSubmit
              }
              className="space-y-5 p-6"
            >
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-500">
                    Current stock
                  </span>

                  <span className="text-xl font-black text-slate-950">
                    {
                      adjustmentModal.stockQuantity
                    }
                  </span>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Adjustment type
                </label>

                <select
                  name="type"
                  value={
                    adjustmentForm.type
                  }
                  onChange={
                    handleAdjustmentChange
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                >
                  <option value="STOCK_RECEIVED">
                    Stock Received
                  </option>

                  <option value="ADJUSTMENT_IN">
                    Adjustment In
                  </option>

                  <option value="ADJUSTMENT_OUT">
                    Adjustment Out
                  </option>

                  <option value="DAMAGE">
                    Damaged Stock
                  </option>

                  <option value="LOSS">
                    Lost Stock
                  </option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Quantity
                </label>

                <input
                  type="number"
                  min="1"
                  step="1"
                  name="quantity"
                  value={
                    adjustmentForm.quantity
                  }
                  onChange={
                    handleAdjustmentChange
                  }
                  placeholder="Enter quantity"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Reason
                </label>

                <input
                  type="text"
                  name="reason"
                  value={
                    adjustmentForm.reason
                  }
                  onChange={
                    handleAdjustmentChange
                  }
                  placeholder="Why is the stock changing?"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Notes
                  <span className="ml-1 font-normal text-slate-400">
                    (optional)
                  </span>
                </label>

                <textarea
                  name="notes"
                  value={
                    adjustmentForm.notes
                  }
                  onChange={
                    handleAdjustmentChange
                  }
                  rows="3"
                  placeholder="Additional information..."
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              {error && (
                <div className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={
                    closeAdjustment
                  }
                  disabled={
                    savingAdjustment
                  }
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    savingAdjustment
                  }
                  className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingAdjustment
                    ? "Saving..."
                    : "Save Adjustment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {scannerOpen && (
        <BarcodeScanner
          onDetected={handleBarcodeDetected}
          onClose={() => setScannerOpen(false)}
        />
      )}

      {/* =================================================
          HISTORY MODAL
      ================================================= */}

      {historyProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="text-lg font-black text-slate-950">
                  Inventory History
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {historyProduct.product
                    ?.name || "Product"}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setHistoryProduct(null)
                }
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="overflow-auto">
              {historyLoading ? (
                <div className="flex min-h-64 items-center justify-center">
                  <div className="text-center">
                    <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

                    <p className="mt-3 text-sm text-slate-500">
                      Loading history...
                    </p>
                  </div>
                </div>
              ) : historyProduct.transactions
                  ?.length === 0 ? (
                <div className="p-10 text-center text-sm text-slate-500">
                  No inventory movements have
                  been recorded for this product.
                </div>
              ) : (
                <table className="min-w-[800px] w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-left">
                      <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-slate-400">
                        Date
                      </th>

                      <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-slate-400">
                        Action
                      </th>

                      <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-slate-400">
                        Quantity
                      </th>

                      <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-slate-400">
                        Stock
                      </th>

                      <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-slate-400">
                        User
                      </th>

                      <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-slate-400">
                        Reason
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {historyProduct.transactions.map(
                      (transaction) => {
                        const increase =
                          isStockIncrease(
                            transaction.type
                          );

                        return (
                          <tr
                            key={
                              transaction._id
                            }
                            className="border-b border-slate-100 last:border-b-0"
                          >
                            <td className="px-6 py-4 text-sm text-slate-500">
                              {formatDate(
                                transaction.createdAt
                              )}
                            </td>

                            <td className="px-6 py-4">
                              <span className="font-bold text-slate-800">
                                {getTransactionLabel(
                                  transaction.type
                                )}
                              </span>
                            </td>

                            <td className="px-6 py-4">
                              <span
                                className={`font-black ${
                                  increase
                                    ? "text-green-600"
                                    : "text-red-600"
                                }`}
                              >
                                {increase
                                  ? "+"
                                  : "-"}
                                {
                                  transaction.quantity
                                }
                              </span>
                            </td>

                            <td className="px-6 py-4 text-sm font-bold text-slate-700">
                              {
                                transaction.stockBefore
                              }{" "}
                              →{" "}
                              {
                                transaction.stockAfter
                              }
                            </td>

                            <td className="px-6 py-4 text-sm text-slate-600">
                              {transaction
                                .userId
                                ?.name ||
                                "System"}
                            </td>

                            <td className="max-w-xs px-6 py-4 text-sm text-slate-500">
                              {transaction.reason ||
                                "-"}
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
