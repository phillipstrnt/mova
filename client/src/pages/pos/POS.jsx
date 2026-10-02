import { useEffect, useMemo, useState } from "react";
import Receipt from "../receipts/Receipts";

import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Search,
  ShoppingCart,
  Smartphone,
  User,
  UserPlus,
  Wallet,
  X,
} from "lucide-react";

import api from "../../services/api";

const PAYMENT_METHODS = [
  {
    value: "CASH",
    label: "Cash",
    icon: Wallet,
  },
  {
    value: "MOBILE_MONEY",
    label: "Mobile Money",
    icon: Smartphone,
  },
  {
    value: "CARD",
    label: "Card",
    icon: CreditCard,
  },
  {
    value: "BANK",
    label: "Bank",
    icon: CreditCard,
  },
];

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);
};

const POS = () => {
  // ====================================================
  // PRODUCTS
  // ====================================================

  const [products, setProducts] = useState([]);

  const [productSearch, setProductSearch] =
    useState("");

  const [loadingProducts, setLoadingProducts] =
    useState(true);

  // ====================================================
  // CART
  // ====================================================

  const [cart, setCart] = useState([]);

  const [discount, setDiscount] =
    useState(0);

  // ====================================================
  // PAYMENT
  // ====================================================

  const [paymentMethod, setPaymentMethod] =
    useState("CASH");

  // ====================================================
  // CUSTOMER
  // ====================================================

  const [customerSearch, setCustomerSearch] =
    useState("");

  const [customers, setCustomers] =
    useState([]);

  const [selectedCustomer, setSelectedCustomer] =
    useState(null);

  const [searchingCustomers, setSearchingCustomers] =
    useState(false);

  const [customerPanelOpen, setCustomerPanelOpen] =
    useState(false);

  // ====================================================
  // SALE
  // ====================================================

  const [processingSale, setProcessingSale] =
    useState(false);

  const [saleSuccess, setSaleSuccess] =
    useState(null);

  const [error, setError] =
    useState("");

  // ====================================================
  // RECEIPT
  // ====================================================

  const [showReceipt, setShowReceipt] =
    useState(false);

  const [completedSale, setCompletedSale] =
    useState(null);

  const [completedCustomer, setCompletedCustomer] =
    useState(null);

  // ====================================================
  // FETCH PRODUCTS
  // ====================================================

  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);

      const response =
        await api.get("/products", {
          params: {
            limit: 100,
            status: "active",
          },
        });

      setProducts(
        response.data.products || []
      );
    } catch (error) {
      console.error(
        "Failed to load products:",
        error
      );

      setError(
        error.response?.data?.message ||
          "Failed to load products."
      );
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // ====================================================
  // SEARCH CUSTOMERS
  // ====================================================

  useEffect(() => {
    const searchCustomers = async () => {
      if (!customerSearch.trim()) {
        setCustomers([]);
        return;
      }

      try {
        setSearchingCustomers(true);

        const response =
          await api.get("/customers", {
            params: {
              search:
                customerSearch.trim(),

              limit: 10,

              status: "active",
            },
          });

        setCustomers(
          response.data.customers || []
        );
      } catch (error) {
        console.error(
          "Customer search failed:",
          error
        );
      } finally {
        setSearchingCustomers(false);
      }
    };

    const timer =
      setTimeout(
        searchCustomers,
        300
      );

    return () =>
      clearTimeout(timer);
  }, [customerSearch]);

  // ====================================================
  // FILTER PRODUCTS
  // ====================================================

  const filteredProducts =
    useMemo(() => {
      const search =
        productSearch
          .trim()
          .toLowerCase();

      if (!search) {
        return products;
      }

      return products.filter(
        (product) =>
          product.name
            ?.toLowerCase()
            .includes(search) ||
          product.sku
            ?.toLowerCase()
            .includes(search) ||
          product.barcode
            ?.toLowerCase()
            .includes(search)
      );
    }, [
      products,
      productSearch,
    ]);

  // ====================================================
  // CART TOTALS
  // ====================================================

  const subtotal =
    useMemo(() => {
      return cart.reduce(
        (sum, item) =>
          sum +
          Number(item.sellingPrice || 0) *
            item.quantity,
        0
      );
    }, [cart]);

  const parsedDiscount =
    Number(discount) || 0;

  const total =
    Math.max(
      subtotal -
        parsedDiscount,
      0
    );

  // ====================================================
  // ADD PRODUCT TO CART
  // ====================================================

  const addToCart = (product) => {
    setError("");

    setCart((currentCart) => {
      const existing =
        currentCart.find(
          (item) =>
            item._id ===
            product._id
        );

      if (existing) {
        if (
          product.trackStock &&
          existing.quantity >=
            product.stockQuantity
        ) {
          setError(
            `Only ${product.stockQuantity} units of ${product.name} are available.`
          );

          return currentCart;
        }

        return currentCart.map(
          (item) =>
            item._id ===
            product._id
              ? {
                  ...item,
                  quantity:
                    item.quantity + 1,
                }
              : item
        );
      }

      if (
        product.trackStock &&
        product.stockQuantity <= 0
      ) {
        setError(
          `${product.name} is out of stock.`
        );

        return currentCart;
      }

      return [
        ...currentCart,
        {
          ...product,
          quantity: 1,
        },
      ];
    });
  };

  // ====================================================
  // INCREASE QUANTITY
  // ====================================================

  const increaseQuantity = (
    productId
  ) => {
    setCart((currentCart) =>
      currentCart.map((item) => {
        if (
          item._id !== productId
        ) {
          return item;
        }

        if (
          item.trackStock &&
          item.quantity >=
            item.stockQuantity
        ) {
          setError(
            `Only ${item.stockQuantity} units of ${item.name} are available.`
          );

          return item;
        }

        return {
          ...item,
          quantity:
            item.quantity + 1,
        };
      })
    );
  };

  // ====================================================
  // DECREASE QUANTITY
  // ====================================================

  const decreaseQuantity = (
    productId
  ) => {
    setCart((currentCart) =>
      currentCart
        .map((item) =>
          item._id === productId
            ? {
                ...item,
                quantity:
                  item.quantity - 1,
              }
            : item
        )
        .filter(
          (item) =>
            item.quantity > 0
        )
    );
  };

  // ====================================================
  // REMOVE CART ITEM
  // ====================================================

  const removeFromCart = (
    productId
  ) => {
    setCart((currentCart) =>
      currentCart.filter(
        (item) =>
          item._id !== productId
      )
    );
  };

  // ====================================================
  // CLEAR CART
  // ====================================================

  const clearCart = () => {
    setCart([]);
    setDiscount(0);
    setError("");
  };

  // ====================================================
  // SELECT CUSTOMER
  // ====================================================

  const selectCustomer = (
    customer
  ) => {
    setSelectedCustomer(customer);
    setCustomerSearch("");
    setCustomers([]);
    setCustomerPanelOpen(false);
    setError("");
  };

  // ====================================================
  // REMOVE CUSTOMER
  // ====================================================

  const removeCustomer = () => {
    setSelectedCustomer(null);
  };

  // ====================================================
  // CLOSE RECEIPT
  // ====================================================

  const closeReceipt = () => {
    setShowReceipt(false);
  };

  // ====================================================
  // START NEW SALE
  // ====================================================

  const startNewSale = () => {
    setShowReceipt(false);
    setCompletedSale(null);
    setCompletedCustomer(null);
    setSaleSuccess(null);
    setError("");
    setPaymentMethod("CASH");
    setDiscount(0);
    setCart([]);
    setSelectedCustomer(null);
    setCustomerSearch("");
  };

  // ====================================================
  // COMPLETE SALE
  // ====================================================

  const completeSale = async () => {
    setError("");
    setSaleSuccess(null);

    if (cart.length === 0) {
      setError(
        "Add at least one product to the cart."
      );

      return;
    }

    if (
      parsedDiscount >
      subtotal
    ) {
      setError(
        "Discount cannot be greater than the subtotal."
      );

      return;
    }

    try {
      setProcessingSale(true);

      const payload = {
        items: cart.map(
          (item) => ({
            productId:
              item._id,

            quantity:
              item.quantity,
          })
        ),

        discount:
          parsedDiscount,

        paymentMethod,

        customerId:
          selectedCustomer?._id ||
          null,
      };

      const response =
        await api.post(
          "/sales",
          payload
        );

      const sale =
        response.data.sale;

      if (!sale) {
        throw new Error(
          "Sale was completed but no sale information was returned."
        );
      }

      /*
      |--------------------------------------------------------------------------
      | SAVE COMPLETED SALE
      |--------------------------------------------------------------------------
      */

      setCompletedSale({
        ...sale,

        /*
        | The backend already returns sale items.
        | Keep them exactly as returned.
        */
        items:
          sale.items || [],
      });

      /*
      |--------------------------------------------------------------------------
      | SAVE CUSTOMER
      |--------------------------------------------------------------------------
      */

      const saleCustomer =
        response.data.customer ||
        selectedCustomer ||
        null;

      setCompletedCustomer(
        saleCustomer
      );

      /*
      |--------------------------------------------------------------------------
      | SUCCESS INFORMATION
      |--------------------------------------------------------------------------
      */

      setSaleSuccess({
        receiptNumber:
          sale.receiptNumber,

        total:
          sale.total,

        paymentMethod:
          sale.paymentMethod,

        customer:
          saleCustomer,
      });

      /*
      |--------------------------------------------------------------------------
      | CLEAR CURRENT SALE
      |--------------------------------------------------------------------------
      */

      setCart([]);

      setDiscount(0);

      setSelectedCustomer(null);

      setCustomerSearch("");

      /*
      |--------------------------------------------------------------------------
      | REFRESH PRODUCTS
      |--------------------------------------------------------------------------
      */

      await fetchProducts();

      /*
      |--------------------------------------------------------------------------
      | OPEN RECEIPT
      |--------------------------------------------------------------------------
      */

      setShowReceipt(true);
    } catch (error) {
      console.error(
        "Sale failed:",
        error
      );

      setError(
        error.response?.data?.message ||
          error.message ||
          "Failed to complete sale."
      );
    } finally {
      setProcessingSale(false);
    }
  };

  // ====================================================
  // SUCCESS SCREEN
  // ====================================================

  if (saleSuccess) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-3xl border border-emerald-200 bg-white p-8 text-center shadow-sm">

          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2
              size={42}
              className="text-emerald-600"
            />
          </div>

          <h1 className="mt-6 text-3xl font-black text-slate-900">
            Sale Completed
          </h1>

          <p className="mt-2 text-slate-500">
            The transaction was
            successfully recorded.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">

            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Receipt
              </p>

              <p className="mt-2 font-black text-slate-900">
                {
                  saleSuccess.receiptNumber
                }
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Total
              </p>

              <p className="mt-2 text-xl font-black text-blue-600">
                {formatCurrency(
                  saleSuccess.total
                )}
              </p>
            </div>

          </div>

          {saleSuccess.customer && (
            <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-5 text-left">

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                  <User
                    size={20}
                    className="text-blue-600"
                  />
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-blue-500">
                    Customer
                  </p>

                  <p className="font-bold text-slate-900">
                    {
                      saleSuccess
                        .customer
                        .name
                    }
                  </p>
                </div>

              </div>

            </div>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">

            <button
              type="button"
              onClick={() =>
                setShowReceipt(true)
              }
              className="rounded-xl border border-blue-200 bg-blue-50 px-6 py-3 font-bold text-blue-600 transition hover:bg-blue-100"
            >
              View Receipt
            </button>

            <button
              type="button"
              onClick={startNewSale}
              className="rounded-xl bg-blue-600 px-6 py-3 font-bold text-white transition hover:bg-blue-700"
            >
              New Sale
            </button>

          </div>

        </div>

        {/* ====================================================
            RECEIPT MODAL
        ==================================================== */}

        {showReceipt &&
          completedSale && (
            <Receipt
              sale={completedSale}
              customer={
                completedCustomer
              }
              onClose={
                closeReceipt
              }
              onNewSale={
                startNewSale
              }
            />
          )}
      </div>
    );
  }

  // ====================================================
  // MAIN POS
  // ====================================================

  return (
    <div className="space-y-6">

      {/* ====================================================
          HEADER
      ==================================================== */}

      <div>
        <h1 className="text-3xl font-black text-slate-900">
          Point of Sale
        </h1>

        <p className="mt-1 text-slate-500">
          Sell products quickly and
          accurately.
        </p>
      </div>

      {/* ====================================================
          ERROR
      ==================================================== */}

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">

          <AlertCircle
            size={20}
            className="mt-0.5 shrink-0"
          />

          <p className="text-sm font-medium">
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              setError("")
            }
            className="ml-auto"
          >
            <X size={18} />
          </button>

        </div>
      )}

      {/* ====================================================
          CUSTOMER SECTION
      ==================================================== */}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50">
              <User
                size={21}
                className="text-blue-600"
              />
            </div>

            <div>
              <h2 className="font-bold text-slate-900">
                Customer
              </h2>

              <p className="text-sm text-slate-500">
                Optional — walk-in
                customers are supported.
              </p>
            </div>

          </div>

          {selectedCustomer ? (
            <div className="flex flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 sm:flex-row sm:items-center">

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100">
                <User
                  size={19}
                  className="text-blue-600"
                />
              </div>

              <div className="min-w-0 flex-1">

                <p className="font-bold text-slate-900">
                  {
                    selectedCustomer.name
                  }
                </p>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">

                  {selectedCustomer.phone && (
                    <span>
                      {
                        selectedCustomer.phone
                      }
                    </span>
                  )}

                  <span>
                    Spent:{" "}
                    {formatCurrency(
                      selectedCustomer.totalSpent
                    )}
                  </span>

                  <span>
                    Credit:{" "}
                    {formatCurrency(
                      selectedCustomer.outstandingBalance
                    )}
                  </span>

                </div>

              </div>

              <button
                type="button"
                onClick={
                  removeCustomer
                }
                className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-red-600"
              >
                <X size={18} />
              </button>

            </div>
          ) : (
            <button
              type="button"
              onClick={() =>
                setCustomerPanelOpen(
                  (open) => !open
                )
              }
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
            >
              <UserPlus size={18} />

              Select Customer

              {customerPanelOpen ? (
                <ChevronUp size={17} />
              ) : (
                <ChevronDown size={17} />
              )}
            </button>
          )}

        </div>

        {/* CUSTOMER SEARCH */}

        {customerPanelOpen &&
          !selectedCustomer && (
            <div className="mt-5 border-t border-slate-100 pt-5">

              <div className="relative">

                <Search
                  size={19}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="text"
                  value={
                    customerSearch
                  }
                  onChange={(event) =>
                    setCustomerSearch(
                      event.target.value
                    )
                  }
                  placeholder="Search customer by name, phone or email..."
                  className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  autoFocus
                />

              </div>

              {searchingCustomers && (
                <p className="mt-3 text-sm text-slate-500">
                  Searching customers...
                </p>
              )}

              {!searchingCustomers &&
                customerSearch.trim() &&
                customers.length ===
                  0 && (
                  <div className="mt-4 rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500">
                    No customers found.
                  </div>
                )}

              {customers.length >
                0 && (
                <div className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">

                  {customers.map(
                    (customer) => (
                      <button
                        key={
                          customer._id
                        }
                        type="button"
                        onClick={() =>
                          selectCustomer(
                            customer
                          )
                        }
                        className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-blue-50"
                      >

                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100">

                          <User
                            size={18}
                            className="text-slate-500"
                          />

                        </div>

                        <div className="min-w-0 flex-1">

                          <p className="font-bold text-slate-900">
                            {
                              customer.name
                            }
                          </p>

                          <p className="text-sm text-slate-500">
                            {
                              customer.phone ||
                              customer.email ||
                              "No contact information"
                            }
                          </p>

                        </div>

                        <div className="hidden text-right sm:block">

                          <p className="text-xs text-slate-400">
                            Total spent
                          </p>

                          <p className="font-bold text-slate-700">
                            {formatCurrency(
                              customer.totalSpent
                            )}
                          </p>

                        </div>

                      </button>
                    )
                  )}

                </div>
              )}

            </div>
          )}

      </div>

      {/* ====================================================
          MAIN POS GRID
      ==================================================== */}

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">

        {/* ==================================================
            PRODUCTS
        ================================================== */}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <h2 className="text-xl font-black text-slate-900">
                Products
              </h2>

              <p className="text-sm text-slate-500">
                Select products to add them
                to the cart.
              </p>

            </div>

            <div className="relative sm:w-80">

              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={
                  productSearch
                }
                onChange={(event) =>
                  setProductSearch(
                    event.target.value
                  )
                }
                placeholder="Search products..."
                className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

            </div>

          </div>

          {loadingProducts ? (
            <div className="flex min-h-64 items-center justify-center">

              <div className="h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

            </div>
          ) : filteredProducts.length ===
            0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center text-center">

              <ShoppingCart
                size={42}
                className="text-slate-300"
              />

              <h3 className="mt-4 font-bold text-slate-700">
                No products found
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Try another search.
              </p>

            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">

              {filteredProducts.map(
                (product) => {
                  const outOfStock =
                    product.trackStock &&
                    product.stockQuantity <=
                      0;

                  return (
                    <button
                      key={
                        product._id
                      }
                      type="button"
                      disabled={
                        outOfStock
                      }
                      onClick={() =>
                        addToCart(
                          product
                        )
                      }
                      className={`group overflow-hidden rounded-2xl border text-left transition ${
                        outOfStock
                          ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-60"
                          : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
                      }`}
                    >

                      <div className="flex aspect-square items-center justify-center bg-slate-100">

                        {product.image ? (
                          <img
                            src={
                              product.image
                            }
                            alt={
                              product.name
                            }
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <ShoppingCart
                            size={35}
                            className="text-slate-300"
                          />
                        )}

                      </div>

                      <div className="p-3">

                        <h3 className="line-clamp-2 min-h-10 text-sm font-bold text-slate-800">
                          {
                            product.name
                          }
                        </h3>

                        <p className="mt-1 text-xs text-slate-400">
                          {
                            product.sku
                          }
                        </p>

                        <div className="mt-3 flex items-end justify-between gap-2">

                          <p className="font-black text-blue-600">
                            {formatCurrency(
                              product.sellingPrice
                            )}
                          </p>

                          <p
                            className={`text-xs font-bold ${
                              outOfStock
                                ? "text-red-500"
                                : "text-slate-400"
                            }`}
                          >
                            {product.trackStock
                              ? `${product.stockQuantity} left`
                              : "No tracking"}
                          </p>

                        </div>

                      </div>

                    </button>
                  );
                }
              )}

            </div>
          )}

        </section>

        {/* ==================================================
            CART
        ================================================== */}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="flex items-center justify-between">

            <div>

              <h2 className="text-xl font-black text-slate-900">
                Current Sale
              </h2>

              <p className="text-sm text-slate-500">
                {cart.length} product
                {cart.length ===
                1
                  ? ""
                  : "s"}
              </p>

            </div>

            {cart.length >
              0 && (
              <button
                type="button"
                onClick={
                  clearCart
                }
                className="text-sm font-bold text-red-500 hover:text-red-700"
              >
                Clear
              </button>
            )}

          </div>

          {/* CART ITEMS */}

          <div className="mt-5 max-h-[430px] space-y-3 overflow-y-auto">

            {cart.length ===
            0 ? (
              <div className="flex min-h-52 flex-col items-center justify-center rounded-2xl bg-slate-50 text-center">

                <ShoppingCart
                  size={40}
                  className="text-slate-300"
                />

                <p className="mt-3 font-bold text-slate-600">
                  Cart is empty
                </p>

                <p className="mt-1 text-sm text-slate-400">
                  Select products to
                  start a sale.
                </p>

              </div>
            ) : (
              cart.map(
                (item) => (
                  <div
                    key={
                      item._id
                    }
                    className="rounded-xl border border-slate-100 p-3"
                  >

                    <div className="flex gap-3">

                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100">

                        {item.image ? (
                          <img
                            src={
                              item.image
                            }
                            alt={
                              item.name
                            }
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">

                            <ShoppingCart
                              size={18}
                              className="text-slate-300"
                            />

                          </div>
                        )}

                      </div>

                      <div className="min-w-0 flex-1">

                        <div className="flex items-start justify-between gap-2">

                          <div className="min-w-0">

                            <p className="truncate text-sm font-bold text-slate-800">
                              {
                                item.name
                              }
                            </p>

                            <p className="text-xs text-slate-400">
                              {formatCurrency(
                                item.sellingPrice
                              )}{" "}
                              each
                            </p>

                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              removeFromCart(
                                item._id
                              )
                            }
                            className="shrink-0 text-slate-300 hover:text-red-500"
                          >
                            <X
                              size={17}
                            />
                          </button>

                        </div>

                        <div className="mt-3 flex items-center justify-between">

                          <div className="flex items-center rounded-lg border border-slate-200">

                            <button
                              type="button"
                              onClick={() =>
                                decreaseQuantity(
                                  item._id
                                )
                              }
                              className="px-3 py-1.5 text-slate-500 hover:bg-slate-50"
                            >
                              −
                            </button>

                            <span className="min-w-8 text-center text-sm font-bold">
                              {
                                item.quantity
                              }
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                increaseQuantity(
                                  item._id
                                )
                              }
                              className="px-3 py-1.5 text-slate-500 hover:bg-slate-50"
                            >
                              +
                            </button>

                          </div>

                          <p className="font-black text-slate-900">
                            {formatCurrency(
                              Number(
                                item.sellingPrice
                              ) *
                                item.quantity
                            )}
                          </p>

                        </div>

                      </div>

                    </div>

                  </div>
                )
              )
            )}

          </div>

          {/* TOTALS */}

          <div className="mt-5 border-t border-slate-100 pt-5">

            <div className="flex items-center justify-between text-sm">

              <span className="text-slate-500">
                Subtotal
              </span>

              <span className="font-bold text-slate-800">
                {formatCurrency(
                  subtotal
                )}
              </span>

            </div>

            {/* DISCOUNT */}

            <div className="mt-3">

              <label className="mb-2 block text-sm font-bold text-slate-700">
                Discount
              </label>

              <input
                type="number"
                min="0"
                value={
                  discount
                }
                onChange={(event) =>
                  setDiscount(
                    event.target.value
                  )
                }
                placeholder="0"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

            </div>

            {/* TOTAL */}

            <div className="mt-5 flex items-center justify-between">

              <span className="text-lg font-bold text-slate-700">
                Total
              </span>

              <span className="text-2xl font-black text-blue-600">
                {formatCurrency(
                  total
                )}
              </span>

            </div>

            {/* PAYMENT METHOD */}

            <div className="mt-5">

              <p className="mb-3 text-sm font-bold text-slate-700">
                Payment Method
              </p>

              <div className="grid grid-cols-2 gap-2">

                {PAYMENT_METHODS.map(
                  ({
                    value,
                    label,
                    icon: Icon,
                  }) => (
                    <button
                      key={
                        value
                      }
                      type="button"
                      onClick={() =>
                        setPaymentMethod(
                          value
                        )
                      }
                      className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-bold transition ${
                        paymentMethod ===
                        value
                          ? "border-blue-500 bg-blue-50 text-blue-600"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <Icon
                        size={17}
                      />

                      {label}
                    </button>
                  )
                )}

              </div>

            </div>

            {/* COMPLETE SALE */}

            <button
              type="button"
              onClick={
                completeSale
              }
              disabled={
                processingSale ||
                cart.length ===
                  0
              }
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-4 font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {processingSale ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />

                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2
                    size={19}
                  />

                  Complete Sale
                </>
              )}
            </button>

          </div>

        </section>

      </div>

    </div>
  );
};

export default POS;