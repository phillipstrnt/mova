import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  BarChart3,
  Calendar,
  Download,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  TrendingUp,
  Wallet,
  CreditCard,
  ShoppingCart,
  XCircle,
  RotateCcw,
} from "lucide-react";

import api from "../../services/api";
import { useBusiness } from "../../context/BusinessContext";

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const formatUGX = (value) => {
  const number = Number(value) || 0;

  return new Intl.NumberFormat(
    "en-UG",
    {
      style: "currency",
      currency: "UGX",
      maximumFractionDigits: 0,
    }
  ).format(number);
};

const formatDate = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-UG",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(date);
};

const formatShortDate = (
  value
) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-UG",
    {
      month: "short",
      day: "numeric",
    }
  ).format(date);
};

const getToday = () => {
  const date =
    new Date();

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      date.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getMonthStart = () => {
  const date =
    new Date();

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, "0");

  return `${year}-${month}-01`;
};

const downloadCSV = (
  filename,
  rows
) => {
  if (!rows.length) {
    return;
  }

  const headers =
    Object.keys(
      rows[0]
    );

  const csvRows = [
    headers.join(","),
    ...rows.map(
      (row) =>
        headers
          .map((header) => {
            const value =
              row[header] ??
              "";

            const escaped =
              String(
                value
              ).replace(
                /"/g,
                '""'
              );

            return `"${escaped}"`;
          })
          .join(",")
    ),
  ];

  const blob =
    new Blob(
      [csvRows.join("\n")],
      {
        type:
          "text/csv;charset=utf-8;",
      }
    );

  const url =
    URL.createObjectURL(
      blob
    );

  const link =
    document.createElement(
      "a"
    );

  link.href = url;
  link.download =
    filename;

  document.body.appendChild(
    link
  );

  link.click();

  document.body.removeChild(
    link
  );

  URL.revokeObjectURL(
    url
  );
};

/*
|--------------------------------------------------------------------------
| Main Component
|--------------------------------------------------------------------------
*/

