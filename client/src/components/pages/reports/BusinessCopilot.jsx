import { useMemo, useState } from "react";

import {
  Bot,
  ChevronDown,
  Lightbulb,
  MessageCircle,
  Send,
  Sparkles,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";

const formatUGX = (value) => {
  const number = Number(value) || 0;

  return new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    maximumFractionDigits: 0,
  }).format(number);
};

const normalize = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

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
  Number(item?.amount ?? item?.total ?? 0) || 0;

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

const generateAnswer = ({
  question,
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
}) => {
  const q = normalize(question);

  if (!q) {
    return "Ask me something about your sales, profit, expenses, products, payments or business performance.";
  }

  const margin =
    revenue > 0
      ? (netResult / revenue) * 100
      : 0;

  const sortedProducts = [...productPerformance].sort(
    (a, b) =>
      getProductRevenue(b) -
      getProductRevenue(a)
  );

  const topProducts = sortedProducts.slice(0, 5);

  const sortedExpenses = [...expenseBreakdown].sort(
    (a, b) =>
      getExpenseAmount(b) -
      getExpenseAmount(a)
  );

  const topExpense = sortedExpenses[0];

  const sortedPayments = [...paymentBreakdown].sort(
    (a, b) =>
      getPaymentAmount(b) -
      getPaymentAmount(a)
  );

  const strongestPayment = sortedPayments[0];

  const sortedDays = [...dailySales].sort(
    (a, b) =>
      (Number(b?.revenue) || 0) -
      (Number(a?.revenue) || 0)
  );

  const strongestDay = sortedDays[0];

  const discountRate =
    revenue > 0
      ? (discounts / revenue) * 100
      : 0;

  if (
    q.includes("how is") ||
    q.includes("business doing") ||
    q.includes("business health") ||
    q.includes("performance")
  ) {
    if (revenue === 0 && transactions === 0) {
      return "There is not enough sales data for this period yet. Record some transactions or select a wider date range and I can analyze the business.";
    }

    let assessment = "";

    if (margin >= 30) {
      assessment =
        "Your current result looks strong based on the reported figures.";
    } else if (margin >= 15) {
      assessment =
        "Your business is generating a positive result, but there is room to improve the margin.";
    } else if (margin >= 0) {
      assessment =
        "Your result is positive but the margin is quite thin. Expense control and pricing deserve attention.";
    } else {
      assessment =
        "The business is currently reporting a negative result for this period. I would prioritize expenses, pricing and product profitability.";
    }

    return `${assessment}

Revenue: ${formatUGX(revenue)}
Expenses: ${formatUGX(expenses)}
Net result: ${formatUGX(netResult)}
Margin: ${margin.toFixed(1)}%
Transactions: ${transactions}
Average sale: ${formatUGX(averageSale)}

${topProducts[0] ? `Top product: ${getProductName(topProducts[0])}.` : "No product leader is available yet."}`;
  }

  if (
    q.includes("improve") ||
    q.includes("recommend") ||
    q.includes("advice") ||
    q.includes("should i") ||
    q.includes("what should")
  ) {
    const recommendations = [];

    if (margin < 15) {
      recommendations.push(
        "Review your selling prices and product costs because your current margin is relatively low."
      );
    }

    if (topExpense && revenue > 0) {
      const expenseShare =
        (getExpenseAmount(topExpense) / revenue) *
        100;

      if (expenseShare >= 20) {
        recommendations.push(
          `${getExpenseName(topExpense)} is consuming a significant share of revenue. Review whether this expense can be reduced.`
        );
      }
    }

    if (discountRate >= 5) {
      recommendations.push(
        `Discounts are about ${discountRate.toFixed(1)}% of revenue. Check whether discounts are improving sales enough to justify the lost revenue.`
      );
    }

    if (cancelled > 0) {
      recommendations.push(
        `You have ${cancelled} cancelled transaction${cancelled === 1 ? "" : "s"}. Investigate the common reasons and reduce avoidable cancellations.`
      );
    }

    if (refunded > 0) {
      recommendations.push(
        `There are ${refunded} refunded transaction${refunded === 1 ? "" : "s"}. Review returned products and customer complaints for patterns.`
      );
    }

    if (strongestPayment && paymentBreakdown.length > 1) {
      recommendations.push(
        `${getPaymentName(strongestPayment)} is your strongest payment channel. Keep it reliable while maintaining alternatives for customers.`
      );
    }

    if (topProducts.length > 0) {
      recommendations.push(
        `Focus on your best-selling products: ${topProducts
          .slice(0, 3)
          .map(getProductName)
          .join(", ")}. Keep them well stocked.`
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        "Your current report does not show a major warning. Continue monitoring sales, margins, stock levels and expenses regularly."
      );
    }

    return recommendations
      .map((item, index) => `${index + 1}. ${item}`)
      .join("\n\n");
  }

  if (
    q.includes("best seller") ||
    q.includes("best selling") ||
    q.includes("top product") ||
    q.includes("top products")
  ) {
    if (!topProducts.length) {
      return "There are no product-performance records for this period yet.";
    }

    return `Your top products by reported sales value are:

${topProducts
  .map(
    (item, index) =>
      `${index + 1}. ${getProductName(item)} — ${formatUGX(
        getProductRevenue(item)
      )} (${getProductQuantity(item)} units)`
  )
  .join("\n")}

Recommendation: keep your strongest products available and monitor their stock closely.`;
  }

  if (
    q.includes("expense") ||
    q.includes("spending") ||
    q.includes("money going") ||
    q.includes("cost")
  ) {
    if (!sortedExpenses.length) {
      return "No expenses are recorded for this period.";
    }

    const totalExpenseData = sortedExpenses.reduce(
      (sum, item) =>
        sum + getExpenseAmount(item),
      0
    );

    return `Your main expense categories are:

${sortedExpenses
  .slice(0, 5)
  .map(
    (item, index) =>
      `${index + 1}. ${getExpenseName(item)} — ${formatUGX(
        getExpenseAmount(item)
      )}`
  )
  .join("\n")}

Reported expense total: ${formatUGX(totalExpenseData)}.

My advice: focus first on the largest category and determine whether it can be reduced without hurting operations.`;
  }

  if (
    q.includes("payment") ||
    q.includes("cash") ||
    q.includes("mobile money") ||
    q.includes("card")
  ) {
    if (!sortedPayments.length) {
      return "There is no payment-method data for this period yet.";
    }

    return `Payment performance:

${sortedPayments
  .map(
    (item, index) =>
      `${index + 1}. ${getPaymentName(item)} — ${formatUGX(
        getPaymentAmount(item)
      )}`
  )
  .join("\n")}

The strongest reported method is ${
      strongestPayment
        ? getPaymentName(strongestPayment)
        : "not available"
    }.`;
  }

  if (
    q.includes("profit") ||
    q.includes("margin") ||
    q.includes("net result")
  ) {
    return `Profit snapshot:

Revenue: ${formatUGX(revenue)}
Expenses: ${formatUGX(expenses)}
Net result: ${formatUGX(netResult)}
Estimated reported margin: ${margin.toFixed(1)}%

${
      margin >= 20
        ? "The current margin is encouraging."
        : margin >= 0
        ? "The result is positive, but improving the margin should be a priority."
        : "The current result is negative, so cost and pricing decisions need immediate attention."
    }`;
  }

  if (
    q.includes("trend") ||
    q.includes("sales trend") ||
    q.includes("best day") ||
    q.includes("strongest day")
  ) {
    if (!strongestDay) {
      return "There is not enough daily sales information to identify a trend.";
    }

    return `Your strongest reported sales day was ${String(
      strongestDay?.date || strongestDay?.createdAt || "the selected period"
    )}, with ${formatUGX(
      Number(strongestDay?.revenue) || 0
    )} in revenue.

Use your strongest days as a clue when planning promotions, staffing and stock levels.`;
  }

  if (
    q.includes("discount") ||
    q.includes("discounts")
  ) {
    return `Discount snapshot:

Discounts: ${formatUGX(discounts)}
Discount rate against reported revenue: ${discountRate.toFixed(1)}%

${
      discountRate >= 10
        ? "That is relatively high. Review whether the discounts are generating enough additional sales."
        : discountRate >= 5
        ? "Discounting is noticeable. Monitor its effect on your actual profit."
        : "Discounting currently appears controlled based on the reported figures."
    }`;
  }

  if (
    q.includes("cancel") ||
    q.includes("refund") ||
    q.includes("return")
  ) {
    return `Transaction quality:

Cancelled transactions: ${cancelled}
Refunded transactions: ${refunded}

If cancellations or refunds are increasing, review product quality, pricing, cashier procedures and customer complaints to identify the underlying cause.`;
  }

  if (
    q.includes("summary") ||
    q.includes("report")
  ) {
    return `MOVA report summary:

Revenue: ${formatUGX(revenue)}
Expenses: ${formatUGX(expenses)}
Net result: ${formatUGX(netResult)}
Transactions: ${transactions}
Average sale: ${formatUGX(averageSale)}
Discounts: ${formatUGX(discounts)}

Ask me "How is my business doing?" for a deeper assessment.`;
  }

  return `I can help you analyze this report.

Try asking:
• How is my business doing?
• What should I improve?
• What are my best sellers?
• Where is my money going?
• Which payment method is strongest?
• How is my profit?
• What is my sales trend?`;
};

