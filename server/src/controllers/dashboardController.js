import Sale from "../models/Sale.js";
import Payment from "../models/Payment.js";
import Expense from "../models/Expense.js";
import Product from "../models/Product.js";

/*
|--------------------------------------------------------------------------
| DASHBOARD OVERVIEW
|--------------------------------------------------------------------------
*/

export const getDashboardOverview = async (req, res) => {
  try {
    /*
    |--------------------------------------------------------------------------
    | USER / BUSINESS / BRANCH
    |--------------------------------------------------------------------------
    */

    const businessId = req.user.businessId;

    /*
     * MOVA supports branches.
     *
     * Depending on the authentication structure, the active branch may be
     * stored as activeBranchId or branchId.
     */
    const branchId =
      req.user.activeBranchId ||
      req.user.branchId ||
      null;

    /*
    |--------------------------------------------------------------------------
    | COMMON FILTERS
    |--------------------------------------------------------------------------
    */

    const saleFilter = {
      businessId,
      ...(branchId ? { branchId } : {}),
    };

    const paymentFilter = {
      businessId,
      ...(branchId ? { branchId } : {}),
    };

    const expenseFilter = {
      businessId,
      ...(branchId ? { branchId } : {}),
    };

    /*
    |--------------------------------------------------------------------------
    | DATE RANGES
    |--------------------------------------------------------------------------
    */

    const now = new Date();

    // Start of today
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    // End of today
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    // Start of current month
    const startOfMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
      0,
      0,
      0,
      0
    );

    // End of current month
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );

    /*
    |--------------------------------------------------------------------------
    | SALES
    |--------------------------------------------------------------------------
    */

    const [
      todaySales,
      monthSales,
      totalSales,
    ] = await Promise.all([
      Sale.find({
        ...saleFilter,

        status: {
          $in: [
            "COMPLETED",
            "PARTIALLY_REFUNDED",
          ],
        },

        createdAt: {
          $gte: startOfToday,
          $lte: endOfToday,
        },
      }),

      Sale.find({
        ...saleFilter,

        status: {
          $in: [
            "COMPLETED",
            "PARTIALLY_REFUNDED",
          ],
        },

        createdAt: {
          $gte: startOfMonth,
          $lte: endOfMonth,
        },
      }),

      Sale.countDocuments({
        ...saleFilter,

        status: {
          $in: [
            "COMPLETED",
            "PARTIALLY_REFUNDED",
          ],
        },
      }),
    ]);

    /*
    |--------------------------------------------------------------------------
    | SALES TOTALS
    |--------------------------------------------------------------------------
    */

    const todaySalesAmount = todaySales.reduce(
      (sum, sale) => {
        return (
          sum +
          Number(sale.total || 0)
        );
      },
      0
    );

    const monthSalesAmount = monthSales.reduce(
      (sum, sale) => {
        return (
          sum +
          Number(sale.total || 0)
        );
      },
      0
    );

    /*
    |--------------------------------------------------------------------------
    | PAYMENTS
    |--------------------------------------------------------------------------
    */

    const todayPayments = await Payment.find({
      ...paymentFilter,

      status: "COMPLETED",

      paymentDate: {
        $gte: startOfToday,
        $lte: endOfToday,
      },
    });

    const monthPayments = await Payment.find({
      ...paymentFilter,

      status: "COMPLETED",

      paymentDate: {
        $gte: startOfMonth,
        $lte: endOfMonth,
      },
    });

    /*
    |--------------------------------------------------------------------------
    | PAYMENT TOTALS
    |--------------------------------------------------------------------------
    */

    const todayPaymentAmount =
      todayPayments.reduce(
        (sum, payment) => {
          return (
            sum +
            Number(payment.amount || 0)
          );
        },
        0
      );

    const monthPaymentAmount =
      monthPayments.reduce(
        (sum, payment) => {
          return (
            sum +
            Number(payment.amount || 0)
          );
        },
        0
      );

    /*
    |--------------------------------------------------------------------------
    | EXPENSES
    |--------------------------------------------------------------------------
    */

    const todayExpenses = await Expense.find({
      ...expenseFilter,

      status: "ACTIVE",

      expenseDate: {
        $gte: startOfToday,
        $lte: endOfToday,
      },
    });

    const monthExpenses = await Expense.find({
      ...expenseFilter,

      status: "ACTIVE",

      expenseDate: {
        $gte: startOfMonth,
        $lte: endOfMonth,
      },
    });

    /*
    |--------------------------------------------------------------------------
    | EXPENSE TOTALS
    |--------------------------------------------------------------------------
    */

    const todayExpenseAmount =
      todayExpenses.reduce(
        (sum, expense) => {
          return (
            sum +
            Number(expense.amount || 0)
          );
        },
        0
      );

    const monthExpenseAmount =
      monthExpenses.reduce(
        (sum, expense) => {
          return (
            sum +
            Number(expense.amount || 0)
          );
        },
        0
      );

    /*
    |--------------------------------------------------------------------------
    | GROSS PROFIT
    |--------------------------------------------------------------------------
    */

    const calculateGrossProfit = (sales) => {
      return sales.reduce(
        (sum, sale) => {
          const items = Array.isArray(
            sale.items
          )
            ? sale.items
            : [];

          const cost = items.reduce(
            (itemSum, item) => {
              return (
                itemSum +
                Number(
                  item.buyingPrice || 0
                ) *
                  Number(
                    item.quantity || 0
                  )
              );
            },
            0
          );

          const revenue = Number(
            sale.total || 0
          );

          return (
            sum +
            (revenue - cost)
          );
        },
        0
      );
    };

    const todayGrossProfit =
      calculateGrossProfit(todaySales);

    const monthGrossProfit =
      calculateGrossProfit(monthSales);

    /*
    |--------------------------------------------------------------------------
    | NET PROFIT
    |--------------------------------------------------------------------------
    */

    const todayNetProfit =
      todayGrossProfit -
      todayExpenseAmount;

    const monthNetProfit =
      monthGrossProfit -
      monthExpenseAmount;

    /*
    |--------------------------------------------------------------------------
    | PRODUCTS
    |--------------------------------------------------------------------------
    |
    | NOTE:
    | The current Product.stockQuantity is retained here temporarily.
    |
    | Your POS is using branch stock, so we will replace this section with
    | ProductBranchStock once we connect the exact branch-stock model.
    |
    */

    const products = await Product.find({
      businessId,
      isActive: true,
    }).select(
      "name sku buyingPrice sellingPrice stockQuantity minimumStock trackStock"
    );

    /*
    |--------------------------------------------------------------------------
    | INVENTORY VALUE
    |--------------------------------------------------------------------------
    */

    const inventoryValue =
      products.reduce(
        (sum, product) => {
          return (
            sum +
            Number(
              product.buyingPrice || 0
            ) *
              Number(
                product.stockQuantity || 0
              )
          );
        },
        0
      );

    /*
    |--------------------------------------------------------------------------
    | LOW STOCK
    |--------------------------------------------------------------------------
    */

    const lowStockProducts =
      products.filter(
        (product) => {
          if (!product.trackStock) {
            return false;
          }

          return (
            Number(
              product.stockQuantity || 0
            ) <=
            Number(
              product.minimumStock || 0
            )
          );
        }
      );

    /*
    |--------------------------------------------------------------------------
    | PRODUCTS SOLD TODAY
    |--------------------------------------------------------------------------
    */

    const productsSoldToday =
      todaySales.reduce(
        (sum, sale) => {
          const items = Array.isArray(
            sale.items
          )
            ? sale.items
            : [];

          const quantity =
            items.reduce(
              (itemSum, item) => {
                return (
                  itemSum +
                  Number(
                    item.quantity || 0
                  )
                );
              },
              0
            );

          return sum + quantity;
        },
        0
      );

    /*
    |--------------------------------------------------------------------------
    | PAYMENT METHOD BREAKDOWN
    |--------------------------------------------------------------------------
    */

    const paymentBreakdown = {
      CASH: 0,
      MOBILE_MONEY: 0,
      CARD: 0,
      BANK: 0,
    };

    todayPayments.forEach(
      (payment) => {
        const method =
          payment.paymentMethod;

        if (
          Object.prototype.hasOwnProperty.call(
            paymentBreakdown,
            method
          )
        ) {
          paymentBreakdown[method] +=
            Number(
              payment.amount || 0
            );
        }
      }
    );

    /*
    |--------------------------------------------------------------------------
    | RECENT SALES
    |--------------------------------------------------------------------------
    */

    const recentSales =
      await Sale.find({
        ...saleFilter,
      })
        .populate(
          "customerId",
          "name phone"
        )
        .populate(
          "cashierId",
          "name"
        )
        .sort({
          createdAt: -1,
        })
        .limit(8);

    /*
    |--------------------------------------------------------------------------
    | RESPONSE
    |--------------------------------------------------------------------------
    */

    return res.json({
      success: true,

      overview: {
        today: {
          sales:
            todaySalesAmount,

          payments:
            todayPaymentAmount,

          expenses:
            todayExpenseAmount,

          grossProfit:
            todayGrossProfit,

          netProfit:
            todayNetProfit,

          productsSold:
            productsSoldToday,
        },

        month: {
          sales:
            monthSalesAmount,

          payments:
            monthPaymentAmount,

          expenses:
            monthExpenseAmount,

          grossProfit:
            monthGrossProfit,

          netProfit:
            monthNetProfit,
        },

        inventory: {
          totalProducts:
            products.length,

          inventoryValue,

          lowStockCount:
            lowStockProducts.length,

          lowStockProducts:
            lowStockProducts
              .slice(0, 10)
              .map(
                (product) => ({
                  id:
                    product._id,

                  name:
                    product.name,

                  sku:
                    product.sku,

                  stock:
                    product.stockQuantity,

                  minimumStock:
                    product.minimumStock,
                })
              ),
        },

        paymentBreakdown,

        totalSales,

        recentSales,
      },
    });
  } catch (error) {
    console.error(
      "Dashboard overview error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Failed to load dashboard data.",

      error:
        process.env.NODE_ENV ===
        "development"
          ? error.message
          : undefined,
    });
  }
};