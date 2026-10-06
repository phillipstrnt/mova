import { useMemo } from "react";

import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Award,
  BarChart3,
  CheckCircle2,
  CircleDollarSign,
  Lightbulb,
  Package,
  ShieldAlert,
  Sparkles,
  Target,
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

const getProductName = (item) =>
  item?.name ||
  item?.productName ||
  item?.product ||
  "Unknown product";

const getProductRevenue = (item) =>
  Number(
    item?.revenue ??
      item?.sales ??
      item?.total ??
      item?.amount ??
      0
  ) || 0;

const getProductQuantity = (item) =>
  Number(
    item?.quantity ??
      item?.unitsSold ??
      item?.sold ??
      item?.totalQuantity ??
      0
  ) || 0;

const getExpenseName = (item) =>
  item?.category ||
  item?.name ||
  "Other";

const getExpenseAmount = (item) =>
  Number(
    item?.amount ??
      item?.total ??
      0
  ) || 0;

const getPaymentName = (item) =>
  item?.method ||
  item?.paymentMethod ||
  item?.name ||
  "Other";

const getPaymentAmount = (item) =>
  Number(
    item?.amount ??
      item?.total ??
      item?.revenue ??
      0
  ) || 0;

const formatPercentage = (value) =>
  `${Number(value || 0).toFixed(1)}%`;

