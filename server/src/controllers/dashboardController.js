import Sale from "../models/Sale.js";
import Product from "../models/Product.js";
import Customer from "../models/Customer.js";
import Expense from "../models/Expense.js";
import ProductBranchStock from "../models/ProductBranchStock.js";
import Business from "../models/Business.js";

/*
|--------------------------------------------------------------------------
| MOVA DASHBOARD CONTROLLER
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| CONTEXT HELPERS
|--------------------------------------------------------------------------
*/

const getBusinessId = (req) => {
  return (
    req.user?.businessId ||
    req.businessId ||
    null
  );
};

const getBranchId = (req) => {
  return (
    req.user?.activeBranchId ||
    req.user?.branchId ||
    null
  );
};

/*
|--------------------------------------------------------------------------
| NUMBER HELPERS
|--------------------------------------------------------------------------
*/

const toNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
};

/*
|--------------------------------------------------------------------------
| DATE HELPERS
|--------------------------------------------------------------------------
*/

const getTimeZoneParts = (date, timeZone) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  return Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)])
  );
};

const startOfCalendarDay = (year, month, day, timeZone) => {
  const localMidnightAsUtc = Date.UTC(year, month - 1, day);
  let timestamp = localMidnightAsUtc;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = getTimeZoneParts(new Date(timestamp), timeZone);
    const representedAsUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second
    );
    const adjustment = localMidnightAsUtc - representedAsUtc;

    timestamp += adjustment;

    if (adjustment === 0) break;
  }

  return new Date(timestamp);
};

const startOfDay = (date, timeZone) => {
  const parts = getTimeZoneParts(date, timeZone);
  return startOfCalendarDay(
    parts.year,
    parts.month,
    parts.day,
    timeZone
  );
};

const shiftCalendarDay = (date, days, timeZone) => {
  const parts = getTimeZoneParts(date, timeZone);
  const shifted = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day + days)
  );

  return startOfCalendarDay(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth() + 1,
    shifted.getUTCDate(),
    timeZone
  );
};

const getDateKey = (date, timeZone) => {
  const parts = getTimeZoneParts(date, timeZone);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
};

const getDateRange = (
  start,
  end
) => ({
  $gte: start,
  $lt: end,
});

/*
|--------------------------------------------------------------------------
| SALE HELPERS
|--------------------------------------------------------------------------
*/

const getSaleStatus = (
  sale
) => {
  return (
    sale?.status ||
    "COMPLETED"
  )
    .toString()
    .toUpperCase();
};

const isCancelledSale = (
  sale
) => {
  return (
    getSaleStatus(
      sale
    ) === "CANCELLED"
  );
};

const getSaleTotal = (
  sale
) => {
  return toNumber(
    sale?.total ??
      sale?.grandTotal ??
      sale?.amount
  );
};

const calculateRevenue = (
  sales
) => {
  return sales.reduce(
    (
      total,
      sale
    ) => {
      if (
        isCancelledSale(
          sale
        )
      ) {
        return total;
      }

      return (
        total +
        getSaleTotal(
          sale
        )
      );
    },
    0
  );
};

const calculateTransactions = (
  sales
) => {
  return sales.filter(
    (sale) =>
      !isCancelledSale(
        sale
      )
  ).length;
};

/*
|--------------------------------------------------------------------------
| PAYMENT BREAKDOWN
|--------------------------------------------------------------------------
*/

const calculatePaymentBreakdown =
  (
    sales
  ) => {
    const result = {};

    for (
      const sale of sales
    ) {
      if (
        isCancelledSale(
          sale
        )
      ) {
        continue;
      }

      const method =
        (
          sale.paymentMethod ||
          sale.paymentType ||
          "OTHER"
        )
          .toString()
          .toUpperCase();

      const amount =
        getSaleTotal(
          sale
        );

      if (
        !result[
          method
        ]
      ) {
        result[
          method
        ] = 0;
      }

      result[
        method
      ] += amount;
    }

    return result;
  };

/*
|--------------------------------------------------------------------------
| PROFIT
|--------------------------------------------------------------------------
|
| MOVA only reports profit when reliable cost information exists
| on every relevant sale item.
|
|--------------------------------------------------------------------------
*/

