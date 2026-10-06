import Sale from "../models/Sale.js";
import Product from "../models/Product.js";
import Customer from "../models/Customer.js";
import Expense from "../models/Expense.js";

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

const startOfDay = (date) => {
  const result = new Date(date);

  result.setHours(
    0,
    0,
    0,
    0
  );

  return result;
};

const endOfDay = (date) => {
  const result = startOfDay(date);

  result.setDate(
    result.getDate() + 1
  );

  return result;
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
          now
        );

      const tomorrowStart =
        endOfDay(
          now
        );

      const monthStart =
        new Date(
          now.getFullYear(),
          now.getMonth(),
          1
        );

      const previousMonthStart =
        new Date(
          now.getFullYear(),
          now.getMonth() -
            1,
          1
        );

      const previousMonthEnd =
        new Date(
          now.getFullYear(),
          now.getMonth(),
          1
        );

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
      };

      const customerFilter = {
        businessId,
      };

      if (branchId) {
        saleFilter.branchId =
          branchId;

        expenseFilter.branchId =
          branchId;

        productFilter.branchId =
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
        products
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
        const date =
          new Date(
            now
          );

        date.setDate(
          now.getDate() -
            index
        );

        const dayStart =
          startOfDay(
            date
          );

        const dayEnd =
          endOfDay(
            date
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
            dayStart
              .toISOString()
              .split(
                "T"
              )[0],

          label:
            dayStart.toLocaleDateString(
              "en-UG",
              {
                weekday:
                  "short",
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