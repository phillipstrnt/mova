import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertTriangle,
  ArrowUpRight,
  Banknote,
  BarChart3,
  Boxes,
  Loader2,
  Package,
  RefreshCw,
  ShoppingCart,
  TrendingUp,
  Wallet,
} from "lucide-react";

import api from "../../services/api";

const currency = new Intl.NumberFormat("en-UG", {
  style: "currency",
  currency: "UGX",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("en-UG");

const formatCurrency = (value) =>
  currency.format(Number(value) || 0);

const formatNumber = (value) =>
  numberFormatter.format(Number(value) || 0);

const formatDate = (date) => {
  if (!date) return "—";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "—";
  }

  return parsedDate.toLocaleDateString("en-UG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getCustomerName = (sale) => {
  return (
    sale?.customerId?.name ||
    sale?.customer?.name ||
    "Walk-in Customer"
  );
};

const getCashierName = (sale) => {
  return (
    sale?.cashierId?.name ||
    sale?.cashier?.name ||
    sale?.userId?.name ||
    "—"
  );
};

const getStatusClass = (status) => {
  const normalized = String(status || "").toUpperCase();

  switch (normalized) {
    case "COMPLETED":
      return "bg-emerald-50 text-emerald-700";

    case "PARTIALLY_REFUNDED":
      return "bg-orange-50 text-orange-700";

    case "REFUNDED":
      return "bg-red-50 text-red-700";

    case "CANCELLED":
      return "bg-slate-100 text-slate-600";

    default:
      return "bg-blue-50 text-blue-700";
  }
};

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  /*
  |--------------------------------------------------------------------------
  | FETCH DASHBOARD
  |--------------------------------------------------------------------------
  */

  const fetchDashboard = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const response = await api.get(
          "/dashboard/overview"
        );

        const overview =
          response?.data?.overview ||
          response?.data?.data ||
          response?.data ||
          {};

        setData(overview);
      } catch (err) {
        console.error(
          "Dashboard error:",
          err
        );

        const message =
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Failed to load dashboard.";

        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  /*
  |--------------------------------------------------------------------------
  | INITIAL DASHBOARD LOAD
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  /*
  |--------------------------------------------------------------------------
  | LISTEN FOR MOVA DATA UPDATES
  |--------------------------------------------------------------------------
  |
  | POS.jsx dispatches:
  |
  | window.dispatchEvent(
  |   new CustomEvent("mova:data-updated", ...)
  | )
  |
  | Whenever a sale is successfully completed.
  |
  */

  useEffect(() => {
    const handleMovaDataUpdate = (event) => {
      console.log(
        "MOVA dashboard update received:",
        event?.detail
      );

      fetchDashboard(true);
    };

    window.addEventListener(
      "mova:data-updated",
      handleMovaDataUpdate
    );

    return () => {
      window.removeEventListener(
        "mova:data-updated",
        handleMovaDataUpdate
      );
    };
  }, [fetchDashboard]);

  /*
  |--------------------------------------------------------------------------
  | REFRESH WHEN USER RETURNS TO THE APP
  |--------------------------------------------------------------------------
  |
  | This helps when the user completes a transaction elsewhere
  | and then returns to the dashboard.
  |
  */

  useEffect(() => {
    const handleWindowFocus = () => {
      fetchDashboard(true);
    };

    window.addEventListener(
      "focus",
      handleWindowFocus
    );

    return () => {
      window.removeEventListener(
        "focus",
        handleWindowFocus
      );
    };
  }, [fetchDashboard]);

  /*
  |--------------------------------------------------------------------------
  | REFRESH WHEN TAB BECOMES VISIBLE
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "visible"
      ) {
        fetchDashboard(true);
      }
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
  }, [fetchDashboard]);

  const today = data?.today || {};
  const month = data?.month || {};
  const inventory = data?.inventory || {};
  const paymentBreakdown =
    data?.paymentBreakdown || {};

  const recentSales = Array.isArray(
    data?.recentSales
  )
    ? data.recentSales
    : [];

  const salesTrend = useMemo(() => {
    const sales = Number(today.sales) || 0;
    const payments =
      Number(today.payments) || 0;

    if (sales <= 0) {
      return 0;
    }

    return Math.round(
      (payments / sales) * 100
    );
  }, [
    today.sales,
    today.payments,
  ]);

  const totalPaymentBreakdown =
    useMemo(() => {
      return (
        Number(
          paymentBreakdown.CASH || 0
        ) +
        Number(
          paymentBreakdown.MOBILE_MONEY || 0
        ) +
        Number(
          paymentBreakdown.CARD || 0
        ) +
        Number(
          paymentBreakdown.BANK || 0
        )
      );
    }, [paymentBreakdown]);

  /*
  |--------------------------------------------------------------------------
  | LOADING
  |--------------------------------------------------------------------------
  */

  if (loading) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2
            size={24}
            className="animate-spin"
          />

          <span className="font-semibold">
            Loading MOVA dashboard...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-bold text-blue-600">
            Business Overview
          </p>

          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">
            Dashboard
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Monitor sales, payments, inventory,
            expenses and business performance.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            fetchDashboard(true)
          }
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
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
      </div>

      {/* ERROR */}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-bold text-red-800">
                Dashboard data could not be
                loaded
              </p>

              <p className="mt-1 text-sm text-red-600">
                {error}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                fetchDashboard(true)
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700"
            >
              <RefreshCw size={16} />

              Try Again
            </button>
          </div>
        </div>
      )}

      {/* PRIMARY METRICS */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Today's Sales"
          value={formatCurrency(
            today.sales
          )}
          description={`${formatNumber(
            today.productsSold
          )} products sold`}
          icon={
            <ShoppingCart size={21} />
          }
          iconClass="bg-blue-50 text-blue-600"
        />

        <MetricCard
          title="Today's Payments"
          value={formatCurrency(
            today.payments
          )}
          description={`${salesTrend}% of today's sales collected`}
          icon={
            <Banknote size={21} />
          }
          iconClass="bg-emerald-50 text-emerald-600"
        />

        <MetricCard
          title="Today's Expenses"
          value={formatCurrency(
            today.expenses
          )}
          description="Recorded business expenses"
          icon={<Wallet size={21} />}
          iconClass="bg-orange-50 text-orange-600"
        />

        <MetricCard
          title="Today's Net Profit"
          value={formatCurrency(
            today.netProfit
          )}
          description="Gross profit less expenses"
          icon={
            <TrendingUp size={21} />
          }
          iconClass="bg-purple-50 text-purple-600"
        />
      </div>

      {/* MONTH PERFORMANCE */}

      <div className="grid gap-4 md:grid-cols-3">
        <PerformanceCard
          title="Monthly Sales"
          value={formatCurrency(
            month.sales
          )}
          icon={<BarChart3 size={20} />}
        />

        <PerformanceCard
          title="Monthly Gross Profit"
          value={formatCurrency(
            month.grossProfit
          )}
          icon={
            <ArrowUpRight size={20} />
          }
        />

        <PerformanceCard
          title="Monthly Net Profit"
          value={formatCurrency(
            month.netProfit
          )}
          icon={
            <TrendingUp size={20} />
          }
        />
      </div>

      {/* INVENTORY + PAYMENTS */}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* INVENTORY */}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-950">
                Inventory
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Current stock position
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Package size={20} />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <InventoryStat
              label="Products"
              value={formatNumber(
                inventory.totalProducts
              )}
              icon={<Boxes size={18} />}
            />

            <InventoryStat
              label="Inventory Value"
              value={formatCurrency(
                inventory.inventoryValue
              )}
              icon={
                <Banknote size={18} />
              }
            />
          </div>

          <div className="mt-5 rounded-xl border border-orange-100 bg-orange-50 p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle
                size={19}
                className="text-orange-600"
              />

              <div>
                <p className="text-sm font-black text-orange-800">
                  Low Stock
                </p>

                <p className="text-xs text-orange-600">
                  {formatNumber(
                    inventory.lowStockCount
                  )}{" "}
                  products need attention
                </p>
              </div>
            </div>
          </div>

          {Array.isArray(
            inventory.lowStockProducts
          ) &&
            inventory.lowStockProducts
              .length > 0 && (
              <div className="mt-4 space-y-2">
                {inventory.lowStockProducts
                  .slice(0, 5)
                  .map(
                    (
                      product,
                      index
                    ) => (
                      <div
                        key={
                          product._id ||
                          product.id ||
                          product.sku ||
                          index
                        }
                        className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-700">
                            {product.name ||
                              "Unnamed Product"}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            {product.sku ||
                              "No SKU"}
                          </p>
                        </div>

                        <span className="ml-4 shrink-0 text-sm font-black text-orange-600">
                          {formatNumber(
                            product.stock
                          )}
                        </span>
                      </div>
                    )
                  )}
              </div>
            )}

          {(!Array.isArray(
            inventory.lowStockProducts
          ) ||
            inventory.lowStockProducts
              .length === 0) && (
            <div className="mt-4 rounded-xl bg-emerald-50 p-4">
              <p className="text-sm font-bold text-emerald-700">
                Inventory looks healthy
              </p>

              <p className="mt-1 text-xs text-emerald-600">
                No low-stock products are
                currently reported.
              </p>
            </div>
          )}
        </section>

        {/* PAYMENT BREAKDOWN */}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-950">
                Today's Payments
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Payment method breakdown
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Banknote size={20} />
            </div>
          </div>

          <div className="mt-6 space-y-5">
            <PaymentBar
              label="Cash"
              value={
                paymentBreakdown.CASH
              }
              total={
                totalPaymentBreakdown ||
                today.payments
              }
            />

            <PaymentBar
              label="Mobile Money"
              value={
                paymentBreakdown.MOBILE_MONEY
              }
              total={
                totalPaymentBreakdown ||
                today.payments
              }
            />

            <PaymentBar
              label="Card"
              value={
                paymentBreakdown.CARD
              }
              total={
                totalPaymentBreakdown ||
                today.payments
              }
            />

            <PaymentBar
              label="Bank"
              value={
                paymentBreakdown.BANK
              }
              total={
                totalPaymentBreakdown ||
                today.payments
              }
            />
          </div>

          <div className="mt-6 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
            <span className="text-sm font-bold text-slate-500">
              Total collected
            </span>

            <span className="text-sm font-black text-slate-950">
              {formatCurrency(
                today.payments
              )}
            </span>
          </div>
        </section>
      </div>

      {/* RECENT SALES */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-950">
              Recent Sales
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Latest transactions
            </p>
          </div>

          <a
            href="/app/sales"
            className="inline-flex w-fit items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700"
          >
            View all

            <ArrowUpRight size={15} />
          </a>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-slate-400">
                  Receipt
                </th>

                <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-slate-400">
                  Customer
                </th>

                <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-slate-400">
                  Cashier
                </th>

                <th className="px-6 py-4 text-right text-xs font-black uppercase tracking-wider text-slate-400">
                  Amount
                </th>

                <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-slate-400">
                  Status
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {recentSales.length ===
              0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="px-6 py-12 text-center"
                  >
                    <div className="mx-auto flex max-w-sm flex-col items-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                        <ShoppingCart
                          size={22}
                        />
                      </div>

                      <p className="mt-3 text-sm font-bold text-slate-600">
                        No sales recorded
                        yet
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        Completed POS
                        transactions will
                        appear here.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                recentSales.map(
                  (
                    sale,
                    index
                  ) => (
                    <tr
                      key={
                        sale?._id ||
                        sale?.id ||
                        sale?.receiptNumber ||
                        index
                      }
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-slate-800">
                          {sale?.receiptNumber ||
                            sale?.receiptNo ||
                            "—"}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {formatDate(
                            sale?.createdAt ||
                              sale?.date
                          )}
                        </p>
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-600">
                        {getCustomerName(
                          sale
                        )}
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-600">
                        {getCashierName(
                          sale
                        )}
                      </td>

                      <td className="px-6 py-4 text-right text-sm font-black text-slate-900">
                        {formatCurrency(
                          sale?.total
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-3 py-1.5 text-xs font-bold ${getStatusClass(
                            sale?.status
                          )}`}
                        >
                          {sale?.status ||
                            "UNKNOWN"}
                        </span>
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| METRIC CARD
|--------------------------------------------------------------------------
*/

const MetricCard = ({
  title,
  value,
  description,
  icon,
  iconClass,
}) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wider text-slate-400">
            {title}
          </p>

          <p className="mt-2 truncate text-2xl font-black tracking-tight text-slate-950">
            {value}
          </p>

          <p className="mt-2 text-xs font-medium text-slate-400">
            {description}
          </p>
        </div>

        <div
          className={`ml-4 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| PERFORMANCE CARD
|--------------------------------------------------------------------------
*/

const PerformanceCard = ({
  title,
  value,
  icon,
}) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          {icon}
        </div>

        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wider text-slate-400">
            {title}
          </p>

          <p className="mt-1 truncate text-xl font-black text-slate-950">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| INVENTORY STAT
|--------------------------------------------------------------------------
*/

const InventoryStat = ({
  label,
  value,
  icon,
}) => {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-slate-400">
        {icon}

        <span className="text-xs font-bold">
          {label}
        </span>
      </div>

      <p className="mt-2 text-lg font-black text-slate-900">
        {value}
      </p>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| PAYMENT BAR
|--------------------------------------------------------------------------
*/

const PaymentBar = ({
  label,
  value,
  total,
}) => {
  const numericValue =
    Number(value) || 0;

  const numericTotal =
    Number(total) || 0;

  const percentage =
    numericTotal > 0
      ? Math.min(
          (numericValue /
            numericTotal) *
            100,
          100
        )
      : 0;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-4">
        <span className="text-sm font-bold text-slate-600">
          {label}
        </span>

        <span className="text-sm font-black text-slate-900">
          {formatCurrency(
            numericValue
          )}
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-blue-600 transition-all duration-500"
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>
    </div>
  );
};

export default Dashboard;