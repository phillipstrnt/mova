import { useEffect, useMemo, useState } from "react";
import api from "../../api";

const emptyItem = {
  productId: "",
  quantity: 1,
  buyingPrice: "",
  batchCode: "",
  expiryDate: "",
};

const Purchases = () => {
  const [purchases, setPurchases] =
    useState([]);

  const [suppliers, setSuppliers] =
    useState([]);

  const [products, setProducts] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [showModal, setShowModal] =
    useState(false);

  const [selectedSupplier, setSelectedSupplier] =
    useState("");

  const [invoiceNumber, setInvoiceNumber] =
    useState("");

  const [paymentMethod, setPaymentMethod] =
    useState("CASH");

  const [paymentStatus, setPaymentStatus] =
    useState("PAID");

  const [discount, setDiscount] =
    useState(0);

  const [notes, setNotes] =
    useState("");

  const [items, setItems] =
    useState([
      {
        ...emptyItem,
      },
    ]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");

      const [
        purchaseResponse,
        supplierResponse,
        productResponse,
      ] = await Promise.all([
        api.get("/purchases"),
        api.get("/suppliers", {
          params: {
            active: "true",
          },
        }),
        api.get("/products"),
      ]);

      setPurchases(
        purchaseResponse.data
          .purchases || []
      );

      setSuppliers(
        supplierResponse.data
          .suppliers || []
      );

      /*
       * Product APIs can have different
       * response structures depending on
       * the current Product controller.
       */
      const productData =
        productResponse.data;

      setProducts(
        productData.products ||
          productData.data ||
          []
      );
    } catch (err) {
      console.error(
        "Fetch purchase data error:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Failed to load purchase data."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openPurchaseModal = () => {
    setSelectedSupplier("");
    setInvoiceNumber("");
    setPaymentMethod("CASH");
    setPaymentStatus("PAID");
    setDiscount(0);
    setNotes("");

    setItems([
      {
        ...emptyItem,
      },
    ]);

    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const closePurchaseModal = () => {
    if (saving) return;

    setShowModal(false);
  };

  const updateItem = (
    index,
    field,
    value
  ) => {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  };

  const handleProductChange = (
    index,
    productId
  ) => {
    const product =
      products.find(
        (item) =>
          String(item._id) ===
          String(productId)
      );

    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              productId,
              buyingPrice:
                product?.buyingPrice ??
                "",
            }
          : item
      )
    );
  };

  const addItem = () => {
    setItems((current) => [
      ...current,
      {
        ...emptyItem,
      },
    ]);
  };

  const removeItem = (index) => {
    if (items.length === 1) return;

    setItems((current) =>
      current.filter(
        (_, itemIndex) =>
          itemIndex !== index
      )
    );
  };

  const subtotal = useMemo(() => {
    return items.reduce(
      (sum, item) => {
        const quantity =
          Number(item.quantity) || 0;

        const price =
          Number(
            item.buyingPrice
          ) || 0;

        return (
          sum +
          quantity * price
        );
      },
      0
    );
  }, [items]);

  const total = Math.max(
    0,
    subtotal -
      (Number(discount) || 0)
  );

  const formatMoney = (amount) => {
    return new Intl.NumberFormat(
      "en-UG",
      {
        style: "currency",
        currency: "UGX",
        maximumFractionDigits: 0,
      }
    ).format(Number(amount) || 0);
  };

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!selectedSupplier) {
      setError(
        "Please select a supplier."
      );
      return;
    }

    if (items.length === 0) {
      setError(
        "Add at least one product."
      );
      return;
    }

    const usedProducts =
      new Set();

    for (
      const item of items
    ) {
      if (!item.productId) {
        setError(
          "Every purchase item must have a product."
        );
        return;
      }

      if (
        usedProducts.has(
          item.productId
        )
      ) {
        setError(
          "A product cannot appear more than once in the same purchase."
        );
        return;
      }

      usedProducts.add(
        item.productId
      );

      const quantity =
        Number(item.quantity);

      const buyingPrice =
        Number(
          item.buyingPrice
        );

      if (
        !Number.isInteger(
          quantity
        ) ||
        quantity <= 0
      ) {
        setError(
          "Quantity must be a whole number greater than zero."
        );
        return;
      }

      if (
        !Number.isFinite(
          buyingPrice
        ) ||
        buyingPrice < 0
      ) {
        setError(
          "Every product must have a valid buying price."
        );
        return;
      }
    }

    if (
      Number(discount) < 0 ||
      Number(discount) > subtotal
    ) {
      setError(
        "Discount cannot be greater than the subtotal."
      );
      return;
    }

    try {
      setSaving(true);

      const response =
        await api.post(
          "/purchases",
          {
            supplierId:
              selectedSupplier,

            invoiceNumber:
              invoiceNumber.trim(),

            items: items.map(
              (item) => ({
                productId:
                  item.productId,

                quantity:
                  Number(
                    item.quantity
                  ),

                buyingPrice:
                  Number(
                    item.buyingPrice
                  ),
                batchCode: item.batchCode || "",
                expiryDate: item.expiryDate || null,
              })
            ),

            discount:
              Number(discount) || 0,

            paymentMethod,

            paymentStatus,

            notes:
              notes.trim(),
          }
        );

      setSuccess(
        response.data.message ||
          "Purchase received successfully."
      );

      setShowModal(false);

      await fetchData();
    } catch (err) {
      console.error(
        "Create purchase error:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Failed to create purchase."
      );
    } finally {
      setSaving(false);
    }
  };

  const cancelPurchase =
    async (purchase) => {
      const confirmed =
        window.confirm(
          `Cancel purchase ${purchase.purchaseNumber}? This will remove the received stock from inventory.`
        );

      if (!confirmed) return;

      try {
        setError("");
        setSuccess("");

        const response =
          await api.post(
            `/purchases/${purchase._id}/cancel`
          );

        setSuccess(
          response.data.message ||
            "Purchase cancelled successfully."
        );

        await fetchData();
      } catch (err) {
        console.error(
          "Cancel purchase error:",
          err
        );

        setError(
          err.response?.data?.message ||
            "Failed to cancel purchase."
        );
      }
    };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900">
            Purchases
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Receive stock from suppliers and
            keep your inventory updated.
          </p>
        </div>

        <button
          onClick={openPurchaseModal}
          className="rounded-xl bg-slate-900 px-5 py-3 font-bold text-white hover:bg-slate-800"
        >
          + Receive Purchase
        </button>
      </div>

      {/* ALERTS */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          {success}
        </div>
      )}

      {/* SUMMARY */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Total Purchases
          </p>

          <p className="mt-2 text-3xl font-black text-slate-900">
            {purchases.length}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Suppliers
          </p>

          <p className="mt-2 text-3xl font-black text-slate-900">
            {suppliers.length}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Received Purchases
          </p>

          <p className="mt-2 text-3xl font-black text-green-600">
            {
              purchases.filter(
                (purchase) =>
                  purchase.status ===
                  "RECEIVED"
              ).length
            }
          </p>
        </div>
      </div>

      {/* PURCHASE TABLE */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-10 text-center text-slate-500">
            Loading purchases...
          </div>
        ) : purchases.length ===
          0 ? (
          <div className="p-10 text-center">
            <div className="text-4xl">
              🧾
            </div>

            <h3 className="mt-3 font-bold text-slate-900">
              No purchases yet
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Your received purchases will
              appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                    Purchase
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                    Supplier
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                    Items
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                    Total
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                    Payment
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                    Status
                  </th>

                  <th className="px-5 py-4 text-right text-xs font-black uppercase tracking-wide text-slate-500">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {purchases.map(
                  (purchase) => (
                    <tr
                      key={purchase._id}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900">
                          {
                            purchase.purchaseNumber
                          }
                        </div>

                        {purchase.invoiceNumber && (
                          <div className="text-xs text-slate-500">
                            Invoice:{" "}
                            {
                              purchase.invoiceNumber
                            }
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4 text-sm font-medium text-slate-700">
                        {purchase
                          .supplierId
                          ?.name ||
                          "Unknown supplier"}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {purchase.items
                          ?.length || 0}
                      </td>

                      <td className="px-5 py-4 font-bold text-slate-900">
                        {formatMoney(
                          purchase.total
                        )}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {
                          purchase.paymentMethod
                        }
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            purchase.status ===
                            "RECEIVED"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {
                            purchase.status
                          }
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        {purchase.status ===
                          "RECEIVED" && (
                          <button
                            onClick={() =>
                              cancelPurchase(
                                purchase
                              )
                            }
                            className="rounded-lg border border-red-200 px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PURCHASE MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  Receive Purchase
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Add products received from a
                  supplier.
                </p>
              </div>

              <button
                onClick={
                  closePurchaseModal
                }
                className="text-2xl text-slate-400 hover:text-slate-700"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-6 p-6"
            >
              {/* PURCHASE INFORMATION */}
              <div className="grid gap-5 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Supplier *
                  </label>

                  <select
                    value={
                      selectedSupplier
                    }
                    onChange={(event) =>
                      setSelectedSupplier(
                        event.target
                          .value
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-slate-400"
                    required
                  >
                    <option value="">
                      Select supplier
                    </option>

                    {suppliers.map(
                      (supplier) => (
                        <option
                          key={
                            supplier._id
                          }
                          value={
                            supplier._id
                          }
                        >
                          {
                            supplier.name
                          }
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Invoice Number
                  </label>

                  <input
                    value={
                      invoiceNumber
                    }
                    onChange={(event) =>
                      setInvoiceNumber(
                        event.target
                          .value
                      )
                    }
                    placeholder="INV-001"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Payment Method
                  </label>

                  <select
                    value={
                      paymentMethod
                    }
                    onChange={(event) =>
                      setPaymentMethod(
                        event.target
                          .value
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-slate-400"
                  >
                    <option value="CASH">
                      Cash
                    </option>

                    <option value="MOBILE_MONEY">
                      Mobile Money
                    </option>

                    <option value="CARD">
                      Card
                    </option>

                    <option value="BANK">
                      Bank
                    </option>

                    <option value="CREDIT">
                      Credit
                    </option>
                  </select>
                </div>
              </div>

              {/* ITEMS */}
              <div className="rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
                  <div>
                    <h3 className="font-black text-slate-900">
                      Purchase Items
                    </h3>

                    <p className="text-xs text-slate-500">
                      Stock will increase when
                      this purchase is received.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={addItem}
                    className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-bold text-white hover:bg-slate-800"
                  >
                    + Add Item
                  </button>
                </div>

                <div className="space-y-4 p-5">
                  {items.map(
                    (
                      item,
                      index
                    ) => {
                      const selectedProduct =
                        products.find(
                          (product) =>
                            String(
                              product._id
                            ) ===
                            String(
                              item.productId
                            )
                        );

                      const lineTotal =
                        (Number(
                          item.quantity
                        ) || 0) *
                        (Number(
                          item.buyingPrice
                        ) || 0);

                      return (
                        <div
                          key={index}
                          className="grid gap-4 rounded-xl border border-slate-200 p-4 md:grid-cols-12"
                        >
                          <div className="md:col-span-5">
                            <label className="mb-2 block text-xs font-bold text-slate-500">
                              Product
                            </label>

                            <select
                              value={
                                item.productId
                              }
                              onChange={(
                                event
                              ) =>
                                handleProductChange(
                                  index,
                                  event
                                    .target
                                    .value
                                )
                              }
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-slate-400"
                              required
                            >
                              <option value="">
                                Select product
                              </option>

                              {products.map(
                                (
                                  product
                                ) => (
                                  <option
                                    key={
                                      product._id
                                    }
                                    value={
                                      product._id
                                    }
                                  >
                                    {
                                      product.name
                                    }{" "}
                                    —{" "}
                                    {
                                      product.sku
                                    }
                                  </option>
                                )
                              )}
                            </select>

                            {selectedProduct && (
                              <p className="mt-1 text-xs text-slate-500">
                                Current stock:{" "}
                                {
                                  selectedProduct.stockQuantity
                                }
                              </p>
                            )}
                          </div>

                          <div className="md:col-span-2">
                            <label className="mb-2 block text-xs font-bold text-slate-500">
                              Quantity
                            </label>

                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={
                                item.quantity
                              }
                              onChange={(
                                event
                              ) =>
                                updateItem(
                                  index,
                                  "quantity",
                                  event
                                    .target
                                    .value
                                )
                              }
                              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:border-slate-400"
                              required
                            />
                          </div>

                          <div className="grid grid-cols-1 gap-3 md:col-span-12 md:grid-cols-2">
                            <label className="text-xs font-bold text-slate-500">
                              Batch / lot code
                              <input type="text" value={item.batchCode || ""} onChange={(event) => updateItem(index, "batchCode", event.target.value)} placeholder="Optional supplier batch code" className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-800" />
                            </label>
                            <label className="text-xs font-bold text-slate-500">
                              Expiry date
                              <input type="date" value={item.expiryDate || ""} onChange={(event) => updateItem(index, "expiryDate", event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-800" />
                            </label>
                          </div>

                          <div className="md:col-span-2">
                            <label className="mb-2 block text-xs font-bold text-slate-500">
                              Buying Price
                            </label>

                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={
                                item.buyingPrice
                              }
                              onChange={(
                                event
                              ) =>
                                updateItem(
                                  index,
                                  "buyingPrice",
                                  event
                                    .target
                                    .value
                                )
                              }
                              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:border-slate-400"
                              required
                            />
                          </div>

                          <div className="md:col-span-2">
                            <label className="mb-2 block text-xs font-bold text-slate-500">
                              Subtotal
                            </label>

                            <div className="rounded-lg bg-slate-50 px-3 py-2.5 font-bold text-slate-900">
                              {formatMoney(
                                lineTotal
                              )}
                            </div>
                          </div>

                          <div className="flex items-end justify-end md:col-span-1">
                            <button
                              type="button"
                              onClick={() =>
                                removeItem(
                                  index
                                )
                              }
                              disabled={
                                items.length ===
                                1
                              }
                              className="rounded-lg px-3 py-2 text-xl text-red-500 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-30"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>

              {/* PAYMENT */}
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Payment Status
                    </label>

                    <select
                      value={
                        paymentStatus
                      }
                      onChange={(event) =>
                        setPaymentStatus(
                          event.target
                            .value
                        )
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-slate-400"
                    >
                      <option value="PAID">
                        Paid
                      </option>

                      <option value="PENDING">
                        Pending
                      </option>

                      <option value="PARTIALLY_PAID">
                        Partially Paid
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Discount
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={discount}
                      onChange={(event) =>
                        setDiscount(
                          event.target
                            .value
                        )
                      }
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Notes
                    </label>

                    <textarea
                      rows="3"
                      value={notes}
                      onChange={(event) =>
                        setNotes(
                          event.target
                            .value
                        )
                      }
                      placeholder="Optional notes..."
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                    />
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-900 p-6 text-white">
                  <h3 className="text-lg font-black">
                    Purchase Summary
                  </h3>

                  <div className="mt-6 space-y-4">
                    <div className="flex justify-between">
                      <span className="text-slate-300">
                        Subtotal
                      </span>

                      <span className="font-bold">
                        {formatMoney(
                          subtotal
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-300">
                        Discount
                      </span>

                      <span className="font-bold">
                        -{" "}
                        {formatMoney(
                          discount
                        )}
                      </span>
                    </div>

                    <div className="border-t border-slate-700 pt-4">
                      <div className="flex justify-between">
                        <span className="text-lg font-bold">
                          Total
                        </span>

                        <span className="text-2xl font-black">
                          {formatMoney(
                            total
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ACTIONS */}
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={
                    closePurchaseModal
                  }
                  disabled={saving}
                  className="rounded-xl border border-slate-200 px-5 py-3 font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-green-600 px-5 py-3 font-bold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Receiving..."
                    : "Receive Purchase"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Purchases;