const Reports = () => {
  const {
    branch,
  } = useBusiness();

  const [
    startDate,
    setStartDate,
  ] = useState(
    getMonthStart()
  );

  const [
    endDate,
    setEndDate,
  ] = useState(
    getToday()
  );

  const [
    report,
    setReport,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  /*
  |--------------------------------------------------------------------------
  | Load report
  |--------------------------------------------------------------------------
  */

  const loadReport =
    useCallback(
      async (
        showLoader = true
      ) => {
        try {
          if (showLoader) {
            setLoading(true);
          } else {
            setRefreshing(true);
          }

          setError("");

          /*
          |--------------------------------------------------------------------------
          | Load both:
          | 1. General report
          | 2. Detailed sales report
          |--------------------------------------------------------------------------
          */

          const [
            generalResponse,
            salesResponse,
          ] =
            await Promise.all([
              api.get(
                "/reports",
                {
                  params: {
                    startDate,
                    endDate,
                  },
                }
              ),

              api.get(
                "/reports/sales",
                {
                  params: {
                    startDate,
                    endDate,
                  },
                }
              ),
            ]);

          const general =
            generalResponse?.data ||
            {};

          const sales =
            salesResponse?.data ||
            {};

          /*
          |--------------------------------------------------------------------------
          | Combine responses
          |--------------------------------------------------------------------------
          */

          setReport({
            ...general,

            sales:
              sales?.sales ||
              general?.sales ||
              [],

            salesSummary:
              sales?.summary ||
              {},

            paymentBreakdown:
              general?.paymentBreakdown ||
              sales?.paymentBreakdown ||
              [],

            productPerformance:
              general?.productPerformance ||
              [],

            expenseBreakdown:
              general?.expenseBreakdown ||
              [],

            dailySales:
              general?.dailySales ||
              general?.salesChart ||
              [],
          });
        } catch (requestError) {
          console.error(
            "MOVA reports error:",
            requestError
          );

          setError(
            requestError?.response?.data
              ?.message ||
              "Unable to load reports."
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [
        startDate,
        endDate,
      ]
    );

  useEffect(() => {
    loadReport();
  }, [
    loadReport,
  ]);

  /*
  |--------------------------------------------------------------------------
  | Branch changes
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const handleBranchChange =
      () => {
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
  }, [
    loadReport,
  ]);

  /*
  |--------------------------------------------------------------------------
  | Data
  |--------------------------------------------------------------------------
  */

  const summary =
    report?.summary ||
    {};

  const salesSummary =
    report?.salesSummary ||
    {};

  const sales =
    Array.isArray(
      report?.sales
    )
      ? report.sales
      : [];

  const paymentBreakdown =
    Array.isArray(
      report?.paymentBreakdown
    )
      ? report.paymentBreakdown
      : [];

  const productPerformance =
    Array.isArray(
      report?.productPerformance
    )
      ? report.productPerformance
      : [];

  const expenseBreakdown =
    Array.isArray(
      report?.expenseBreakdown
    )
      ? report.expenseBreakdown
      : [];

  const dailySales =
    Array.isArray(
      report?.dailySales
    )
      ? report.dailySales
      : [];

  /*
  |--------------------------------------------------------------------------
  | Calculated values
  |--------------------------------------------------------------------------
  */

  const revenue =
    Number(
      salesSummary.revenue ??
        summary.revenue ??
        0
    );

  const discounts =
    Number(
      salesSummary.discounts ??
        salesSummary.totalDiscounts ??
        summary.discounts ??
        0
    );

  const expenses =
    Number(
      summary.expenses ??
        0
    );

  const netResult =
    Number(
      summary.netResult ??
        revenue -
          expenses
    );

  const transactions =
    Number(
      salesSummary.transactions ??
        summary.transactions ??
        0
    );

  const cancelled =
    Number(
      salesSummary.cancelled ??
        summary.cancelled ??
        0
    );

  const refunded =
    Number(
      salesSummary.refunded ??
        summary.refunded ??
        0
    );

  const averageSale =
    transactions > 0
      ? revenue /
        transactions
      : 0;

  const maxDailyRevenue =
    dailySales.length
      ? Math.max(
          ...dailySales.map(
            (item) =>
              Number(
                item?.revenue
              ) || 0
          )
        )
      : 0;

  /*
  |--------------------------------------------------------------------------
  | Export
  |--------------------------------------------------------------------------
  */

  const handleExport =
    () => {
      const rows =
        sales.map(
          (sale) => ({
            Receipt:
              sale.receiptNumber ||
              sale.saleNumber ||
              "",

            Date:
              sale.createdAt
                ? new Date(
                    sale.createdAt
                  ).toLocaleString()
                : "",

            Customer:
              sale.customerName ||
              sale.customer ||
              "Walk-in Customer",

            Cashier:
              sale.cashier ||
              "",

            Payment:
              sale.paymentMethod ||
              "",

            Subtotal:
              sale.subtotal ||
              0,

            Discount:
              sale.discount ||
              0,

            Total:
              sale.total ||
              0,

            Status:
              sale.status ||
              "",
          })
        );

      downloadCSV(
        `mova-sales-${startDate}-to-${endDate}.csv`,
        rows
      );
    };

  /*
  |--------------------------------------------------------------------------
  | Print
  |--------------------------------------------------------------------------
  */

  const handlePrint =
    () => {
      window.print();
    };

  /*
  |--------------------------------------------------------------------------
  | Loading
  |--------------------------------------------------------------------------
  */

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-8 w-56 animate-pulse rounded-lg bg-slate-200" />

          <div className="mt-2 h-4 w-80 animate-pulse rounded bg-slate-200" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from(
            {
              length: 4,
            }
          ).map(
            (_, index) => (
              <div
                key={index}
                className="h-32 animate-pulse rounded-2xl bg-slate-200"
              />
            )
          )}
        </div>

        <div className="h-96 animate-pulse rounded-2xl bg-slate-200" />
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Error
  |--------------------------------------------------------------------------
  */

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Reports
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Analyze your business performance.
          </p>
        </div>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-red-100 p-3 text-red-600">
              <XCircle
                size={22}
              />
            </div>

            <div className="flex-1">
              <h2 className="font-semibold text-red-900">
                Unable to load reports
              </h2>

              <p className="mt-1 text-sm text-red-700">
                {error}
              </p>

              <button
                type="button"
                onClick={() =>
                  loadReport()
                }
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                <RefreshCw
                  size={16}
                />
                Try again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Render
  |--------------------------------------------------------------------------
  */

  return (
    <div
      id="mova-reports"
      className="space-y-6 print:space-y-4"
    >
      {/* Header */}

      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {branch?.name
              ? `${branch.name} • `
              : ""}
            Business intelligence
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Reports
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Understand your sales, payments,
            expenses and business performance.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 print:hidden">
          <button
            type="button"
            onClick={() =>
              loadReport(false)
            }
            disabled={
              refreshing
            }
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw
              size={16}
              className={
                refreshing
                  ? "animate-spin"
                  : ""
              }
            />

            Refresh
          </button>

          <button
            type="button"
            onClick={
              handleExport
            }
            disabled={
              !sales.length
            }
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download
              size={16}
            />

            Export CSV
          </button>

          <button
            type="button"
            onClick={
              handlePrint
            }
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <FileText
              size={16}
            />

            Print
          </button>
        </div>
      </div>

      {/* Date Filters */}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm print:hidden">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-slate-100 p-2.5 text-slate-700">
              <Calendar
                size={19}
              />
            </div>

            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Report period
              </h2>

              <p className="text-xs text-slate-500">
                Select the period you want to analyze.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[430px]">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-500">
                From
              </span>

              <input
                type="date"
                value={
                  startDate
                }
                onChange={(
                  event
                ) =>
                  setStartDate(
                    event
                      .target
                      .value
                  )
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-500">
                To
              </span>

              <input
                type="date"
                value={
                  endDate
                }
                onChange={(
                  event
                ) =>
                  setEndDate(
                    event
                      .target
                      .value
                  )
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />
            </label>
          </div>
        </div>
      </div>

      {/* KPI Cards */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ReportCard
          title="Revenue"
          value={formatUGX(
            revenue
          )}
          description={`${transactions} completed transactions`}
          icon={
            <TrendingUp
              size={20}
            />
          }
        />

        <ReportCard
          title="Average Sale"
          value={formatUGX(
            averageSale
          )}
          description="Average completed transaction"
          icon={
            <ShoppingCart
              size={20}
            />
          }
        />

        <ReportCard
          title="Expenses"
          value={formatUGX(
            expenses
          )}
          description="Recorded expenses"
          icon={
            <Wallet
              size={20}
            />
          }
        />

        <ReportCard
          title="Net Result"
          value={formatUGX(
            netResult
          )}
          description="Revenue minus expenses"
          icon={
            <BarChart3
              size={20}
            />
          }
        />
      </div>

      {/* Secondary Stats */}

      <div className="grid gap-4 sm:grid-cols-3">
        <SmallStat
          label="Discounts"
          value={formatUGX(
            discounts
          )}
        />

        <SmallStat
          label="Cancelled"
          value={
            cancelled
          }
        />

        <SmallStat
          label="Refunded"
          value={
            refunded
          }
        />
      </div>

      {/* Sales Trend */}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Sales trend
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Daily revenue during the selected period.
            </p>
          </div>

          <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
            {formatDate(
              startDate
            )}{" "}
            —{" "}
            {formatDate(
              endDate
            )}
          </div>
        </div>

        {dailySales.length ===
        0 ? (
          <EmptyState
            message="No sales recorded for this period."
          />
        ) : (
          <div className="mt-6">
            <div className="flex h-64 items-end gap-2 overflow-x-auto border-b border-slate-100 pb-0">
              {dailySales.map(
                (
                  item
                ) => {
                  const revenueValue =
                    Number(
                      item?.revenue
                    ) || 0;

                  const percentage =
                    maxDailyRevenue >
                    0
                      ? Math.max(
                          6,
                          (revenueValue /
                            maxDailyRevenue) *
                            100
                        )
                      : 6;

                  return (
                    <div
                      key={
                        item.date
                      }
                      className="flex h-full min-w-[52px] flex-1 flex-col justify-end"
                    >
                      <div className="group relative flex h-full items-end justify-center">
                        <div
                          className="w-7 rounded-t-lg bg-slate-800 transition-all hover:bg-slate-700 sm:w-9"
                          style={{
                            height: `${percentage}%`,
                          }}
                          title={`${formatShortDate(
                            item.date
                          )}: ${formatUGX(
                            revenueValue
                          )}`}
                        />
                      </div>

                      <div className="mt-2 truncate text-center text-[10px] text-slate-400">
                        {formatShortDate(
                          item.date
                        )}
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </div>
        )}
      </section>

      {/* Payment + Expenses */}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Payment Methods */}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-slate-100 p-2.5 text-slate-700">
              <CreditCard
                size={19}
              />
            </div>

            <div>
              <h2 className="text-base font-bold text-slate-900">
                Payment methods
              </h2>

              <p className="text-xs text-slate-500">
                How customers paid.
              </p>
            </div>
          </div>

          {paymentBreakdown.length ===
          0 ? (
            <EmptyState
              message="No payment data available."
            />
          ) : (
            <div className="mt-5 space-y-4">
              {paymentBreakdown.map(
                (
                  payment
                ) => {
                  const amount =
                    Number(
                      payment.amount
                    ) || 0;

                  const percentage =
                    revenue >
                    0
                      ? (amount /
                          revenue) *
                        100
                      : 0;

                  return (
                    <div
                      key={
                        payment.method
                      }
                    >
                      <div className="mb-1.5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold capitalize text-slate-800">
                            {String(
                              payment.method ||
                                "Other"
                            ).replace(
                              /_/g,
                              " "
                            )}
                          </span>

                          <span className="text-xs text-slate-400">
                            {
                              payment.count
                            }{" "}
                            sales
                          </span>
                        </div>

                        <span className="text-sm font-semibold text-slate-900">
                          {formatUGX(
                            amount
                          )}
                        </span>
                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-slate-800"
                          style={{
                            width: `${Math.min(
                              100,
                              percentage
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </section>

        {/* Expenses */}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-slate-100 p-2.5 text-slate-700">
              <Wallet
                size={19}
              />
            </div>

            <div>
              <h2 className="text-base font-bold text-slate-900">
                Expense breakdown
              </h2>

              <p className="text-xs text-slate-500">
                Where business expenses are going.
              </p>
            </div>
          </div>

          {expenseBreakdown.length ===
          0 ? (
            <EmptyState
              message="No expenses recorded for this period."
            />
          ) : (
            <div className="mt-5 space-y-4">
              {expenseBreakdown.map(
                (
                  expense
                ) => {
                  const amount =
                    Number(
                      expense.amount
                    ) || 0;

                  const percentage =
                    expenses >
                    0
                      ? (amount /
                          expenses) *
                        100
                      : 0;

                  return (
                    <div
                      key={
                        expense.category
                      }
                    >
                      <div className="mb-1.5 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold capitalize text-slate-800">
                            {String(
                              expense.category ||
                                "Other"
                            ).replace(
                              /_/g,
                              " "
                            )}
                          </p>

                          <p className="text-xs text-slate-400">
                            {
                              expense.count
                            }{" "}
                            entries
                          </p>
                        </div>

                        <span className="text-sm font-semibold text-slate-900">
                          {formatUGX(
                            amount
                          )}
                        </span>
                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-slate-500"
                          style={{
                            width: `${Math.min(
                              100,
                              percentage
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </section>
      </div>

      {/* Product Performance */}

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Product performance
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Best-performing products by sales revenue.
            </p>
          </div>

          <span className="text-xs text-slate-400">
            Top 20 products
          </span>
        </div>

        {productPerformance.length ===
        0 ? (
          <EmptyState
            message="No product sales found for this period."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Product
                  </th>

                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Quantity
                  </th>

                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Revenue
                  </th>
                </tr>
              </thead>

              <tbody>
                {productPerformance.map(
                  (
                    product,
                    index
                  ) => (
                    <tr
                      key={
                        product.productId ||
                        product.name ||
                        index
                      }
                      className="border-b border-slate-50 last:border-0"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600">
                            {index +
                              1}
                          </span>

                          <span className="text-sm font-semibold text-slate-800">
                            {
                              product.name
                            }
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-right text-sm text-slate-600">
                        {Number(
                          product.quantity
                        ) || 0}
                      </td>

                      <td className="px-5 py-4 text-right text-sm font-semibold text-slate-900">
                        {formatUGX(
                          product.revenue
                        )}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Recent Sales */}

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Recent transactions
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Sales included in this report.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <FileSpreadsheet
              size={17}
              className="text-slate-400"
            />

            <span className="text-xs text-slate-400">
              {sales.length} records
            </span>
          </div>
        </div>

        {sales.length ===
        0 ? (
          <EmptyState
            message="No transactions found for this period."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[850px] w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Receipt
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Date
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Customer
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Payment
                  </th>

                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Total
                  </th>

                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody>
                {sales
                  .slice(
                    0,
                    20
                  )
                  .map(
                    (
                      sale,
                      index
                    ) => (
                      <tr
                        key={
                          sale._id ||
                          index
                        }
                        className="border-b border-slate-50 last:border-0 hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">
                          <span className="text-sm font-semibold text-slate-800">
                            {sale.receiptNumber ||
                              sale.saleNumber ||
                              "N/A"}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-500">
                          {formatDate(
                            sale.createdAt
                          )}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {sale.customerName ||
                            sale.customer ||
                            "Walk-in Customer"}
                        </td>

                        <td className="px-5 py-4">
                          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold capitalize text-slate-600">
                            {String(
                              sale.paymentMethod ||
                                "OTHER"
                            ).replace(
                              /_/g,
                              " "
                            )}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right text-sm font-bold text-slate-900">
                          {formatUGX(
                            sale.total
                          )}
                        </td>

                        <td className="px-5 py-4 text-right">
                          <StatusBadge
                            status={
                              sale.status
                            }
                          />
                        </td>
                      </tr>
                    )
                  )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Print Footer */}

      <div className="hidden border-t border-slate-200 pt-4 text-xs text-slate-500 print:block">
        <div className="flex justify-between">
          <span>
            MOVA Business Management Platform
          </span>

          <span>
            Report generated{" "}
            {new Date().toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Report Card
|--------------------------------------------------------------------------
*/

const ReportCard = ({
  title,
  value,
  description,
  icon,
}) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {title}
          </p>

          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {description}
          </p>
        </div>

        <div className="rounded-xl bg-slate-100 p-3 text-slate-700">
          {icon}
        </div>
      </div>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Small Stat
|--------------------------------------------------------------------------
*/

const SmallStat = ({
  label,
  value,
}) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-lg font-bold text-slate-900">
        {value}
      </p>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Empty State
|--------------------------------------------------------------------------
*/

const EmptyState = ({
  message,
}) => {
  return (
    <div className="flex min-h-40 items-center justify-center px-5 py-8 text-center">
      <div>
        <BarChart3
          size={28}
          className="mx-auto mb-3 text-slate-300"
        />

        <p className="text-sm text-slate-400">
          {message}
        </p>
      </div>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Status Badge
|--------------------------------------------------------------------------
*/

const StatusBadge = ({
  status,
}) => {
  const normalized =
    String(
      status ||
        "COMPLETED"
    ).toUpperCase();

  let classes =
    "bg-slate-100 text-slate-600";

  if (
    normalized ===
    "COMPLETED"
  ) {
    classes =
      "bg-emerald-50 text-emerald-700";
  }

  if (
    normalized ===
    "CANCELLED"
  ) {
    classes =
      "bg-red-50 text-red-700";
  }

  if (
    normalized ===
    "REFUNDED"
  ) {
    classes =
      "bg-amber-50 text-amber-700";
  }

  if (
    normalized ===
    "PARTIALLY_REFUNDED"
  ) {
    classes =
      "bg-orange-50 text-orange-700";
  }

  return (
    <span
      className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ${classes}`}
    >
      {normalized.replace(
        /_/g,
        " "
      )}
    </span>
  );
};

export default Reports;