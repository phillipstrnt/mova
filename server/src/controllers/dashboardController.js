import Sale from "../models/Sale.js";
import Payment from "../models/Payment.js";
import Expense from "../models/Expense.js";
import Product from "../models/Product.js";

/* =======================================================
   HELPERS
======================================================= */

const toNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
};

const getStartOfDay = (date = new Date()) => {
  const start = new Date(date);

  start.setHours(0, 0, 0, 0);

  return start;
};

const getEndOfDay = (date = new Date()) => {
  const end = new Date(date);

  end.setHours(23, 59, 59, 999);

  return end;
};

const getStartOfMonth = (date = new Date()) => {
  const start = new Date(date);

  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  return start;
};

const getEndOfMonth = (date = new Date()) => {
  const end = new Date(date);

  end.setMonth(end.getMonth() + 1);
  end.setDate(0);
  end.setHours(23, 59, 59, 999);

  return end;
};

/* =======================================================
   DASHBOARD OVERVIEW
======================================================= */

export const getDashboardOverview = async (
  req,
  res
) => {
  try {
    /*
    |--------------------------------------------------------------------------
    | USER / BUSINESS / BRANCH
    |--------------------------------------------------------------------------
    */

    const businessId =
      req.user?.businessId;

    const branchId =
      req.user?.activeBranchId ||
      req.user?.branchId ||
      null;

    if (!businessId) {
      return res.status(400).json({
        success: false,
        message:
          "Your account is not associated with a business.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | DATE RANGES
    |--------------------------------------------------------------------------
    */

    const now = new Date();

    const todayStart =
      getStartOfDay(now);

    const todayEnd =
      getEndOfDay(now);

    const monthStart =
      getStartOfMonth(now);

    const monthEnd =
      getEndOfMonth(now);

    /*
    |--------------------------------------------------------------------------
    | SALE FILTERS
    |--------------------------------------------------------------------------
    |
    | POS creates:
    |
    | businessId
    | branchId
    | status = COMPLETED
    |
    */

    const todaySaleFilter = {
      businessId,
      status: "COMPLETED",

      createdAt: {
        $gte: todayStart,
        $lte: todayEnd,
      },
    };

    const monthSaleFilter = {
      businessId,
      status: "COMPLETED",

      createdAt: {
        $gte: monthStart,
        $lte: monthEnd,
      },
    };

    /*
    |--------------------------------------------------------------------------
    | BRANCH FILTER
    |--------------------------------------------------------------------------
    |
    | If the logged-in user has an active branch,
    | only that branch's transactions are shown.
    |
    */

    if (branchId) {
      todaySaleFilter.branchId =
        branchId;

      monthSaleFilter.branchId =
        branchId;
    }

    /*
    |--------------------------------------------------------------------------
    | PAYMENT FILTERS
    |--------------------------------------------------------------------------
    */

    const todayPaymentFilter = {
      businessId,

      status: "COMPLETED",

      paymentDate: {
        $gte: todayStart,
        $lte: todayEnd,
      },
    };

    const monthPaymentFilter = {
      businessId,

      status: "COMPLETED",

      paymentDate: {
        $gte: monthStart,
        $lte: monthEnd,
      },
    };

    if (branchId) {
      todayPaymentFilter.branchId =
        branchId;

      monthPaymentFilter.branchId =
        branchId;
    }

    /*
    |--------------------------------------------------------------------------
    | EXPENSE FILTERS
    |--------------------------------------------------------------------------
    */

    const todayExpenseFilter = {
      businessId,

      createdAt: {
        $gte: todayStart,
        $lte: todayEnd,
      },
    };

    const monthExpenseFilter = {
      businessId,

      createdAt: {
        $gte: monthStart,
        $lte: monthEnd,
      },
    };

    if (branchId) {
      todayExpenseFilter.branchId =
        branchId;

      monthExpenseFilter.branchId =
        branchId;
    }

    /*
    |--------------------------------------------------------------------------
    | LOAD DATA
    |--------------------------------------------------------------------------
    |
    | We intentionally load the actual completed sales and payments.
    | This makes the dashboard use the same records created by POS.
    |
    */

    const [
      todaySales,
      monthSales,
      todayPayments,
      monthPayments,
      todayExpenses,
      monthExpenses,
    ] = await Promise.all([
      Sale.find(todaySaleFilter)
        .populate(
          "customerId",
          "name phone"
        )
        .populate(
          "cashierId",
          "name email"
        )
        .sort({
          createdAt: -1,
        }),

      Sale.find(monthSaleFilter),

      Payment.find(
        todayPaymentFilter
      ),

      Payment.find(
        monthPaymentFilter
      ),

      Expense.find(
        todayExpenseFilter
      ),

      Expense.find(
        monthExpenseFilter
      ),
    ]);

    /*
    |--------------------------------------------------------------------------
    | TODAY'S SALES
    |--------------------------------------------------------------------------
    */

    const todaySalesTotal =
      todaySales.reduce(
        (sum, sale) =>
          sum +
          toNumber(sale.total),
        0
      );

    /*
    |--------------------------------------------------------------------------
    | MONTH'S SALES
    |--------------------------------------------------------------------------
    */

    const monthSalesTotal =
      monthSales.reduce(
        (sum, sale) =>
          sum +
          toNumber(sale.total),
        0
      );

    /*
    |--------------------------------------------------------------------------
    | TODAY'S PAYMENTS
    |--------------------------------------------------------------------------
    */

    const todayPaymentsTotal =
      todayPayments.reduce(
        (sum, payment) =>
          sum +
          toNumber(payment.amount),
        0
      );

    /*
    |--------------------------------------------------------------------------
    | MONTH'S PAYMENTS
    |--------------------------------------------------------------------------
    */

    const monthPaymentsTotal =
      monthPayments.reduce(
        (sum, payment) =>
          sum +
          toNumber(payment.amount),
        0
      );

    /*
    |--------------------------------------------------------------------------
    | TODAY'S EXPENSES
    |--------------------------------------------------------------------------
    */

    const todayExpensesTotal =
      todayExpenses.reduce(
        (sum, expense) =>
          sum +
          toNumber(
            expense.amount
          ),
        0
      );

    /*
    |--------------------------------------------------------------------------
    | MONTH'S EXPENSES
    |--------------------------------------------------------------------------
    */

    const monthExpensesTotal =
      monthExpenses.reduce(
        (sum, expense) =>
          sum +
          toNumber(
            expense.amount
          ),
        0
      );

    /*
    |--------------------------------------------------------------------------
    | PRODUCTS SOLD TODAY
    |--------------------------------------------------------------------------
    */

    const productsSoldToday =
      todaySales.reduce(
        (sum, sale) => {
          const items =
            Array.isArray(
              sale.items
            )
              ? sale.items
              : [];

          return (
            sum +
            items.reduce(
              (
                itemTotal,
                item
              ) =>
                itemTotal +
                toNumber(
                  item.quantity
                ),
              0
            )
          );
        },
        0
      );

    /*
    |--------------------------------------------------------------------------
    | GROSS PROFIT
    |--------------------------------------------------------------------------
    |
    | Gross profit:
    |
    | Selling value - buying value
    |
    | The sale items already contain buyingPrice
    | when the sale is created.
    |
    */

    const calculateGrossProfit = (
      sales
    ) => {
      return sales.reduce(
        (salesTotal, sale) => {
          const items =
            Array.isArray(
              sale.items
            )
              ? sale.items
              : [];

          const cost =
            items.reduce(
              (
                itemTotal,
                item
              ) => {
                const buyingPrice =
                  toNumber(
                    item.buyingPrice
                  );

                const quantity =
                  toNumber(
                    item.quantity
                  );

                return (
                  itemTotal +
                  buyingPrice *
                    quantity
                );
              },
              0
            );

          const saleTotal =
            toNumber(
              sale.total
            );

          return (
            salesTotal +
            (saleTotal - cost)
          );
        },
        0
      );
    };

    const todayGrossProfit =
      calculateGrossProfit(
        todaySales
      );

    const monthGrossProfit =
      calculateGrossProfit(
        monthSales
      );

    /*
    |--------------------------------------------------------------------------
    | NET PROFIT
    |--------------------------------------------------------------------------
    */

    const todayNetProfit =
      todayGrossProfit -
      todayExpensesTotal;

    const monthNetProfit =
      monthGrossProfit -
      monthExpensesTotal;

    /*
    |--------------------------------------------------------------------------
    | PAYMENT BREAKDOWN
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
          String(
            payment.paymentMethod ||
              ""
          ).toUpperCase();

        const amount =
          toNumber(
            payment.amount
          );

        if (
          Object.prototype.hasOwnProperty.call(
            paymentBreakdown,
            method
          )
        ) {
          paymentBreakdown[
            method
          ] += amount;
        }
      }
    );

    /*
    |--------------------------------------------------------------------------
    | INVENTORY
    |--------------------------------------------------------------------------
    |
    | This part currently uses Product.stockQuantity because
    | the exact branch-stock model has not yet been supplied.
    |
    | We will replace this section with the actual branch-stock
    | collection once that model is provided.
    |
    */

    const productFilter = {
      businessId,
    };

    const products =
      await Product.find(
        productFilter
      ).lean();

    const totalProducts =
      products.length;

    const inventoryValue =
      products.reduce(
        (sum, product) => {
          const stock =
            toNumber(
              product.stockQuantity
            );

          const buyingPrice =
            toNumber(
              product.buyingPrice
            );

          return (
            sum +
            stock * buyingPrice
          );
        },
        0
      );

    /*
    |--------------------------------------------------------------------------
    | LOW STOCK PRODUCTS
    |--------------------------------------------------------------------------
    */

    const lowStockProducts =
      products
        .filter((product) => {
          const stock =
            toNumber(
              product.stockQuantity
            );

          const minimumStock =
            toNumber(
              product.minimumStock ??
                product.minStock ??
                0
            );

          return (
            stock <= minimumStock
          );
        })
        .sort(
          (a, b) =>
            toNumber(
              a.stockQuantity
            ) -
            toNumber(
              b.stockQuantity
            )
        )
        .slice(0, 20)
        .map((product) => ({
          _id: product._id,
          name: product.name,
          sku: product.sku,

          stock: toNumber(
            product.stockQuantity
          ),

          minimumStock: toNumber(
            product.minimumStock ??
              product.minStock ??
              0
          ),
        }));

    /*
    |--------------------------------------------------------------------------
    | RECENT SALES
    |--------------------------------------------------------------------------
    |
    | Return the latest completed sales.
    |
    */

    const recentSales =
      todaySales
        .slice(0, 10)
        .map((sale) => ({
          _id: sale._id,

          receiptNumber:
            sale.receiptNumber,

          total:
            toNumber(
              sale.total
            ),

          status:
            sale.status,

          paymentMethod:
            sale.paymentMethod,

          createdAt:
            sale.createdAt,

          customerId:
            sale.customerId || null,

          cashierId:
            sale.cashierId || null,
        }));

    /*
    |--------------------------------------------------------------------------
    | RESPONSE
    |--------------------------------------------------------------------------
    */

    return res.status(200).json({
      success: true,

      overview: {
        today: {
          sales:
            todaySalesTotal,

          payments:
            todayPaymentsTotal,

          expenses:
            todayExpensesTotal,

          grossProfit:
            todayGrossProfit,

          netProfit:
            todayNetProfit,

          productsSold:
            productsSoldToday,
        },

        month: {
          sales:
            monthSalesTotal,

          payments:
            monthPaymentsTotal,

          expenses:
            monthExpensesTotal,

          grossProfit:
            monthGrossProfit,

          netProfit:
            monthNetProfit,
        },

        inventory: {
          totalProducts,

          inventoryValue,

          lowStockCount:
            lowStockProducts.length,

          lowStockProducts,
        },

        paymentBreakdown,

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
        "Failed to load dashboard overview.",

      error:
        process.env.NODE_ENV ===
        "development"
          ? error.message
          : undefined,
    });
  }
};