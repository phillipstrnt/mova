import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Calendar,
  Download,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  TrendingUp,
  Wallet,
  ShoppingCart,
  XCircle,
  RotateCcw,
} from "lucide-react";

import api from "../../services/api";
import { useBusiness } from "../../context/BusinessContext";

import ReportCharts from "../../components/pages/reports/ReportCharts";
import BusinessInsights from "../../components/pages/reports/BusinessInsights";
import BusinessCopilot from "../../components/pages/reports/BusinessCopilot";

const formatUGX = (value) => {
  const number = Number(value) || 0;

  return new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    maximumFractionDigits: 0,
  }).format(number);
};

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-UG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const getToday = () => {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getMonthStart = () => {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}-01`;
};

const downloadCSV = (filename, rows) => {
  if (!Array.isArray(rows) || !rows.length) {
    return;
  }

  const headers = Object.keys(rows[0]);

  const csvRows = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const value = row[header] ?? "";
          const escaped = String(value).replace(
            /"/g,
            '""'
          );

          return `"${escaped}"`;
        })
        .join(",")
    ),
  ];

  const blob = new Blob([csvRows.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};

const Reports = () => {
  const { branch } = useBusiness();

  const [startDate, setStartDate] = useState(
    getMonthStart()
  );

  const [endDate, setEndDate] = useState(
    getToday()
  );

  const [report, setReport] = useState(null);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");

  const loadReport = useCallback(
    async (showLoader = true) => {
      try {
        if (showLoader) {
          setLoading(true);
        } else {
          setRefreshing(true);
        }

        setError("");

        const [
          generalResponse,
          salesResponse,
        ] = await Promise.all([
          api.get("/reports", {
            params: {
              startDate,
              endDate,
            },
          }),

          api.get("/reports/sales", {
            params: {
              startDate,
              endDate,
            },
          }),
        ]);

        const general =
          generalResponse?.data || {};

        const sales =
          salesResponse?.data || {};

        setReport({
          ...general,

          sales:
            sales?.sales ||
            general?.sales ||
            [],

          salesSummary:
            sales?.summary ||
            general?.salesSummary ||
            {},

          paymentBreakdown:
            general?.paymentBreakdown ||
            sales?.paymentBreakdown ||
            [],

          productPerformance:
            general?.productPerformance ||
            sales?.productPerformance ||
            [],

          expenseBreakdown:
            general?.expenseBreakdown ||
            [],

          dailySales:
            general?.dailySales ||
            general?.salesChart ||
            sales?.dailySales ||
            [],
        });
      } catch (requestError) {
        console.error(
          "MOVA reports error:",
          requestError
        );

        setError(
          requestError?.response?.data?.message ||
            requestError?.message ||
            "Unable to load reports."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [startDate, endDate]
  );

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  useEffect(() => {
    const handleBranchChange = () => {
      loadReport(false);
    };

    window.addEventListener(
      "mova:branch-changed",
      handleBranchChange
    );

    return () => {
      window.removeEventListener(
        "mova:branch-changed",
        handleBranchChange
      );
    };
  }, [loadReport]);

  const summary = report?.summary || {};

  const salesSummary =
    report?.salesSummary || {};

  const sales = Array.isArray(report?.sales)
    ? report.sales
    : [];

  const paymentBreakdown = Array.isArray(
    report?.paymentBreakdown
  )
    ? report.paymentBreakdown
    : [];

  const productPerformance =
    Array.isArray(report?.productPerformance)
      ? report.productPerformance
      : [];

  const expenseBreakdown =
    Array.isArray(report?.expenseBreakdown)
      ? report.expenseBreakdown
      : [];

  const dailySales =
    Array.isArray(report?.dailySales)
      ? report.dailySales
      : [];

  const revenue = Number(
    salesSummary.revenue ??
      salesSummary.totalRevenue ??
      summary.revenue ??
      0
  );

  const discounts = Number(
    salesSummary.discounts ??
      salesSummary.totalDiscounts ??
      summary.discounts ??
      0
  );

  const expenses = Number(
    summary.expenses ??
      summary.totalExpenses ??
      0
  );

  const netResult = Number(
    summary.netResult ??
      summary.netProfit ??
      summary.profit ??
      revenue - expenses
  );

  const transactions = Number(
    salesSummary.transactions ??
      salesSummary.count ??
      summary.transactions ??
      0
  );

  const cancelled = Number(
    salesSummary.cancelled ??
      summary.cancelled ??
      0
  );

  const refunded = Number(
    salesSummary.refunded ??
      summary.refunded ??
      0
  );

  const averageSale =
    transactions > 0
      ? revenue / transactions
      : 0;

  const profitMargin =
    revenue > 0
      ? (netResult / revenue) * 100
      : 0;

  const topProduct = useMemo(() => {
    if (!productPerformance.length) {
      return null;
    }

    return [...productPerformance].sort(
      (a, b) =>
        Number(
          b?.revenue ??
            b?.sales ??
            b?.total ??
            b?.amount ??
            0
        ) -
        Number(
          a?.revenue ??
            a?.sales ??
            a?.total ??
            a?.amount ??
            0
        )
    )[0];
  }, [productPerformance]);

  const handleExport = () => {
    const rows = sales.map((sale) => ({
      Receipt:
        sale.receiptNumber ||
        sale.saleNumber ||
        "",

      Date: sale.createdAt
        ? new Date(
            sale.createdAt
          ).toLocaleString()
        : "",

      Customer:
        sale.customerName ||
        sale.customer ||
        "Walk-in Customer",

      Cashier:
        sale.cashierName ||
        sale.cashier ||
        "",

      Payment:
        sale.paymentMethod || "",

      Subtotal:
        sale.subtotal || 0,

      Discount:
        sale.discount || 0,

      Total:
        sale.total || 0,

      Status:
        sale.status || "",
    }));

    downloadCSV(
      `mova-sales-${startDate}-to-${endDate}.csv`,
      rows
    );
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-28 animate-pulse rounded-2xl bg-slate-100" />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map(
            (_, index) => (
              <div
                key={index}
                className="h-32 animate-pulse rounded-2xl bg-slate-100"
              />
            )
          )}
        </div>

        <div className="h-96 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <div className="max-w-md rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <XCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />

          <h2 className="text-lg font-bold text-red-800">
            Unable to load reports
          </h2>

          <p className="mt-2 text-sm text-red-600">
            {error}
          </p>

          <button
            type="button"
            onClick={() => loadReport()}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      id="mova-reports"
      className="space-y-6 print:space-y-4"
    >
      {/* HEADER */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-slate-950 p-2.5 text-white">
              <TrendingUp className="h-5 w-5" />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Reports
              </h1>

              <p className="text-sm text-slate-500">
                Business performance and intelligence
              </p>
            </div>
          </div>

          <p className="mt-3 text-sm text-slate-500">
            {branch?.name
              ? `${branch.name} • `
              : ""}
            {startDate} to {endDate}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 print:hidden">
          <button
            type="button"
            onClick={() => loadReport(false)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                refreshing
                  ? "animate-spin"
                  : ""
              }`}
            />

            Refresh
          </button>

          <button
            type="button"
            onClick={handleExport}
            disabled={!sales.length}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <FileText className="h-4 w-4" />
            Print
          </button>
        </div>
      </div>

      {/* DATE FILTERS */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm print:hidden">
        <div className="flex flex-col gap-4 md:flex-row md:items-end">
          <div className="flex-1">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Start date
            </label>

            <div className="relative">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                type="date"
                value={startDate}
                onChange={(event) =>
                  setStartDate(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />
            </div>
          </div>

          <div className="flex-1">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              End date
            </label>

            <div className="relative">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                type="date"
                value={endDate}
                onChange={(event) =>
                  setEndDate(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setStartDate(getMonthStart());
                setEndDate(getToday());
              }}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              This month
            </button>

            <button
              type="button"
              onClick={() => {
                const today = getToday();

                setStartDate(today);
                setEndDate(today);
              }}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Today
            </button>
          </div>
        </div>
      </section>

      {/* KPI CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ReportCard
          title="Revenue"
          value={formatUGX(revenue)}
          description={`${transactions} transaction${
            transactions === 1
              ? ""
              : "s"
          }`}
          icon={
            <TrendingUp className="h-5 w-5" />
          }
        />

        <ReportCard
          title="Average Sale"
          value={formatUGX(averageSale)}
          description="Average value per transaction"
          icon={
            <ShoppingCart className="h-5 w-5" />
          }
        />

        <ReportCard
          title="Expenses"
          value={formatUGX(expenses)}
          description="Reported business expenses"
          icon={
            <Wallet className="h-5 w-5" />
          }
        />

        <ReportCard
          title="Net Result"
          value={formatUGX(netResult)}
          description={`${profitMargin.toFixed(
            1
          )}% reported margin`}
          icon={
            <TrendingUp className="h-5 w-5" />
          }
          positive={netResult >= 0}
        />
      </div>

      {/* SECONDARY STATS */}
      <div className="grid gap-4 sm:grid-cols-3">
        <SmallStat
          title="Discounts"
          value={formatUGX(discounts)}
        />

        <SmallStat
          title="Cancelled"
          value={cancelled}
          icon={
            <XCircle className="h-4 w-4" />
          }
        />

        <SmallStat
          title="Refunded"
          value={refunded}
          icon={
            <RotateCcw className="h-4 w-4" />
          }
        />
      </div>

      {/* CHARTS */}
      <ReportCharts
        dailySales={dailySales}
        paymentBreakdown={paymentBreakdown}
        expenseBreakdown={expenseBreakdown}
      />

      {/* MOVA BUSINESS INTELLIGENCE */}
      <BusinessInsights
        revenue={revenue}
        expenses={expenses}
        netResult={netResult}
        transactions={transactions}
        averageSale={averageSale}
        discounts={discounts}
        cancelled={cancelled}
        refunded={refunded}
        paymentBreakdown={paymentBreakdown}
        productPerformance={productPerformance}
        expenseBreakdown={expenseBreakdown}
        dailySales={dailySales}
      />

      {/* TOP PRODUCT SNAPSHOT */}
      {topProduct && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Current top product
              </p>

              <h2 className="mt-1 text-lg font-bold text-slate-900">
                {topProduct.name ||
                  topProduct.productName ||
                  topProduct.product ||
                  "Top Product"}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Leading product based on the current report data.
              </p>
            </div>

            <div className="text-left md:text-right">
              <p className="text-xl font-bold text-slate-900">
                {formatUGX(
                  Number(
                    topProduct.revenue ??
                      topProduct.sales ??
                      topProduct.total ??
                      topProduct.amount ??
                      0
                  )
                )}
              </p>

              <p className="text-xs text-slate-500">
                Reported sales value
              </p>
            </div>
          </div>
        </section>
      )}

      {/* PRODUCT PERFORMANCE */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="font-semibold text-slate-900">
              Product Performance
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Products contributing most to sales.
            </p>
          </div>

          <FileSpreadsheet className="h-5 w-5 text-slate-400" />
        </div>

        {productPerformance.length === 0 ? (
          <EmptyState message="No product performance data available." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">
                    Product
                  </th>

                  <th className="px-5 py-3">
                    Quantity
                  </th>

                  <th className="px-5 py-3">
                    Revenue
                  </th>

                  <th className="px-5 py-3">
                    Share
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {productPerformance
                  .slice(0, 10)
                  .map((product, index) => {
                    const productRevenue =
                      Number(
                        product?.revenue ??
                          product?.sales ??
                          product?.total ??
                          product?.amount ??
                          0
                      ) || 0;

                    const quantity =
                      Number(
                        product?.quantity ??
                          product?.unitsSold ??
                          product?.sold ??
                          product?.totalQuantity ??
                          0
                      ) || 0;

                    const share =
                      revenue > 0
                        ? (productRevenue /
                            revenue) *
                          100
                        : 0;

                    return (
                      <tr
                        key={
                          product?._id ||
                          product?.productId ||
                          `${product?.name}-${index}`
                        }
                        className="hover:bg-slate-50"
                      >
                        <td className="px-5 py-3.5 font-medium text-slate-900">
                          {product?.name ||
                            product?.productName ||
                            product?.product ||
                            "Unknown product"}
                        </td>

                        <td className="px-5 py-3.5 text-slate-600">
                          {quantity}
                        </td>

                        <td className="px-5 py-3.5 font-semibold text-slate-900">
                          {formatUGX(
                            productRevenue
                          )}
                        </td>

                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-slate-900"
                                style={{
                                  width: `${Math.min(
                                    share,
                                    100
                                  )}%`,
                                }}
                              />
                            </div>

                            <span className="text-xs text-slate-500">
                              {share.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* RECENT SALES */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-slate-900">
            Recent Transactions
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Sales recorded during the selected period.
          </p>
        </div>

        {sales.length === 0 ? (
          <EmptyState message="No transactions found for this period." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">
                    Receipt
                  </th>

                  <th className="px-5 py-3">
                    Date
                  </th>

                  <th className="px-5 py-3">
                    Customer
                  </th>

                  <th className="px-5 py-3">
                    Payment
                  </th>

                  <th className="px-5 py-3">
                    Total
                  </th>

                  <th className="px-5 py-3">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {sales
                  .slice(0, 20)
                  .map((sale, index) => (
                    <tr
                      key={
                        sale?._id ||
                        sale?.receiptNumber ||
                        index
                      }
                      className="hover:bg-slate-50"
                    >
                      <td className="px-5 py-3.5 font-semibold text-slate-900">
                        {sale?.receiptNumber ||
                          sale?.saleNumber ||
                          "—"}
                      </td>

                      <td className="px-5 py-3.5 text-slate-500">
                        {formatDate(
                          sale?.createdAt
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-slate-600">
                        {sale?.customerName ||
                          sale?.customer ||
                          "Walk-in Customer"}
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                          {sale?.paymentMethod ||
                            "—"}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 font-semibold text-slate-900">
                        {formatUGX(
                          sale?.total
                        )}
                      </td>

                      <td className="px-5 py-3.5">
                        <StatusBadge
                          status={
                            sale?.status ||
                            "COMPLETED"
                          }
                        />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* PRINT FOOTER */}
      <div className="hidden print:block">
        <div className="mt-8 border-t border-slate-300 pt-4 text-center text-xs text-slate-500">
          MOVA Business Management Platform
          <br />
          Report generated for{" "}
          {branch?.name || "current branch"}
          <br />
          {startDate} — {endDate}
        </div>
      </div>

      {/* MOVA BUSINESS COPILOT */}
      <BusinessCopilot
        revenue={revenue}
        expenses={expenses}
        netResult={netResult}
        transactions={transactions}
        averageSale={averageSale}
        discounts={discounts}
        cancelled={cancelled}
        refunded={refunded}
        paymentBreakdown={paymentBreakdown}
        productPerformance={productPerformance}
        expenseBreakdown={expenseBreakdown}
        dailySales={dailySales}
      />
    </div>
  );
};

const ReportCard = ({
  title,
  value,
  description,
  icon,
  positive = true,
}) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            {title}
          </p>

          <p
            className={`mt-2 text-2xl font-bold ${
              positive
                ? "text-slate-900"
                : "text-red-600"
            }`}
          >
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {description}
          </p>
        </div>

        <div
          className={`rounded-xl p-2.5 ${
            positive
              ? "bg-slate-100 text-slate-700"
              : "bg-red-50 text-red-600"
          }`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
};

const SmallStat = ({
  title,
  value,
  icon,
}) => {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {title}
        </p>

        <p className="mt-1 text-lg font-bold text-slate-900">
          {value}
        </p>
      </div>

      {icon && (
        <div className="rounded-xl bg-slate-100 p-2 text-slate-500">
          {icon}
        </div>
      )}
    </div>
  );
};

const EmptyState = ({ message }) => {
  return (
    <div className="px-5 py-12 text-center">
      <p className="text-sm text-slate-500">
        {message}
      </p>
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const normalized = String(
    status || ""
  ).toUpperCase();

  const classes = {
    COMPLETED:
      "bg-emerald-50 text-emerald-700",

    CANCELLED:
      "bg-red-50 text-red-700",

    PARTIALLY_REFUNDED:
      "bg-amber-50 text-amber-700",

    REFUNDED:
      "bg-purple-50 text-purple-700",
  };

  return (
    <span
      className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
        classes[normalized] ||
        "bg-slate-100 text-slate-600"
      }`}
    >
      {normalized.replaceAll("_", " ") ||
        "UNKNOWN"}
    </span>
  );
};

export default Reports;