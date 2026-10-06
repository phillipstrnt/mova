import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Boxes,
  CheckCircle2,
  Clock3,
  DollarSign,
  Package,
  RefreshCw,
  ShoppingCart,
  Users,
  Wallet,
} from "lucide-react";

import api from "../../services/api";

import {
  useBusiness,
} from "../../context/BusinessContext";

import {
  useAuth,
} from "../../context/AuthContext";

/*
|--------------------------------------------------------------------------
| FORMATTERS
|--------------------------------------------------------------------------
*/

const formatCurrency = (
  value
) => {
  const amount =
    Number(value) || 0;

  return new Intl.NumberFormat(
    "en-UG",
    {
      style: "currency",
      currency: "UGX",
      maximumFractionDigits: 0,
    }
  ).format(amount);
};

const formatNumber = (
  value
) => {
  return new Intl.NumberFormat(
    "en-UG"
  ).format(
    Number(value) || 0
  );
};

const formatDate = (
  value
) => {
  if (!value) {
    return "-";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "-";
  }

  return date.toLocaleString(
    "en-UG",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  );
};

/*
|--------------------------------------------------------------------------
| DASHBOARD
|--------------------------------------------------------------------------
*/

const Dashboard = () => {
  const {
    branch,
  } = useBusiness();

  const {
    user,
  } = useAuth();

  const [
    dashboard,
    setDashboard,
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

  const [
    lastUpdated,
    setLastUpdated,
  ] = useState(null);

  /*
  |--------------------------------------------------------------------------
  | LOAD DASHBOARD
  |--------------------------------------------------------------------------
  */

  const loadDashboard =
    useCallback(
      async (
        options = {}
      ) => {
        const {
          silent = false,
        } = options;

        try {
          if (silent) {
            setRefreshing(
              true
            );
          } else {
            setLoading(
              true
            );
          }

          setError("");

          /*
          |--------------------------------------------------------------------------
          | CURRENT DASHBOARD ENDPOINT
          |--------------------------------------------------------------------------
          */

          const response =
            await api.get(
              "/dashboard/overview",
              {
                params: {
                  branchId:
                    branch?._id ||
                    undefined,

                  timestamp:
                    Date.now(),
                },
              }
            );

          const data =
            response?.data;

          if (
            !data?.success
          ) {
            throw new Error(
              data?.message ||
                "Dashboard data could not be loaded."
            );
          }

          setDashboard(
            data
          );

          setLastUpdated(
            new Date()
          );
        } catch (
          requestError
        ) {
          console.error(
            "Dashboard loading failed:",
            requestError
          );

          setError(
            requestError?.response
              ?.data?.message ||
              requestError?.message ||
              "Dashboard data could not be loaded."
          );
        } finally {
          setLoading(
            false
          );

          setRefreshing(
            false
          );
        }
      },
      [
        branch?._id,
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | INITIAL LOAD
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    loadDashboard();
  }, [
    loadDashboard,
  ]);

  /*
  |--------------------------------------------------------------------------
  | AUTOMATIC REAL-TIME REFRESH
  |--------------------------------------------------------------------------
  |
  | Every 10 seconds MOVA asks the server for the latest
  | database information.
  |
  */

  useEffect(() => {
    const interval =
      window.setInterval(
        () => {
          loadDashboard({
            silent: true,
          });
        },
        10000
      );

    return () => {
      window.clearInterval(
        interval
      );
    };
  }, [
    loadDashboard,
  ]);

  /*
  |--------------------------------------------------------------------------
  | REFRESH WHEN WINDOW BECOMES ACTIVE
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const handleFocus =
      () => {
        loadDashboard({
          silent: true,
        });
      };

    const handleVisibility =
      () => {
        if (
          document.visibilityState ===
          "visible"
        ) {
          loadDashboard({
            silent: true,
          });
        }
      };

    window.addEventListener(
      "focus",
      handleFocus
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibility
    );

    return () => {
      window.removeEventListener(
        "focus",
        handleFocus
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibility
      );
    };
  }, [
    loadDashboard,
  ]);

  /*
  |--------------------------------------------------------------------------
  | REFRESH AFTER MOVA OPERATIONS
  |--------------------------------------------------------------------------
  |
  | POS, purchases, expenses, payments and other components
  | can dispatch this event after successfully changing data.
  |
  */

  useEffect(() => {
    const handleDataChanged =
      () => {
        loadDashboard({
          silent: true,
        });
      };

    const events = [
      "mova:data-changed",
      "mova:sale-completed",
      "mova:purchase-completed",
      "mova:expense-created",
      "mova:payment-updated",
      "mova:inventory-changed",
      "mova:customer-changed",
      "mova:branch-changed",
    ];

    events.forEach(
      (eventName) => {
        window.addEventListener(
          eventName,
          handleDataChanged
        );
      }
    );

    return () => {
      events.forEach(
        (eventName) => {
          window.removeEventListener(
            eventName,
            handleDataChanged
          );
        }
      );
    };
  }, [
    loadDashboard,
  ]);

  /*
  |--------------------------------------------------------------------------
  | DATA
  |--------------------------------------------------------------------------
  */

  const stats =
    dashboard?.stats ||
    dashboard?.summary ||
    {};

  const recentSales =
    Array.isArray(
      dashboard?.recentSales
    )
      ? dashboard.recentSales
      : [];

  const lowStockProducts =
    Array.isArray(
      dashboard?.lowStockProducts
    )
      ? dashboard.lowStockProducts
      : [];

  const salesChart =
    Array.isArray(
      dashboard?.salesChart
    )
      ? dashboard.salesChart
      : [];

  const paymentBreakdown =
    dashboard?.paymentBreakdown ||
    {};

  const profitAvailable =
    stats?.profitDataAvailable !==
    false;

  /*
  |--------------------------------------------------------------------------
  | KPI CARDS
  |--------------------------------------------------------------------------
  */

  const cards =
    useMemo(
      () => [
        {
          title:
            "Today's Sales",

          value:
            formatCurrency(
              stats.todayRevenue ??
                stats.todaySales
            ),

          subtitle:
            `${formatNumber(
              stats.todayTransactions
            )} transactions`,

          icon:
            ShoppingCart,
        },

        {
          title:
            "Monthly Revenue",

          value:
            formatCurrency(
              stats.monthRevenue ??
                stats.monthSales
            ),

          subtitle:
            `${formatNumber(
              stats.monthTransactions
            )} transactions`,

          icon:
            DollarSign,

          change:
            stats.revenueChange,
        },

        {
          title:
            "Monthly Expenses",

          value:
            formatCurrency(
              stats.totalExpenses
            ),

          subtitle:
            "Recorded business expenses",

          icon:
            Wallet,
        },

        {
          title:
            "Customers",

          value:
            formatNumber(
              stats.totalCustomers
            ),

          subtitle:
            "Customers in this branch",

          icon:
            Users,
        },

        {
          title:
            "Gross Profit",

          value:
            profitAvailable
              ? formatCurrency(
                  stats.grossProfit
                )
              : "—",

          subtitle:
            profitAvailable
              ? "Based on recorded costs"
              : "Cost data not available",

          icon:
            BarChart3,
        },

        {
          title:
            "Low Stock",

          value:
            formatNumber(
              lowStockProducts.length
            ),

          subtitle:
            "Products needing attention",

          icon:
            Package,
        },
      ],
      [
        stats,
        lowStockProducts.length,
        profitAvailable,
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | LOADING
  |--------------------------------------------------------------------------
  */

  if (
    loading &&
    !dashboard
  ) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-9 w-56 animate-pulse rounded-lg bg-slate-200" />

          <div className="mt-2 h-5 w-80 animate-pulse rounded-lg bg-slate-100" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from(
            {
              length: 6,
            }
          ).map(
            (_, index) => (
              <div
                key={index}
                className="h-36 animate-pulse rounded-2xl bg-white shadow-sm ring-1 ring-slate-200"
              />
            )
          )}
        </div>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | ERROR WITH NO DATA
  |--------------------------------------------------------------------------
  */

  if (
    error &&
    !dashboard
  ) {
    return (
      <div className="mx-auto max-w-xl py-16">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <div className="flex items-start gap-3">
            <AlertCircle
              className="mt-0.5 shrink-0 text-red-600"
              size={22}
            />

            <div>
              <h2 className="font-bold text-red-900">
                Dashboard data could not be loaded
              </h2>

              <p className="mt-2 text-sm text-red-700">
                {error}
              </p>

              <button
                type="button"
                onClick={() =>
                  loadDashboard()
                }
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700"
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
  | DASHBOARD
  |--------------------------------------------------------------------------
  */

  return (
    <div className="mx-auto max-w-screen-2xl space-y-6">
      {/* HEADER */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">
              Dashboard
            </h1>

            {branch?.name && (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                {branch.name}
              </span>
            )}
          </div>

          <p className="mt-1 text-sm text-slate-500">
            Welcome back
            {user?.name
              ? `, ${user.name}`
              : ""}.
            Here's what's happening in your business.
          </p>

          {lastUpdated && (
            <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
              <Clock3
                size={13}
              />

              Updated{" "}
              {lastUpdated.toLocaleTimeString(
                "en-UG",
                {
                  hour:
                    "2-digit",
                  minute:
                    "2-digit",
                  second:
                    "2-digit",
                }
              )}

              {refreshing && (
                <>
                  <span>
                    •
                  </span>

                  <span>
                    Refreshing...
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() =>
            loadDashboard({
              silent: true,
            })
          }
          disabled={
            refreshing
          }
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            size={17}
            className={
              refreshing
                ? "animate-spin"
                : ""
            }
          />

          Refresh
        </button>
      </div>

      {/* ERROR BANNER */}

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <AlertCircle
            size={19}
          />

          <span className="flex-1">
            {error}
          </span>

          <button
            type="button"
            onClick={() =>
              loadDashboard({
                silent: true,
              })
            }
            className="font-bold underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* KPI CARDS */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(
          (card) => {
            const Icon =
              card.icon;

            const hasChange =
              typeof card.change ===
              "number";

            const positive =
              Number(
                card.change
              ) >= 0;

            return (
              <div
                key={
                  card.title
                }
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      {card.title}
                    </p>

                    <p className="mt-2 text-2xl font-black text-slate-900">
                      {card.value}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {card.subtitle}
                    </p>
                  </div>

                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                    <Icon
                      size={21}
                    />
                  </div>
                </div>

                {hasChange && (
                  <div
                    className={`mt-4 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                      positive
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {positive ? (
                      <ArrowUpRight
                        size={14}
                      />
                    ) : (
                      <ArrowDownRight
                        size={14}
                      />
                    )}

                    {Math.abs(
                      card.change
                    ).toFixed(
                      1
                    )}
                    % vs previous month
                  </div>
                )}
              </div>
            );
          }
        )}
      </div>

      {/* SALES CHART + PAYMENTS */}

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-black text-slate-900">
                Sales — Last 7 Days
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Revenue generated by day.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {salesChart.length ===
            0 ? (
              <div className="py-12 text-center text-sm text-slate-400">
                No sales recorded yet.
              </div>
            ) : (
              salesChart.map(
                (item) => {
                  const maxRevenue =
                    Math.max(
                      ...salesChart.map(
                        (
                          chartItem
                        ) =>
                          Number(
                            chartItem.revenue
                          ) ||
                          0
                      ),
                      1
                    );

                  const percentage =
                    (
                      Number(
                        item.revenue
                      ) /
                      maxRevenue
                    ) *
                    100;

                  return (
                    <div
                      key={
                        item.date
                      }
                    >
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-600">
                          {item.label}
                        </span>

                        <span className="text-slate-500">
                          {formatCurrency(
                            item.revenue
                          )}
                        </span>
                      </div>

                      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-slate-800 transition-all duration-500"
                          style={{
                            width: `${Math.max(
                              percentage,
                              item.revenue
                                ? 2
                                : 0
                            )}%`,
                          }}
                        />
                      </div>

                      <p className="mt-1 text-right text-[11px] text-slate-400">
                        {
                          item.transactions
                        }{" "}
                        transactions
                      </p>
                    </div>
                  );
                }
              )
            )}
          </div>
        </section>

        {/* PAYMENT BREAKDOWN */}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <h2 className="font-black text-slate-900">
              Payment Methods
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              This month's recorded sales.
            </p>
          </div>

          <div className="mt-6 space-y-4">
            {Object.keys(
              paymentBreakdown
            ).length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-400">
                No payment data yet.
              </div>
            ) : (
              Object.entries(
                paymentBreakdown
              ).map(
                ([
                  method,
                  amount,
                ]) => (
                  <div
                    key={
                      method
                    }
                    className="flex items-center justify-between rounded-xl bg-slate-50 p-4"
                  >
                    <span className="text-sm font-bold text-slate-700">
                      {method.replace(
                        /_/g,
                        " "
                      )}
                    </span>

                    <span className="text-sm font-black text-slate-900">
                      {formatCurrency(
                        amount
                      )}
                    </span>
                  </div>
                )
              )
            )}
          </div>
        </section>
      </div>

      {/* RECENT SALES + LOW STOCK */}

      <div className="grid gap-6 xl:grid-cols-3">
        {/* RECENT SALES */}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 p-5">
            <div>
              <h2 className="font-black text-slate-900">
                Recent Sales
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Latest transactions from this branch.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3">
                    Receipt
                  </th>

                  <th className="px-5 py-3">
                    Customer
                  </th>

                  <th className="px-5 py-3">
                    Payment
                  </th>

                  <th className="px-5 py-3 text-right">
                    Total
                  </th>

                  <th className="px-5 py-3">
                    Date
                  </th>
                </tr>
              </thead>

              <tbody>
                {recentSales.length ===
                0 ? (
                  <tr>
                    <td
                      colSpan="5"
                      className="px-5 py-10 text-center text-sm text-slate-400"
                    >
                      No sales yet.
                    </td>
                  </tr>
                ) : (
                  recentSales.map(
                    (sale) => (
                      <tr
                        key={
                          sale._id
                        }
                        className="border-b border-slate-50 last:border-0"
                      >
                        <td className="px-5 py-4 text-sm font-bold text-slate-800">
                          {sale.receiptNumber ||
                            sale.saleNumber ||
                            `#${String(
                              sale._id
                            ).slice(
                              -6
                            )}`}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {sale.customerId?.name ||
                            sale.customer?.name ||
                            "Walk-in customer"}
                        </td>

                        <td className="px-5 py-4 text-xs font-bold text-slate-600">
                          {(
                            sale.paymentMethod ||
                            "-"
                          ).replace(
                            /_/g,
                            " "
                          )}
                        </td>

                        <td className="px-5 py-4 text-right text-sm font-black text-slate-900">
                          {formatCurrency(
                            sale.total ??
                              sale.grandTotal ??
                              sale.amount
                          )}
                        </td>

                        <td className="px-5 py-4 text-xs text-slate-400">
                          {formatDate(
                            sale.createdAt
                          )}
                        </td>
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* LOW STOCK */}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-black text-slate-900">
                Low Stock
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Products requiring attention.
              </p>
            </div>

            <Boxes
              size={20}
              className="text-slate-400"
            />
          </div>

          <div className="mt-5 space-y-3">
            {lowStockProducts.length ===
            0 ? (
              <div className="rounded-xl bg-emerald-50 p-4 text-center">
                <CheckCircle2
                  size={22}
                  className="mx-auto text-emerald-600"
                />

                <p className="mt-2 text-sm font-bold text-emerald-700">
                  Stock levels look good.
                </p>
              </div>
            ) : (
              lowStockProducts.map(
                (product) => (
                  <div
                    key={
                      product._id
                    }
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-800">
                        {
                          product.name
                        }
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        SKU:{" "}
                        {product.sku ||
                          "-"}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-sm font-black text-red-600">
                        {formatNumber(
                          product.stockQuantity
                        )}
                      </p>

                      <p className="text-[11px] text-slate-400">
                        remaining
                      </p>
                    </div>
                  </div>
                )
              )
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;