import { useEffect, useMemo, useState } from "react";
import {
  Banknote,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Eye,
  Landmark,
  Loader2,
  RefreshCw,
  Search,
  Smartphone,
  X,
} from "lucide-react";

import api from "../../api";

const currency = new Intl.NumberFormat("en-UG", {
  style: "currency",
  currency: "UGX",
  maximumFractionDigits: 0,
});

const formatCurrency = (amount) => {
  return currency.format(Number(amount) || 0);
};

const formatDate = (date) => {
  if (!date) return "—";

  return new Date(date).toLocaleString("en-UG", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const paymentMethodLabel = {
  CASH: "Cash",
  MOBILE_MONEY: "Mobile Money",
  CARD: "Card",
  BANK: "Bank",
};

const PaymentMethodIcon = ({ method }) => {
  if (method === "MOBILE_MONEY") {
    return <Smartphone size={16} />;
  }

  if (method === "CARD") {
    return <CreditCard size={16} />;
  }

  if (method === "BANK") {
    return <Landmark size={16} />;
  }

  return <Banknote size={16} />;
};

const methodClasses = {
  CASH: "bg-emerald-50 text-emerald-700",
  MOBILE_MONEY: "bg-blue-50 text-blue-700",
  CARD: "bg-purple-50 text-purple-700",
  BANK: "bg-orange-50 text-orange-700",
};

const statusClasses = {
  COMPLETED: "bg-emerald-50 text-emerald-700",
  CANCELLED: "bg-red-50 text-red-700",
  REFUNDED: "bg-slate-100 text-slate-600",
};

const Payments = () => {
  const [payments, setPayments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [status, setStatus] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 1,
  });

  const [selectedPayment, setSelectedPayment] = useState(null);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      setError("");

      const params = {
        page,
        limit: 20,
      };

      if (search.trim()) {
        params.search = search.trim();
      }

      if (paymentMethod) {
        params.paymentMethod = paymentMethod;
      }

      if (status) {
        params.status = status;
      }

      if (startDate) {
        params.startDate = startDate;
      }

      if (endDate) {
        params.endDate = endDate;
      }

      const response = await api.get("/payments", {
        params,
      });

      setPayments(response.data?.payments || []);

      setPagination(
        response.data?.pagination || {
          page: 1,
          limit: 20,
          total: 0,
          pages: 1,
        }
      );
    } catch (err) {
      console.error("Failed to fetch payments:", err);

      setError(
        err.response?.data?.message ||
          "Failed to load payments."
      );

      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [
    page,
    paymentMethod,
    status,
    startDate,
    endDate,
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchPayments();
    }, 400);

    return () => clearTimeout(timer);
  }, [search]);

  const summary = useMemo(() => {
    const completedPayments = payments.filter(
      (payment) =>
        payment.status === "COMPLETED"
    );

    const total = completedPayments.reduce(
      (sum, payment) =>
        sum + Number(payment.amount || 0),
      0
    );

    const cash = completedPayments
      .filter(
        (payment) =>
          payment.paymentMethod === "CASH"
      )
      .reduce(
        (sum, payment) =>
          sum + Number(payment.amount || 0),
        0
      );

    const mobileMoney = completedPayments
      .filter(
        (payment) =>
          payment.paymentMethod ===
          "MOBILE_MONEY"
      )
      .reduce(
        (sum, payment) =>
          sum + Number(payment.amount || 0),
        0
      );

    const card = completedPayments
      .filter(
        (payment) =>
          payment.paymentMethod === "CARD"
      )
      .reduce(
        (sum, payment) =>
          sum + Number(payment.amount || 0),
        0
      );

    const bank = completedPayments
      .filter(
        (payment) =>
          payment.paymentMethod === "BANK"
      )
      .reduce(
        (sum, payment) =>
          sum + Number(payment.amount || 0),
        0
      );

    return {
      total,
      cash,
      mobileMoney,
      card,
      bank,
    };
  }, [payments]);

  const clearFilters = () => {
    setSearch("");
    setPaymentMethod("");
    setStatus("");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  const hasFilters =
    search ||
    paymentMethod ||
    status ||
    startDate ||
    endDate;

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-950">
            Payments
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Track and review all payments received
            through MOVA.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchPayments}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            size={17}
            className={
              loading
                ? "animate-spin"
                : ""
            }
          />

          Refresh
        </button>
      </div>

      {/* ERROR */}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {/* SUMMARY */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          title="Total"
          value={summary.total}
          icon={<Banknote size={20} />}
          iconClass="bg-blue-50 text-blue-600"
        />

        <SummaryCard
          title="Cash"
          value={summary.cash}
          icon={<Banknote size={20} />}
          iconClass="bg-emerald-50 text-emerald-600"
        />

        <SummaryCard
          title="Mobile Money"
          value={summary.mobileMoney}
          icon={<Smartphone size={20} />}
          iconClass="bg-indigo-50 text-indigo-600"
        />

        <SummaryCard
          title="Card"
          value={summary.card}
          icon={<CreditCard size={20} />}
          iconClass="bg-purple-50 text-purple-600"
        />

        <SummaryCard
          title="Bank"
          value={summary.bank}
          icon={<Landmark size={20} />}
          iconClass="bg-orange-50 text-orange-600"
        />
      </div>

      {/* FILTERS */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {/* SEARCH */}
          <div className="relative xl:col-span-2">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search payment reference..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* METHOD */}
          <select
            value={paymentMethod}
            onChange={(event) => {
              setPaymentMethod(
                event.target.value
              );
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
          >
            <option value="">
              All payment methods
            </option>

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
          </select>

          {/* STATUS */}
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
          >
            <option value="">
              All statuses
            </option>

            <option value="COMPLETED">
              Completed
            </option>

            <option value="CANCELLED">
              Cancelled
            </option>

            <option value="REFUNDED">
              Refunded
            </option>
          </select>

          {/* CLEAR */}
          <button
            type="button"
            onClick={clearFilters}
            disabled={!hasFilters}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Clear Filters
          </button>
        </div>

        {/* DATE FILTERS */}
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="relative">
            <CalendarDays
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="date"
              value={startDate}
              onChange={(event) => {
                setStartDate(
                  event.target.value
                );
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="relative">
            <CalendarDays
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="date"
              value={endDate}
              onChange={(event) => {
                setEndDate(
                  event.target.value
                );
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-slate-500">
                  Receipt
                </th>

                <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-slate-500">
                  Customer
                </th>

                <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-slate-500">
                  Method
                </th>

                <th className="px-5 py-4 text-right text-xs font-black uppercase tracking-wider text-slate-500">
                  Amount
                </th>

                <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-slate-500">
                  Reference
                </th>

                <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-slate-500">
                  Date
                </th>

                <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-slate-500">
                  Status
                </th>

                <th className="px-5 py-4 text-right text-xs font-black uppercase tracking-wider text-slate-500">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan="8"
                    className="px-5 py-16 text-center"
                  >
                    <div className="flex items-center justify-center gap-2 text-sm font-semibold text-slate-500">
                      <Loader2
                        size={20}
                        className="animate-spin"
                      />

                      Loading payments...
                    </div>
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td
                    colSpan="8"
                    className="px-5 py-16 text-center"
                  >
                    <div className="mx-auto max-w-sm">
                      <Banknote
                        size={40}
                        className="mx-auto text-slate-300"
                      />

                      <p className="mt-3 text-sm font-bold text-slate-700">
                        No payments found
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        Payments created from completed
                        POS sales will appear here.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                payments.map((payment) => (
                  <tr
                    key={payment._id}
                    className="transition hover:bg-slate-50"
                  >
                    <td className="px-5 py-4">
                      <p className="text-sm font-bold text-slate-900">
                        {payment.saleId?.receiptNumber ||
                          "—"}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {payment.saleId?._id
                          ? String(
                              payment.saleId._id
                            ).slice(-8)
                          : "No sale ID"}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-slate-700">
                        {payment.customerId?.name ||
                          "Walk-in Customer"}
                      </p>

                      {payment.customerId?.phone && (
                        <p className="mt-1 text-xs text-slate-400">
                          {payment.customerId.phone}
                        </p>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${
                          methodClasses[
                            payment.paymentMethod
                          ] ||
                          "bg-slate-100 text-slate-600"
                        }`}
                      >
                        <PaymentMethodIcon
                          method={
                            payment.paymentMethod
                          }
                        />

                        {paymentMethodLabel[
                          payment.paymentMethod
                        ] ||
                          payment.paymentMethod}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <span className="text-sm font-black text-slate-950">
                        {formatCurrency(
                          payment.amount
                        )}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span className="text-sm text-slate-500">
                        {payment.reference ||
                          "—"}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span className="text-sm text-slate-500">
                        {formatDate(
                          payment.paymentDate
                        )}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                          statusClasses[
                            payment.status
                          ] ||
                          "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {payment.status}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedPayment(
                            payment
                          )
                        }
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
                      >
                        <Eye size={15} />

                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        {!loading &&
          payments.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                Page{" "}
                <span className="font-bold text-slate-700">
                  {pagination.page}
                </span>{" "}
                of{" "}
                <span className="font-bold text-slate-700">
                  {pagination.pages || 1}
                </span>{" "}
                ·{" "}
                <span className="font-bold text-slate-700">
                  {pagination.total || 0}
                </span>{" "}
                payments
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={
                    page <= 1 ||
                    loading
                  }
                  onClick={() =>
                    setPage((current) =>
                      Math.max(
                        current - 1,
                        1
                      )
                    )
                  }
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>

                <button
                  type="button"
                  disabled={
                    page >=
                      (pagination.pages ||
                        1) ||
                    loading
                  }
                  onClick={() =>
                    setPage((current) =>
                      current + 1
                    )
                  }
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
      </div>

      {/* DETAILS MODAL */}
      {selectedPayment && (
        <PaymentDetailsModal
          payment={selectedPayment}
          onClose={() =>
            setSelectedPayment(null)
          }
        />
      )}
    </div>
  );
};

const SummaryCard = ({
  title,
  value,
  icon,
  iconClass,
}) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-slate-400">
            {title}
          </p>

          <p className="mt-2 text-lg font-black text-slate-950">
            {formatCurrency(value)}
          </p>
        </div>

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconClass}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
};

const PaymentDetailsModal = ({
  payment,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-black text-slate-950">
              Payment Details
            </h2>

            <p className="mt-1 text-xs text-slate-400">
              Payment transaction information
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-5 p-6">
          <div className="rounded-2xl bg-slate-50 p-5 text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Amount
            </p>

            <p className="mt-2 text-3xl font-black text-slate-950">
              {formatCurrency(
                payment.amount
              )}
            </p>

            <span
              className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                statusClasses[
                  payment.status
                ] ||
                "bg-slate-100 text-slate-600"
              }`}
            >
              {payment.status}
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <DetailItem
              label="Receipt"
              value={
                payment.saleId
                  ?.receiptNumber ||
                "—"
              }
            />

            <DetailItem
              label="Payment Method"
              value={
                paymentMethodLabel[
                  payment.paymentMethod
                ] ||
                payment.paymentMethod
              }
            />

            <DetailItem
              label="Reference"
              value={
                payment.reference ||
                "—"
              }
            />

            <DetailItem
              label="Customer"
              value={
                payment.customerId
                  ?.name ||
                "Walk-in Customer"
              }
            />

            <DetailItem
              label="Received By"
              value={
                payment.receivedBy
                  ?.name ||
                payment.receivedBy
                  ?.email ||
                "—"
              }
            />

            <DetailItem
              label="Payment Date"
              value={formatDate(
                payment.paymentDate
              )}
            />
          </div>

          {payment.notes && (
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                Notes
              </p>

              <p className="mt-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                {payment.notes}
              </p>
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 px-6 py-4 text-right">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const DetailItem = ({
  label,
  value,
}) => {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold text-slate-700">
        {value}
      </p>
    </div>
  );
};

export default Payments;