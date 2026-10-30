import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Calendar,
  Download,
  FileText,
  RefreshCw,
  TrendingUp,
  Wallet,
  ShoppingCart,
  XCircle,
} from "lucide-react";

import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useBusiness } from "../../context/BusinessContext";

import ReportCharts from "../../components/pages/reports/ReportCharts";
import BusinessCopilot from "../../components/pages/reports/BusinessCopilot";
import ProfitAnalysis from "../../components/pages/reports/ProfitAnalysis";
import InventoryIntelligence from "../../components/pages/reports/InventoryIntelligence";
import BusinessHealthScore from "../../components/pages/reports/BusinessHealthScore";
import BusinessRecommendations from "../../components/pages/reports/BusinessRecommendations";

const formatUGX = (value) => {
  const number = Number(value) || 0;

  return new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    maximumFractionDigits: 0,
  }).format(number);
};

const formatNumber = (value) => {
  return new Intl.NumberFormat("en-UG").format(
    Number(value) || 0
  );
};

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("en-UG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
};

const getDateInputValue = (date) => {
  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getDefaultStartDate = () => {
  const date = new Date();

  date.setDate(date.getDate() - 29);

  return getDateInputValue(date);
};

const getDefaultEndDate = () => {
  return getDateInputValue(new Date());
};

const normalizeArray = (value) => {
  return Array.isArray(value) ? value : [];
};

const pickNumber = (...values) => {
  for (const value of values) {
    const number = Number(value);

    if (Number.isFinite(number)) {
      return number;
    }
  }

  return 0;
};

const getReportPayload = (response) => {
  return (
    response?.data?.report ||
    response?.data?.data ||
    response?.data ||
    {}
  );
};

const getInventoryPayload = (response) => {
  const data =
    response?.data?.report ||
    response?.data?.data ||
    response?.data ||
    {};

  if (Array.isArray(data)) {
    return data;
  }

  return (
    data?.inventory ||
    data?.products ||
    data?.items ||
    []
  );
};

const getProfitPayload = (response) => {
  const data =
    response?.data?.report ||
    response?.data?.data ||
    response?.data ||
    {};

  return data?.profit || data;
};

const ReportCard = ({
  title,
  value,
  subtitle,
  icon,
  iconClass = "bg-slate-100 text-slate-600",
}) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </p>

          {subtitle && (
            <p className="mt-1 text-xs text-slate-400">
              {subtitle}
            </p>
          )}
        </div>

        <div
          className={`rounded-xl p-3 ${iconClass}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
};

const SmallStat = ({
  label,
  value,
  description,
  valueClass = "text-slate-900",
}) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p
        className={`mt-1 text-lg font-bold ${valueClass}`}
      >
        {value}
      </p>

      {description && (
        <p className="mt-1 text-xs text-slate-500">
          {description}
        </p>
      )}
    </div>
  );
};

const EmptyState = ({
  title = "No data available",
  description = "There is no information to display for the selected period.",
}) => {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
      <FileText className="mx-auto h-8 w-8 text-slate-400" />

      <h3 className="mt-3 text-sm font-semibold text-slate-700">
        {title}
      </h3>

      <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500">
        {description}
      </p>
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const normalized = String(
    status || "UNKNOWN"
  ).toUpperCase();

  const styles = {
    COMPLETED:
      "bg-emerald-50 text-emerald-700 border-emerald-200",
    PAID:
      "bg-emerald-50 text-emerald-700 border-emerald-200",
    PENDING:
      "bg-amber-50 text-amber-700 border-amber-200",
    CANCELLED:
      "bg-red-50 text-red-700 border-red-200",
    REFUNDED:
      "bg-purple-50 text-purple-700 border-purple-200",
    PARTIALLY_REFUNDED:
      "bg-orange-50 text-orange-700 border-orange-200",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
        styles[normalized] ||
        "border-slate-200 bg-slate-50 text-slate-600"
      }`}
    >
      {normalized.replaceAll("_", " ")}
    </span>
  );
};

