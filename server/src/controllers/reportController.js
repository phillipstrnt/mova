import Sale from "../models/Sale.js";
import Expense from "../models/Expense.js";
import ReceiptSettings from "../models/ReceiptSettings.js";

export const searchReportAssistant = async (req, res) => {
  const query = String(req.body?.query || "").trim();
  if (query.length < 3 || query.length > 400) {
    return res.status(400).json({ success: false, message: "Enter a question between 3 and 400 characters." });
  }

  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      success: false,
      code: "WEB_SEARCH_NOT_CONFIGURED",
      message: "Web search is not configured yet. Add BRAVE_SEARCH_API_KEY to MOVA's API environment settings.",
    });
  }

  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), 20000);
  try {
    const response = await fetch("https://api.search.brave.com/res/v1/chat/completions", {
      method: "POST",
      signal: abortController.signal,
      headers: {
        Accept: "text/event-stream",
        "Content-Type": "application/json",
        "X-Subscription-Token": apiKey,
      },
      body: JSON.stringify({
        model: "brave",
        stream: true,
        enable_citations: true,
        enable_research: false,
        country: "UG",
        language: "en",
        safesearch: "moderate",
        max_completion_tokens: 600,
        messages: [{ role: "user", content: query }],
      }),
    });

    if (!response.ok) {
      const status = response.status === 429 || response.status === 402 ? 503 : 502;
      return res.status(status).json({
        success: false,
        code: response.status === 402 ? "WEB_SEARCH_CREDITS_REQUIRED" : "WEB_SEARCH_FAILED",
        message: response.status === 402
          ? "The web search service needs an active plan or more credits."
          : response.status === 429
            ? "The web search service is busy. Please try again shortly."
            : "The web search service could not answer this question.",
      });
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("Search provider did not return a response stream.");

    const decoder = new TextDecoder();
    let buffer = "";
    let answer = "";
    const sources = [];
    let done = false;
    const processLine = (line) => {
      if (!line.startsWith("data:")) return false;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") return payload === "[DONE]";
      try {
        const content = JSON.parse(payload)?.choices?.[0]?.delta?.content;
        if (typeof content !== "string") return false;
        const citationMatch = content.match(/^<citation>([\s\S]*)<\/citation>$/);
        if (citationMatch) {
          const citation = JSON.parse(citationMatch[1]);
          const url = new URL(citation.url);
          if (["http:", "https:"].includes(url.protocol) && !sources.some((item) => item.url === url.href)) {
            sources.push({ url: url.href, snippet: String(citation.snippet || "").slice(0, 600) });
          }
        } else if (!content.startsWith("<usage>")) {
          answer += content;
        }
      } catch (error) {
        if (error instanceof SyntaxError) return false;
        return false;
      }
      return false;
    };

    while (!done) {
      const { value, done: streamDone } = await reader.read();
      buffer += decoder.decode(value || new Uint8Array(), { stream: !streamDone });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (processLine(line)) done = true;
      }
      if (streamDone) {
        if (buffer) processLine(buffer);
        break;
      }
    }

    const cleanAnswer = answer.trim();
    if (!cleanAnswer) {
      return res.status(502).json({ success: false, message: "The web search service returned no answer. Please try rephrasing your question." });
    }
    return res.json({ success: true, data: { answer: cleanAnswer, sources } });
  } catch (error) {
    console.error("Report web search failed:", error.name === "AbortError" ? "request timed out" : error.message);
    return res.status(502).json({ success: false, message: error.name === "AbortError" ? "Web search took too long. Please try again." : "The web search service is temporarily unavailable." });
  } finally {
    clearTimeout(timeout);
  }
};

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

/*
 * Get the authenticated user's business.
 */
const getBusinessId = (req) => {
  return req.user?.businessId || null;
};

/*
 * Get the active branch.
 *
 * Priority:
 * 1. branchId from query string
 * 2. activeBranchId from authenticated user
 * 3. branchId from authenticated user
 */
const getActiveBranchId = (req) => {
  return (
    req.query?.branchId ||
    req.user?.activeBranchId ||
    req.user?.branchId ||
    null
  );
};

/*
 * Build a date range for reports.
 *
 * Example:
 *
 * startDate=2026-10-01
 * endDate=2026-10-06
 *
 * The end date is inclusive until 23:59:59.999.
 */
