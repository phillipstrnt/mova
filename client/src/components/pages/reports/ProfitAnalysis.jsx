import {
  ArrowDownRight,
  ArrowUpRight,
  CircleDollarSign,
  Percent,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

const formatUGX = (value) => {
  const number = Number(value) || 0;

  return new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    maximumFractionDigits: 0,
  }).format(number);
};

const formatPercent = (value) => {
  const number = Number(value) || 0;

  return `${number.toFixed(1)}%`;
};

const MetricCard = ({
  title,
  value,
  description,
  icon,
  tone = "neutral",
}) => {
  const toneClasses = {
    neutral: {
      wrapper: "bg-slate-50 text-slate-600",
      value: "text-slate-900",
    },
    positive: {
      wrapper: "bg-emerald-50 text-emerald-600",
      value: "text-emerald-700",
    },
    negative: {
      wrapper: "bg-red-50 text-red-600",
      value: "text-red-700",
    },
    warning: {
      wrapper: "bg-amber-50 text-amber-600",
      value: "text-amber-700",
    },
    blue: {
      wrapper: "bg-blue-50 text-blue-600",
      value: "text-blue-700",
    },
  };

  const selectedTone = toneClasses[tone] || toneClasses.neutral;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            {title}
          </p>

          <p className={`mt-2 text-2xl font-bold ${selectedTone.value}`}>
            {value}
          </p>

          {description && (
            <p className="mt-1 text-xs text-slate-500">{description}</p>
          )}
        </div>

        <div className={`rounded-xl p-2.5 ${selectedTone.wrapper}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

const ProgressBar = ({
  label,
  value,
  percentage,
  tone = "slate",
}) => {
  const safePercentage = Math.min(
    Math.max(Number(percentage) || 0, 0),
    100
  );

  const colors = {
    slate: "bg-slate-900",
    green: "bg-emerald-500",
    blue: "bg-blue-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-slate-700">
          {label}
        </span>

        <span className="text-sm font-semibold text-slate-900">
          {value}
        </span>
      </div>

      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            colors[tone] || colors.slate
          }`}
          style={{
            width: `${safePercentage}%`,
          }}
        />
      </div>
    </div>
  );
};

const getProfitStatus = (netProfit, revenue, margin) => {
  if (revenue <= 0) {
    return {
      title: "No revenue recorded",
      message:
        "There is not enough sales data to evaluate profitability for this period.",
      tone: "neutral",
    };
  }

  if (netProfit < 0) {
    return {
      title: "Business is operating at a loss",
      message:
        "Expenses and product costs are currently higher than the revenue generated.",
      tone: "negative",
    };
  }

  if (margin < 5) {
    return {
      title: "Profit margin needs attention",
      message:
        "The business is profitable, but the current margin is relatively low.",
      tone: "warning",
    };
  }

  if (margin < 15) {
    return {
      title: "Moderate profitability",
      message:
        "The business is profitable. Controlling costs could improve the final margin.",
      tone: "warning",
    };
  }

  return {
    title: "Healthy profitability",
    message:
      "The business is generating a healthy positive margin during this period.",
    tone: "positive",
  };
};