const Reports = () => {
  const { user } = useAuth();
  const isOwnerOrAdmin = ["OWNER", "ADMIN"].includes(String(user?.role || "").toUpperCase());
  const { business, branches } = useBusiness();
  const [allBranches, setAllBranches] = useState(false);
  const [reportBranchId, setReportBranchId] = useState("");

  const [startDate, setStartDate] = useState(
    getDefaultStartDate()
  );

  const [endDate, setEndDate] = useState(
    getDefaultEndDate()
  );

  const [report, setReport] = useState({
    sales: [],
    salesSummary: {},
    paymentBreakdown: [],
    productPerformance: [],
    expenseBreakdown: [],
    dailySales: [],
    profit: {},
    inventory: [],
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] = useState("");

  const loadReport = useCallback(
    async ({
      showRefreshing = false,
    } = {}) => {
      try {
        if (showRefreshing) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const params = {
          startDate,
          endDate,
          ...(reportBranchId ? { branchId: reportBranchId } : {}),
          ...(isOwnerOrAdmin && allBranches && !reportBranchId ? { allBranches: "true" } : {}),
        };

        const [
          generalResponse,
          salesResponse,
          profitResponse,
          inventoryResponse,
        ] = await Promise.allSettled([
          api.get("/reports", {
            params,
          }),

          api.get("/reports/sales", {
            params,
          }),

          api.get("/reports/profit", {
            params,
          }),

          api.get("/reports/inventory", {
            params,
          }),
        ]);

        let general = {};
        let sales = {};
        let profit = {};
        let inventory = [];

        if (
          generalResponse.status ===
          "fulfilled"
        ) {
          general = getReportPayload(
            generalResponse.value
          );
        }

        if (
          salesResponse.status ===
          "fulfilled"
        ) {
          sales = getReportPayload(
            salesResponse.value
          );
        }

        if (
          profitResponse.status ===
          "fulfilled"
        ) {
          profit = getProfitPayload(
            profitResponse.value
          );
        }

        if (
          inventoryResponse.status ===
          "fulfilled"
        ) {
          inventory =
            getInventoryPayload(
              inventoryResponse.value
            );
        }

        const salesList = normalizeArray(
          sales?.recentTransactions ||
            sales?.sales ||
            sales?.transactions ||
            sales?.recentSales ||
            general?.recentTransactions ||
            general?.sales ||
            general?.transactions
        );

        const paymentBreakdown =
          normalizeArray(
            sales?.paymentBreakdown ||
              general?.paymentBreakdown ||
              general?.payments
          );

        const productPerformance =
          normalizeArray(
            sales?.productPerformance ||
              sales?.products ||
              general?.productPerformance ||
              general?.products
          );

        const expenseBreakdown =
          normalizeArray(
            general?.expenseBreakdown ||
              general?.expensesByCategory ||
              general?.expenses
          );

        const dailySales = normalizeArray(
          sales?.dailySales ||
            general?.dailySales ||
            sales?.salesTrend ||
            general?.salesTrend
        );

        const salesSummary =
          sales?.summary ||
          sales?.salesSummary ||
          general?.salesSummary ||
          general?.summary ||
          {};

        const finalInventory =
          inventory.length > 0
            ? inventory
            : normalizeArray(
                general?.inventory ||
                  general?.inventoryReport ||
                  general?.stock
              );

        const finalProfit = {
          ...general?.profit,
          ...general?.profitReport,
          ...sales?.profit,
          ...profit,
        };

        setReport({
          sales: salesList,
          salesSummary,
          paymentBreakdown,
          productPerformance,
          expenseBreakdown,
          dailySales,
          profit: finalProfit,
          inventory: finalInventory,
        });

        const allFailed =
          generalResponse.status ===
            "rejected" &&
          salesResponse.status ===
            "rejected" &&
          profitResponse.status ===
            "rejected" &&
          inventoryResponse.status ===
            "rejected";

        if (allFailed) {
          throw new Error(
            "Unable to load report data."
          );
        }
      } catch (err) {
        console.error(
          "MOVA reports error:",
          err
        );

        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Unable to load report data."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [startDate, endDate, isOwnerOrAdmin, allBranches, reportBranchId]
  );

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const revenue = useMemo(() => {
    return pickNumber(
      report.salesSummary?.revenue,
      report.salesSummary?.totalRevenue,
      report.salesSummary?.sales,
      report.profit?.revenue,
      report.profit?.totalRevenue
    );
  }, [report]);

  const discounts = useMemo(() => {
    return pickNumber(
      report.salesSummary?.discounts,
      report.salesSummary?.totalDiscount,
      report.salesSummary?.discount,
      report.profit?.discounts,
      report.profit?.totalDiscount
    );
  }, [report]);

  const expenses = useMemo(() => {
    return pickNumber(
      report.salesSummary?.expenses,
      report.profit?.expenses,
      report.profit?.totalExpenses
    );
  }, [report]);

  const transactions = useMemo(() => {
    return pickNumber(
      report.salesSummary?.transactions,
      report.salesSummary?.transactionCount,
      report.salesSummary?.count,
      report.profit?.transactions
    );
  }, [report]);

  const cancelled = useMemo(() => {
    return pickNumber(
      report.salesSummary?.cancelled,
      report.salesSummary?.cancelledSales,
      report.salesSummary?.cancelledCount
    );
  }, [report]);

  const refunded = useMemo(() => {
    return pickNumber(
      report.salesSummary?.refunded,
      report.salesSummary?.refundedSales,
      report.salesSummary?.refundedCount
    );
  }, [report]);

  const cogs = useMemo(() => {
    return pickNumber(
      report.profit?.cogs,
      report.profit?.costOfGoodsSold,
      report.profit?.cost
    );
  }, [report]);

  const grossProfit = useMemo(() => {
    const explicitGrossProfit =
      pickNumber(
        report.profit?.grossProfit,
        report.profit?.grossProfitAmount
      );

    if (
      explicitGrossProfit !== 0 ||
      revenue === 0
    ) {
      return explicitGrossProfit;
    }

    return revenue - cogs;
  }, [
    report.profit,
    revenue,
    cogs,
  ]);

  const netResult = useMemo(() => {
    const explicitNetProfit =
      pickNumber(
        report.profit?.netProfit,
        report.profit?.netResult,
        report.profit?.profit
      );

    if (
      explicitNetProfit !== 0 ||
      revenue === 0
    ) {
      return explicitNetProfit;
    }

    return grossProfit - expenses;
  }, [
    report.profit,
    revenue,
    grossProfit,
    expenses,
  ]);

  const averageSale = useMemo(() => {
    if (transactions <= 0) {
      return 0;
    }

    return revenue / transactions;
  }, [
    revenue,
    transactions,
  ]);

  const profitMargin = useMemo(() => {
    if (revenue <= 0) {
      return 0;
    }

    return (
      (netResult / revenue) *
      100
    );
  }, [
    netResult,
    revenue,
  ]);

  const topProduct = useMemo(() => {
    if (
      !report.productPerformance.length
    ) {
      return null;
    }

    return [
      ...report.productPerformance,
    ].sort(
      (a, b) =>
        pickNumber(
          b.revenue,
          b.totalRevenue,
          b.sales
        ) -
        pickNumber(
          a.revenue,
          a.totalRevenue,
          a.sales
        )
    )[0];
  }, [
    report.productPerformance,
  ]);

  const topProductName = useMemo(() => {
    return (
      topProduct?.name ||
      topProduct?.productName ||
      topProduct?.product?.name ||
      "No product data"
    );
  }, [topProduct]);

  const topProductRevenue = useMemo(() => {
    return pickNumber(
      topProduct?.revenue,
      topProduct?.totalRevenue,
      topProduct?.sales
    );
  }, [topProduct]);

  const handleRefresh = () => {
    loadReport({
      showRefreshing: true,
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    const rows = [
      [
        "Receipt",
        "Date",
        "Payment Method",
        "Status",
        "Total",
      ],
      ...report.sales.map((sale) => [
        sale?.receiptNumber ||
          sale?.receipt ||
          "—",
        formatDate(
          sale?.createdAt ||
            sale?.date ||
            sale?.saleDate
        ),
        sale?.paymentMethod ||
          sale?.method ||
          "—",
        sale?.status ||
          sale?.paymentStatus ||
          "—",
        pickNumber(
          sale?.total,
          sale?.amount,
          sale?.grandTotal
        ),
      ]),
    ];

    const csv = rows
      .map((row) =>
        row
          .map((value) => {
            const text = String(
              value ?? ""
            );

            return `"${text.replaceAll(
              '"',
              '""'
            )}"`;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;

    link.download = `mova-sales-report-${startDate}-to-${endDate}.csv`;

    document.body.appendChild(link);

    link.click();

    link.remove();

    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200" />

            <div className="mt-2 h-4 w-72 animate-pulse rounded bg-slate-100" />
          </div>

          <div className="h-10 w-28 animate-pulse rounded-xl bg-slate-200" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map(
            (item) => (
              <div
                key={item}
                className="h-32 animate-pulse rounded-2xl bg-slate-100"
              />
            )
          )}
        </div>

        <div className="h-96 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10 print:space-y-4">
      {/* HEADER */}

      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Business Reports
            </h1>

            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
              MOVA Intelligence
            </span>
          </div>

          <p className="mt-1 text-sm text-slate-500">
            Understand your sales, profitability,
            expenses and inventory performance.
          </p>

          {business?.name && (
            <p className="mt-1 text-xs font-medium text-slate-400">
              {business.name}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
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
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <Download className="h-4 w-4" />

            Export CSV
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            <FileText className="h-4 w-4" />

            Print
          </button>
        </div>
      </div>

      {/* DATE FILTERS */}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm print:hidden">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-500" />

              <h2 className="text-sm font-semibold text-slate-800">
                Reporting Period
              </h2>
            </div>

            <p className="mt-1 text-xs text-slate-500">
              Select the period you want MOVA to analyze.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-500">
                Start date
              </span>

              <input
                type="date"
                value={startDate}
                max={endDate}
                onChange={(event) =>
                  setStartDate(
                    event.target.value
                  )
                }
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-500">
                End date
              </span>

              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(event) =>
                  setEndDate(
                    event.target.value
                  )
                }
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />
            </label>
          </div>

          {branches.length > 1 && <label className="block text-xs font-semibold text-slate-500">
            Branch scope
            <select value={reportBranchId} onChange={(event) => { setReportBranchId(event.target.value); setAllBranches(false); }} className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700">
              <option value="">Current branch</option>
              {branches.map((item) => <option key={item._id || item.id} value={item._id || item.id}>{item.name || item.code || "Branch"}</option>)}
            </select>
          </label>}
          {isOwnerOrAdmin && <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <input type="checkbox" checked={allBranches} disabled={Boolean(reportBranchId)} onChange={(event) => setAllBranches(event.target.checked)} className="h-4 w-4 rounded border-slate-300 accent-blue-600" />
            Include all business branches
          </label>}
        </div>
      </section>

      {/* ERROR */}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

            <div>
              <p className="text-sm font-semibold text-red-800">
                Report data could not be loaded
              </p>

              <p className="mt-1 text-xs leading-5 text-red-700">
                {error}
              </p>

              <button
                type="button"
                onClick={handleRefresh}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700"
              >
                <RefreshCw className="h-3.5 w-3.5" />

                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KPI CARDS */}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ReportCard
          title="Revenue"
          value={formatUGX(revenue)}
          subtitle={`${formatNumber(
            transactions
          )} transactions`}
          icon={
            <TrendingUp className="h-5 w-5" />
          }
          iconClass="bg-emerald-50 text-emerald-600"
        />

        <ReportCard
          title="Net Result"
          value={formatUGX(netResult)}
          subtitle={`${profitMargin.toFixed(
            1
          )}% profit margin`}
          icon={
            <Wallet className="h-5 w-5" />
          }
          iconClass={
            netResult >= 0
              ? "bg-blue-50 text-blue-600"
              : "bg-red-50 text-red-600"
          }
        />

        <ReportCard
          title="Expenses"
          value={formatUGX(expenses)}
          subtitle={
            revenue > 0
              ? `${(
                  (expenses / revenue) *
                  100
                ).toFixed(1)}% of revenue`
              : "No revenue recorded"
          }
          icon={
            <Wallet className="h-5 w-5" />
          }
          iconClass="bg-amber-50 text-amber-600"
        />

        <ReportCard
          title="Average Sale"
          value={formatUGX(averageSale)}
          subtitle="Average value per transaction"
          icon={
            <ShoppingCart className="h-5 w-5" />
          }
          iconClass="bg-purple-50 text-purple-600"
        />
      </div>

      {/* SMALL STATS */}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SmallStat
          label="COGS"
          value={formatUGX(cogs)}
          description="Cost of goods sold"
        />

        <SmallStat
          label="Gross Profit"
          value={formatUGX(grossProfit)}
          description="Revenue less COGS"
          valueClass={
            grossProfit >= 0
              ? "text-emerald-600"
              : "text-red-600"
          }
        />

        <SmallStat
          label="Discounts"
          value={formatUGX(discounts)}
          description="Discounts applied"
          valueClass="text-amber-600"
        />

        <SmallStat
          label="Refunded"
          value={formatNumber(refunded)}
          description={`${formatNumber(
            cancelled
          )} cancelled`}
          valueClass="text-red-600"
        />
      </div>

      {/* CHARTS */}

      <ReportCharts
        dailySales={report.dailySales}
        paymentBreakdown={
          report.paymentBreakdown
        }
        expenseBreakdown={
          report.expenseBreakdown
        }
      />

      {/* BUSINESS HEALTH */}

      <BusinessHealthScore
        revenue={revenue}
        expenses={expenses}
        netResult={netResult}
        transactions={transactions}
        cancelled={cancelled}
        refunded={refunded}
        inventory={report.inventory}
      />

      {/* BUSINESS RECOMMENDATIONS */}

      <BusinessRecommendations
        revenue={revenue}
        expenses={expenses}
        netResult={netResult}
        transactions={transactions}
        cancelled={cancelled}
        refunded={refunded}
        discounts={discounts}
        productPerformance={
          report.productPerformance
        }
        inventory={report.inventory}
        expenseBreakdown={
          report.expenseBreakdown
        }
        paymentBreakdown={
          report.paymentBreakdown
        }
      />

      {/* PROFIT ANALYSIS */}

      <ProfitAnalysis
        revenue={revenue}
        cogs={cogs}
        grossProfit={grossProfit}
        expenses={expenses}
        netResult={netResult}
      />

      {/* INVENTORY INTELLIGENCE */}

      <InventoryIntelligence
        inventory={report.inventory}
        products={
          report.productPerformance
        }
      />

      {/* TOP PRODUCT */}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Top Performing Product
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Highest revenue contributor in the selected period.
            </p>
          </div>

          {topProduct && (
            <div className="rounded-xl bg-emerald-50 px-4 py-3 text-right">
              <p className="text-xs font-medium text-emerald-600">
                Revenue
              </p>

              <p className="text-lg font-bold text-emerald-700">
                {formatUGX(
                  topProductRevenue
                )}
              </p>
            </div>
          )}
        </div>

        <div className="mt-5">
          {!topProduct ? (
            <EmptyState
              title="No product performance data"
              description="Product performance will appear here after sales are recorded."
            />
          ) : (
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <p className="font-semibold text-slate-900">
                  {topProductName}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {formatNumber(
                    pickNumber(
                      topProduct?.quantity,
                      topProduct?.unitsSold,
                      topProduct?.sold
                    )
                  )}{" "}
                  units sold
                </p>
              </div>

              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
          )}
        </div>
      </section>

      {/* PRODUCT PERFORMANCE */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Product Performance
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Products contributing to sales during the selected period.
            </p>
          </div>

          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
            {formatNumber(
              report.productPerformance.length
            )}{" "}
            products
          </span>
        </div>

        {report.productPerformance.length ===
        0 ? (
          <div className="p-5">
            <EmptyState
              title="No product performance data"
              description="Product-level sales analysis will appear here when transactions are recorded."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">
                    Product
                  </th>

                  <th className="px-5 py-3 text-right font-semibold">
                    Units
                  </th>

                  <th className="px-5 py-3 text-right font-semibold">
                    Revenue
                  </th>

                  <th className="px-5 py-3 text-right font-semibold">
                    Profit
                  </th>

                  <th className="px-5 py-3 text-right font-semibold">
                    Margin
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {report.productPerformance
                  .slice(0, 20)
                  .map(
                    (product, index) => {
                      const name =
                        product?.name ||
                        product?.productName ||
                        product?.product
                          ?.name ||
                        "Unknown Product";

                      const units =
                        pickNumber(
                          product?.quantity,
                          product?.unitsSold,
                          product?.sold
                        );

                      const productRevenue =
                        pickNumber(
                          product?.revenue,
                          product?.totalRevenue,
                          product?.sales
                        );

                      const productProfit =
                        pickNumber(
                          product?.profit,
                          product?.grossProfit,
                          product?.netProfit
                        );

                      const margin =
                        productRevenue > 0
                          ? (productProfit /
                              productRevenue) *
                            100
                          : 0;

                      return (
                        <tr
                          key={
                            product?._id ||
                            product?.productId ||
                            `${name}-${index}`
                          }
                          className="hover:bg-slate-50"
                        >
                          <td className="px-5 py-4">
                            <div className="font-medium text-slate-900">
                              {name}
                            </div>

                            {(product?.sku ||
                              product?.product
                                ?.sku) && (
                              <div className="mt-0.5 text-xs text-slate-400">
                                SKU:{" "}
                                {product?.sku ||
                                  product
                                    ?.product
                                    ?.sku}
                              </div>
                            )}
                          </td>

                          <td className="px-5 py-4 text-right font-medium text-slate-700">
                            {formatNumber(
                              units
                            )}
                          </td>

                          <td className="px-5 py-4 text-right font-semibold text-slate-900">
                            {formatUGX(
                              productRevenue
                            )}
                          </td>

                          <td
                            className={`px-5 py-4 text-right font-semibold ${
                              productProfit >=
                              0
                                ? "text-emerald-600"
                                : "text-red-600"
                            }`}
                          >
                            {formatUGX(
                              productProfit
                            )}
                          </td>

                          <td className="px-5 py-4 text-right">
                            <span
                              className={
                                margin >= 20
                                  ? "font-semibold text-emerald-600"
                                  : margin >= 10
                                  ? "font-semibold text-amber-600"
                                  : "font-semibold text-red-600"
                              }
                            >
                              {margin.toFixed(
                                1
                              )}
                              %
                            </span>
                          </td>
                        </tr>
                      );
                    }
                  )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* RECENT TRANSACTIONS */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Recent Transactions
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Sales recorded during the selected reporting period.
            </p>
          </div>

          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
            {formatNumber(
              report.sales.length
            )}{" "}
            records
          </span>
        </div>

        {report.sales.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="No transactions found"
              description="Sales transactions will appear here once they are recorded."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">
                    Receipt
                  </th>

                  <th className="px-5 py-3 font-semibold">
                    Date
                  </th>

                  <th className="px-5 py-3 font-semibold">
                    Payment
                  </th>

                  <th className="px-5 py-3 text-right font-semibold">
                    Total
                  </th>

                  <th className="px-5 py-3 text-right font-semibold">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {report.sales
                  .slice(0, 30)
                  .map(
                    (sale, index) => {
                      const receipt =
                        sale?.receiptNumber ||
                        sale?.receipt ||
                        sale?._id ||
                        "—";

                      const date =
                        sale?.createdAt ||
                        sale?.date ||
                        sale?.saleDate;

                      const paymentMethod =
                        sale?.paymentMethod ||
                        sale?.method ||
                        "—";

                      const total =
                        pickNumber(
                          sale?.total,
                          sale?.amount,
                          sale?.grandTotal
                        );

                      const status =
                        sale?.status ||
                        sale?.paymentStatus ||
                        "UNKNOWN";

                      return (
                        <tr
                          key={
                            sale?._id ||
                            `${receipt}-${index}`
                          }
                          className="hover:bg-slate-50"
                        >
                          <td className="px-5 py-4">
                            <span className="font-semibold text-slate-900">
                              {receipt}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-slate-600">
                            {formatDate(
                              date
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                              {String(
                                paymentMethod
                              ).replaceAll(
                                "_",
                                " "
                              )}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-right font-bold text-slate-900">
                            {formatUGX(
                              total
                            )}
                          </td>

                          <td className="px-5 py-4 text-right">
                            <StatusBadge
                              status={
                                status
                              }
                            />
                          </td>
                        </tr>
                      );
                    }
                  )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* PRINT FOOTER */}

      <div className="hidden print:block">
        <div className="mt-8 border-t border-slate-300 pt-4 text-xs text-slate-500">
          <p>
            MOVA Business Management Platform
          </p>

          <p className="mt-1">
            Report period: {startDate} to{" "}
            {endDate}
          </p>

          <p className="mt-1">
            Generated:{" "}
            {formatDate(new Date())}
          </p>
        </div>
      </div>

      {/* BUSINESS COPILOT */}

      <BusinessCopilot
        revenue={revenue}
        expenses={expenses}
        netResult={netResult}
        transactions={transactions}
        averageSale={averageSale}
        discounts={discounts}
        cancelled={cancelled}
        refunded={refunded}
        paymentBreakdown={
          report.paymentBreakdown
        }
        productPerformance={
          report.productPerformance
        }
        expenseBreakdown={
          report.expenseBreakdown
        }
        dailySales={report.dailySales}
      />
    </div>
  );
};

export default Reports;