const calculateProfit = (
  sales
) => {
  let profit = 0;

  let salesFound = false;

  let costsAvailable = true;

  for (
    const sale of sales
  ) {
    if (
      isCancelledSale(
        sale
      )
    ) {
      continue;
    }

    if (
      !Array.isArray(
        sale.items
      ) ||
      sale.items.length === 0
    ) {
      costsAvailable = false;
      continue;
    }

    salesFound = true;

    for (
      const item of sale.items
    ) {
      const quantity =
        toNumber(
          item.quantity
        );

      const sellingPrice =
        toNumber(
          item.sellingPrice ??
            item.price ??
            item.unitPrice
        );

      const costValue =
        item.buyingPrice ??
        item.costPrice ??
        item.cost ??
        item.purchasePrice ??
        item.unitCost;

      if (
        costValue ===
          undefined ||
        costValue ===
          null ||
        costValue === ""
      ) {
        costsAvailable =
          false;

        continue;
      }

      const buyingPrice =
        toNumber(
          costValue
        );

      profit +=
        (
          sellingPrice -
          buyingPrice
        ) *
        quantity;
    }
  }

  if (
    !salesFound ||
    !costsAvailable
  ) {
    return {
      available: false,
      value: 0,
    };
  }

  return {
    available: true,
    value: profit,
  };
};

/*
|--------------------------------------------------------------------------
| DASHBOARD
|--------------------------------------------------------------------------
*/

