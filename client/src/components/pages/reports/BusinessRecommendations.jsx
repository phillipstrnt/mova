import { useMemo } from "react";

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  Lightbulb,
  Package,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";

const formatUGX = (value) => {
  const number = Number(value) || 0;

  return new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    maximumFractionDigits: 0,
  }).format(number);
};

const numberValue = (value) => {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
};

const getProductName = (product) => {
  return (
    product?.name ||
    product?.productName ||
    product?.product?.name ||
    "Unknown product"
  );
};

const getUnitsSold = (product) => {
  return numberValue(
    product?.unitsSold ??
      product?.quantitySold ??
      product?.quantity ??
      product?.sold
  );
};

const getRevenue = (product) => {
  return numberValue(
    product?.revenue ??
      product?.totalRevenue ??
      product?.sales
  );
};

const getStock = (product) => {
  return numberValue(
    product?.stock ??
      product?.quantityInStock ??
      product?.currentStock ??
      product?.availableStock ??
      product?.quantity
  );
};

const getMinimumStock = (product) => {
  return numberValue(
    product?.minStock ??
      product?.minimumStock ??
      product?.reorderLevel
  );
};

const getPriorityStyles = (priority) => {
  if (priority === "high") {
    return {
      badge:
        "border-red-200 bg-red-50 text-red-700",
      icon:
        "bg-red-100 text-red-700",
      border:
        "border-red-200",
    };
  }

  if (priority === "medium") {
    return {
      badge:
        "border-amber-200 bg-amber-50 text-amber-700",
      icon:
        "bg-amber-100 text-amber-700",
      border:
        "border-amber-200",
    };
  }

  return {
    badge:
      "border-emerald-200 bg-emerald-50 text-emerald-700",
    icon:
      "bg-emerald-100 text-emerald-700",
    border:
      "border-emerald-200",
  };
};

