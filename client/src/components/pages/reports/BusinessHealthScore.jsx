import { useMemo } from "react";

import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  DollarSign,
  Gauge,
  ShieldCheck,
  Target,
  TrendingDown,
  TrendingUp,
  XCircle,
} from "lucide-react";

const formatUGX = (value) => {
  const number = Number(value) || 0;

  return new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    maximumFractionDigits: 0,
  }).format(number);
};

const clamp = (value, min, max) => {
  return Math.min(Math.max(value, min), max);
};

const getHealthLabel = (score) => {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Healthy";
  if (score >= 55) return "Needs Attention";
  if (score >= 40) return "At Risk";

  return "Critical";
};

const getHealthDescription = (score) => {
  if (score >= 85) {
    return "Your business indicators are performing strongly. Focus on maintaining momentum and improving your best opportunities.";
  }

  if (score >= 70) {
    return "Your business is generally healthy, but there are still areas where MOVA can help you improve performance.";
  }

  if (score >= 55) {
    return "Your business is showing mixed performance. Review the warnings below and focus on the highest-impact improvements.";
  }

  if (score >= 40) {
    return "Several business indicators need attention. Prioritize profitability, sales activity and operational risks.";
  }

  return "Your business requires immediate attention. Review sales, expenses, stock and profitability before making major decisions.";
};

const getScoreTone = (score) => {
  if (score >= 85) {
    return {
      text: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      bar: "bg-emerald-500",
    };
  }

  if (score >= 70) {
    return {
      text: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-200",
      bar: "bg-blue-500",
    };
  }

  if (score >= 55) {
    return {
      text: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-200",
      bar: "bg-amber-500",
    };
  }

  if (score >= 40) {
    return {
      text: "text-orange-600",
      bg: "bg-orange-50",
      border: "border-orange-200",
      bar: "bg-orange-500",
    };
  }

  return {
    text: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-200",
    bar: "bg-red-500",
  };
};

const calculateSalesScore = ({
  revenue,
  transactions,
}) => {
  if (revenue <= 0 || transactions <= 0) {
    return 0;
  }

  const revenueScore =
    revenue >= 10000000
      ? 100
      : revenue >= 5000000
      ? 90
      : revenue >= 2000000
      ? 80
      : revenue >= 1000000
      ? 70
      : revenue >= 500000
      ? 55
      : revenue >= 100000
      ? 40
      : 20;

  const transactionScore =
    transactions >= 200
      ? 100
      : transactions >= 100
      ? 90
      : transactions >= 50
      ? 80
      : transactions >= 25
      ? 70
      : transactions >= 10
      ? 55
      : transactions >= 5
      ? 40
      : 20;

  return Math.round(
    revenueScore * 0.6 +
      transactionScore * 0.4
  );
};

const calculateProfitScore = ({
  revenue,
  netResult,
}) => {
  if (revenue <= 0) {
    return 0;
  }

  const margin =
    (netResult / revenue) * 100;

  if (margin >= 30) return 100;
  if (margin >= 20) return 95;
  if (margin >= 15) return 85;
  if (margin >= 10) return 75;
  if (margin >= 5) return 60;
  if (margin >= 0) return 45;
  if (margin >= -5) return 25;

  return 10;
};

const calculateExpenseScore = ({
  revenue,
  expenses,
}) => {
  if (revenue <= 0) {
    return 0;
  }

  const expenseRatio =
    (expenses / revenue) * 100;

  if (expenseRatio <= 20) return 100;
  if (expenseRatio <= 30) return 90;
  if (expenseRatio <= 40) return 80;
  if (expenseRatio <= 50) return 65;
  if (expenseRatio <= 60) return 50;
  if (expenseRatio <= 75) return 35;

  return 15;
};

const calculateTransactionScore = ({
  transactions,
  cancelled,
  refunded,
}) => {
  if (transactions <= 0) {
    return 0;
  }

  const cancelledRate =
    (cancelled / transactions) * 100;

  const refundedRate =
    (refunded / transactions) * 100;

  let score = 100;

  if (cancelledRate > 20) {
    score -= 35;
  } else if (cancelledRate > 10) {
    score -= 20;
  } else if (cancelledRate > 5) {
    score -= 10;
  }

  if (refundedRate > 15) {
    score -= 30;
  } else if (refundedRate > 10) {
    score -= 20;
  } else if (refundedRate > 5) {
    score -= 10;
  }

  return clamp(score, 0, 100);
};

const calculateInventoryScore = ({
  inventory = [],
}) => {
  if (!Array.isArray(inventory) || !inventory.length) {
    return 70;
  }

  let healthy = 0;

  inventory.forEach((item) => {
    const quantity = Number(
      item?.quantity ??
        item?.stock ??
        item?.currentStock ??
        0
    );

    const minimum = Number(
      item?.minStock ??
        item?.minimumStock ??
        item?.reorderLevel ??
        0
    );

    if (
      quantity > 0 &&
      (minimum <= 0 ||
        quantity > minimum)
    ) {
      healthy += 1;
    }
  });

  return Math.round(
    (healthy / inventory.length) * 100
  );
};

