import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

import {
  AlertCircle,
  Check,
  Download,
  Edit3,
  FileUp,
  FolderPlus,
  ImagePlus,
  Package,
  Plus,
  RefreshCw,
  Search,
  ToggleLeft,
  ToggleRight,
  X,
} from "lucide-react";

import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import ProductImage from "../../components/products/ProductImage";

const emptyForm = {
  name: "",
  sku: "",
  barcode: "",
  image: "",
  description: "",
  categoryId: "",
  buyingPrice: "",
  sellingPrice: "",
  stockQuantity: "",
  minimumStock: "",
  unit: "piece",
  trackStock: true,
  stockRotation: "FIFO",
};

const emptyCategoryForm = {
  name: "",
  description: "",
};

const currency = new Intl.NumberFormat("en-UG", {
  style: "currency",
  currency: "UGX",
  maximumFractionDigits: 0,
});

const formatMoney = (amount) => {
  return currency.format(Number(amount) || 0);
};

const formatNumber = (value) => {
  return new Intl.NumberFormat("en-UG").format(
    Number(value) || 0
  );
};

const parseCsv = (text) => {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  const source = String(text || "").replace(/^\uFEFF/, "");
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (char === '"' && source[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && source[index + 1] === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = "";
    } else cell += char;
  }
  if (quoted) throw new Error("The CSV has an unclosed quoted field.");
  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
};

const downloadProductTemplate = () => {
  const csv = "name,sku,barcode,description,category,buyingPrice,sellingPrice,stockQuantity,minimumStock,unit,trackStock,stockRotation\n" +
    'Example product,SKU-001,,Optional description,,1000,1500,20,5,piece,true,FIFO\n';
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "mova-product-import-template.csv";
  link.click();
  URL.revokeObjectURL(url);
};

const resizeProductImage = (file) => new Promise((resolve, reject) => {
  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
    const maxDimension = 900;
    const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext("2d");
    if (!context) {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Unable to prepare this product image."));
      return;
    }
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    let dataUrl = canvas.toDataURL("image/webp", 0.78);
    if (!dataUrl.startsWith("data:image/webp")) dataUrl = canvas.toDataURL("image/jpeg", 0.78);
    if (dataUrl.length > 680000) {
      const smallerCanvas = document.createElement("canvas");
      smallerCanvas.width = Math.max(1, Math.round(canvas.width * 0.72));
      smallerCanvas.height = Math.max(1, Math.round(canvas.height * 0.72));
      smallerCanvas.getContext("2d")?.drawImage(canvas, 0, 0, smallerCanvas.width, smallerCanvas.height);
      dataUrl = smallerCanvas.toDataURL("image/jpeg", 0.65);
    }
    URL.revokeObjectURL(objectUrl);
    if (dataUrl.length > 700000) {
      reject(new Error("This image is still too large. Choose a smaller or more compressed photo."));
      return;
    }
    resolve(dataUrl);
  };
  image.onerror = () => {
    URL.revokeObjectURL(objectUrl);
    reject(new Error("Unable to read this image. Choose a JPG, PNG, or WebP photo."));
  };
  image.src = objectUrl;
});

