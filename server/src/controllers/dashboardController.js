import Sale from "../models/Sale.js";
import Product from "../models/Product.js";
import Customer from "../models/Customer.js";
import Expense from "../models/Expense.js";

/*
|--------------------------------------------------------------------------
| HELPERS
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

const toNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
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
| SALE STATUS
|--------------------------------------------------------------------------
|
| Cancelled sales should not contribute to revenue.
|
*/

const getSaleStatus = (sale) => {
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
    getSaleStatus(sale) ===
    "CANCELLED"
  );
};

/*
|--------------------------------------------------------------------------
| SALE TOTAL
|--------------------------------------------------------------------------
*/

const getSaleTotal = (
  sale
) => {
  return toNumber(
    sale?.total ??
      sale?.grandTotal ??
      sale?.amount
  );
};

/*
|--------------------------------------------------------------------------
| REVENUE
|--------------------------------------------------------------------------
*/

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

/*
|--------------------------------------------------------------------------
| TRANSACTIONS
|--------------------------------------------------------------------------
*/

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
| PROFIT DATA
|--------------------------------------------------------------------------
|
| We only calculate gross profit when every sale item has a reliable
| cost/buying-price snapshot.
|
| This prevents MOVA from displaying fake profit.
|
*/

const calculateProfit = (
  sales
) => {
  let grossProfit = 0;

  let hasSales = false;

  let allCostsAvailable = true;

  for (const sale of sales) {
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
      allCostsAvailable = false;
      continue;
    }

    hasSales = true;

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

      const buyingPriceValue =
        item.buyingPrice ??
        item.costPrice ??
        item.cost ??
        item.purchasePrice ??
        item.unitCost;

      /*
      |----------------------------------------------------------------------
      | A cost must actually exist.
      |----------------------------------------------------------------------
      */

      if (
        buyingPriceValue ===
          undefined ||
        buyingPriceValue ===
          null ||
        buyingPriceValue === ""
      ) {
        allCostsAvailable =
          false;

        continue;
      }

      const buyingPrice =
        toNumber(
          buyingPriceValue
        );

      grossProfit +=
        (
          sellingPrice -
          buyingPrice
        ) *
        quantity;
    }
  }

  if (
    !hasSales ||
    !allCostsAvailable
  ) {
    return {
      available: false,
      value: 0,
    };
  }

  return {
    available: true,
    value: grossProfit,
  };
};

/*
|--------------------------------------------------------------------------
| PAYMENT BREAKDOWN
|--------------------------------------------------------------------------
*/

const buildPaymentBreakdown = (
  sales
) => {
  const breakdown = {};

  for (const sale of sales) {
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
      !breakdown[
        method
      ]
    ) {
      breakdown[
        method
      ] = 0;
    }

    breakdown[
      method
    ] += amount;
  }

  return breakdown;
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
      const businessId =
        getBusinessId(req);

      const branchId =
        getBranchId(req);

      if (!businessId) {
        return res.status(400).json({
          success: false,
          message:
            "Business context is missing.",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | CURRENT TIME
      |--------------------------------------------------------------------------
      */

      const now =
        new Date();

      /*
      |--------------------------------------------------------------------------
      | TODAY
      |--------------------------------------------------------------------------
      */

      const startOfToday =
        new Date(now);

      startOfToday.setHours(
        0,
        0,
        0,
        0
      );

      const endOfToday =
        new Date(
          startOfToday
        );

      endOfToday.setDate(
        endOfToday.getDate() +
          1
      );

      /*
      |--------------------------------------------------------------------------
      | CURRENT MONTH
      |--------------------------------------------------------------------------
      */

      const startOfMonth =
        new Date(
          now.getFullYear(),
          now.getMonth(),
          1
        );

      /*
      |--------------------------------------------------------------------------
      | PREVIOUS MONTH
      |--------------------------------------------------------------------------
      */

      const startOfPreviousMonth =
        new Date(
          now.getFullYear(),
          now.getMonth() -
            1,
          1
        );

      const endOfPreviousMonth =
        new Date(
          now.getFullYear(),
          now.getMonth(),
          1
        );

      /*
      |--------------------------------------------------------------------------
      | BASE FILTERS
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

      /*
      |--------------------------------------------------------------------------
      | BRANCH FILTER
      |--------------------------------------------------------------------------
      */

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

      /*
      |--------------------------------------------------------------------------
      | LOAD SALES
      |--------------------------------------------------------------------------
      */

      const [
        todaySales,
        monthSales,
        previousMonthSales,
        recentSales,
      ] =
        await Promise.all([
          Sale.find({
            ...saleFilter,

            createdAt:
              getDateRange(
                startOfToday,
                endOfToday
              ),
          })
            .lean(),

          Sale.find({
            ...saleFilter,

            createdAt:
              getDateRange(
                startOfMonth,
                now
              ),
          })
            .lean(),

          Sale.find({
            ...saleFilter,

            createdAt:
              getDateRange(
                startOfPreviousMonth,
                endOfPreviousMonth
              ),
          })
            .lean(),

          Sale.find(
            saleFilter
          )
            .sort({
              createdAt: -1,
            })
            .limit(8)
            .populate(
              "customerId",
              "name phone email"
            )
            .populate(
              "userId",
              "name email"
            )
            .lean(),
        ]);

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

      /*
      |--------------------------------------------------------------------------
      | TRANSACTIONS
      |--------------------------------------------------------------------------
      */

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

      const monthExpenses =
        await Expense.find({
          ...expenseFilter,

          createdAt:
            getDateRange(
              startOfMonth,
              now
            ),
        })
          .lean();

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
      | CUSTOMERS
      |--------------------------------------------------------------------------
      */

      const totalCustomers =
        await Customer.countDocuments(
          customerFilter
        );

      /*
      |--------------------------------------------------------------------------
      | PRODUCTS / LOW STOCK
      |--------------------------------------------------------------------------
      */

      const products =
        await Product.find(
          productFilter
        )
          .select(
            [
              "name",
              "sku",
              "stockQuantity",
              "minStock",
              "minimumStock",
              "reorderLevel",
              "trackStock",
              "categoryId",
              "price",
              "sellingPrice",
            ].join(" ")
          )
          .lean();

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
      | SEVEN-DAY SALES CHART
      |--------------------------------------------------------------------------
      */

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

        const start =
          new Date(
            date
          );

        start.setHours(
          0,
          0,
          0,
          0
        );

        const end =
          new Date(
            start
          );

        end.setDate(
          end.getDate() +
            1
        );

        const daySales =
          await Sale.find({
            ...saleFilter,

            createdAt:
              getDateRange(
                start,
                end
              ),
          })
            .select(
              "total grandTotal amount status"
            )
            .lean();

        const revenue =
          calculateRevenue(
            daySales
          );

        const transactions =
          calculateTransactions(
            daySales
          );

        salesChart.push({
          date:
            start
              .toISOString()
              .split(
                "T"
              )[0],

          label:
            start.toLocaleDateString(
              "en-UG",
              {
                weekday:
                  "short",
              }
            ),

          revenue,

          transactions,
        });
      }

      /*
      |--------------------------------------------------------------------------
      | PAYMENT BREAKDOWN
      |--------------------------------------------------------------------------
      */

      const paymentBreakdown =
        buildPaymentBreakdown(
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
      | RESPONSE
      |--------------------------------------------------------------------------
      */

      return res.status(200).json({
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
      });
    } catch (
      error
    ) {
      console.error(
        "Dashboard error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Unable to load dashboard data.",

        error:
          process.env.NODE_ENV ===
          "development"
            ? error.message
            : undefined,
      });
    }
  };