const RecommendationCard = ({
  recommendation,
}) => {
  const styles = getPriorityStyles(
    recommendation.priority
  );

  return (
    <div
      className={`rounded-2xl border bg-white p-5 shadow-sm ${styles.border}`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`rounded-xl p-3 ${styles.icon}`}
        >
          {recommendation.icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="font-bold text-slate-900">
                {recommendation.title}
              </h3>

              <p className="mt-1 text-xs font-medium text-slate-500">
                {recommendation.category}
              </p>
            </div>

            <span
              className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${styles.badge}`}
            >
              {recommendation.priority}
            </span>
          </div>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            {recommendation.description}
          </p>

          {recommendation.metric && (
            <div className="mt-4 rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-medium text-slate-400">
                MOVA detected
              </p>

              <p className="mt-1 text-sm font-bold text-slate-800">
                {recommendation.metric}
              </p>
            </div>
          )}

          {recommendation.action && (
            <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-slate-700">
              <ArrowRight className="h-4 w-4" />

              {recommendation.action}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const BusinessRecommendations = ({
  revenue = 0,
  expenses = 0,
  netResult = 0,
  transactions = 0,
  cancelled = 0,
  refunded = 0,
  discounts = 0,
  productPerformance = [],
  inventory = [],
  expenseBreakdown = [],
  paymentBreakdown = [],
}) => {
  const recommendations = useMemo(() => {
    const items = [];

    const safeRevenue = numberValue(
      revenue
    );

    const safeExpenses = numberValue(
      expenses
    );

    const safeNetResult = numberValue(
      netResult
    );

    const safeTransactions =
      numberValue(transactions);

    const safeCancelled =
      numberValue(cancelled);

    const safeRefunded =
      numberValue(refunded);

    const safeDiscounts =
      numberValue(discounts);

    const profitMargin =
      safeRevenue > 0
        ? (safeNetResult /
            safeRevenue) *
          100
        : 0;

    const expenseRatio =
      safeRevenue > 0
        ? (safeExpenses /
            safeRevenue) *
          100
        : 0;

    const discountRatio =
      safeRevenue > 0
        ? (safeDiscounts /
            safeRevenue) *
          100
        : 0;

    const cancellationRate =
      safeTransactions > 0
        ? (safeCancelled /
            safeTransactions) *
          100
        : 0;

    const refundRate =
      safeTransactions > 0
        ? (safeRefunded /
            safeTransactions) *
          100
        : 0;

    const products =
      Array.isArray(productPerformance)
        ? productPerformance
        : [];

    const stockItems =
      Array.isArray(inventory)
        ? inventory
        : [];

    const expensesList =
      Array.isArray(expenseBreakdown)
        ? expenseBreakdown
        : [];

    const payments =
      Array.isArray(paymentBreakdown)
        ? paymentBreakdown
        : [];

    /*
     * 1. NEGATIVE PROFIT
     */

    if (
      safeRevenue > 0 &&
      safeNetResult < 0
    ) {
      items.push({
        id: "negative-profit",
        priority: "high",
        category: "Profitability",
        title:
          "Your business is currently losing money",
        description:
          "MOVA detected that your total expenses and operating costs are higher than the result generated during this reporting period.",
        metric: `Net result: ${formatUGX(
          safeNetResult
        )}`,
        action:
          "Review pricing, buying costs and operating expenses first.",
        icon: (
          <TrendingDown className="h-5 w-5" />
        ),
      });
    }

    /*
     * 2. LOW PROFIT MARGIN
     */

    if (
      safeRevenue > 0 &&
      safeNetResult >= 0 &&
      profitMargin < 10
    ) {
      items.push({
        id: "low-margin",
        priority:
          profitMargin < 5
            ? "high"
            : "medium",
        category: "Profitability",
        title:
          "Profit margin is lower than expected",
        description:
          "Your business is generating sales, but only a small percentage is remaining after costs and expenses.",
        metric: `Current net margin: ${profitMargin.toFixed(
          1
        )}%`,
        action:
          "Review your highest-selling products and their margins.",
        icon: (
          <CircleDollarSign className="h-5 w-5" />
        ),
      });
    }

    /*
     * 3. HIGH EXPENSE RATIO
     */

    if (
      safeRevenue > 0 &&
      expenseRatio > 40
    ) {
      items.push({
        id: "high-expenses",
        priority:
          expenseRatio > 60
            ? "high"
            : "medium",
        category: "Expenses",
        title:
          "Operating expenses are consuming a large share of revenue",
        description:
          "A significant portion of the revenue generated during this period is being absorbed by expenses.",
        metric: `Expenses are ${expenseRatio.toFixed(
          1
        )}% of revenue`,
        action:
          "Review recurring expenses and identify costs that can be reduced.",
        icon: (
          <Wallet className="h-5 w-5" />
        ),
      });
    }

    /*
     * 4. LOW SALES ACTIVITY
     */

    if (
      safeRevenue > 0 &&
      safeTransactions < 10
    ) {
      items.push({
        id: "low-sales",
        priority: "medium",
        category: "Sales",
        title:
          "Sales activity is relatively low",
        description:
          "There are only a small number of recorded transactions in the selected reporting period.",
        metric: `${safeTransactions} transactions recorded`,
        action:
          "Focus on customer acquisition, repeat purchases and promotions.",
        icon: (
          <ShoppingCart className="h-5 w-5" />
        ),
      });
    }

    /*
     * 5. HIGH DISCOUNTS
     */

    if (
      safeRevenue > 0 &&
      discountRatio > 10
    ) {
      items.push({
        id: "high-discounts",
        priority:
          discountRatio > 20
            ? "high"
            : "medium",
        category: "Pricing",
        title:
          "Discounts are taking a significant share of revenue",
        description:
          "Large discounts can increase sales volume while reducing your actual profit.",
        metric: `Discounts represent ${discountRatio.toFixed(
          1
        )}% of revenue`,
        action:
          "Review discount rules and protect margins on profitable products.",
        icon: (
          <TrendingDown className="h-5 w-5" />
        ),
      });
    }

    /*
     * 6. CANCELLATIONS
     */

    if (
      safeTransactions > 0 &&
      cancellationRate > 5
    ) {
      items.push({
        id: "cancellations",
        priority:
          cancellationRate > 10
            ? "high"
            : "medium",
        category: "Transactions",
        title:
          "Cancelled sales need investigation",
        description:
          "A noticeable percentage of your transactions have been cancelled.",
        metric: `${cancellationRate.toFixed(
          1
        )}% cancellation rate`,
        action:
          "Review why transactions are being cancelled and identify recurring causes.",
        icon: (
          <AlertTriangle className="h-5 w-5" />
        ),
      });
    }

    /*
     * 7. REFUNDS
     */

    if (
      safeTransactions > 0 &&
      refundRate > 5
    ) {
      items.push({
        id: "refunds",
        priority:
          refundRate > 10
            ? "high"
            : "medium",
        category: "Customer Experience",
        title:
          "Refund activity deserves attention",
        description:
          "A noticeable percentage of recorded transactions have been refunded.",
        metric: `${refundRate.toFixed(
          1
        )}% refund rate`,
        action:
          "Investigate returned products and recurring customer complaints.",
        icon: (
          <TrendingDown className="h-5 w-5" />
        ),
      });
    }

    /*
     * 8. LOW STOCK
     */

    const lowStockProducts =
      stockItems.filter((item) => {
        const stock = getStock(item);
        const minimum =
          getMinimumStock(item);

        if (stock <= 0) return true;

        if (minimum > 0) {
          return stock <= minimum;
        }

        return false;
      });

    if (lowStockProducts.length > 0) {
      items.push({
        id: "low-stock",
        priority:
          lowStockProducts.length >= 5
            ? "high"
            : "medium",
        category: "Inventory",
        title:
          "Some products need replenishment",
        description:
          "MOVA detected products at or below their configured minimum stock levels.",
        metric: `${lowStockProducts.length} product${
          lowStockProducts.length === 1
            ? ""
            : "s"
        } need attention`,
        action:
          "Review inventory and create purchase orders for important products.",
        icon: (
          <Package className="h-5 w-5" />
        ),
      });
    }

    /*
     * 9. FAST MOVING PRODUCT
     */

    const fastMoving =
      [...products]
        .filter(
          (product) =>
            getUnitsSold(product) > 0
        )
        .sort(
          (a, b) =>
            getUnitsSold(b) -
            getUnitsSold(a)
        )[0];

    if (fastMoving) {
      items.push({
        id: "fast-moving",
        priority: "low",
        category: "Opportunity",
        title:
          "Your fastest-moving product deserves attention",
        description:
          "One of your products is significantly contributing to sales volume and may deserve stronger stock availability.",
        metric: `${getProductName(
          fastMoving
        )} — ${getUnitsSold(
          fastMoving
        )} units sold`,
        action:
          "Keep this product adequately stocked and consider promoting it.",
        icon: (
          <Zap className="h-5 w-5" />
        ),
      });
    }

    /*
     * 10. TOP REVENUE PRODUCT
     */

    const topRevenueProduct =
      [...products]
        .filter(
          (product) =>
            getRevenue(product) > 0
        )
        .sort(
          (a, b) =>
            getRevenue(b) -
            getRevenue(a)
        )[0];

    if (
      topRevenueProduct &&
      getRevenue(topRevenueProduct) >
        0
    ) {
      items.push({
        id: "top-revenue",
        priority: "low",
        category: "Opportunity",
        title:
          "Protect your strongest revenue contributor",
        description:
          "Your leading product by revenue should receive special attention because it contributes significantly to overall sales.",
        metric: `${getProductName(
          topRevenueProduct
        )} — ${formatUGX(
          getRevenue(
            topRevenueProduct
          )
        )}`,
        action:
          "Monitor its stock, price and availability closely.",
        icon: (
          <TrendingUp className="h-5 w-5" />
        ),
      });
    }

    /*
     * 11. EXPENSE CONCENTRATION
     */

    if (expensesList.length > 1) {
      const largestExpense =
        [...expensesList].sort(
          (a, b) =>
            numberValue(
              b?.amount ??
                b?.total
            ) -
            numberValue(
              a?.amount ??
                a?.total
            )
        )[0];

      const largestAmount =
        numberValue(
          largestExpense?.amount ??
            largestExpense?.total
        );

      if (
        largestExpense &&
        largestAmount > 0
      ) {
        const category =
          largestExpense?.category ||
          largestExpense?.name ||
          "Other expenses";

        items.push({
          id: "expense-concentration",
          priority: "medium",
          category: "Expenses",
          title:
            "One expense category is dominating spending",
          description:
            "MOVA found a major expense category that may deserve closer monitoring.",
          metric: `${category} — ${formatUGX(
            largestAmount
          )}`,
          action:
            "Review whether this expense is essential and sustainable.",
          icon: (
            <Wallet className="h-5 w-5" />
          ),
        });
      }
    }

    /*
     * 12. PAYMENT DIVERSIFICATION
     */

    if (
      payments.length === 1 &&
      safeTransactions >= 10
    ) {
      const method =
        payments[0]?.method ||
        payments[0]?.paymentMethod ||
        payments[0]?.name ||
        "one payment method";

      items.push({
        id: "payment-diversification",
        priority: "low",
        category: "Payments",
        title:
          "Consider offering more payment options",
        description:
          "Your transactions are currently concentrated around one payment method.",
        metric: `Primary method: ${String(
          method
        ).replaceAll("_", " ")}`,
        action:
          "Consider supporting cash, mobile money and card where practical.",
        icon: (
          <CircleDollarSign className="h-5 w-5" />
        ),
      });
    }

    /*
     * 13. POSITIVE BUSINESS SIGNAL
     */

    if (
      safeRevenue > 0 &&
      safeNetResult > 0 &&
      profitMargin >= 20 &&
      expenseRatio <= 40 &&
      cancellationRate <= 5 &&
      refundRate <= 5
    ) {
      items.push({
        id: "healthy-business",
        priority: "low",
        category: "Business Health",
        title:
          "Your current business indicators are strong",
        description:
          "Revenue, profitability and transaction quality are showing positive signals during this period.",
        metric: `${profitMargin.toFixed(
          1
        )}% net margin`,
        action:
          "Protect your strongest products and continue monitoring the trend.",
        icon: (
          <CheckCircle2 className="h-5 w-5" />
        ),
      });
    }

    /*
     * Sort high → medium → low.
     */

    const priorityWeight = {
      high: 3,
      medium: 2,
      low: 1,
    };

    items.sort(
      (a, b) =>
        priorityWeight[b.priority] -
        priorityWeight[a.priority]
    );

    return items.slice(0, 8);
  }, [
    revenue,
    expenses,
    netResult,
    transactions,
    cancelled,
    refunded,
    discounts,
    productPerformance,
    inventory,
    expenseBreakdown,
    paymentBreakdown,
  ]);

  const highPriorityCount =
    recommendations.filter(
      (item) => item.priority === "high"
    ).length;

  const mediumPriorityCount =
    recommendations.filter(
      (item) => item.priority === "medium"
    ).length;

  const opportunityCount =
    recommendations.filter(
      (item) =>
        item.category ===
        "Opportunity"
    ).length;

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* HEADER */}

      <div className="border-b border-slate-200 bg-slate-950 p-5 text-white">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-white/10 p-2.5">
              <Lightbulb className="h-5 w-5" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold">
                  MOVA Recommendations
                </h2>

                <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-300">
                  Intelligence
                </span>
              </div>

              <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-300">
                MOVA analyzes your business data and
                highlights actions that could improve
                sales, profitability and operations.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-white/10 px-3 py-2 text-center">
              <p className="text-lg font-bold">
                {highPriorityCount}
              </p>

              <p className="text-[10px] text-slate-400">
                High
              </p>
            </div>

            <div className="rounded-xl bg-white/10 px-3 py-2 text-center">
              <p className="text-lg font-bold">
                {mediumPriorityCount}
              </p>

              <p className="text-[10px] text-slate-400">
                Medium
              </p>
            </div>

            <div className="rounded-xl bg-white/10 px-3 py-2 text-center">
              <p className="text-lg font-bold">
                {opportunityCount}
              </p>

              <p className="text-[10px] text-slate-400">
                Opportunities
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CONTENT */}

      <div className="p-5">
        {recommendations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
            <CheckCircle2 className="mx-auto h-9 w-9 text-emerald-500" />

            <h3 className="mt-3 text-sm font-bold text-slate-800">
              No immediate issues detected
            </h3>

            <p className="mx-auto mt-1 max-w-lg text-xs leading-5 text-slate-500">
              MOVA does not currently have enough
              information to generate additional
              recommendations.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {recommendations.map(
              (recommendation) => (
                <RecommendationCard
                  key={recommendation.id}
                  recommendation={
                    recommendation
                  }
                />
              )
            )}
          </div>
        )}

        {/* BOTTOM NOTE */}

        <div className="mt-5 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />

          <p className="text-xs leading-5 text-slate-500">
            <span className="font-semibold text-slate-700">
              MOVA Intelligence:
            </span>{" "}
            These recommendations are generated from
            the data available in your selected reporting
            period. They are decision-support suggestions,
            not guaranteed financial advice.
          </p>
        </div>
      </div>
    </section>
  );
};

export default BusinessRecommendations;