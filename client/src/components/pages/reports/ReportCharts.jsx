import { useMemo } from "react";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { BarChart3, CreditCard, Wallet } from "lucide-react";

const formatUGX = (value) => {
  const number = Number(value) || 0;

  return new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    maximumFractionDigits: 0,
  }).format(number);
};

const formatShortDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("en-UG", {
    month: "short",
    day: "numeric",
  }).format(date);
};

const CHART_COLORS = [
  "#2563eb",
  "#16a34a",
  "#f59e0b",
  "#9333ea",
  "#dc2626",
  "#0891b2",
  "#ea580c",
  "#4f46e5",
];

const EmptyChart = ({ message = "No data available for this period." }) => {
  return (
    <div className="flex min-h-[280px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 text-center">
      <div>
        <BarChart3 className="mx-auto mb-3 h-8 w-8 text-slate-400" />

        <p className="text-sm font-medium text-slate-600">
          {message}
        </p>

        <p className="mt-1 text-xs text-slate-400">
          Try selecting a different date range.
        </p>
      </div>
    </div>
  );
};

const ChartCard = ({
  title,
  description,
  icon,
  children,
  className = "",
}) => {
  return (
    <section
      className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            {title}
          </h3>

          {description && (
            <p className="mt-1 text-xs text-slate-500">
              {description}
            </p>
          )}
        </div>

        {icon && (
          <div className="rounded-xl bg-slate-100 p-2 text-slate-600">
            {icon}
          </div>
        )}
      </div>

      {children}
    </section>
  );
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
      <p className="mb-2 text-xs font-semibold text-slate-700">
        {label}
      </p>

      {payload.map((item) => (
        <div
          key={`${item.dataKey}-${item.name}`}
          className="flex items-center justify-between gap-5 text-xs"
        >
          <span className="text-slate-500">
            {item.name}
          </span>

          <span className="font-semibold text-slate-900">
            {item.dataKey === "revenue" || item.dataKey === "amount"
              ? formatUGX(item.value)
              : item.value}
          </span>
        </div>
      ))}
    </div>
  );
};

const ReportCharts = ({
  dailySales = [],
  paymentBreakdown = [],
  expenseBreakdown = [],
}) => {
  const salesChartData = useMemo(() => {
    return dailySales.map((item) => ({
      date: formatShortDate(item?.date || item?.createdAt),
      revenue: Number(item?.revenue ?? item?.sales ?? item?.amount ?? item?.total) || 0,
      transactions:
        Number(item?.transactions ?? item?.count) || 0,
    }));
  }, [dailySales]);

  const paymentChartData = useMemo(() => {
    return paymentBreakdown
      .map((item) => ({
        name:
          item?.method ||
          item?.paymentMethod ||
          item?.name ||
          "Other",
        amount:
          Number(item?.amount ?? item?.total ?? item?.revenue) || 0,
        transactions:
          Number(item?.transactions ?? item?.count) || 0,
      }))
      .filter((item) => item.amount > 0 || item.transactions > 0);
  }, [paymentBreakdown]);

  const expenseChartData = useMemo(() => {
    return expenseBreakdown
      .map((item) => ({
        name:
          item?.category ||
          item?.name ||
          "Other",
        amount:
          Number(item?.amount ?? item?.total) || 0,
      }))
      .filter((item) => item.amount > 0);
  }, [expenseBreakdown]);

  return (
    <div className="space-y-6">
      <ChartCard
        title="Sales Trend"
        description="Revenue generated across the selected period."
        icon={<BarChart3 className="h-5 w-5" />}
      >
        {salesChartData.length === 0 ? (
          <EmptyChart />
        ) : (
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={salesChartData}
                margin={{
                  top: 10,
                  right: 10,
                  left: 0,
                  bottom: 5,
                }}
              >
                <defs>
                  <linearGradient
                    id="movaRevenueGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="#2563eb"
                      stopOpacity={0.25}
                    />

                    <stop
                      offset="95%"
                      stopColor="#2563eb"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e2e8f0"
                />

                <XAxis
                  dataKey="date"
                  tick={{
                    fontSize: 11,
                    fill: "#64748b",
                  }}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  tick={{
                    fontSize: 11,
                    fill: "#64748b",
                  }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) =>
                    value >= 1000000
                      ? `${(value / 1000000).toFixed(1)}M`
                      : value >= 1000
                      ? `${(value / 1000).toFixed(0)}K`
                      : value
                  }
                />

                <Tooltip content={<CustomTooltip />} />

                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue"
                  stroke="#2563eb"
                  strokeWidth={3}
                  fill="url(#movaRevenueGradient)"
                  activeDot={{
                    r: 6,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard
          title="Payment Methods"
          description="How customers are paying."
          icon={<CreditCard className="h-5 w-5" />}
        >
          {paymentChartData.length === 0 ? (
            <EmptyChart />
          ) : (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={paymentChartData}
                  layout="vertical"
                  margin={{
                    top: 5,
                    right: 20,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    stroke="#e2e8f0"
                  />

                  <XAxis
                    type="number"
                    tick={{
                      fontSize: 11,
                      fill: "#64748b",
                    }}
                    tickFormatter={(value) =>
                      value >= 1000000
                        ? `${(value / 1000000).toFixed(1)}M`
                        : value >= 1000
                        ? `${(value / 1000).toFixed(0)}K`
                        : value
                    }
                    axisLine={false}
                    tickLine={false}
                  />

                  <YAxis
                    type="category"
                    dataKey="name"
                    width={100}
                    tick={{
                      fontSize: 11,
                      fill: "#475569",
                    }}
                    axisLine={false}
                    tickLine={false}
                  />

                  <Tooltip content={<CustomTooltip />} />

                  <Bar
                    dataKey="amount"
                    name="Amount"
                    radius={[0, 6, 6, 0]}
                    fill="#2563eb"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        <ChartCard
          title="Expense Breakdown"
          description="Where your business spending is going."
          icon={<Wallet className="h-5 w-5" />}
        >
          {expenseChartData.length === 0 ? (
            <EmptyChart message="No expenses recorded." />
          ) : (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseChartData}
                    dataKey="amount"
                    nameKey="name"
                    cx="50%"
                    cy="45%"
                    outerRadius={90}
                    innerRadius={50}
                    paddingAngle={2}
                  >
                    {expenseChartData.map((item, index) => (
                      <Cell
                        key={`${item.name}-${index}`}
                        fill={
                          CHART_COLORS[
                            index % CHART_COLORS.length
                          ]
                        }
                      />
                    ))}
                  </Pie>

                  <Tooltip
                    formatter={(value) => formatUGX(value)}
                  />

                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    wrapperStyle={{
                      fontSize: "11px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
};

export default ReportCharts;