const Products = () => {
  const { user } = useAuth();
  const location = useLocation();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingCategory, setSavingCategory] =
    useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [categoryError, setCategoryError] =
    useState("");
  const [categorySuccess, setCategorySuccess] =
    useState("");

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] =
    useState("");
  const [statusFilter, setStatusFilter] =
    useState("active");

  const [showModal, setShowModal] =
    useState(false);

  const [showCategoryModal, setShowCategoryModal] =
    useState(false);

  const [editingProduct, setEditingProduct] =
    useState(null);

  const [form, setForm] = useState(emptyForm);
  const imageInputRef = useRef(null);
  const importInputRef = useRef(null);
  const [processingImage, setProcessingImage] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState("");

  const [categoryForm, setCategoryForm] =
    useState(emptyCategoryForm);

  const canManageProducts = [
    "OWNER",
    "ADMIN",
    "MANAGER",
    "INVENTORY_MANAGER",
  ].includes(
    String(user?.role || "").toUpperCase()
  );

  const importProductsFromCsv = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    setSuccess("");
    setImportProgress("");
    setImporting(true);
    try {
      const rows = parseCsv(await file.text());
      if (rows.length < 2) throw new Error("Add at least one product row below the CSV header.");
      const headers = rows[0].map((header) => header.trim().toLowerCase());
      const required = ["name", "sku", "buyingprice", "sellingprice"];
      const missing = required.filter((header) => !headers.includes(header));
      if (missing.length) throw new Error(`CSV is missing required columns: ${missing.join(", ")}.`);
      const column = Object.fromEntries(headers.map((header, index) => [header, index]));
      const inputRows = rows.slice(1);
      if (inputRows.length > 500) throw new Error("Import up to 500 products at a time.");
      const categoryByName = new Map(categories.map((category) => [String(category.name || "").trim().toLowerCase(), category._id || category.id]));
      const knownSkus = new Set(products.map((product) => String(product.sku || "").trim().toUpperCase()));
      const failures = [];
      let imported = 0;
      for (let index = 0; index < inputRows.length; index += 1) {
        const cells = inputRows[index];
        const rowNumber = index + 2;
        const value = (name) => String(cells[column[name]] ?? "").trim();
        const name = value("name");
        const sku = value("sku").toUpperCase();
        const categoryName = value("category").toLowerCase();
        const numeric = (key, fallback) => {
          const raw = value(key);
          const number = raw === "" ? fallback : Number(raw);
          if (!Number.isFinite(number) || number < 0) throw new Error(`${key} must be a non-negative number`);
          return number;
        };
        try {
          if (!name || !sku) throw new Error("name and sku are required");
          if (knownSkus.has(sku)) throw new Error(`SKU ${sku} is already present in this product list or import`);
          const categoryId = categoryName ? categoryByName.get(categoryName) : null;
          if (categoryName && !categoryId) throw new Error(`category “${value("category")}” does not exist`);
          const rotation = (value("stockrotation") || "FIFO").toUpperCase();
          if (!["FIFO", "LIFO"].includes(rotation)) throw new Error("stockRotation must be FIFO or LIFO");
          const trackText = value("trackstock").toLowerCase();
          if (trackText && !["true", "false", "yes", "no", "1", "0"].includes(trackText)) throw new Error("trackStock must be true or false");
          const payload = {
            name, sku, barcode: value("barcode"), description: value("description"),
            categoryId, buyingPrice: numeric("buyingprice", 0), sellingPrice: numeric("sellingprice", 0),
            stockQuantity: numeric("stockquantity", 0), minimumStock: numeric("minimumstock", 0),
            unit: value("unit") || "piece", trackStock: trackText ? ["true", "yes", "1"].includes(trackText) : true,
            stockRotation: rotation,
          };
          await api.post("/products", payload);
          knownSkus.add(sku);
          imported += 1;
        } catch (rowError) {
          failures.push(`Row ${rowNumber}: ${rowError?.response?.data?.message || rowError.message || "could not be imported"}`);
        }
        setImportProgress(`Imported ${imported} of ${inputRows.length} products…`);
      }
      await fetchProducts({ silent: true });
      if (failures.length) {
        setError(`${imported} product${imported === 1 ? "" : "s"} imported; ${failures.length} row${failures.length === 1 ? "" : "s"} need attention. ${failures.slice(0, 3).join("; ")}${failures.length > 3 ? `; and ${failures.length - 3} more` : ""}`);
      } else setSuccess(`${imported} product${imported === 1 ? "" : "s"} imported successfully.`);
    } catch (importError) {
      setError(importError.message || "Unable to import this CSV file.");
    } finally {
      setImportProgress("");
      setImporting(false);
    }
  };

  // ==========================================================
  // FETCH PRODUCTS
  // ==========================================================

  const fetchProducts = async ({
    isRefresh = false,
    silent = false,
  } = {}) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else if (!silent) {
        setLoading(true);
      }

      if (!silent) {
        setError("");
      }

      const response = await api.get("/products", {
        params: {
          search: search.trim() || undefined,

          categoryId:
            categoryFilter || undefined,

          isActive:
            statusFilter === "all"
              ? undefined
              : statusFilter === "active",
        },
      });

      const returnedProducts =
        response?.data?.products ||
        response?.data?.data ||
        [];

      setProducts(
        Array.isArray(returnedProducts)
          ? returnedProducts
          : []
      );
    } catch (err) {
      console.error(
        "Failed to load products:",
        err
      );

      if (!silent) {
        setError(
          err?.response?.data?.message ||
            err?.response?.data?.error ||
            err?.message ||
            "Failed to load products."
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ==========================================================
  // FETCH CATEGORIES
  // ==========================================================

  const fetchCategories = async () => {
    try {
      const response = await api.get(
        "/categories"
      );

      const returnedCategories =
        response?.data?.categories ||
        response?.data?.data ||
        [];

      setCategories(
        Array.isArray(returnedCategories)
          ? returnedCategories
          : []
      );
    } catch (err) {
      console.error(
        "Failed to load categories:",
        err
      );

      setCategoryError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to load categories."
      );
    }
  };

  useEffect(() => {
    const globalSearch = new URLSearchParams(location.search).get("search");
    if (globalSearch !== null) setSearch(globalSearch);
  }, [location.search]);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
    }, 300);

    return () => clearTimeout(timer);
  }, [
    search,
    categoryFilter,
    statusFilter,
  ]);

  // ==========================================================
  // PRODUCT MODAL
  // ==========================================================

  const openAddModal = () => {
    setEditingProduct(null);

    setForm({
      ...emptyForm,
    });

    setError("");
    setSuccess("");

    setShowModal(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);

    setForm({
      name: product?.name || "",

      sku: product?.sku || "",

      barcode:
        product?.barcode || "",

      image:
        product?.image || "",

      description:
        product?.description || "",

      categoryId:
        product?.categoryId?._id ||
        product?.categoryId?.id ||
        product?.categoryId ||
        "",

      buyingPrice:
        product?.buyingPrice ?? "",

      sellingPrice:
        product?.sellingPrice ?? "",

      stockQuantity:
        product?.stockQuantity ??
        product?.stock ??
        "",

      minimumStock:
        product?.minimumStock ?? "",

      unit:
        product?.unit || "piece",

      trackStock:
        product?.trackStock ?? true,
      stockRotation: product?.stockRotation || "FIFO",
    });

    setError("");
    setSuccess("");

    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);

    setEditingProduct(null);

    setForm({
      ...emptyForm,
    });

    setError("");
  };

  // ==========================================================
  // CATEGORY MODAL
  // ==========================================================

  const openCategoryModal = () => {
    setCategoryForm({
      ...emptyCategoryForm,
    });

    setCategoryError("");
    setCategorySuccess("");

    setShowCategoryModal(true);
  };

  const closeCategoryModal = () => {
    if (savingCategory) return;

    setShowCategoryModal(false);

    setCategoryForm({
      ...emptyCategoryForm,
    });

    setCategoryError("");
  };

  const handleCategoryChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;

    setCategoryForm(
      (previous) => ({
        ...previous,
        [name]: value,
      })
    );
  };

  // ==========================================================
  // CREATE CATEGORY
  // ==========================================================

  const handleCreateCategory = async (
    event
  ) => {
    event.preventDefault();

    setCategoryError("");
    setCategorySuccess("");

    const name =
      categoryForm.name.trim();

    const description =
      categoryForm.description.trim();

    if (!name) {
      setCategoryError(
        "Category name is required."
      );

      return;
    }

    // Prevent obvious duplicate categories
    const duplicate =
      categories.some(
        (category) =>
          String(
            category?.name || ""
          )
            .trim()
            .toLowerCase() ===
          name.toLowerCase()
      );

    if (duplicate) {
      setCategoryError(
        "A category with this name already exists."
      );

      return;
    }

    try {
      setSavingCategory(true);

      const response =
        await api.post(
          "/categories",
          {
            name,
            description,
          }
        );

      const createdCategory =
        response?.data?.category ||
        response?.data?.data;

      // --------------------------------------------------------
      // REFRESH CATEGORY LIST
      // --------------------------------------------------------

      await fetchCategories();

      // --------------------------------------------------------
      // IF API RETURNS CREATED CATEGORY,
      // AUTOMATICALLY SELECT IT IN PRODUCT FORM
      // --------------------------------------------------------

      if (createdCategory) {
        const newCategoryId =
          createdCategory._id ||
          createdCategory.id;

        if (newCategoryId) {
          setForm(
            (previous) => ({
              ...previous,
              categoryId:
                newCategoryId,
            })
          );
        }
      }

      setCategorySuccess(
        "Category created successfully."
      );

      setSuccess(
        `Category "${name}" created successfully.`
      );

      // --------------------------------------------------------
      // CLOSE CATEGORY MODAL AFTER SHORT DELAY
      // --------------------------------------------------------

      setTimeout(() => {
        setShowCategoryModal(false);

        setCategoryForm({
          ...emptyCategoryForm,
        });

        setCategorySuccess("");
      }, 700);
    } catch (err) {
      console.error(
        "Failed to create category:",
        err
      );

      setCategoryError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Failed to create category."
      );
    } finally {
      setSavingCategory(false);
    }
  };

  // ==========================================================
  // PRODUCT FORM
  // ==========================================================

  const handleChange = (event) => {
    const {
      name,
      value,
      type,
      checked,
    } = event.target;

    setForm((previous) => ({
      ...previous,

      [name]:
        type === "checkbox"
          ? checked
          : value,
    }));
  };

  const handleProductImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";
    setError("");
    if (!file.type.startsWith("image/")) {
      setError("Choose a JPG, PNG, or WebP product image.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Choose a product image smaller than 10 MB.");
      return;
    }
    setProcessingImage(true);
    try {
      const image = await resizeProductImage(file);
      setForm((previous) => ({ ...previous, image }));
    } catch (imageError) {
      setError(imageError.message || "Unable to prepare this product image.");
    } finally {
      setProcessingImage(false);
    }
  };

  // ==========================================================
  // SAVE PRODUCT
  // ==========================================================

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const name =
      form.name.trim();

    const sku =
      form.sku
        .trim()
        .toUpperCase();

    const buyingPrice =
      Number(
        form.buyingPrice
      );

    const sellingPrice =
      Number(
        form.sellingPrice
      );

    const stockQuantity =
      Number(
        form.stockQuantity || 0
      );

    const minimumStock =
      Number(
        form.minimumStock || 0
      );

    if (!name) {
      setError(
        "Product name is required."
      );

      return;
    }

    if (!sku) {
      setError(
        "SKU/product code is required."
      );

      return;
    }

    if (
      form.buyingPrice === "" ||
      !Number.isFinite(
        buyingPrice
      ) ||
      buyingPrice < 0
    ) {
      setError(
        "Enter a valid buying price."
      );

      return;
    }

    if (
      form.sellingPrice === "" ||
      !Number.isFinite(
        sellingPrice
      ) ||
      sellingPrice < 0
    ) {
      setError(
        "Enter a valid selling price."
      );

      return;
    }

    if (
      !Number.isFinite(
        stockQuantity
      ) ||
      stockQuantity < 0
    ) {
      setError(
        "Stock quantity cannot be negative."
      );

      return;
    }

    if (
      !Number.isFinite(
        minimumStock
      ) ||
      minimumStock < 0
    ) {
      setError(
        "Minimum stock cannot be negative."
      );

      return;
    }

    if (
      sellingPrice <
      buyingPrice
    ) {
      const confirmed =
        window.confirm(
          "The selling price is lower than the buying price. This means the product will be sold at a loss. Do you want to continue?"
        );

      if (!confirmed) {
        return;
      }
    }

    const payload = {
      name,

      sku,

      barcode:
        form.barcode.trim(),

      image:
        form.image.trim(),

      description:
        form.description.trim(),

      categoryId:
        form.categoryId || null,

      buyingPrice,

      sellingPrice,

      stockQuantity,

      minimumStock,

      unit:
        form.unit.trim() ||
        "piece",

      trackStock:
        Boolean(
          form.trackStock
        ),

      stockRotation: form.stockRotation || "FIFO",
    };

    try {
      setSaving(true);

      if (editingProduct?._id) {
        await api.patch(
          `/products/${editingProduct._id}`,
          payload
        );

        setSuccess(
          "Product updated successfully."
        );
      } else {
        await api.post(
          "/products",
          payload
        );

        setSuccess(
          "Product added successfully."
        );
      }

      await fetchProducts({
        silent: true,
      });

      setTimeout(() => {
        setShowModal(false);

        setEditingProduct(null);

        setForm({
          ...emptyForm,
        });

        setSuccess("");
      }, 700);
    } catch (err) {
      console.error(
        "Failed to save product:",
        err
      );

      const message =
        err?.response?.data
          ?.message ||
        err?.response?.data
          ?.error ||
        err?.message ||
        "Failed to save product.";

      setError(message);
    } finally {
      setSaving(false);
    }
  };

  // ==========================================================
  // TOGGLE PRODUCT STATUS
  // ==========================================================

  const toggleProductStatus =
    async (product) => {
      if (!product?._id) {
        setError(
          "This product does not have a valid ID."
        );

        return;
      }

      try {
        setError("");
        setSuccess("");

        const action =
          product.isActive
            ? "deactivate"
            : "activate";

        await api.patch(
          `/products/${product._id}/${action}`
        );

        setSuccess(
          product.isActive
            ? "Product deactivated successfully."
            : "Product activated successfully."
        );

        await fetchProducts({
          silent: true,
        });

        setTimeout(() => {
          setSuccess("");
        }, 2000);
      } catch (err) {
        console.error(
          "Failed to update product status:",
          err
        );

        setError(
          err?.response?.data
            ?.message ||
            err?.response?.data
              ?.error ||
            err?.message ||
            "Failed to update product status."
        );
      }
    };

  // ==========================================================
  // CATEGORY NAME
  // ==========================================================

  const getCategoryName = (
    product
  ) => {
    if (
      product?.categoryId?.name
    ) {
      return product.categoryId.name;
    }

    const categoryId =
      product?.categoryId?._id ||
      product?.categoryId?.id ||
      product?.categoryId;

    const category =
      categories.find(
        (item) =>
          item?._id ===
            categoryId ||
          item?.id === categoryId
      );

    return (
      category?.name ||
      "Uncategorized"
    );
  };

  // ==========================================================
  // STOCK
  // ==========================================================

  const getProductStock = (
    product
  ) => {
    return Number(
      product?.stockQuantity ??
        product?.stock ??
        0
    );
  };

  const getMinimumStock = (
    product
  ) => {
    return Number(
      product?.minimumStock ?? 0
    );
  };

  // ==========================================================
  // STATISTICS
  // ==========================================================

  const statistics = useMemo(() => {
    const activeProducts =
      products.filter(
        (product) =>
          product?.isActive
      );

    const lowStock =
      activeProducts.filter(
        (product) => {
          if (
            !product?.trackStock
          ) {
            return false;
          }

          return (
            getProductStock(
              product
            ) <=
            getMinimumStock(
              product
            )
          );
        }
      );

    const totalStockValue =
      activeProducts.reduce(
        (
          total,
          product
        ) => {
          const buyingPrice =
            Number(
              product?.buyingPrice ||
                0
            );

          const stock =
            getProductStock(
              product
            );

          return (
            total +
            buyingPrice *
              stock
          );
        },
        0
      );

    const potentialSalesValue =
      activeProducts.reduce(
        (
          total,
          product
        ) => {
          const sellingPrice =
            Number(
              product?.sellingPrice ||
                0
            );

          const stock =
            getProductStock(
              product
            );

          return (
            total +
            sellingPrice *
              stock
          );
        },
        0
      );

    return {
      total:
        products.length,

      active:
        activeProducts.length,

      lowStock:
        lowStock.length,

      stockValue:
        totalStockValue,

      potentialSalesValue,
    };
  }, [products]);

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div className="space-y-6">
      {/* =====================================================
          HEADER
      ====================================================== */}

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
            Manage your products,
            pricing, stock levels,
            categories and
            availability from one
            place.
          </p>
        </div>

        {/* ACTION BUTTONS */}

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {canManageProducts && (
            <>
              <input
                ref={importInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={importProductsFromCsv}
                className="hidden"
                aria-label="Choose a product CSV file"
              />
              <button
                type="button"
                onClick={downloadProductTemplate}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                <Download size={17} /> CSV template
              </button>
              <button
                type="button"
                onClick={() => importInputRef.current?.click()}
                disabled={importing}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700 transition hover:bg-blue-100 disabled:cursor-wait disabled:opacity-60"
              >
                <FileUp size={17} /> {importing ? "Importing…" : "Import CSV"}
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() =>
              fetchProducts({
                isRefresh: true,
              })
            }
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              size={17}
              className={
                refreshing
                  ? "animate-spin"
                  : ""
              }
            />

            {refreshing
              ? "Refreshing..."
              : "Refresh"}
          </button>

          {canManageProducts && (
            <>
              {/* ADD CATEGORY */}

              <button
                type="button"
                onClick={
                  openCategoryModal
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-bold text-blue-700 transition hover:bg-blue-100"
              >
                <FolderPlus
                  size={18}
                />

                Add Category
              </button>

              {/* ADD PRODUCT */}

              <button
                type="button"
                onClick={
                  openAddModal
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
              >
                <Plus size={18} />

                Add Product
              </button>
            </>
          )}
        </div>
      </div>

      {importProgress && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700" role="status" aria-live="polite">
          {importProgress}
        </div>
      )}

      {/* =====================================================
          ALERTS
      ====================================================== */}

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle
            className="mt-0.5 shrink-0"
            size={18}
          />

          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-700">
          <Check size={18} />

          {success}
        </div>
      )}

      {/* =====================================================
          CATEGORY SUMMARY
      ====================================================== */}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-blue-600">
              Categories
            </p>

            <h2 className="mt-1 text-lg font-black text-slate-900">
              Product Categories
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Organize products into
              categories for easier
              management and reporting.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600">
              {formatNumber(
                categories.length
              )}{" "}
              categor
              {categories.length === 1
                ? "y"
                : "ies"}
            </span>

            {canManageProducts && (
              <button
                type="button"
                onClick={
                  openCategoryModal
                }
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-600/20 hover:bg-blue-700"
              >
                <Plus size={17} />

                New Category
              </button>
            )}
          </div>
        </div>

        {categoryError && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {categoryError}
          </div>
        )}

        {categories.length > 0 ? (
          <div className="mt-5 flex flex-wrap gap-2">
            {categories.map(
              (category) => (
                <button
                  type="button"
                  key={
                    category._id ||
                    category.id
                  }
                  onClick={() =>
                    setCategoryFilter(
                      category._id ||
                        category.id
                    )
                  }
                  className={`rounded-xl border px-4 py-2 text-sm font-bold transition ${
                    categoryFilter ===
                    (category._id ||
                      category.id)
                      ? "border-blue-300 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                  }`}
                >
                  {category.name}
                </button>
              )
            )}

            {categoryFilter && (
              <button
                type="button"
                onClick={() =>
                  setCategoryFilter("")
                }
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-50"
              >
                Clear category
              </button>
            )}
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
            <p className="text-sm font-semibold text-slate-600">
              No categories have been
              created yet.
            </p>

            {canManageProducts && (
              <button
                type="button"
                onClick={
                  openCategoryModal
                }
                className="mt-3 text-sm font-bold text-blue-600 hover:text-blue-700"
              >
                Create your first
                category
              </button>
            )}
          </div>
        )}
      </div>

      {/* =====================================================
          STATISTICS
      ====================================================== */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Products"
          value={formatNumber(
            statistics.total
          )}
          description="Products returned"
        />

        <StatCard
          label="Active Products"
          value={formatNumber(
            statistics.active
          )}
          description="Currently available"
          valueClass="text-green-600"
        />

        <StatCard
          label="Low Stock"
          value={formatNumber(
            statistics.lowStock
          )}
          description="Need attention"
          valueClass="text-amber-600"
        />

        <StatCard
          label="Stock Value"
          value={formatMoney(
            statistics.stockValue
          )}
          description="At buying price"
        />
      </div>

      {/* =====================================================
          POTENTIAL SALES VALUE
      ====================================================== */}

      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-blue-500">
              Potential Sales Value
            </p>

            <p className="mt-1 text-2xl font-black text-blue-900">
              {formatMoney(
                statistics.potentialSalesValue
              )}
            </p>

            <p className="mt-1 text-xs text-blue-600">
              Estimated value of current
              tracked stock at selling
              prices.
            </p>
          </div>

          <div className="rounded-xl bg-white px-4 py-3 text-sm font-bold text-blue-700 shadow-sm">
            {formatNumber(
              statistics.active
            )}{" "}
            active products
          </div>
        </div>
      </div>

      {/* =====================================================
          FILTERS
      ====================================================== */}

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
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search by product name, SKU or barcode..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(event) =>
              setCategoryFilter(
                event.target.value
              )
            }
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
          >
            <option value="">
              All categories
            </option>

            {categories.map(
              (category) => (
                <option
                  key={
                    category._id ||
                    category.id
                  }
                  value={
                    category._id ||
                    category.id
                  }
                >
                  {category.name}
                </option>
              )
            )}
          </select>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value
              )
            }
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
          >
            <option value="active">
              Active
            </option>

            <option value="all">
              All products
            </option>
          </select>
        </div>
      </div>

      {/* =====================================================
          PRODUCTS TABLE
      ====================================================== */}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-black text-slate-900">
              Product Catalogue
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {formatNumber(
                products.length
              )}{" "}
              product
              {products.length ===
              1
                ? ""
                : "s"}{" "}
              found
            </p>
          </div>

          {search && (
            <button
              type="button"
              onClick={() =>
                setSearch("")
              }
              className="text-xs font-bold text-blue-600 hover:text-blue-700"
            >
              Clear search
            </button>
          )}
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
        ) : products.length ===
          0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Package size={25} />
            </div>

            <h3 className="mt-4 font-bold text-slate-900">
              No products found
            </h3>

            <p className="mt-1 max-w-md text-sm text-slate-500">
              Add your first product
              or change the
              search/filter options.
            </p>

            {canManageProducts && (
              <button
                type="button"
                onClick={
                  openAddModal
                }
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
              >
                <Plus size={17} />

                Add Product
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1100px] w-full">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs font-black uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-4">
                    Product
                  </th>

                  <th className="px-5 py-4">
                    SKU
                  </th>

                  <th className="px-5 py-4">
                    Category
                  </th>

                  <th className="px-5 py-4">
                    Buying
                  </th>

                  <th className="px-5 py-4">
                    Selling
                  </th>

                  <th className="px-5 py-4">
                    Margin
                  </th>

                  <th className="px-5 py-4">
                    Stock
                  </th>

                  <th className="px-5 py-4">
                    Status
                  </th>

                  {canManageProducts && (
                    <th className="px-5 py-4 text-right">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {products.map(
                  (product) => {
                    const stock =
                      getProductStock(
                        product
                      );

                    const minimumStock =
                      getMinimumStock(
                        product
                      );

                    const lowStock =
                      Boolean(
                        product?.trackStock
                      ) &&
                      stock <=
                        minimumStock;

                    const buyingPrice =
                      Number(
                        product?.buyingPrice ||
                          0
                      );

                    const sellingPrice =
                      Number(
                        product?.sellingPrice ||
                          0
                      );

                    const margin =
                      sellingPrice -
                      buyingPrice;

                    const marginPercent =
                      buyingPrice > 0
                        ? (margin /
                            buyingPrice) *
                          100
                        : 0;

                    return (
                      <tr
                        key={
                          product._id ||
                          product.id
                        }
                        className="transition hover:bg-slate-50/70"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <ProductImage product={product} className="h-12 w-12 shrink-0 rounded-xl object-cover" />

                            <div className="min-w-0">
                              <p className="truncate font-bold text-slate-900">
                                {product.name ||
                                  "Unnamed Product"}
                              </p>

                              {product.barcode && (
                                <p className="mt-1 truncate text-xs text-slate-400">
                                  Barcode:{" "}
                                  {product.barcode}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs font-bold text-slate-600">
                            {product.sku ||
                              "—"}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-sm font-medium text-slate-600">
                          {getCategoryName(
                            product
                          )}
                        </td>

                        <td className="px-5 py-4 text-sm font-semibold text-slate-700">
                          {formatMoney(
                            buyingPrice
                          )}
                        </td>

                        <td className="px-5 py-4 text-sm font-bold text-slate-900">
                          {formatMoney(
                            sellingPrice
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <p
                            className={`text-sm font-black ${
                              margin >= 0
                                ? "text-emerald-600"
                                : "text-red-600"
                            }`}
                          >
                            {formatMoney(
                              margin
                            )}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            {marginPercent.toFixed(
                              1
                            )}
                            %
                          </p>
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
                                {formatNumber(
                                  stock
                                )}
                              </span>

                              <span className="ml-1 text-xs text-slate-400">
                                {product.unit ||
                                  "piece"}
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
                                type="button"
                                onClick={() =>
                                  openEditModal(
                                    product
                                  )
                                }
                                className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                                title="Edit product"
                              >
                                <Edit3
                                  size={16}
                                />
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  toggleProductStatus(
                                    product
                                  )
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
                                  <ToggleRight
                                    size={17}
                                  />
                                ) : (
                                  <ToggleLeft
                                    size={17}
                                  />
                                )}
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =====================================================
          ADD / EDIT PRODUCT MODAL
      ====================================================== */}

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
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
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
                  <AlertCircle
                    size={18}
                    className="mt-0.5 shrink-0"
                  />

                  <span>{error}</span>
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
                    onChange={
                      handleChange
                    }
                    placeholder="e.g. Premium Sugar 1KG"
                    required
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
                    onChange={
                      handleChange
                    }
                    placeholder="e.g. SUG-001"
                    required
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
                    onChange={
                      handleChange
                    }
                    placeholder="Scan or enter barcode"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>

                {/* CATEGORY */}

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="block text-sm font-bold text-slate-700">
                      Category
                    </label>

                    {canManageProducts && (
                      <button
                        type="button"
                        onClick={
                          openCategoryModal
                        }
                        className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700"
                      >
                        <Plus
                          size={14}
                        />

                        New
                      </button>
                    )}
                  </div>

                  <select
                    name="categoryId"
                    value={
                      form.categoryId
                    }
                    onChange={
                      handleChange
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  >
                    <option value="">
                      Uncategorized
                    </option>

                    {categories.map(
                      (category) => (
                        <option
                          key={
                            category._id ||
                            category.id
                          }
                          value={
                            category._id ||
                            category.id
                          }
                        >
                          {
                            category.name
                          }
                        </option>
                      )
                    )}
                  </select>

                  {categories.length ===
                    0 && (
                    <p className="mt-2 text-xs text-amber-600">
                      No categories are
                      available yet. Click
                      "New" above to create
                      one.
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
                    onChange={
                      handleChange
                    }
                    placeholder="piece, kg, litre..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">Stock rotation</label>
                  <select name="stockRotation" value={form.stockRotation || "FIFO"} onChange={handleChange} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10">
                    <option value="FIFO">FIFO · oldest batch first</option>
                    <option value="LIFO">LIFO · newest batch first</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Buying price *
                  </label>

                  <input
                    name="buyingPrice"
                    type="number"
                    min="0"
                    step="1"
                    value={
                      form.buyingPrice
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="3500"
                    required
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
                    step="1"
                    value={
                      form.sellingPrice
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="4500"
                    required
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
                    step="1"
                    value={
                      form.stockQuantity
                    }
                    onChange={
                      handleChange
                    }
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
                    step="1"
                    value={
                      form.minimumStock
                    }
                    onChange={
                      handleChange
                    }
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
                    value={
                      form.description
                    }
                    onChange={
                      handleChange
                    }
                    rows="3"
                    placeholder="Describe the product..."
                    className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-bold text-slate-700">Product photo</label>
                  <div className="flex flex-col gap-4 rounded-2xl border border-dashed border-blue-200 bg-blue-50/40 p-4 sm:flex-row sm:items-center">
                    <ProductImage product={{ name: form.name || "Product preview", image: form.image }} className="h-28 w-28 shrink-0 rounded-2xl object-cover shadow-sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-800">Add a clear product photo</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">Choose a photo from this device. MOVA resizes it so it loads quickly in the catalogue and cashier screen.</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleProductImage} className="sr-only" />
                        <button type="button" disabled={processingImage || saving} onClick={() => imageInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3.5 py-2.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"><ImagePlus size={15} />{processingImage ? "Preparing photo…" : form.image ? "Replace photo" : "Upload photo"}</button>
                        {form.image && <button type="button" disabled={saving} onClick={() => setForm((previous) => ({ ...previous, image: "" }))} className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50">Remove photo</button>}
                      </div>
                      <label className="mt-3 block text-[11px] font-semibold text-slate-500">Or paste an image link
                        <input name="image" type="text" value={form.image.startsWith("data:image/") ? "" : form.image} onChange={handleChange} placeholder="https://…" className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-normal outline-none focus:border-blue-500" />
                      </label>
                    </div>
                  </div>
                </div>

                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
                  <input
                    name="trackStock"
                    type="checkbox"
                    checked={
                      form.trackStock
                    }
                    onChange={
                      handleChange
                    }
                    className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />

                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      Track inventory for
                      this product
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      MOVA will monitor stock
                      and generate low-stock
                      alerts.
                    </p>
                  </div>
                </label>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={
                    closeModal
                  }
                  disabled={saving}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
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

      {/* =====================================================
          CATEGORY MODAL
      ====================================================== */}

      {showCategoryModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
            {/* HEADER */}

            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <FolderPlus
                    size={21}
                  />
                </div>

                <div>
                  <h2 className="text-xl font-black text-slate-950">
                    Add Category
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Create a category for
                    organizing your products.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={
                  closeCategoryModal
                }
                disabled={
                  savingCategory
                }
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            {/* FORM */}

            <form
              onSubmit={
                handleCreateCategory
              }
              className="space-y-5 p-6"
            >
              {categoryError && (
                <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  <AlertCircle
                    size={18}
                    className="mt-0.5 shrink-0"
                  />

                  <span>
                    {categoryError}
                  </span>
                </div>
              )}

              {categorySuccess && (
                <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-700">
                  <Check
                    size={18}
                  />

                  {categorySuccess}
                </div>
              )}

              {/* NAME */}

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Category name *
                </label>

                <input
                  type="text"
                  name="name"
                  value={
                    categoryForm.name
                  }
                  onChange={
                    handleCategoryChange
                  }
                  placeholder="e.g. Beverages"
                  required
                  autoFocus
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              {/* DESCRIPTION */}

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Description
                </label>

                <textarea
                  name="description"
                  value={
                    categoryForm.description
                  }
                  onChange={
                    handleCategoryChange
                  }
                  rows="3"
                  placeholder="e.g. Soft drinks, juices and bottled water"
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              {/* ACTIONS */}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={
                    closeCategoryModal
                  }
                  disabled={
                    savingCategory
                  }
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    savingCategory
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingCategory ? (
                    <>
                      <RefreshCw
                        size={17}
                        className="animate-spin"
                      />

                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus size={17} />

                      Create Category
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// STAT CARD
// ============================================================

const StatCard = ({
  label,
  value,
  description,
  valueClass = "text-slate-950",
}) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">
        {label}
      </p>

      <p
        className={`mt-2 text-2xl font-black ${valueClass}`}
      >
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-400">
        {description}
      </p>
    </div>
  );
};

export default Products;