const ProfitAnalysis = ({
  revenue = 0,
  cogs = 0,
  grossProfit,
  expenses = 0,
  netResult = 0,
}) => {
  const safeRevenue = Number(revenue) || 0;
  const safeCogs = Number(cogs) || 0;
  const safeExpenses = Number(expenses) || 0;
  const safeNetResult = Number(netResult) || 0;

  const calculatedGrossProfit =
    grossProfit !== undefined && grossProfit !== null
      ? Number(grossProfit) || 0
      : safeRevenue - safeCogs;

  const grossMargin =
    safeRevenue > 0
      ? (calculatedGrossProfit / safeRevenue) * 100
      : 0;

  const netMargin =
    safeRevenue > 0
      ? (safeNetResult / safeRevenue) * 100
      : 0;

  const expenseRatio =
    safeRevenue > 0
      ? (safeExpenses / safeRevenue) * 100
      : 0;

  const cogsRatio =
    safeRevenue > 0
      ? (safeCogs / safeRevenue) * 100
      : 0;

  const status = getProfitStatus(
    safeNetResult,
    safeRevenue,
    netMargin
  );

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-slate-950 p-2.5 text-white">
            <CircleDollarSign className="h-5 w-5" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Profit Analysis
            </h2>

            <p className="text-sm text-slate-500">
              Understand where your revenue is going and how much
              profit your business is keeping.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Revenue"
          value={formatUGX(safeRevenue)}
          description="Total sales generated"
          icon={<TrendingUp className="h-5 w-5" />}
          tone="blue"
        />

        <MetricCard
          title="Cost of Goods"
          value={formatUGX(safeCogs)}
          description="Estimated product cost"
          icon={<Wallet className="h-5 w-5" />}
          tone="warning"
        />

        <MetricCard
          title="Gross Profit"
          value={formatUGX(calculatedGrossProfit)}
          description={`${formatPercent(grossMargin)} gross margin`}
          icon={
            calculatedGrossProfit >= 0 ? (
              <ArrowUpRight className="h-5 w-5" />
            ) : (
              <ArrowDownRight className="h-5 w-5" />
            )
          }
          tone={calculatedGrossProfit >= 0 ? "positive" : "negative"}
        />

        <MetricCard
          title="Net Profit"
          value={formatUGX(safeNetResult)}
          description={`${formatPercent(netMargin)} net margin`}
          icon={
            safeNetResult >= 0 ? (
              <TrendingUp className="h-5 w-5" />
            ) : (
              <TrendingDown className="h-5 w-5" />
            )
          }
          tone={safeNetResult >= 0 ? "positive" : "negative"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-6">
            <h3 className="font-semibold text-slate-900">
              Revenue Distribution
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              How revenue is consumed by product costs and operating
              expenses.
            </p>
          </div>

          <div className="space-y-6">
            <ProgressBar
              label="Cost of Goods"
              value={formatUGX(safeCogs)}
              percentage={cogsRatio}
              tone="amber"
            />

            <ProgressBar
              label="Operating Expenses"
              value={formatUGX(safeExpenses)}
              percentage={expenseRatio}
              tone="red"
            />

            <ProgressBar
              label="Net Profit"
              value={formatUGX(safeNetResult)}
              percentage={Math.max(netMargin, 0)}
              tone="green"
            />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-6">
            <h3 className="font-semibold text-slate-900">
              Profitability Metrics
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              Key indicators for evaluating business performance.
            </p>
          </div>

          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-blue-50 p-2 text-blue-600">
                  <Percent className="h-4 w-4" />
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-700">
                    Gross Margin
                  </p>

                  <p className="text-xs text-slate-400">
                    Profit after product costs
                  </p>
                </div>
              </div>

              <p className="font-bold text-slate-900">
                {formatPercent(grossMargin)}
              </p>
            </div>

            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-amber-50 p-2 text-amber-600">
                  <Wallet className="h-4 w-4" />
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-700">
                    Expense Ratio
                  </p>

                  <p className="text-xs text-slate-400">
                    Expenses compared with revenue
                  </p>
                </div>
              </div>

              <p className="font-bold text-slate-900">
                {formatPercent(expenseRatio)}
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`rounded-xl p-2 ${
                    netMargin >= 0
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-red-50 text-red-600"
                  }`}
                >
                  <TrendingUp className="h-4 w-4" />
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-700">
                    Net Margin
                  </p>

                  <p className="text-xs text-slate-400">
                    Final profit retained
                  </p>
                </div>
              </div>

              <p
                className={`font-bold ${
                  netMargin >= 0
                    ? "text-emerald-700"
                    : "text-red-700"
                }`}
              >
                {formatPercent(netMargin)}
              </p>
            </div>
          </div>
        </section>
      </div>

      <section
        className={`rounded-2xl border p-5 ${
          status.tone === "positive"
            ? "border-emerald-200 bg-emerald-50"
            : status.tone === "negative"
            ? "border-red-200 bg-red-50"
            : status.tone === "warning"
            ? "border-amber-200 bg-amber-50"
            : "border-slate-200 bg-slate-50"
        }`}
      >
        <div className="flex items-start gap-4">
          <div
            className={`rounded-xl p-2.5 ${
              status.tone === "positive"
                ? "bg-emerald-100 text-emerald-700"
                : status.tone === "negative"
                ? "bg-red-100 text-red-700"
                : status.tone === "warning"
                ? "bg-amber-100 text-amber-700"
                : "bg-slate-200 text-slate-600"
            }`}
          >
            {status.tone === "negative" ? (
              <TrendingDown className="h-5 w-5" />
            ) : (
              <TrendingUp className="h-5 w-5" />
            )}
          </div>

          <div>
            <h3 className="font-bold text-slate-900">
              {status.title}
            </h3>

            <p className="mt-1 text-sm text-slate-600">
              {status.message}
            </p>
          </div>
        </div>
      </section>
    </section>
  );
};

export default ProfitAnalysis;