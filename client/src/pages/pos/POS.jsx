import { useEffect, useMemo, useState } from "react";
import {
  Banknote,
  CreditCard,
  Minus,
  Package,
  Plus,
  Search,
  Smartphone,
  Trash2,
  WalletCards,
  X,
} from "lucide-react";

import api from "../../services/api";

const POS = () => {
  const [products, setProducts] = useState([]);

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);

  const [cart, setCart] = useState([]);

  const [discount, setDiscount] = useState("");

  const [paymentMethod, setPaymentMethod] =
    useState("CASH");

  const [checkoutLoading, setCheckoutLoading] =
    useState(false);

  const [message, setMessage] = useState({
    type: "",
    text: "",
  });

  const fetchProducts = async () => {
    try {
      setLoading(true);

      const response = await api.get("/products", {
        params: {
          search: search || undefined,
          isActive: true,
        },
      });

      setProducts(response.data.products || []);
    } catch (error) {
      console.error(
        "Failed to load products:",
        error
      );

      setMessage({
        type: "error",
        text:
          error.response?.data?.message ||
          "Failed to load products.",
      });
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

  const addToCart = (product) => {
    if (
      product.trackStock &&
      Number(product.stockQuantity) <= 0
    ) {
      setMessage({
        type: "error",
        text: `${product.name} is out of stock.`,
      });

      return;
    }

    setCart((currentCart) => {
      const existing = currentCart.find(
        (item) => item._id === product._id
      );

      if (existing) {
        if (
          product.trackStock &&
          existing.quantity >=
            Number(product.stockQuantity)
        ) {
          return currentCart;
        }

        return currentCart.map((item) =>
          item._id === product._id
            ? {
                ...item,
                quantity: item.quantity + 1,
              }
            : item
        );
      }

      return [
        ...currentCart,
        {
          ...product,
          quantity: 1,
        },
      ];
    });

    setMessage({
      type: "",
      text: "",
    });
  };

  const updateQuantity = (productId, change) => {
    setCart((currentCart) =>
      currentCart
        .map((item) => {
          if (item._id !== productId) {
            return item;
          }

          const newQuantity =
            item.quantity + change;

          if (newQuantity <= 0) {
            return null;
          }

          if (
            item.trackStock &&
            newQuantity >
              Number(item.stockQuantity)
          ) {
            return item;
          }

          return {
            ...item,
            quantity: newQuantity,
          };
        })
        .filter(Boolean)
    );
  };

  const removeFromCart = (productId) => {
    setCart((currentCart) =>
      currentCart.filter(
        (item) => item._id !== productId
      )
    );
  };

  const clearCart = () => {
    setCart([]);
    setDiscount("");
  };

  const subtotal = useMemo(() => {
    return cart.reduce(
      (total, item) =>
        total +
        Number(item.sellingPrice) *
          Number(item.quantity),
      0
    );
  }, [cart]);

  const discountAmount = useMemo(() => {
    const value = Number(discount || 0);

    if (value < 0) return 0;

    return Math.min(value, subtotal);
  }, [discount, subtotal]);

  const total = subtotal - discountAmount;

  const formatMoney = (amount) => {
    return new Intl.NumberFormat("en-UG", {
      style: "currency",
      currency: "UGX",
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const completeSale = async () => {
    if (cart.length === 0) {
      setMessage({
        type: "error",
        text: "Add at least one product to the cart.",
      });

      return;
    }

    if (total <= 0) {
      setMessage({
        type: "error",
        text: "Sale total must be greater than zero.",
      });

      return;
    }

    try {
      setCheckoutLoading(true);

      setMessage({
        type: "",
        text: "",
      });

      const response = await api.post("/sales", {
        items: cart.map((item) => ({
          productId: item._id,
          quantity: item.quantity,
        })),

        discount: discountAmount,

        paymentMethod,

        notes: "",
      });

      const receipt =
        response.data.sale.receiptNumber;

      setCart([]);
      setDiscount("");

      await fetchProducts();

      setMessage({
        type: "success",
        text: `Sale completed successfully. Receipt: ${receipt}`,
      });
    } catch (error) {
      console.error(
        "Checkout failed:",
        error
      );

      setMessage({
        type: "error",
        text:
          error.response?.data?.message ||
          "Failed to complete sale.",
      });
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-9rem)] flex-col gap-6 xl:flex-row">
      {/* Products */}
      <section className="min-w-0 flex-1">
        <div className="mb-5">
          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
              <Package size={21} />
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
                Sales
              </p>

              <h1 className="text-3xl font-black tracking-tight text-slate-950">
                Point of Sale
              </h1>
            </div>
          </div>

          <p className="text-sm text-slate-500">
            Select products and build the customer's
            order.
          </p>
        </div>

        {/* Search */}
        <div className="mb-5">
          <div className="relative">
            <Search
              size={19}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search products by name or SKU..."
              className="w-full rounded-2xl border border-slate-200 bg-white py-4 pl-12 pr-4 text-sm outline-none shadow-sm transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
            />
          </div>
        </div>

        {/* Message */}
        {message.text && (
          <div
            className={`mb-5 flex items-center gap-3 rounded-xl border p-4 text-sm font-medium ${
              message.type === "success"
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            <span>{message.text}</span>

            <button
              onClick={() =>
                setMessage({
                  type: "",
                  text: "",
                })
              }
              className="ml-auto"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {/* Product grid */}
        {loading ? (
          <div className="flex min-h-96 items-center justify-center rounded-2xl border border-slate-200 bg-white">
            <div className="text-center">
              <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

              <p className="mt-3 text-sm font-medium text-slate-500">
                Loading products...
              </p>
            </div>
          </div>
        ) : products.length === 0 ? (
          <div className="flex min-h-96 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 text-center">
            <Package
              size={40}
              className="text-slate-300"
            />

            <h2 className="mt-4 font-black text-slate-900">
              No products found
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Try another search or add products first.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {products.map((product) => {
              const outOfStock =
                product.trackStock &&
                Number(product.stockQuantity) <= 0;

              return (
                <button
                  key={product._id}
                  type="button"
                  disabled={outOfStock}
                  onClick={() =>
                    addToCart(product)
                  }
                  className={`group rounded-2xl border bg-white p-4 text-left shadow-sm transition ${
                    outOfStock
                      ? "cursor-not-allowed border-slate-200 opacity-50"
                      : "border-slate-200 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg"
                  }`}
                >
                  <div className="mb-4 flex h-28 items-center justify-center rounded-xl bg-slate-50">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="h-full w-full rounded-xl object-cover"
                      />
                    ) : (
                      <Package
                        size={35}
                        className="text-slate-300"
                      />
                    )}
                  </div>

                  <p className="line-clamp-2 min-h-10 font-bold text-slate-900">
                    {product.name}
                  </p>

                  <p className="mt-1 text-xs font-medium text-slate-400">
                    {product.sku}
                  </p>

                  <div className="mt-4 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-lg font-black text-blue-600">
                        {formatMoney(
                          product.sellingPrice
                        )}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {product.trackStock
                          ? `${product.stockQuantity} ${product.unit} available`
                          : "Stock not tracked"}
                      </p>
                    </div>

                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 transition group-hover:bg-blue-600 group-hover:text-white">
                      <Plus size={18} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Cart */}
      <aside className="w-full shrink-0 xl:w-[420px]">
        <div className="sticky top-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
          {/* Cart header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5">
            <div>
              <h2 className="text-xl font-black text-slate-950">
                Current Sale
              </h2>

              <p className="mt-1 text-xs font-medium text-slate-400">
                {cart.length} item
                {cart.length === 1 ? "" : "s"}
              </p>
            </div>

            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs font-bold text-red-500 hover:text-red-700"
              >
                Clear cart
              </button>
            )}
          </div>

          {/* Cart items */}
          <div className="max-h-[420px] overflow-y-auto">
            {cart.length === 0 ? (
              <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                  <Package
                    size={27}
                    className="text-slate-400"
                  />
                </div>

                <h3 className="mt-4 font-bold text-slate-900">
                  Cart is empty
                </h3>

                <p className="mt-1 max-w-xs text-sm leading-5 text-slate-500">
                  Select products from the left to
                  start a new sale.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {cart.map((item) => (
                  <div
                    key={item._id}
                    className="p-4"
                  >
                    <div className="flex gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="h-full w-full rounded-xl object-cover"
                          />
                        ) : (
                          <Package
                            size={20}
                            className="text-slate-400"
                          />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="truncate text-sm font-bold text-slate-900">
                              {item.name}
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              {formatMoney(
                                item.sellingPrice
                              )}{" "}
                              each
                            </p>
                          </div>

                          <button
                            onClick={() =>
                              removeFromCart(
                                item._id
                              )
                            }
                            className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center rounded-lg border border-slate-200">
                            <button
                              onClick={() =>
                                updateQuantity(
                                  item._id,
                                  -1
                                )
                              }
                              className="p-2 text-slate-500 hover:bg-slate-50"
                            >
                              <Minus size={14} />
                            </button>

                            <span className="min-w-9 text-center text-sm font-black text-slate-800">
                              {item.quantity}
                            </span>

                            <button
                              onClick={() =>
                                updateQuantity(
                                  item._id,
                                  1
                                )
                              }
                              className="p-2 text-slate-500 hover:bg-slate-50"
                            >
                              <Plus size={14} />
                            </button>
                          </div>

                          <p className="text-sm font-black text-slate-900">
                            {formatMoney(
                              item.sellingPrice *
                                item.quantity
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Checkout */}
          <div className="border-t border-slate-100 p-5">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">
                  Subtotal
                </span>

                <span className="font-bold text-slate-800">
                  {formatMoney(subtotal)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-slate-500">
                  Discount
                </span>

                <input
                  type="number"
                  min="0"
                  max={subtotal}
                  value={discount}
                  onChange={(event) =>
                    setDiscount(
                      event.target.value
                    )
                  }
                  placeholder="0"
                  className="w-32 rounded-lg border border-slate-200 px-3 py-2 text-right text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              <div className="flex items-center justify-between border-t border-dashed border-slate-200 pt-3">
                <span className="font-bold text-slate-700">
                  Total
                </span>

                <span className="text-2xl font-black text-blue-600">
                  {formatMoney(total)}
                </span>
              </div>
            </div>

            {/* Payment methods */}
            <div className="mt-5">
              <p className="mb-3 text-xs font-black uppercase tracking-wider text-slate-400">
                Payment Method
              </p>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setPaymentMethod("CASH")
                  }
                  className={`flex items-center gap-2 rounded-xl border p-3 text-sm font-bold ${
                    paymentMethod === "CASH"
                      ? "border-green-500 bg-green-50 text-green-700"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Banknote size={17} />
                  Cash
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setPaymentMethod(
                      "MOBILE_MONEY"
                    )
                  }
                  className={`flex items-center gap-2 rounded-xl border p-3 text-sm font-bold ${
                    paymentMethod ===
                    "MOBILE_MONEY"
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Smartphone size={17} />
                  Mobile Money
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setPaymentMethod("CARD")
                  }
                  className={`flex items-center gap-2 rounded-xl border p-3 text-sm font-bold ${
                    paymentMethod === "CARD"
                      ? "border-purple-500 bg-purple-50 text-purple-700"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <CreditCard size={17} />
                  Card
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setPaymentMethod("BANK")
                  }
                  className={`flex items-center gap-2 rounded-xl border p-3 text-sm font-bold ${
                    paymentMethod === "BANK"
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <WalletCards size={17} />
                  Bank
                </button>
              </div>
            </div>

            <button
              onClick={completeSale}
              disabled={
                checkoutLoading ||
                cart.length === 0
              }
              className="mt-5 w-full rounded-xl bg-blue-600 py-4 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {checkoutLoading
                ? "Processing Sale..."
                : `Complete Sale · ${formatMoney(total)}`}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default POS;