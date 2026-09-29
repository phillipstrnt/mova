import { useEffect, useState } from "react";
import {
  Banknote,
  CalendarDays,
  CreditCard,
  Eye,
  FileText,
  Search,
  Smartphone,
  WalletCards,
  X,
} from "lucide-react";

import api from "../../services/api";

const Sales = () => {
  const [sales, setSales] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [paymentMethod, setPaymentMethod] =
    useState("");

  const [selectedSale, setSelectedSale] =
    useState(null);

  const [detailsLoading, setDetailsLoading] =
    useState(false);

  const [page, setPage] = useState(1);

  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0,
  });

  const fetchSales = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/sales", {
        params: {
          search: search || undefined,
          paymentMethod:
            paymentMethod || undefined,
          page,
          limit: 20,
        },
      });

      setSales(response.data.sales || []);

      setPagination(
        response.data.pagination || {
          page: 1,
          pages: 1,
          total: 0,
        }
      );
    } catch (err) {
      console.error("Failed to load sales:", err);

      setError(
        err.response?.data?.message ||
          "Failed to load sales."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSales();
    }, 300);

    return () => clearTimeout(timer);
  }, [search, paymentMethod, page]);

  const openSaleDetails = async (saleId) => {
    try {
      setDetailsLoading(true);
      setError("");

      const response = await api.get(
        `/sales/${saleId}`
      );

      setSelectedSale(response.data.sale);
    } catch (err) {
      console.error(
        "Failed to load sale:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Failed to load sale details."
      );
    } finally {
      setDetailsLoading(false);
    }
  };

  const formatMoney = (amount) => {
    return new Intl.NumberFormat("en-UG", {
      style: "currency",
      currency: "UGX",
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    return new Intl.DateTimeFormat("en-UG", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(date));
  };

  const getPaymentIcon = (method) => {
    switch (method) {
      case "CASH":
        return <Banknote size={16} />;

      case "MOBILE_MONEY":
        return <Smartphone size={16} />;

      case "CARD":
        return <CreditCard size={16} />;

      case "BANK":
        return <WalletCards size={16} />;

      default:
        return <WalletCards size={16} />;
    }
  };

  const getPaymentLabel = (method) => {
    switch (method) {
      case "MOBILE_MONEY":
        return "Mobile Money";

      case "CASH":
        return "Cash";

      case "CARD":
        return "Card";

      case "BANK":
        return "Bank";

      default:
        return method;
    }
  };

  const printReceipt = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="mb-2 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
            <FileText size={21} />
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
              Transactions
            </p>

            <h1 className="text-3xl font-black tracking-tight text-slate-950">
              Sales
            </h1>
          </div>
        </div>

        <p className="text-sm text-slate-500">
          View and manage completed sales transactions.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {/* Filters */}
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
              onChange={(event) => {
                setPage(1);
                setSearch(event.target.value);
              }}
              placeholder="Search receipt number..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            />
          </div>

          <select
            value={paymentMethod}
            onChange={(event) => {
              setPage(1);
              setPaymentMethod(event.target.value);
            }}
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
          >
            <option value="">
              All payment methods
            </option>

            <option value="CASH">Cash</option>

            <option value="MOBILE_MONEY">
              Mobile Money
            </option>

            <option value="CARD">Card</option>

            <option value="BANK">Bank</option>
          </select>
        </div>
      </div>

      {/* Sales table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-black text-slate-900">
            Transactions
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {pagination.total || 0} total transaction
            {pagination.total === 1 ? "" : "s"}
          </p>
        </div>

        {loading ? (
          <div className="flex min-h-72 items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

              <p className="mt-3 text-sm font-medium text-slate-500">
                Loading sales...
              </p>
            </div>
          </div>
        ) : sales.length === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
            <FileText
              size={40}
              className="text-slate-300"
            />

            <h3 className="mt-4 font-black text-slate-900">
              No sales found
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Completed POS transactions will appear here.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-[900px] w-full">
                <thead className="bg-slate-50">
                  <tr className="text-left text-xs font-black uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-4">
                      Receipt
                    </th>

                    <th className="px-5 py-4">
                      Date
                    </th>

                    <th className="px-5 py-4">
                      Cashier
                    </th>

                    <th className="px-5 py-4">
                      Payment
                    </th>

                    <th className="px-5 py-4">
                      Items
                    </th>

                    <th className="px-5 py-4">
                      Total
                    </th>

                    <th className="px-5 py-4 text-right">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {sales.map((sale) => (
                    <tr
                      key={sale._id}
                      className="transition hover:bg-slate-50/70"
                    >
                      <td className="px-5 py-4">
                        <span className="rounded-lg bg-blue-50 px-2.5 py-1 font-mono text-xs font-bold text-blue-700">
                          {sale.receiptNumber}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <CalendarDays
                            size={15}
                            className="text-slate-400"
                          />

                          {formatDate(
                            sale.createdAt
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm font-bold text-slate-800">
                          {sale.cashierId?.name ||
                            "Unknown"}
                        </p>

                        <p className="text-xs text-slate-400">
                          {sale.cashierId?.role ||
                            ""}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">
                          {getPaymentIcon(
                            sale.paymentMethod
                          )}

                          {getPaymentLabel(
                            sale.paymentMethod
                          )}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-sm font-bold text-slate-700">
                        {sale.items?.reduce(
                          (total, item) =>
                            total +
                            Number(
                              item.quantity || 0
                            ),
                          0
                        )}
                      </td>

                      <td className="px-5 py-4 text-sm font-black text-slate-900">
                        {formatMoney(sale.total)}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() =>
                            openSaleDetails(
                              sale._id
                            )
                          }
                          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                        >
                          <Eye size={16} />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">
              <p className="text-sm text-slate-500">
                Page{" "}
                <span className="font-bold text-slate-700">
                  {pagination.page}
                </span>{" "}
                of{" "}
                <span className="font-bold text-slate-700">
                  {pagination.pages}
                </span>
              </p>

              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() =>
                    setPage((current) =>
                      Math.max(current - 1, 1)
                    )
                  }
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>

                <button
                  disabled={
                    page >= pagination.pages
                  }
                  onClick={() =>
                    setPage((current) =>
                      Math.min(
                        current + 1,
                        pagination.pages
                      )
                    )
                  }
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Sale details modal */}
      {selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-blue-600">
                  Receipt
                </p>

                <h2 className="mt-1 font-mono text-lg font-black text-slate-950">
                  {selectedSale.receiptNumber}
                </h2>
              </div>

              <button
                onClick={() =>
                  setSelectedSale(null)
                }
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            {detailsLoading ? (
              <div className="flex min-h-64 items-center justify-center">
                <div className="h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
              </div>
            ) : (
              <>
                <div
                  id="printable-receipt"
                  className="space-y-6 p-6"
                >
                  {/* Receipt header */}
                  <div className="text-center">
                    <h3 className="text-2xl font-black text-slate-950">
                      MOVA
                    </h3>

                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                      Business Receipt
                    </p>

                    <p className="mt-3 text-sm text-slate-500">
                      {formatDate(
                        selectedSale.createdAt
                      )}
                    </p>
                  </div>

                  {/* Receipt information */}
                  <div className="grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4 text-sm">
                    <div>
                      <p className="text-xs text-slate-400">
                        Receipt
                      </p>

                      <p className="mt-1 font-mono font-bold text-slate-800">
                        {
                          selectedSale.receiptNumber
                        }
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-400">
                        Cashier
                      </p>

                      <p className="mt-1 font-bold text-slate-800">
                        {selectedSale.cashierId
                          ?.name || "Unknown"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-400">
                        Payment
                      </p>

                      <p className="mt-1 font-bold text-slate-800">
                        {getPaymentLabel(
                          selectedSale.paymentMethod
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-400">
                        Status
                      </p>

                      <p className="mt-1 font-bold text-green-600">
                        {selectedSale.status}
                      </p>
                    </div>
                  </div>

                  {/* Items */}
                  <div>
                    <h3 className="mb-3 font-black text-slate-900">
                      Items
                    </h3>

                    <div className="overflow-hidden rounded-xl border border-slate-200">
                      <table className="w-full">
                        <thead className="bg-slate-50">
                          <tr className="text-left text-xs font-black uppercase tracking-wider text-slate-500">
                            <th className="px-4 py-3">
                              Product
                            </th>

                            <th className="px-4 py-3 text-center">
                              Qty
                            </th>

                            <th className="px-4 py-3 text-right">
                              Price
                            </th>

                            <th className="px-4 py-3 text-right">
                              Total
                            </th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                          {selectedSale.items?.map(
                            (item, index) => (
                              <tr key={index}>
                                <td className="px-4 py-3">
                                  <p className="text-sm font-bold text-slate-800">
                                    {item.name}
                                  </p>

                                  <p className="text-xs text-slate-400">
                                    {item.sku}
                                  </p>
                                </td>

                                <td className="px-4 py-3 text-center text-sm font-bold">
                                  {item.quantity}
                                </td>

                                <td className="px-4 py-3 text-right text-sm text-slate-600">
                                  {formatMoney(
                                    item.unitPrice
                                  )}
                                </td>

                                <td className="px-4 py-3 text-right text-sm font-black text-slate-900">
                                  {formatMoney(
                                    item.subtotal
                                  )}
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Totals */}
                  <div className="ml-auto max-w-sm space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">
                        Subtotal
                      </span>

                      <span className="font-bold">
                        {formatMoney(
                          selectedSale.subtotal
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">
                        Discount
                      </span>

                      <span className="font-bold text-red-600">
                        -{" "}
                        {formatMoney(
                          selectedSale.discount
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between border-t border-slate-200 pt-3">
                      <span className="font-black text-slate-800">
                        Total
                      </span>

                      <span className="text-xl font-black text-blue-600">
                        {formatMoney(
                          selectedSale.total
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Modal actions */}
                <div className="flex flex-col-reverse gap-3 border-t border-slate-100 p-5 sm:flex-row sm:justify-end">
                  <button
                    onClick={() =>
                      setSelectedSale(null)
                    }
                    className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Close
                  </button>

                  <button
                    onClick={printReceipt}
                    className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"
                  >
                    Print Receipt
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Sales;