export const getDashboard =
  async (
    req,
    res
  ) => {
    try {
      console.log(
        "========================================"
      );

      console.log(
        "MOVA DASHBOARD REQUEST"
      );

      console.log(
        "User:",
        req.user?._id ||
          req.user?.id ||
          "unknown"
      );

      console.log(
        "Business:",
        req.user?.businessId ||
          req.businessId ||
          "missing"
      );

      console.log(
        "Branch:",
        req.user?.activeBranchId ||
          req.user?.branchId ||
          req.query?.branchId ||
          "none"
      );

      /*
      |--------------------------------------------------------------------------
      | BUSINESS
      |--------------------------------------------------------------------------
      */

      const businessId =
        getBusinessId(req);

      if (!businessId) {
        console.error(
          "DASHBOARD ERROR: Business ID is missing."
        );

        return res.status(400).json({
          success: false,

          message:
            "Business context is missing.",
        });
      }

      const business = await Business.findById(businessId)
        .select("timezone")
        .lean();
      const timeZone = business?.timezone || "Africa/Kampala";

      /*
      |--------------------------------------------------------------------------
      | BRANCH
      |--------------------------------------------------------------------------
      */

      /*
       * Prefer the authenticated user's active branch.
       *
       * The frontend also sends branchId as a query parameter.
       * We only use that as a fallback.
       */

      const branchId =
        getBranchId(req) ||
        req.query?.branchId ||
        null;

      /*
      |--------------------------------------------------------------------------
      | CURRENT DATE
      |--------------------------------------------------------------------------
      */

      const now =
        new Date();

      const todayStart =
        startOfDay(
          now,
          timeZone
        );

      const tomorrowStart =
        shiftCalendarDay(
          now,
          1,
          timeZone
        );

      const currentDateParts = getTimeZoneParts(now, timeZone);
      const monthStart = startOfCalendarDay(
        currentDateParts.year,
        currentDateParts.month,
        1,
        timeZone
      );
      const previousMonthStart = startOfCalendarDay(
        currentDateParts.month === 1
          ? currentDateParts.year - 1
          : currentDateParts.year,
        currentDateParts.month === 1
          ? 12
          : currentDateParts.month - 1,
        1,
        timeZone
      );
      const previousMonthEnd = monthStart;

      /*
      |--------------------------------------------------------------------------
      | FILTERS
      |--------------------------------------------------------------------------
      */

      const saleFilter = {
        businessId,
      };

      const expenseFilter = {
        businessId,
      };

      const productFilter = {
        businessId,
        isActive: true,
      };

      const customerFilter = {
        businessId,
      };

      if (branchId) {
        saleFilter.branchId =
          branchId;

        expenseFilter.branchId =
          branchId;

        customerFilter.branchId =
          branchId;
      }

      console.log(
        "Dashboard filters:",
        {
          saleFilter,
          expenseFilter,
          productFilter,
          customerFilter,
        }
      );

      /*
      |--------------------------------------------------------------------------
      | SALES
      |--------------------------------------------------------------------------
      */

      console.log(
        "Dashboard: loading today's sales..."
      );

      const todaySales =
        await Sale.find({
          ...saleFilter,

          createdAt:
            getDateRange(
              todayStart,
              tomorrowStart
            ),
        }).lean();

      console.log(
        "Dashboard: today's sales:",
        todaySales.length
      );

      /*
      |--------------------------------------------------------------------------
      | MONTH SALES
      |--------------------------------------------------------------------------
      */

      console.log(
        "Dashboard: loading monthly sales..."
      );

      const monthSales =
        await Sale.find({
          ...saleFilter,

          createdAt:
            getDateRange(
              monthStart,
              now
            ),
        }).lean();

      console.log(
        "Dashboard: monthly sales:",
        monthSales.length
      );

      /*
      |--------------------------------------------------------------------------
      | PREVIOUS MONTH SALES
      |--------------------------------------------------------------------------
      */

      console.log(
        "Dashboard: loading previous month sales..."
      );

      const previousMonthSales =
        await Sale.find({
          ...saleFilter,

          createdAt:
            getDateRange(
              previousMonthStart,
              previousMonthEnd
            ),
        }).lean();

      console.log(
        "Dashboard: previous month sales:",
        previousMonthSales.length
      );

      /*
      |--------------------------------------------------------------------------
      | RECENT SALES
      |--------------------------------------------------------------------------
      |
      | IMPORTANT:
      | We deliberately do not populate customerId/userId here.
      |
      | If the Sale schema has a different relationship configuration,
      | Mongoose populate can throw a 500 and break the entire dashboard.
      |
      */

      console.log(
        "Dashboard: loading recent sales..."
      );

      const recentSales =
        await Sale.find(
          saleFilter
        )
          .sort({
            createdAt: -1,
          })
          .limit(8)
          .lean();

      console.log(
        "Dashboard: recent sales:",
        recentSales.length
      );

      /*
      |--------------------------------------------------------------------------
      | REVENUE
      |--------------------------------------------------------------------------
      */

      const todayRevenue =
        calculateRevenue(
          todaySales
        );

      const monthRevenue =
        calculateRevenue(
          monthSales
        );

      const previousMonthRevenue =
        calculateRevenue(
          previousMonthSales
        );

      const todayTransactions =
        calculateTransactions(
          todaySales
        );

      const monthTransactions =
        calculateTransactions(
          monthSales
        );

      /*
      |--------------------------------------------------------------------------
      | EXPENSES
      |--------------------------------------------------------------------------
      */

      console.log(
        "Dashboard: loading expenses..."
      );

      const monthExpenses =
        await Expense.find({
          ...expenseFilter,

          createdAt:
            getDateRange(
              monthStart,
              now
            ),
        }).lean();

      console.log(
        "Dashboard: expenses:",
        monthExpenses.length
      );

      const totalExpenses =
        monthExpenses.reduce(
          (
            total,
            expense
          ) => {
            return (
              total +
              toNumber(
                expense.amount ??
                  expense.total ??
                  expense.cost
              )
            );
          },
          0
        );

      /*
      |--------------------------------------------------------------------------
      | CUSTOMERS
      |--------------------------------------------------------------------------
      */

      console.log(
        "Dashboard: loading customers..."
      );

      const totalCustomers =
        await Customer.countDocuments(
          customerFilter
        );

      console.log(
        "Dashboard: customers:",
        totalCustomers
      );

      /*
      |--------------------------------------------------------------------------
      | PRODUCTS
      |--------------------------------------------------------------------------
      */

      console.log(
        "Dashboard: loading products..."
      );

      const products =
        await Product.find(
          productFilter
        )
          .select(
            "name sku stockQuantity minStock minimumStock reorderLevel trackStock categoryId price sellingPrice"
          )
          .lean();

      const branchStocks = branchId
        ? await ProductBranchStock.find({
            businessId,
            branchId,
            isActive: true,
          })
            .select("productId stockQuantity minimumStock")
            .lean()
        : [];
      const branchStockByProduct = new Map(
        branchStocks.map((stock) => [
          String(stock.productId),
          stock,
        ])
      );

      const productsWithCurrentStock = products.map((product) => {
        const branchStock = branchStockByProduct.get(
          String(product._id)
        );

        if (!branchId) return product;

        return {
          ...product,
          stockQuantity: branchStock?.stockQuantity ?? 0,
          minimumStock:
            branchStock?.minimumStock ??
            product.minimumStock ??
            product.minStock ??
            product.reorderLevel ??
            0,
        };
      });

      console.log(
        "Dashboard: products:",
        products.length
      );

      /*
      |--------------------------------------------------------------------------
      | LOW STOCK
      |--------------------------------------------------------------------------
      */

      const lowStockProducts =
        productsWithCurrentStock
          .filter(
            (
              product
            ) => {
              if (
                product.trackStock ===
                false
              ) {
                return false;
              }

              const stock =
                toNumber(
                  product.stockQuantity
                );

              const minimumStock =
                toNumber(
                  product.minStock ??
                    product.minimumStock ??
                    product.reorderLevel ??
                    0
                );

              return (
                stock <=
                minimumStock
              );
            }
          )
          .sort(
            (
              a,
              b
            ) =>
              toNumber(
                a.stockQuantity
              ) -
              toNumber(
                b.stockQuantity
              )
          )
          .slice(
            0,
            10
          );

      /*
      |--------------------------------------------------------------------------
      | SALES CHART
      |--------------------------------------------------------------------------
      */

      console.log(
        "Dashboard: building seven-day chart..."
      );

      const salesChart =
        [];

      for (
        let index = 6;
        index >= 0;
        index--
      ) {
        const date = shiftCalendarDay(
          now,
          -index,
          timeZone
        );

        const dayStart =
          startOfDay(
            date,
            timeZone
          );

        const dayEnd =
          shiftCalendarDay(
            date,
            1,
            timeZone
          );

        const daySales =
          await Sale.find({
            ...saleFilter,

            createdAt:
              getDateRange(
                dayStart,
                dayEnd
              ),
          })
            .select(
              "total grandTotal amount status"
            )
            .lean();

        salesChart.push({
          date:
            getDateKey(dayStart, timeZone),

          label:
            dayStart.toLocaleDateString(
              "en-UG",
              {
                timeZone,
                weekday: "short",
              }
            ),

          revenue:
            calculateRevenue(
              daySales
            ),

          transactions:
            calculateTransactions(
              daySales
            ),
        });
      }

      /*
      |--------------------------------------------------------------------------
      | PAYMENT BREAKDOWN
      |--------------------------------------------------------------------------
      */

      const paymentBreakdown =
        calculatePaymentBreakdown(
          monthSales
        );

      /*
      |--------------------------------------------------------------------------
      | REVENUE CHANGE
      |--------------------------------------------------------------------------
      */

      let revenueChange =
        0;

      if (
        previousMonthRevenue !==
        0
      ) {
        revenueChange =
          (
            (
              monthRevenue -
              previousMonthRevenue
            ) /
            Math.abs(
              previousMonthRevenue
            )
          ) *
          100;
      }

      /*
      |--------------------------------------------------------------------------
      | PROFIT
      |--------------------------------------------------------------------------
      */

      const profit =
        calculateProfit(
          monthSales
        );

      const grossProfit =
        profit.available
          ? profit.value
          : 0;

      const netProfit =
        profit.available
          ? grossProfit -
            totalExpenses
          : 0;

      /*
      |--------------------------------------------------------------------------
      | RESPONSE
      |--------------------------------------------------------------------------
      */

      const responseData = {
        success: true,

        businessId,

        branchId,

        generatedAt:
          new Date().toISOString(),

        stats: {
          todaySales:
            todayRevenue,

          todayRevenue,

          monthSales:
            monthRevenue,

          monthRevenue,

          todayTransactions,

          monthTransactions,

          totalCustomers,

          totalExpenses,

          grossProfit,

          netProfit,

          revenueChange,

          profitDataAvailable:
            profit.available,
        },

        summary: {
          revenue:
            monthRevenue,

          expenses:
            totalExpenses,

          grossProfit:
            profit.available
              ? grossProfit
              : null,

          netProfit:
            profit.available
              ? netProfit
              : null,

          transactions:
            monthTransactions,

          customers:
            totalCustomers,

          lowStock:
            lowStockProducts.length,

          profitDataAvailable:
            profit.available,
        },

        recentSales,

        lowStockProducts,

        salesChart,

        paymentBreakdown,
      };

      console.log(
        "Dashboard successfully generated:",
        {
          todayRevenue,
          monthRevenue,
          totalExpenses,
          totalCustomers,
          lowStock:
            lowStockProducts.length,
        }
      );

      console.log(
        "========================================"
      );

      return res.status(200).json(
        responseData
      );
    } catch (
      error
    ) {
      console.error(
        "========================================"
      );

      console.error(
        "MOVA DASHBOARD ERROR"
      );

      console.error(
        "Message:",
        error?.message
      );

      console.error(
        "Name:",
        error?.name
      );

      console.error(
        "Stack:",
        error?.stack
      );

      console.error(
        "========================================"
      );

      return res.status(500).json({
        success: false,

        message:
          "Unable to load dashboard data.",

        error:
          error?.message ||
          "Unknown dashboard error.",

        errorName:
          error?.name ||
          "UnknownError",
      });
    }
  };