const getDateRange = (req) => {
  const now = new Date();

  let startDate;
  let endDate;

  if (req.query.startDate) {
    startDate = new Date(
      `${req.query.startDate}T00:00:00`
    );
  } else {
    startDate = new Date(now);

    startDate.setHours(
      0,
      0,
      0,
      0
    );
  }

  if (req.query.endDate) {
    endDate = new Date(
      `${req.query.endDate}T23:59:59.999`
    );
  } else {
    endDate = new Date(now);

    endDate.setHours(
      23,
      59,
      59,
      999
    );
  }

  /*
   * Protect against invalid dates.
   */
  if (
    Number.isNaN(
      startDate.getTime()
    )
  ) {
    startDate = new Date(now);

    startDate.setHours(
      0,
      0,
      0,
      0
    );
  }

  if (
    Number.isNaN(
      endDate.getTime()
    )
  ) {
    endDate = new Date(now);

    endDate.setHours(
      23,
      59,
      59,
      999
    );
  }

  return {
    startDate,
    endDate,
  };
};

/*
 * Convert a value safely to a number.
 */
const numberValue = (value) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
};

/*
|--------------------------------------------------------------------------
| SALE FILTER
|--------------------------------------------------------------------------
*/

const buildSaleFilter = (req) => {
  const businessId =
    getBusinessId(req);

  const branchId =
    getActiveBranchId(req);

  const {
    startDate,
    endDate,
  } = getDateRange(req);

  const filter = {
    businessId,

    createdAt: {
      $gte: startDate,
      $lte: endDate,
    },
  };

  if (branchId) {
    filter.branchId =
      branchId;
  }

  return filter;
};

/*
|--------------------------------------------------------------------------
| EXPENSE FILTER
|--------------------------------------------------------------------------
*/

const buildExpenseFilter = (req) => {
  const businessId =
    getBusinessId(req);

  const branchId =
    getActiveBranchId(req);

  const {
    startDate,
    endDate,
  } = getDateRange(req);

  const filter = {
    businessId,

    expenseDate: {
      $gte: startDate,
      $lte: endDate,
    },

    status: {
      $ne: "CANCELLED",
    },
  };

  if (branchId) {
    filter.branchId =
      branchId;
  }

  return filter;
};

/*
|--------------------------------------------------------------------------
| GENERAL REPORT
|--------------------------------------------------------------------------
|
| GET /api/reports
|
*/