const BusinessCopilot = ({
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
  const [open, setOpen] = useState(false);

  const [question, setQuestion] = useState("");

  const initialMessage = useMemo(
    () =>
      `Hello! I'm MOVA Copilot 👋

I can analyze your current business report and help you understand sales, profit, expenses, products and payments.

Ask me what you should improve or choose one of the quick questions below.`,
    []
  );

  const [messages, setMessages] = useState([
    {
      id: 1,
      role: "assistant",
      text: initialMessage,
    },
  ]);

  const quickQuestions = [
    "How is my business doing?",
    "What should I improve?",
    "What are my best sellers?",
    "Where is my money going?",
    "Which payment method is strongest?",
  ];

  const askCopilot = (text) => {
    const cleanText = String(text || "").trim();

    if (!cleanText) return;

    const answer = generateAnswer({
      question: cleanText,
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
    });

    setMessages((current) => [
      ...current,
      {
        id: Date.now(),
        role: "user",
        text: cleanText,
      },
      {
        id: Date.now() + 1,
        role: "assistant",
        text: answer,
      },
    ]);

    setQuestion("");
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    askCopilot(question);
  };

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-3 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-2xl transition hover:scale-[1.02] hover:bg-slate-800"
          aria-label="Open MOVA Copilot"
        >
          <span className="relative">
            <Bot className="h-5 w-5" />

            <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold">
              AI
            </span>
          </span>

          <span className="hidden sm:inline">
            MOVA Copilot
          </span>
        </button>
      )}

      {open && (
        <>
          <button
            type="button"
            aria-label="Close copilot overlay"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-[1px]"
          />

          <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-950 px-5 py-4 text-white">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-white/10 p-2">
                  <Sparkles className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-sm font-bold">
                    MOVA Copilot
                  </h2>

                  <p className="text-xs text-slate-300">
                    Smart business assistant
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 transition hover:bg-white/10"
                aria-label="Close MOVA Copilot"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex items-start gap-2">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />

                <p className="text-xs leading-5 text-slate-600">
                  Copilot is analyzing the report currently displayed in
                  MOVA.
                </p>
              </div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5">
              {messages.map((message) => {
                const isAssistant =
                  message.role === "assistant";

                return (
                  <div
                    key={message.id}
                    className={`flex ${
                      isAssistant
                        ? "justify-start"
                        : "justify-end"
                    }`}
                  >
                    <div
                      className={`max-w-[88%] whitespace-pre-line rounded-2xl px-4 py-3 text-sm leading-6 ${
                        isAssistant
                          ? "rounded-tl-sm bg-slate-100 text-slate-700"
                          : "rounded-tr-sm bg-slate-950 text-white"
                      }`}
                    >
                      {isAssistant && (
                        <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-500">
                          <Bot className="h-3.5 w-3.5" />
                          MOVA Copilot
                        </div>
                      )}

                      {message.text}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-slate-200 bg-white p-4">
              <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
                {quickQuestions.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => askCopilot(item)}
                    className="whitespace-nowrap rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-100"
                  >
                    {item}
                  </button>
                ))}
              </div>

              <form
                onSubmit={handleSubmit}
                className="flex items-center gap-2"
              >
                <div className="relative flex-1">
                  <MessageCircle className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    type="text"
                    value={question}
                    onChange={(event) =>
                      setQuestion(event.target.value)
                    }
                    placeholder="Ask MOVA Copilot..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!question.trim()}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Send question"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </aside>
        </>
      )}
    </>
  );
};

export default BusinessCopilot;