const InsightCard = ({
  icon,
  title,
  label,
  children,
  type = "neutral",
}) => {
  const styles = {
    positive: {
      wrapper:
        "border-emerald-200 bg-emerald-50/70",
      icon:
        "bg-emerald-100 text-emerald-700",
      label:
        "text-emerald-700",
    },

    warning: {
      wrapper:
        "border-amber-200 bg-amber-50/70",
      icon:
        "bg-amber-100 text-amber-700",
      label:
        "text-amber-700",
    },

    danger: {
      wrapper:
        "border-red-200 bg-red-50/70",
      icon:
        "bg-red-100 text-red-700",
      label:
        "text-red-700",
    },

    neutral: {
      wrapper:
        "border-slate-200 bg-white",
      icon:
        "bg-slate-100 text-slate-700",
      label:
        "text-slate-600",
    },

    info: {
      wrapper:
        "border-blue-200 bg-blue-50/70",
      icon:
        "bg-blue-100 text-blue-700",
      label:
        "text-blue-700",
    },
  };

  const currentStyle =
    styles[type] || styles.neutral;

  return (
    <article
      className={`rounded-2xl border p-5 shadow-sm transition hover:shadow-md ${currentStyle.wrapper}`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${currentStyle.icon}`}
        >
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-900">
              {title}
            </h3>

            {label && (
              <span
                className={`text-[10px] font-bold uppercase tracking-wide ${currentStyle.label}`}
              >
                {label}
              </span>
            )}
          </div>

          <div className="mt-2 text-sm leading-6 text-slate-600">
            {children}
          </div>
        </div>
      </div>
    </article>
  );
};

const MetricPill = ({
  label,
  value,
  icon,
}) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
        {icon}

        <span>{label}</span>
      </div>

      <p className="mt-1 text-lg font-bold text-slate-900">
        {value}
      </p>
    </div>
  );
};

const BusinessInsights = ({
  revenue = 0,
  expenses = 0,
  netResult = 0,
  transactions = 0,
  averageSale = 0,
  discounts = 0,
  cancelled = 0,
  refunded = 0,
  paymentBreakdown = [],
  productPerformance = [],
  expenseBreakdown = [],
  dailySales = [],
}) => {
  const insights = useMemo(() => {
    const safeRevenue =
      Number(revenue) || 0;

    const safeExpenses =
      Number(expenses) || 0;

    const safeNetResult =
      Number(netResult) || 0;

    const safeTransactions =
      Number(transactions) || 0;

    const safeAverageSale =
      Number(averageSale) || 0;

    const safeDiscounts =
      Number(discounts) || 0;

    const margin =
      safeRevenue > 0
        ? (safeNetResult / safeRevenue) * 100
        : 0;

    const expenseRate =
      safeRevenue > 0
        ? (safeExpenses / safeRevenue) * 100
        : 0;

    const discountRate =
      safeRevenue > 0
        ? (safeDiscounts / safeRevenue) * 100
        : 0;

    const sortedProducts = [
      ...productPerformance,
    ].sort(
      (a, b) =>
        getProductRevenue(b) -
        getProductRevenue(a)
    );

    const sortedExpenses = [
      ...expenseBreakdown,
    ].sort(
      (a, b) =>
        getExpenseAmount(b) -
        getExpenseAmount(a)
    );

    const sortedPayments = [
      ...paymentBreakdown,
    ].sort(
      (a, b) =>
        getPaymentAmount(b) -
        getPaymentAmount(a)
    );

    const sortedDays = [
      ...dailySales,
    ].sort(
      (a, b) =>
        new Date(
          a?.date || a?.createdAt || 0
        ).getTime() -
        new Date(
          b?.date || b?.createdAt || 0
        ).getTime()
    );

    const strongestProduct =
      sortedProducts[0];

    const strongestExpense =
      sortedExpenses[0];

    const strongestPayment =
      sortedPayments[0];

    let firstHalfRevenue = 0;
    let secondHalfRevenue = 0;

    if (sortedDays.length >= 4) {
      const midpoint =
        Math.ceil(sortedDays.length / 2);

      firstHalfRevenue =
        sortedDays
          .slice(0, midpoint)
          .reduce(
            (sum, item) =>
              sum +
              (Number(item?.revenue) || 0),
            0
          );

      secondHalfRevenue =
        sortedDays
          .slice(midpoint)
          .reduce(
            (sum, item) =>
              sum +
              (Number(item?.revenue) || 0),
            0
          );
    }

    const trendPercentage =
      firstHalfRevenue > 0
        ? ((secondHalfRevenue -
            firstHalfRevenue) /
            firstHalfRevenue) *
          100
        : 0;

    return {
      safeRevenue,
      safeExpenses,
      safeNetResult,
      safeTransactions,
      safeAverageSale,
      safeDiscounts,
      margin,
      expenseRate,
      discountRate,
      sortedProducts,
      sortedExpenses,
      sortedPayments,
      strongestProduct,
      strongestExpense,
      strongestPayment,
      trendPercentage,
    };
  }, [
    revenue,
    expenses,
    netResult,
    transactions,
    averageSale,
    discounts,
    cancelled,
    refunded,
    paymentBreakdown,
    productPerformance,
    expenseBreakdown,
    dailySales,
  ]);

  const {
    safeRevenue,
    safeExpenses,
    safeNetResult,
    safeTransactions,
    safeAverageSale,
    safeDiscounts,
    margin,
    expenseRate,
    discountRate,
    sortedProducts,
    sortedExpenses,
    sortedPayments,
    strongestProduct,
    strongestExpense,
    strongestPayment,
    trendPercentage,
  } = insights;

  const businessStatus =
    safeRevenue === 0 &&
    safeTransactions === 0
      ? "No Data"
      : margin >= 30
      ? "Excellent"
      : margin >= 20
      ? "Healthy"
      : margin >= 10
      ? "Needs Attention"
      : margin >= 0
      ? "Low Margin"
      : "At Risk";

  const businessStatusType =
    businessStatus === "Excellent" ||
    businessStatus === "Healthy"
      ? "positive"
      : businessStatus === "No Data"
      ? "neutral"
      : businessStatus === "At Risk"
      ? "danger"
      : "warning";

  const salesTrendType =
    trendPercentage >= 10
      ? "positive"
      : trendPercentage <= -10
      ? "danger"
      : "neutral";

  const salesTrendText =
    trendPercentage >= 10
      ? `Sales appear to be improving. Revenue in the later part of the selected period is approximately ${formatPercentage(
          trendPercentage
        )} higher than the earlier part.`
      : trendPercentage <= -10
      ? `Sales appear to be declining. Revenue in the later part of the selected period is approximately ${formatPercentage(
          Math.abs(trendPercentage)
        )} lower than the earlier part.`
      : "Sales are relatively stable across the selected period. Continue monitoring the trend as more transactions are recorded.";

  const marginMessage =
    margin >= 30
      ? "Your reported result has a strong margin. Protect this performance by controlling costs and maintaining profitable pricing."
      : margin >= 20
      ? "Your margin is in a healthy range. Continue monitoring product costs and expenses so the margin does not deteriorate."
      : margin >= 10
      ? "Your margin is positive but could be stronger. Review pricing, discounts and high-cost areas."
      : margin >= 0
      ? "Your business is currently generating a positive result, but the margin is thin. Small increases in costs could significantly affect profitability."
      : "Your reported result is negative. Review pricing, expenses, discounts and product profitability as priorities.";

  const expenseMessage =
    expenseRate >= 50
      ? `Expenses represent approximately ${formatPercentage(
          expenseRate
        )} of reported revenue. This is a major area for management attention.`
      : expenseRate >= 30
      ? `Expenses represent approximately ${formatPercentage(
          expenseRate
        )} of reported revenue. Look for areas where spending can be controlled without affecting operations.`
      : "Expenses appear reasonably controlled against the reported revenue. Continue monitoring the largest categories.";

  const discountMessage =
    discountRate >= 10
      ? `Discounts are approximately ${formatPercentage(
          discountRate
        )} of revenue. Review whether these discounts are producing enough additional sales to justify the reduction in revenue.`
      : discountRate >= 5
      ? `Discounts are noticeable at approximately ${formatPercentage(
          discountRate
        )} of revenue. Monitor their effect on your final profit.`
      : "Discounting appears relatively controlled based on the current report.";

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6 text-white shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <div className="rounded-xl bg-white/10 p-2">
                <Sparkles className="h-5 w-5" />
              </div>

              <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">
                MOVA Intelligence
              </span>
            </div>

            <h2 className="text-xl font-bold">
              Business Insights
            </h2>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-300">
              MOVA automatically analyzes your current
              report and highlights business performance,
              risks and opportunities.
            </p>
          </div>

          <div
            className={`inline-flex w-fit items-center gap-2 rounded-full px-4 py-2 text-xs font-bold ${
              businessStatusType === "positive"
                ? "bg-emerald-400/15 text-emerald-300"
                : businessStatusType === "danger"
                ? "bg-red-400/15 text-red-300"
                : businessStatusType === "neutral"
                ? "bg-white/10 text-slate-300"
                : "bg-amber-400/15 text-amber-300"
            }`}
          >
            {businessStatusType ===
            "positive" ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : businessStatusType ===
              "danger" ? (
              <ShieldAlert className="h-4 w-4" />
            ) : (
              <Lightbulb className="h-4 w-4" />
            )}

            Business status: {businessStatus}
          </div>
        </div>
      </div>

      {/* Key intelligence metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricPill
          label="Revenue"
          value={formatUGX(safeRevenue)}
          icon={
            <CircleDollarSign className="h-4 w-4" />
          }
        />

        <MetricPill
          label="Net Result"
          value={formatUGX(safeNetResult)}
          icon={
            safeNetResult >= 0 ? (
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )
          }
        />

        <MetricPill
          label="Profit Margin"
          value={formatPercentage(margin)}
          icon={
            <Target className="h-4 w-4" />
          }
        />

        <MetricPill
          label="Transactions"
          value={safeTransactions}
          icon={
            <BarChart3 className="h-4 w-4" />
          }
        />
      </div>

      {/* Main insights */}
      <div className="grid gap-5 lg:grid-cols-2">
        <InsightCard
          title="Profit Health"
          label={businessStatus}
          type={businessStatusType}
          icon={
            margin >= 20 ? (
              <TrendingUp className="h-5 w-5" />
            ) : (
              <TrendingDown className="h-5 w-5" />
            )
          }
        >
          <p>{marginMessage}</p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/70 bg-white/70 p-3">
              <p className="text-[11px] text-slate-500">
                Revenue
              </p>

              <p className="mt-1 text-sm font-bold text-slate-900">
                {formatUGX(safeRevenue)}
              </p>
            </div>

            <div className="rounded-xl border border-white/70 bg-white/70 p-3">
              <p className="text-[11px] text-slate-500">
                Net result
              </p>

              <p className="mt-1 text-sm font-bold text-slate-900">
                {formatUGX(safeNetResult)}
              </p>
            </div>
          </div>
        </InsightCard>

        <InsightCard
          title="Sales Trend"
          label={
            trendPercentage >= 10
              ? "Improving"
              : trendPercentage <= -10
              ? "Declining"
              : "Stable"
          }
          type={salesTrendType}
          icon={
            trendPercentage >= 10 ? (
              <ArrowUpRight className="h-5 w-5" />
            ) : trendPercentage <= -10 ? (
              <ArrowDownRight className="h-5 w-5" />
            ) : (
              <BarChart3 className="h-5 w-5" />
            )
          }
        >
          <p>{salesTrendText}</p>

          {trendPercentage !== 0 && (
            <p className="mt-3 text-xs font-semibold text-slate-500">
              Estimated movement:{" "}
              {trendPercentage > 0 ? "+" : ""}
              {formatPercentage(
                trendPercentage
              )}
            </p>
          )}
        </InsightCard>

        <InsightCard
          title="Expense Intelligence"
          label={
            expenseRate >= 50
              ? "High"
              : expenseRate >= 30
              ? "Watch"
              : "Controlled"
          }
          type={
            expenseRate >= 50
              ? "danger"
              : expenseRate >= 30
              ? "warning"
              : "positive"
          }
          icon={
            <Wallet className="h-5 w-5" />
          }
        >
          <p>{expenseMessage}</p>

          {strongestExpense && (
            <div className="mt-4 rounded-xl border border-white/70 bg-white/70 p-3">
              <p className="text-[11px] text-slate-500">
                Largest expense category
              </p>

              <div className="mt-1 flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-slate-900">
                  {getExpenseName(
                    strongestExpense
                  )}
                </span>

                <span className="text-sm font-bold text-slate-900">
                  {formatUGX(
                    getExpenseAmount(
                      strongestExpense
                    )
                  )}
                </span>
              </div>
            </div>
          )}
        </InsightCard>

        <InsightCard
          title="Discount Intelligence"
          label={
            discountRate >= 10
              ? "Review"
              : discountRate >= 5
              ? "Monitor"
              : "Controlled"
          }
          type={
            discountRate >= 10
              ? "warning"
              : "info"
          }
          icon={
            <CircleDollarSign className="h-5 w-5" />
          }
        >
          <p>{discountMessage}</p>

          <div className="mt-4 flex items-center justify-between rounded-xl border border-white/70 bg-white/70 p-3">
            <span className="text-xs text-slate-500">
              Reported discounts
            </span>

            <span className="text-sm font-bold text-slate-900">
              {formatUGX(safeDiscounts)}
            </span>
          </div>
        </InsightCard>
      </div>

      {/* Opportunities */}
      <div className="grid gap-5 lg:grid-cols-3">
        <InsightCard
          title="Top Product Opportunity"
          label="Focus"
          type="positive"
          icon={
            <Award className="h-5 w-5" />
          }
        >
          {strongestProduct ? (
            <>
              <p>
                <strong>
                  {getProductName(
                    strongestProduct
                  )}
                </strong>{" "}
                is currently your strongest reported
                product by sales value.
              </p>

              <div className="mt-4 rounded-xl bg-white/70 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    Sales value
                  </span>

                  <span className="text-sm font-bold text-slate-900">
                    {formatUGX(
                      getProductRevenue(
                        strongestProduct
                      )
                    )}
                  </span>
                </div>

                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    Units reported
                  </span>

                  <span className="text-sm font-bold text-slate-900">
                    {getProductQuantity(
                      strongestProduct
                    )}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <p>
              There is not enough product-performance
              data to identify an opportunity yet.
            </p>
          )}
        </InsightCard>

        <InsightCard
          title="Payment Intelligence"
          label="Customer Behaviour"
          type="info"
          icon={
            <Wallet className="h-5 w-5" />
          }
        >
          {strongestPayment ? (
            <>
              <p>
                <strong>
                  {getPaymentName(
                    strongestPayment
                  )}
                </strong>{" "}
                is currently the strongest reported
                payment channel.
              </p>

              <div className="mt-4 rounded-xl bg-white/70 p-3">
                <p className="text-[11px] text-slate-500">
                  Reported payment value
                </p>

                <p className="mt-1 text-lg font-bold text-slate-900">
                  {formatUGX(
                    getPaymentAmount(
                      strongestPayment
                    )
                  )}
                </p>
              </div>
            </>
          ) : (
            <p>
              Payment-method data will appear here
              after transactions are recorded.
            </p>
          )}
        </InsightCard>

        <InsightCard
          title="Average Transaction"
          label="Sales Efficiency"
          type={
            safeAverageSale > 0
              ? "positive"
              : "neutral"
          }
          icon={
            <Target className="h-5 w-5" />
          }
        >
          <p>
            Your average reported transaction value
            is{" "}
            <strong>
              {formatUGX(
                safeAverageSale
              )}
            </strong>
            .
          </p>

          <p className="mt-3 text-xs text-slate-500">
            Increasing average basket value through
            bundles, complementary products and
            responsible upselling can improve revenue
            without requiring the same increase in
            customer traffic.
          </p>
        </InsightCard>
      </div>

      {/* Management recommendations */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-start gap-3">
          <div className="rounded-xl bg-amber-100 p-2 text-amber-700">
            <Lightbulb className="h-5 w-5" />
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-900">
              MOVA Recommendations
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              Practical actions based on the current
              report.
            </p>
          </div>
        </div>

        <div className="grid gap-3">
          {margin < 15 && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />

              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Improve profitability
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-600">
                  Review selling prices, product costs,
                  discounts and operating expenses to
                  improve your margin.
                </p>
              </div>
            </div>
          )}

          {strongestProduct && (
            <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <Package className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />

              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Protect your best seller
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-600">
                  Keep{" "}
                  <strong>
                    {getProductName(
                      strongestProduct
                    )}
                  </strong>{" "}
                  available and monitor its stock
                  closely because it is currently one
                  of your strongest reported products.
                </p>
              </div>
            </div>
          )}

          {strongestExpense &&
            expenseRate >= 30 && (
              <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
                <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Review major expenses
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-600">
                    The largest reported expense category
                    is{" "}
                    <strong>
                      {getExpenseName(
                        strongestExpense
                      )}
                    </strong>
                    . Review whether this cost can be
                    reduced or better controlled.
                  </p>
                </div>
              </div>
            )}

          {discountRate >= 5 && (
            <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
              <CircleDollarSign className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />

              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Monitor discounting
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-600">
                  Your current discount rate is{" "}
                  <strong>
                    {formatPercentage(
                      discountRate
                    )}
                  </strong>
                  . Make sure discounts are increasing
                  sales enough to compensate for reduced
                  revenue.
                </p>
              </div>
            </div>
          )}

          {trendPercentage <= -10 && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
              <TrendingDown className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Investigate the sales decline
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-600">
                  Recent sales appear weaker than the
                  earlier part of the selected period.
                  Check stock availability, pricing,
                  customer demand and promotions.
                </p>
              </div>
            </div>
          )}

          {safeRevenue === 0 &&
            safeTransactions === 0 && (
              <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <BarChart3 className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />

                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Start recording transactions
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-600">
                    MOVA needs sales activity before it
                    can provide meaningful business
                    intelligence. Record some sales or
                    select a wider reporting period.
                  </p>
                </div>
              </div>
            )}

          {safeRevenue > 0 &&
            margin >= 20 &&
            expenseRate < 30 &&
            discountRate < 5 &&
            trendPercentage > -10 && (
              <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />

                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    No major warning detected
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-600">
                    The current report shows a generally
                    healthy position. Continue monitoring
                    sales, margins, expenses and stock
                    levels.
                  </p>
                </div>
              </div>
            )}
        </div>
      </section>

      {/* Intelligence footer */}
      <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-slate-500" />

          <span>
            MOVA Intelligence is based on the report
            currently selected.
          </span>
        </div>

        <span>
          {sortedProducts.length} products •{" "}
          {sortedExpenses.length} expense categories •{" "}
          {sortedPayments.length} payment methods
        </span>
      </div>
    </section>
  );
};

export default BusinessInsights;