const getReports = async (
  req,
  res
) => {
  try {
    const businessId =
      getBusinessId(req);

    if (!businessId) {
      return res.status(401).json({
        success: false,
        message:
          "Authenticated business could not be determined.",
      });
    }

    const saleFilter =
      buildSaleFilter(req);

    const expenseFilter =
      buildExpenseFilter(req);

    const [
      sales,
      expenses,
    ] = await Promise.all([
      Sale.find(
        saleFilter
      )
        .sort({
          createdAt: -1,
        })
        .lean(),

      Expense.find(
        expenseFilter
      )
        .sort({
          expenseDate: -1,
        })
        .lean(),
    ]);

    const activeSales =
      sales.filter(
        (sale) =>
          sale.status !==
          "CANCELLED"
      );

    /*
     * Revenue
     */
    const revenue =
      activeSales.reduce(
        (sum, sale) =>
          sum +
          numberValue(
            sale.total
          ),
        0
      );

    /*
     * Discounts
     */
    const discounts =
      activeSales.reduce(
        (sum, sale) =>
          sum +
          numberValue(
            sale.discount
          ),
        0
      );

    /*
     * Expenses
     */
    const totalExpenses =
      expenses.reduce(
        (sum, expense) =>
          sum +
          numberValue(
            expense.amount
          ),
        0
      );

    /*
     * Cost of goods sold
     */
    let costOfGoodsSold = 0;

    for (const sale of activeSales) {
      if (
        !Array.isArray(
          sale.items
        )
      ) {
        continue;
      }

      for (const item of sale.items) {
        costOfGoodsSold +=
          numberValue(
            item.quantity
          ) *
          numberValue(
            item.buyingPrice
          );
      }
    }

    const grossProfit =
      revenue -
      costOfGoodsSold;

    const netProfit =
      grossProfit -
      totalExpenses;

    /*
     * Payment breakdown
     */
    const paymentMap = {};

    for (const sale of activeSales) {
      const method =
        sale.paymentMethod ||
        "UNKNOWN";

      if (
        !paymentMap[method]
      ) {
        paymentMap[method] = {
          paymentMethod:
            method,
          transactions: 0,
          amount: 0,
        };
      }

      paymentMap[method]
        .transactions += 1;

      paymentMap[method]
        .amount +=
        numberValue(
          sale.total
        );
    }

    /*
     * Recent transactions
     */
    const recentTransactions =
      activeSales
        .slice(0, 20)
        .map((sale) => ({
          _id: sale._id,

          receiptNumber:
            sale.receiptNumber,

          total:
            numberValue(
              sale.total
            ),

          subtotal:
            numberValue(
              sale.subtotal
            ),

          discount:
            numberValue(
              sale.discount
            ),

          paymentMethod:
            sale.paymentMethod,

          paymentStatus:
            sale.paymentStatus,

          status:
            sale.status,

          branchId:
            sale.branchId,

          cashierId:
            sale.cashierId,

          customerId:
            sale.customerId,

          items:
            Array.isArray(
              sale.items
            )
              ? sale.items.length
              : 0,

          createdAt:
            sale.createdAt,
        }));

    return res.status(200).json({
      success: true,

      report: {
        period:
          getDateRange(req),

        summary: {
          revenue,
          discounts,
          costOfGoodsSold,
          grossProfit,
          totalExpenses,
          netProfit,

          transactions:
            activeSales.length,
        },

        paymentBreakdown:
          Object.values(
            paymentMap
          ),

        recentTransactions,
      },
    });
  } catch (error) {
    console.error(
      "Get general reports error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to load reports.",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| SALES REPORT
|--------------------------------------------------------------------------
|
| GET /api/reports/sales
|
*/

const getSalesReport = async (
  req,
  res
) => {
  try {
    const businessId =
      getBusinessId(req);

    if (!businessId) {
      return res.status(401).json({
        success: false,
        message:
          "Authenticated business could not be determined.",
      });
    }

    const filter =
      buildSaleFilter(req);

    const sales =
      await Sale.find(filter)
        .sort({
          createdAt: -1,
        })
        .lean();

    /*
     * Cancelled sales do not count
     * towards revenue.
     */
    const activeSales =
      sales.filter(
        (sale) =>
          sale.status !==
          "CANCELLED"
      );

    let revenue = 0;
    let subtotal = 0;
    let discounts = 0;

    /*
     * Payment breakdown
     */
    const paymentBreakdown = {};

    /*
     * Product performance
     */
    const productMap = {};

    /*
     * Daily sales
     */
    const dailyMap = {};

    for (const sale of activeSales) {
      const saleTotal =
        numberValue(
          sale.total
        );

      const saleSubtotal =
        numberValue(
          sale.subtotal
        );

      const saleDiscount =
        numberValue(
          sale.discount
        );

      revenue +=
        saleTotal;

      subtotal +=
        saleSubtotal;

      discounts +=
        saleDiscount;

      /*
       * Payment method
       */
      const paymentMethod =
        sale.paymentMethod ||
        "UNKNOWN";

      if (
        !paymentBreakdown[
          paymentMethod
        ]
      ) {
        paymentBreakdown[
          paymentMethod
        ] = {
          paymentMethod,
          transactions: 0,
          amount: 0,
        };
      }

      paymentBreakdown[
        paymentMethod
      ].transactions += 1;

      paymentBreakdown[
        paymentMethod
      ].amount +=
        saleTotal;

      /*
       * Daily sales
       */
      if (sale.createdAt) {
        const date =
          new Date(
            sale.createdAt
          );

        const dayKey =
          date
            .toISOString()
            .slice(0, 10);

        if (!dailyMap[dayKey]) {
          dailyMap[dayKey] = {
            date: dayKey,
            sales: 0,
            transactions: 0,
          };
        }

        dailyMap[dayKey]
          .sales +=
          saleTotal;

        dailyMap[dayKey]
          .transactions += 1;
      }

      /*
       * Product performance
       */
      if (
        Array.isArray(
          sale.items
        )
      ) {
        for (const item of sale.items) {
          const productKey =
            item.productId
              ? String(
                  item.productId
                )
              : String(
                  item.sku ||
                    item.name ||
                    "unknown"
                );

          if (
            !productMap[
              productKey
            ]
          ) {
            productMap[
              productKey
            ] = {
              productId:
                item.productId ||
                null,

              name:
                item.name ||
                "Unknown Product",

              sku:
                item.sku ||
                "",

              quantity: 0,

              revenue: 0,

              cost: 0,

              profit: 0,
            };
          }

          const quantity =
            numberValue(
              item.quantity
            );

          const unitPrice =
            numberValue(
              item.unitPrice
            );

          const buyingPrice =
            numberValue(
              item.buyingPrice
            );

          const itemRevenue =
            numberValue(
              item.subtotal
            ) ||
            quantity *
              unitPrice;

          const itemCost =
            quantity *
            buyingPrice;

          productMap[
            productKey
          ].quantity +=
            quantity;

          productMap[
            productKey
          ].revenue +=
            itemRevenue;

          productMap[
            productKey
          ].cost +=
            itemCost;

          productMap[
            productKey
          ].profit +=
            itemRevenue -
            itemCost;
        }
      }
    }

    /*
     * Product performance list
     */
    const productPerformance =
      Object.values(
        productMap
      ).sort(
        (a, b) =>
          b.revenue -
          a.revenue
      );

    /*
     * Gross profit
     */
    const grossProfit =
      productPerformance.reduce(
        (sum, product) =>
          sum +
          numberValue(
            product.profit
          ),
        0
      );

    /*
     * Daily sales list
     */
    const dailySales =
      Object.values(
        dailyMap
      ).sort((a, b) =>
        a.date.localeCompare(
          b.date
        )
      );

    /*
     * Recent transactions
     */
    const recentTransactions =
      activeSales
        .slice(0, 20)
        .map((sale) => ({
          _id: sale._id,

          receiptNumber:
            sale.receiptNumber,

          total:
            numberValue(
              sale.total
            ),

          subtotal:
            numberValue(
              sale.subtotal
            ),

          discount:
            numberValue(
              sale.discount
            ),

          paymentMethod:
            sale.paymentMethod,

          paymentStatus:
            sale.paymentStatus,

          status:
            sale.status,

          branchId:
            sale.branchId,

          cashierId:
            sale.cashierId,

          customerId:
            sale.customerId,

          items:
            Array.isArray(
              sale.items
            )
              ? sale.items.length
              : 0,

          createdAt:
            sale.createdAt,
        }));

    const summary = {
      revenue,

      subtotal,

      discounts,

      grossProfit,

      transactions:
        activeSales.length,

      averageTransaction:
        activeSales.length
          ? revenue /
            activeSales.length
          : 0,
    };

    return res.status(200).json({
      success: true,

      report: {
        period:
          getDateRange(req),

        summary,

        paymentBreakdown:
          Object.values(
            paymentBreakdown
          ),

        dailySales,

        productPerformance,

        recentTransactions,
      },

      /*
       * Top-level values are intentionally
       * included for compatibility with
       * different frontend report versions.
       */
      summary,

      sales:
        recentTransactions,

      paymentBreakdown:
        Object.values(
          paymentBreakdown
        ),

      dailySales,

      productPerformance,
    });
  } catch (error) {
    console.error(
      "Get sales report error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to load sales report.",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| PAYMENT REPORT
|--------------------------------------------------------------------------
|
| GET /api/reports/payments
|
*/

const getPaymentReport = async (
  req,
  res
) => {
  try {
    const businessId =
      getBusinessId(req);

    if (!businessId) {
      return res.status(401).json({
        success: false,
        message:
          "Authenticated business could not be determined.",
      });
    }

    const filter =
      buildSaleFilter(req);

    const sales =
      await Sale.find(filter)
        .sort({
          createdAt: -1,
        })
        .lean();

    const activeSales =
      sales.filter(
        (sale) =>
          sale.status !==
          "CANCELLED"
      );

    const paymentMap = {};

    let totalAmount = 0;

    let totalTransactions = 0;

    for (const sale of activeSales) {
      const paymentMethod =
        sale.paymentMethod ||
        "UNKNOWN";

      const amount =
        numberValue(
          sale.total
        );

      if (
        !paymentMap[
          paymentMethod
        ]
      ) {
        paymentMap[
          paymentMethod
        ] = {
          paymentMethod,
          transactions: 0,
          amount: 0,
        };
      }

      paymentMap[
        paymentMethod
      ].transactions += 1;

      paymentMap[
        paymentMethod
      ].amount += amount;

      totalAmount +=
        amount;

      totalTransactions +=
        1;
    }

    const payments =
      Object.values(
        paymentMap
      ).map((payment) => ({
        ...payment,

        percentage:
          totalAmount > 0
            ? (
                (payment.amount /
                  totalAmount) *
                100
              )
            : 0,
      }));

    return res.status(200).json({
      success: true,

      report: {
        period:
          getDateRange(req),

        summary: {
          totalAmount,

          totalTransactions,
        },

        payments,
      },

      summary: {
        totalAmount,

        totalTransactions,
      },

      payments,
    });
  } catch (error) {
    console.error(
      "Get payment report error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to load payment report.",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| PAYMENT REPORT ALIAS
|--------------------------------------------------------------------------
|
| Some existing MOVA routes use:
|
| getPaymentsReport
|
| while the report route uses:
|
| getPaymentReport
|
| Keep both names so existing routes
| continue to work.
|
*/

const getPaymentsReport =
  getPaymentReport;

/*
|--------------------------------------------------------------------------
| EXPENSE REPORT
|--------------------------------------------------------------------------
|
| GET /api/reports/expenses
|
*/

const getExpenseReport = async (
  req,
  res
) => {
  try {
    const businessId =
      getBusinessId(req);

    if (!businessId) {
      return res.status(401).json({
        success: false,
        message:
          "Authenticated business could not be determined.",
      });
    }

    const filter =
      buildExpenseFilter(req);

    const expenses =
      await Expense.find(filter)
        .sort({
          expenseDate: -1,
        })
        .lean();

    let totalExpenses = 0;

    const categoryMap = {};

    const paymentMap = {};

    const dailyMap = {};

    for (const expense of expenses) {
      const amount =
        numberValue(
          expense.amount
        );

      totalExpenses +=
        amount;

      /*
       * Category
       */
      const category =
        expense.category ||
        "Uncategorized";

      if (
        !categoryMap[
          category
        ]
      ) {
        categoryMap[
          category
        ] = {
          category,

          amount: 0,

          transactions: 0,
        };
      }

      categoryMap[
        category
      ].amount += amount;

      categoryMap[
        category
      ].transactions += 1;

      /*
       * Payment method
       */
      const paymentMethod =
        expense.paymentMethod ||
        "UNKNOWN";

      if (
        !paymentMap[
          paymentMethod
        ]
      ) {
        paymentMap[
          paymentMethod
        ] = {
          paymentMethod,

          amount: 0,

          transactions: 0,
        };
      }

      paymentMap[
        paymentMethod
      ].amount += amount;

      paymentMap[
        paymentMethod
      ].transactions += 1;

      /*
       * Daily expenses
       */
      if (
        expense.expenseDate
      ) {
        const date =
          new Date(
            expense.expenseDate
          );

        const dayKey =
          date
            .toISOString()
            .slice(0, 10);

        if (
          !dailyMap[dayKey]
        ) {
          dailyMap[dayKey] = {
            date: dayKey,

            amount: 0,

            transactions: 0,
          };
        }

        dailyMap[dayKey]
          .amount += amount;

        dailyMap[dayKey]
          .transactions += 1;
      }
    }

    const categoryBreakdown =
      Object.values(
        categoryMap
      ).sort(
        (a, b) =>
          b.amount -
          a.amount
      );

    const paymentBreakdown =
      Object.values(
        paymentMap
      ).sort(
        (a, b) =>
          b.amount -
          a.amount
      );

    const dailyExpenses =
      Object.values(
        dailyMap
      ).sort((a, b) =>
        a.date.localeCompare(
          b.date
        )
      );

    return res.status(200).json({
      success: true,

      report: {
        period:
          getDateRange(req),

        summary: {
          totalExpenses,

          transactions:
            expenses.length,
        },

        categoryBreakdown,

        paymentBreakdown,

        dailyExpenses,

        expenses,
      },

      summary: {
        totalExpenses,

        transactions:
          expenses.length,
      },

      categoryBreakdown,

      paymentBreakdown,

      dailyExpenses,

      expenses,
    });
  } catch (error) {
    console.error(
      "Get expense report error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to load expense report.",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| PROFIT REPORT
|--------------------------------------------------------------------------
|
| GET /api/reports/profit
|
| Revenue
|    -
| Cost of Goods Sold
|    =
| Gross Profit
|
| Gross Profit
|    -
| Operating Expenses
|    =
| Net Profit
|
*/

const getProfitReport = async (
  req,
  res
) => {
  try {
    const businessId =
      getBusinessId(req);

    if (!businessId) {
      return res.status(401).json({
        success: false,
        message:
          "Authenticated business could not be determined.",
      });
    }

    const saleFilter =
      buildSaleFilter(req);

    const expenseFilter =
      buildExpenseFilter(req);

    const [
      sales,
      expenses,
    ] = await Promise.all([
      Sale.find(
        saleFilter
      ).lean(),

      Expense.find(
        expenseFilter
      ).lean(),
    ]);

    const activeSales =
      sales.filter(
        (sale) =>
          sale.status !==
          "CANCELLED"
      );

    let revenue = 0;

    let costOfGoodsSold = 0;

    for (const sale of activeSales) {
      revenue +=
        numberValue(
          sale.total
        );

      if (
        !Array.isArray(
          sale.items
        )
      ) {
        continue;
      }

      for (const item of sale.items) {
        costOfGoodsSold +=
          numberValue(
            item.quantity
          ) *
          numberValue(
            item.buyingPrice
          );
      }
    }

    const totalExpenses =
      expenses.reduce(
        (sum, expense) =>
          sum +
          numberValue(
            expense.amount
          ),
        0
      );

    const grossProfit =
      revenue -
      costOfGoodsSold;

    const netProfit =
      grossProfit -
      totalExpenses;

    const grossMargin =
      revenue > 0
        ? (grossProfit /
            revenue) *
          100
        : 0;

    const netMargin =
      revenue > 0
        ? (netProfit /
            revenue) *
          100
        : 0;

    return res.status(200).json({
      success: true,

      report: {
        period:
          getDateRange(req),

        revenue,

        costOfGoodsSold,

        grossProfit,

        totalExpenses,

        netProfit,

        grossMargin,

        netMargin,

        transactions:
          activeSales.length,
      },

      revenue,

      costOfGoodsSold,

      grossProfit,

      totalExpenses,

      netProfit,

      grossMargin,

      netMargin,

      transactions:
        activeSales.length,
    });
  } catch (error) {
    console.error(
      "Get profit report error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to load profit report.",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| INVENTORY REPORT
|--------------------------------------------------------------------------
|
| GET /api/reports/inventory
|
| This report uses the sale data to show products sold
| during the selected period.
|
| It does not make assumptions about the structure of
| MOVA's inventory transaction model.
|
*/

const getInventoryReport =
  async (req, res) => {
    try {
      const businessId =
        getBusinessId(req);

      if (!businessId) {
        return res.status(401).json({
          success: false,
          message:
            "Authenticated business could not be determined.",
        });
      }

      const filter =
        buildSaleFilter(req);

      const sales =
        await Sale.find(
          filter
        ).lean();

      const productMap = {};

      for (const sale of sales) {
        if (
          sale.status ===
          "CANCELLED"
        ) {
          continue;
        }

        if (
          !Array.isArray(
            sale.items
          )
        ) {
          continue;
        }

        for (const item of sale.items) {
          const productKey =
            item.productId
              ? String(
                  item.productId
                )
              : String(
                  item.sku ||
                    item.name ||
                    "unknown"
                );

          if (
            !productMap[
              productKey
            ]
          ) {
            productMap[
              productKey
            ] = {
              productId:
                item.productId ||
                null,

              name:
                item.name ||
                "Unknown Product",

              sku:
                item.sku ||
                "",

              quantitySold: 0,

              salesValue: 0,
            };
          }

          productMap[
            productKey
          ].quantitySold +=
            numberValue(
              item.quantity
            );

          productMap[
            productKey
          ].salesValue +=
            numberValue(
              item.subtotal
            );
        }
      }

      const soldProducts =
        Object.values(
          productMap
        ).sort(
          (a, b) =>
            b.quantitySold -
            a.quantitySold
        );

      const totalUnitsSold =
        soldProducts.reduce(
          (sum, item) =>
            sum +
            numberValue(
              item.quantitySold
            ),
          0
        );

      const salesValue =
        soldProducts.reduce(
          (sum, item) =>
            sum +
            numberValue(
              item.salesValue
            ),
          0
        );

      return res.status(200).json({
        success: true,

        report: {
          period:
            getDateRange(req),

          summary: {
            productsSold:
              soldProducts.length,

            totalUnitsSold,

            salesValue,
          },

          soldProducts,
        },

        summary: {
          productsSold:
            soldProducts.length,

          totalUnitsSold,

          salesValue,
        },

        soldProducts,
      });
    } catch (error) {
      console.error(
        "Get inventory report error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to load inventory report.",
        error: error.message,
      });
    }
  };

/*
|--------------------------------------------------------------------------
| RECEIPT SETTINGS
|--------------------------------------------------------------------------
|
| These functions were previously stored inside reportController.js.
|
| They are retained here so existing receipt-related routes continue
| working without requiring us to create another controller right now.
|
*/

/*
 * GET /api/receipts/settings
 */
const getReceiptSettings =
  async (req, res) => {
    try {
      const businessId =
        req.user.businessId;

      const settings =
        await ReceiptSettings.findOne({
          businessId,
        });

      return res.status(200).json({
        success: true,

        settings:
          settings || null,
      });
    } catch (error) {
      console.error(
        "Get receipt settings error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Failed to load receipt settings",

        error: error.message,
      });
    }
  };

/*
 * PUT/PATCH receipt settings
 */
const updateReceiptSettings =
  async (req, res) => {
    try {
      const businessId =
        req.user.businessId;

      const {
        prefix,
        footerMessage,
        showLogo,
        showPhone,
        showAddress,
        showCashier,
      } = req.body;

      const updateData = {};

      /*
       * Prefix
       */
      if (
        prefix !== undefined
      ) {
        const normalizedPrefix =
          String(prefix)
            .trim()
            .toUpperCase();

        if (
          !normalizedPrefix
        ) {
          return res.status(400).json({
            success: false,

            message:
              "Receipt prefix cannot be empty",
          });
        }

        updateData.prefix =
          normalizedPrefix;
      }

      /*
       * Footer
       */
      if (
        footerMessage !==
        undefined
      ) {
        updateData.footerMessage =
          String(
            footerMessage
          ).trim();
      }

      /*
       * Logo
       */
      if (
        showLogo !== undefined
      ) {
        updateData.showLogo =
          Boolean(showLogo);
      }

      /*
       * Phone
       */
      if (
        showPhone !== undefined
      ) {
        updateData.showPhone =
          Boolean(showPhone);
      }

      /*
       * Address
       */
      if (
        showAddress !==
        undefined
      ) {
        updateData.showAddress =
          Boolean(showAddress);
      }

      /*
       * Cashier
       */
      if (
        showCashier !== undefined
      ) {
        updateData.showCashier =
          Boolean(showCashier);
      }

      const settings =
        await ReceiptSettings.findOneAndUpdate(
          {
            businessId,
          },

          {
            $set:
              updateData,

            $setOnInsert: {
              businessId,
            },
          },

          {
            new: true,

            upsert: true,

            runValidators: true,
          }
        );

      return res.status(200).json({
        success: true,

        message:
          "Receipt settings saved successfully",

        settings,
      });
    } catch (error) {
      console.error(
        "Update receipt settings error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Failed to save receipt settings",

        error: error.message,
      });
    }
  };

/*
|--------------------------------------------------------------------------
| EXPORTS
|--------------------------------------------------------------------------
*/

export {
  /*
   * General reports
   */
  getReports,

  /*
   * Sales
   */
  getSalesReport,

  /*
   * Payments
   *
   * Both names are exported because different existing
   * MOVA routes use different names.
   */
  getPaymentReport,
  getPaymentsReport,

  /*
   * Expenses
   */
  getExpenseReport,

  /*
   * Profit
   */
  getProfitReport,

  /*
   * Inventory
   */
  getInventoryReport,

  /*
   * Receipt settings
   */
  getReceiptSettings,
  updateReceiptSettings,
};
