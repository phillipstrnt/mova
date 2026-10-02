import Sale from "../models/Sale.js";
import Payment from "../models/Payment.js";
import Expense from "../models/Expense.js";
import Product from "../models/Product.js";
import InventoryTransaction from "../models/InventoryTransaction.js";

/*
|--------------------------------------------------------------------------
| DASHBOARD OVERVIEW
|--------------------------------------------------------------------------
*/

export const getDashboardOverview = async (
  req,
  res
) => {
  try {
    const businessId =
      req.user.businessId;

    const now = new Date();

    /*
    |--------------------------------------------------------------------------
    | TODAY RANGE
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
      new Date(now);

    endOfToday.setHours(
      23,
      59,
      59,
      999
    );

    /*
    |--------------------------------------------------------------------------
    | MONTH RANGE
    |--------------------------------------------------------------------------
    */

    const startOfMonth =
      new Date(
        now.getFullYear(),
        now.getMonth(),
        1
      );

    const endOfMonth =
      new Date(
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
        businessId,
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
        businessId,
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
        businessId,
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

    const todaySalesAmount =
      todaySales.reduce(
        (sum, sale) =>
          sum +
          Number(sale.total || 0),
        0
      );

    const monthSalesAmount =
      monthSales.reduce(
        (sum, sale) =>
          sum +
          Number(sale.total || 0),
        0
      );

    /*
    |--------------------------------------------------------------------------
    | PAYMENTS
    |--------------------------------------------------------------------------
    */

    const todayPayments =
      await Payment.find({
        businessId,

        status: "COMPLETED",

        paymentDate: {
          $gte: startOfToday,
          $lte: endOfToday,
        },
      });

    const todayPaymentAmount =
      todayPayments.reduce(
        (sum, payment) =>
          sum +
          Number(
            payment.amount || 0
          ),
        0
      );

    /*
    |--------------------------------------------------------------------------
    | MONTH PAYMENTS
    |--------------------------------------------------------------------------
    */

    const monthPayments =
      await Payment.find({
        businessId,

        status: "COMPLETED",

        paymentDate: {
          $gte: startOfMonth,
          $lte: endOfMonth,
        },
      });

    const monthPaymentAmount =
      monthPayments.reduce(
        (sum, payment) =>
          sum +
          Number(
            payment.amount || 0
          ),
        0
      );

    /*
    |--------------------------------------------------------------------------
    | EXPENSES
    |--------------------------------------------------------------------------
    */

    const todayExpenses =
      await Expense.find({
        businessId,

        status: "ACTIVE",

        expenseDate: {
          $gte: startOfToday,
          $lte: endOfToday,
        },
      });

    const monthExpenses =
      await Expense.find({
        businessId,

        status: "ACTIVE",

        expenseDate: {
          $gte: startOfMonth,
          $lte: endOfMonth,
        },
      });

    const todayExpenseAmount =
      todayExpenses.reduce(
        (sum, expense) =>
          sum +
          Number(
            expense.amount || 0
          ),
        0
      );

    const monthExpenseAmount =
      monthExpenses.reduce(
        (sum, expense) =>
          sum +
          Number(
            expense.amount || 0
          ),
        0
      );

    /*
    |--------------------------------------------------------------------------
    | GROSS PROFIT
    |--------------------------------------------------------------------------
    */

    const todayGrossProfit =
      todaySales.reduce(
        (sum, sale) => {
          const cost =
            sale.items.reduce(
              (
                itemSum,
                item
              ) =>
                itemSum +
                Number(
                  item.buyingPrice ||
                    0
                ) *
                  Number(
                    item.quantity ||
                      0
                  ),
              0
            );

          return (
            sum +
            (Number(
              sale.total || 0
            ) -
              cost)
          );
        },
        0
      );

    const monthGrossProfit =
      monthSales.reduce(
        (sum, sale) => {
          const cost =
            sale.items.reduce(
              (
                itemSum,
                item
              ) =>
                itemSum +
                Number(
                  item.buyingPrice ||
                    0
                ) *
                  Number(
                    item.quantity ||
                      0
                  ),
              0
            );

          return (
            sum +
            (Number(
              sale.total || 0
            ) -
              cost)
          );
        },
        0
      );

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
    | INVENTORY
    |--------------------------------------------------------------------------
    */

    const products =
      await Product.find({
        businessId,
        isActive: true,
      }).select(
        "name sku buyingPrice sellingPrice stockQuantity minimumStock trackStock"
      );

    const inventoryValue =
      products.reduce(
        (sum, product) =>
          sum +
          Number(
            product.buyingPrice || 0
          ) *
            Number(
              product.stockQuantity ||
                0
            ),
        0
      );

    const lowStockProducts =
      products.filter(
        (product) =>
          product.trackStock &&
          product.stockQuantity <=
            product.minimumStock
      );

    /*
    |--------------------------------------------------------------------------
    | PRODUCTS SOLD TODAY
    |--------------------------------------------------------------------------
    */

    const productsSoldToday =
      todaySales.reduce(
        (sum, sale) =>
          sum +
          sale.items.reduce(
            (
              itemSum,
              item
            ) =>
              itemSum +
              Number(
                item.quantity || 0
              ),
            0
          ),
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
        if (
          paymentBreakdown[
            payment.paymentMethod
          ] !== undefined
        ) {
          paymentBreakdown[
            payment.paymentMethod
          ] += Number(
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
        businessId,
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
    });
  }
};