import { useEffect, useMemo, useState } from "react";

import {
  AlertTriangle,
  ArrowDownRight,
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

import api from "../../api";

const currency = new Intl.NumberFormat(
  "en-UG",
  {
    style: "currency",
    currency: "UGX",
    maximumFractionDigits: 0,
  }
);

const formatCurrency = (value) =>
  currency.format(
    Number(value) || 0
  );

const formatNumber = (value) =>
  new Intl.NumberFormat("en-UG").format(
    Number(value) || 0
  );

const Dashboard = () => {
  const [data, setData] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const fetchDashboard =
    async () => {
      try {
        setLoading(true);
        setError("");

        const response =
          await api.get(
            "/dashboard/overview"
          );

        setData(
          response.data?.overview ||
            null
        );
      } catch (err) {
        console.error(
          "Dashboard error:",
          err
        );

        setError(
          err.response?.data
            ?.message ||
            "Failed to load dashboard."
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const today = data?.today || {};

  const month = data?.month || {};

  const inventory =
    data?.inventory || {};

  const paymentBreakdown =
    data?.paymentBreakdown || {};

  const recentSales =
    data?.recentSales || [];

  const salesTrend = useMemo(() => {
    const sales =
      Number(today.sales) || 0;

    const payments =
      Number(today.payments) || 0;

    if (sales === 0) {
      return 0;
    }

    return Math.round(
      (payments / sales) *
        100
    );
  }, [
    today.sales,
    today.payments,
  ]);

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
            Monitor sales, payments,
            expenses and business
            performance.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchDashboard}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw
            size={17}
          />

          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {/* PRIMARY CARDS */}
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
            <ShoppingCart
              size={21}
            />
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
            <Banknote
              size={21}
            />
          }
          iconClass="bg-emerald-50 text-emerald-600"
        />

        <MetricCard
          title="Today's Expenses"
          value={formatCurrency(
            today.expenses
          )}
          description="Active business expenses"
          icon={
            <Wallet
              size={21}
            />
          }
          iconClass="bg-orange-50 text-orange-600"
        />

        <MetricCard
          title="Today's Net Profit"
          value={formatCurrency(
            today.netProfit
          )}
          description="Gross profit less expenses"
          icon={
            <TrendingUp
              size={21}
            />
          }
          iconClass="bg-purple-50 text-purple-600"
        />
      </div>

      {/* MONTH PERFORMANCE */}
      <div className="grid gap-4 lg:grid-cols-3">
        <PerformanceCard
          title="Monthly Sales"
          value={formatCurrency(
            month.sales
          )}
          icon={
            <BarChart3
              size={20}
            />
          }
        />

        <PerformanceCard
          title="Monthly Gross Profit"
          value={formatCurrency(
            month.grossProfit
          )}
          icon={
            <ArrowUpRight
              size={20}
            />
          }
        />

        <PerformanceCard
          title="Monthly Net Profit"
          value={formatCurrency(
            month.netProfit
          )}
          icon={
            <TrendingUp
              size={20}
            />
          }
        />
      </div>

      {/* INVENTORY + PAYMENT METHODS */}
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
              <Package
                size={20}
              />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <InventoryStat
              label="Products"
              value={formatNumber(
                inventory.totalProducts
              )}
              icon={
                <Boxes
                  size={18}
                />
              }
            />

            <InventoryStat
              label="Inventory Value"
              value={formatCurrency(
                inventory.inventoryValue
              )}
              icon={
                <Banknote
                  size={18}
                />
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

          {inventory.lowStockProducts
            ?.length > 0 && (
            <div className="mt-4 space-y-2">
              {inventory.lowStockProducts
                .slice(0, 5)
                .map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-bold text-slate-700">
                        {product.name}
                      </p>

                      <p className="text-xs text-slate-400">
                        {product.sku}
                      </p>
                    </div>

                    <span className="text-sm font-black text-orange-600">
                      {product.stock}
                    </span>
                  </div>
                ))}
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
              <Banknote
                size={20}
              />
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <PaymentBar
              label="Cash"
              value={
                paymentBreakdown.CASH
              }
              total={
                today.payments
              }
            />

            <PaymentBar
              label="Mobile Money"
              value={
                paymentBreakdown.MOBILE_MONEY
              }
              total={
                today.payments
              }
            />

            <PaymentBar
              label="Card"
              value={
                paymentBreakdown.CARD
              }
              total={
                today.payments
              }
            />

            <PaymentBar
              label="Bank"
              value={
                paymentBreakdown.BANK
              }
              total={
                today.payments
              }
            />
          </div>
        </section>
      </div>

      {/* RECENT SALES */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
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
            className="text-sm font-bold text-blue-600 hover:text-blue-700"
          >
            View all
          </a>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left">
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
                    className="px-6 py-12 text-center text-sm text-slate-400"
                  >
                    No sales recorded yet.
                  </td>
                </tr>
              ) : (
                recentSales.map(
                  (sale) => (
                    <tr
                      key={
                        sale._id
                      }
                      className="hover:bg-slate-50"
                    >
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-slate-800">
                          {
                            sale.receiptNumber
                          }
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {new Date(
                            sale.createdAt
                          ).toLocaleDateString(
                            "en-UG"
                          )}
                        </p>
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-600">
                        {sale
                          .customerId
                          ?.name ||
                          "Walk-in Customer"}
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-600">
                        {sale
                          .cashierId
                          ?.name ||
                          "—"}
                      </td>

                      <td className="px-6 py-4 text-right text-sm font-black text-slate-900">
                        {formatCurrency(
                          sale.total
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                          {
                            sale.status
                          }
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

const MetricCard = ({
  title,
  value,
  description,
  icon,
  iconClass,
}) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-slate-400">
            {title}
          </p>

          <p className="mt-2 text-2xl font-black tracking-tight text-slate-950">
            {value}
          </p>

          <p className="mt-2 text-xs font-medium text-slate-400">
            {description}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconClass}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
};

const PerformanceCard = ({
  title,
  value,
  icon,
}) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          {icon}
        </div>

        <div>
          <p className="text-xs font-black uppercase tracking-wider text-slate-400">
            {title}
          </p>

          <p className="mt-1 text-xl font-black text-slate-950">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
};

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

const PaymentBar = ({
  label,
  value,
  total,
}) => {
  const percentage =
    Number(total) > 0
      ? Math.min(
          (Number(value) /
            Number(total)) *
            100,
          100
        )
      : 0;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-bold text-slate-600">
          {label}
        </span>

        <span className="text-sm font-black text-slate-900">
          {formatCurrency(value)}
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-blue-600 transition-all"
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>
    </div>
  );
};

export default Dashboard;