const ScoreItem = ({
  title,
  score,
  icon,
  description,
}) => {
  const tone = getScoreTone(score);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`rounded-xl p-2 ${tone.bg} ${tone.text}`}
          >
            {icon}
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-900">
              {title}
            </p>

            <p className="mt-0.5 text-xs text-slate-500">
              {description}
            </p>
          </div>
        </div>

        <span
          className={`text-lg font-bold ${tone.text}`}
        >
          {score}
        </span>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all duration-500 ${tone.bar}`}
          style={{
            width: `${score}%`,
          }}
        />
      </div>
    </div>
  );
};

const BusinessHealthScore = ({
  revenue = 0,
  expenses = 0,
  netResult = 0,
  transactions = 0,
  cancelled = 0,
  refunded = 0,
  inventory = [],
}) => {
  const analysis = useMemo(() => {
    const salesScore = calculateSalesScore({
      revenue,
      transactions,
    });

    const profitScore = calculateProfitScore({
      revenue,
      netResult,
    });

    const expenseScore = calculateExpenseScore({
      revenue,
      expenses,
    });

    const transactionScore =
      calculateTransactionScore({
        transactions,
        cancelled,
        refunded,
      });

    const inventoryScore =
      calculateInventoryScore({
        inventory,
      });

    const score = Math.round(
      salesScore * 0.25 +
        profitScore * 0.30 +
        expenseScore * 0.15 +
        transactionScore * 0.15 +
        inventoryScore * 0.15
    );

    return {
      score: clamp(score, 0, 100),
      salesScore,
      profitScore,
      expenseScore,
      transactionScore,
      inventoryScore,
    };
  }, [
    revenue,
    expenses,
    netResult,
    transactions,
    cancelled,
    refunded,
    inventory,
  ]);

  const healthLabel = getHealthLabel(
    analysis.score
  );

  const tone = getScoreTone(
    analysis.score
  );

  const profitMargin =
    revenue > 0
      ? (netResult / revenue) * 100
      : 0;

  const expenseRatio =
    revenue > 0
      ? (expenses / revenue) * 100
      : 0;

  const cancellationRate =
    transactions > 0
      ? (cancelled / transactions) * 100
      : 0;

  const refundRate =
    transactions > 0
      ? (refunded / transactions) * 100
      : 0;

  const recommendations = useMemo(() => {
    const items = [];

    if (analysis.profitScore < 60) {
      items.push({
        priority: "high",
        title: "Improve profitability",
        description:
          profitMargin < 0
            ? "Your reported net result is negative. Review product margins, expenses and discounts."
            : "Your profit margin is relatively low. Review product pricing, buying costs and operating expenses.",
      });
    }

    if (analysis.expenseScore < 60) {
      items.push({
        priority: "high",
        title: "Control expenses",
        description: `Expenses are approximately ${expenseRatio.toFixed(
          1
        )}% of revenue. Review recurring and non-essential costs.`,
      });
    }

    if (analysis.salesScore < 60) {
      items.push({
        priority: "medium",
        title: "Increase sales activity",
        description:
          "Your current sales volume is relatively low for the selected reporting period. Focus on customer acquisition and repeat purchases.",
      });
    }

    if (analysis.inventoryScore < 60) {
      items.push({
        priority: "high",
        title: "Review inventory",
        description:
          "Several products appear to be below healthy stock levels. Replenish important products before they cause missed sales.",
      });
    }

    if (analysis.transactionScore < 60) {
      items.push({
        priority: "medium",
        title: "Investigate cancelled and refunded sales",
        description: `Cancellation rate is ${cancellationRate.toFixed(
          1
        )}% and refund rate is ${refundRate.toFixed(
          1
        )}%. Review the causes of failed or reversed transactions.`,
      });
    }

    if (!items.length) {
      items.push({
        priority: "positive",
        title: "Maintain your current performance",
        description:
          "The major business indicators are currently performing well. Continue monitoring the trends and protect your strongest revenue sources.",
      });
    }

    return items.slice(0, 4);
  }, [
    analysis,
    profitMargin,
    expenseRatio,
    cancellationRate,
    refundRate,
  ]);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* HEADER */}

      <div className="border-b border-slate-200 px-5 py-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-slate-950 p-2.5 text-white">
              <Gauge className="h-5 w-5" />
            </div>

            <div>
              <h2 className="font-bold text-slate-900">
                MOVA Business Health
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                A combined view of your business performance.
              </p>
            </div>
          </div>

          <div
            className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${tone.bg} ${tone.border} ${tone.text}`}
          >
            <Activity className="h-3.5 w-3.5" />

            {healthLabel}
          </div>
        </div>
      </div>

      <div className="p-5">
        {/* MAIN SCORE */}

        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <div
            className={`flex flex-col items-center justify-center rounded-2xl border p-6 text-center ${tone.bg} ${tone.border}`}
          >
            <div className="relative flex h-40 w-40 items-center justify-center">
              <svg
                viewBox="0 0 160 160"
                className="absolute inset-0 h-full w-full -rotate-90"
              >
                <circle
                  cx="80"
                  cy="80"
                  r="64"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="12"
                  className="text-slate-200"
                />

                <circle
                  cx="80"
                  cy="80"
                  r="64"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray="402"
                  strokeDashoffset={
                    402 -
                    (402 *
                      analysis.score) /
                      100
                  }
                  className={tone.text}
                />
              </svg>

              <div className="relative">
                <p
                  className={`text-4xl font-black ${tone.text}`}
                >
                  {analysis.score}
                </p>

                <p className="text-xs font-semibold text-slate-500">
                  / 100
                </p>
              </div>
            </div>

            <h3
              className={`mt-4 text-xl font-bold ${tone.text}`}
            >
              {healthLabel}
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              {getHealthDescription(
                analysis.score
              )}
            </p>
          </div>

          {/* COMPONENT SCORES */}

          <div className="space-y-3">
            <ScoreItem
              title="Sales Performance"
              score={analysis.salesScore}
              description="Revenue and transaction activity"
              icon={
                <TrendingUp className="h-4 w-4" />
              }
            />

            <ScoreItem
              title="Profitability"
              score={analysis.profitScore}
              description="Net result and profit margin"
              icon={
                <DollarSign className="h-4 w-4" />
              }
            />

            <ScoreItem
              title="Expense Control"
              score={analysis.expenseScore}
              description="Expenses relative to revenue"
              icon={
                <Target className="h-4 w-4" />
              }
            />

            <ScoreItem
              title="Transaction Quality"
              score={analysis.transactionScore}
              description="Cancelled and refunded sales"
              icon={
                <ShieldCheck className="h-4 w-4" />
              }
            />

            <ScoreItem
              title="Inventory Health"
              score={analysis.inventoryScore}
              description="Current stock availability"
              icon={
                <Activity className="h-4 w-4" />
              }
            />
          </div>
        </div>

        {/* QUICK METRICS */}

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Revenue
            </p>

            <p className="mt-1 font-bold text-slate-900">
              {formatUGX(revenue)}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Net Result
            </p>

            <p
              className={`mt-1 font-bold ${
                netResult >= 0
                  ? "text-emerald-600"
                  : "text-red-600"
              }`}
            >
              {formatUGX(netResult)}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Profit Margin
            </p>

            <p className="mt-1 font-bold text-slate-900">
              {profitMargin.toFixed(1)}%
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Transactions
            </p>

            <p className="mt-1 font-bold text-slate-900">
              {transactions}
            </p>
          </div>
        </div>

        {/* RECOMMENDATIONS */}

        <div className="mt-6">
          <div className="mb-3 flex items-center gap-2">
            <div className="rounded-lg bg-slate-100 p-2 text-slate-600">
              <ArrowUpRight className="h-4 w-4" />
            </div>

            <div>
              <h3 className="font-semibold text-slate-900">
                Recommended Actions
              </h3>

              <p className="text-xs text-slate-500">
                What MOVA thinks deserves attention.
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {recommendations.map(
              (recommendation, index) => {
                const isPositive =
                  recommendation.priority ===
                  "positive";

                const isHigh =
                  recommendation.priority ===
                  "high";

                return (
                  <div
                    key={`${recommendation.title}-${index}`}
                    className={`rounded-xl border p-4 ${
                      isPositive
                        ? "border-emerald-200 bg-emerald-50"
                        : isHigh
                        ? "border-red-200 bg-red-50"
                        : "border-amber-200 bg-amber-50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`rounded-lg p-2 ${
                          isPositive
                            ? "bg-emerald-100 text-emerald-700"
                            : isHigh
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {isPositive ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : isHigh ? (
                          <AlertTriangle className="h-4 w-4" />
                        ) : (
                          <TrendingDown className="h-4 w-4" />
                        )}
                      </div>

                      <div>
                        <h4 className="text-sm font-bold text-slate-900">
                          {recommendation.title}
                        </h4>

                        <p className="mt-1 text-xs leading-5 text-slate-600">
                          {recommendation.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </div>

        {/* FOOTER */}

        <div className="mt-6 flex items-start gap-3 rounded-xl bg-slate-950 p-4 text-white">
          <Activity className="mt-0.5 h-5 w-5 shrink-0 text-slate-300" />

          <div>
            <p className="text-sm font-semibold">
              How MOVA calculates this score
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-300">
              The score combines sales performance,
              profitability, expense control,
              transaction quality and inventory
              health. It is an operational indicator,
              not an accounting or financial rating.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BusinessHealthScore;