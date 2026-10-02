import Sale from "../models/Sale.js";
import Payment from "../models/Payment.js";
import Expense from "../models/Expense.js";
import Product from "../models/Product.js";
import Report from "../models/Report.js";

/* =========================================================
   DATE HELPERS
========================================================= */

const getDateRange = (req) => {
  const now = new Date();

  const startDateParam = req.query.startDate;
  const endDateParam = req.query.endDate;

  let startDate;
  let endDate;

  if (startDateParam) {
    startDate = new Date(`${startDateParam}T00:00:00`);
  } else {
    startDate = new Date(now);
    startDate.setHours(0, 0, 0, 0);
  }

  if (endDateParam) {
    endDate = new Date(`${endDateParam}T23:59:59.999`);
  } else {
    endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);
  }

  if (Number.isNaN(startDate.getTime())) {
    startDate = new Date(now);
    startDate.setHours(0, 0, 0, 0);
  }

  if (Number.isNaN(endDate.getTime())) {
    endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);
  }

  return {
    startDate,
    endDate,
  };
};

/* =========================================================
   SALES REPORT
========================================================= */

export const getSalesReport = async (req, res) => {
  try {
    const businessId = req.user.businessId;

    const { startDate, endDate } = getDateRange(req);

    const sales = await Sale.find({
      businessId,
      createdAt: {
        $gte: startDate,
        $lte: endDate,
      },
      status: {
        $in: [
          "COMPLETED",
          "PARTIALLY_REFUNDED",
        ],
      },
    })
      .sort({ createdAt: -1 })
      .lean();

    let totalSales = 0;
    let totalItems = 0;
    let totalDiscount = 0;
    let grossProfit = 0;

    sales.forEach((sale) => {
      totalSales += Number(sale.total || 0);
      totalDiscount += Number(sale.discount || 0);

      (sale.items || []).forEach((item) => {
        const quantity = Number(item.quantity || 0);
        const sellingPrice = Number(item.unitPrice || 0);
        const buyingPrice = Number(item.buyingPrice || 0);

        totalItems += quantity;

        grossProfit +=
          (sellingPrice - buyingPrice) * quantity;
      });
    });

    return res.json({
      success: true,

      report: {
        totalTransactions: sales.length,
        totalSales,
        totalItems,
        totalDiscount,
        grossProfit,
      },

      sales,
    });
  } catch (error) {
    console.error(
      "Sales report error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to generate sales report.",
    });
  }
};

/* =========================================================
   PAYMENT REPORT
========================================================= */

export const getPaymentReport = async (req, res) => {
  try {
    const businessId = req.user.businessId;

    const { startDate, endDate } = getDateRange(req);

    const payments = await Payment.find({
      businessId,
      paymentDate: {
        $gte: startDate,
        $lte: endDate,
      },
      status: "COMPLETED",
    })
      .sort({ paymentDate: -1 })
      .lean();

    let totalPayments = 0;

    const breakdown = {
      CASH: 0,
      MOBILE_MONEY: 0,
      CARD: 0,
      BANK: 0,
    };

    payments.forEach((payment) => {
      const amount = Number(
        payment.amount || 0
      );

      totalPayments += amount;

      if (
        Object.prototype.hasOwnProperty.call(
          breakdown,
          payment.paymentMethod
        )
      ) {
        breakdown[payment.paymentMethod] +=
          amount;
      }
    });

    return res.json({
      success: true,

      report: {
        totalTransactions: payments.length,
        totalPayments,
        breakdown,
      },

      payments,
    });
  } catch (error) {
    console.error(
      "Payment report error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to generate payment report.",
    });
  }
};

/* =========================================================
   EXPENSE REPORT
========================================================= */

export const getExpenseReport = async (req, res) => {
  try {
    const businessId = req.user.businessId;

    const { startDate, endDate } = getDateRange(req);

    const expenses = await Expense.find({
      businessId,
      expenseDate: {
        $gte: startDate,
        $lte: endDate,
      },
      status: "ACTIVE",
    })
      .sort({ expenseDate: -1 })
      .lean();

    let totalExpenses = 0;

    const categoryBreakdown = {};

    expenses.forEach((expense) => {
      const amount = Number(
        expense.amount || 0
      );

      totalExpenses += amount;

      const category =
        expense.category || "Other";

      if (!categoryBreakdown[category]) {
        categoryBreakdown[category] = 0;
      }

      categoryBreakdown[category] += amount;
    });

    return res.json({
      success: true,

      report: {
        totalTransactions: expenses.length,
        totalExpenses,
        categoryBreakdown,
      },

      expenses,
    });
  } catch (error) {
    console.error(
      "Expense report error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to generate expense report.",
    });
  }
};

/* =========================================================
   PROFIT REPORT
========================================================= */

export const getProfitReport = async (req, res) => {
  try {
    const businessId = req.user.businessId;

    const { startDate, endDate } = getDateRange(req);

    const sales = await Sale.find({
      businessId,
      createdAt: {
        $gte: startDate,
        $lte: endDate,
      },
      status: {
        $in: [
          "COMPLETED",
          "PARTIALLY_REFUNDED",
        ],
      },
    })
      .lean();

    const expenses = await Expense.find({
      businessId,
      expenseDate: {
        $gte: startDate,
        $lte: endDate,
      },
      status: "ACTIVE",
    })
      .lean();

    let revenue = 0;
    let costOfGoods = 0;
    let totalExpenses = 0;

    sales.forEach((sale) => {
      revenue += Number(
        sale.total || 0
      );

      (sale.items || []).forEach((item) => {
        const quantity = Number(
          item.quantity || 0
        );

        const buyingPrice = Number(
          item.buyingPrice || 0
        );

        costOfGoods +=
          buyingPrice * quantity;
      });
    });

    expenses.forEach((expense) => {
      totalExpenses += Number(
        expense.amount || 0
      );
    });

    const grossProfit =
      revenue - costOfGoods;

    const netProfit =
      grossProfit - totalExpenses;

    return res.json({
      success: true,

      report: {
        revenue,
        costOfGoods,
        grossProfit,
        totalExpenses,
        netProfit,
      },
    });
  } catch (error) {
    console.error(
      "Profit report error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to generate profit report.",
    });
  }
};

/* =========================================================
   INVENTORY REPORT
========================================================= */

export const getInventoryReport = async (
  req,
  res
) => {
  try {
    const businessId = req.user.businessId;

    const products = await Product.find({
      businessId,
      isActive: true,
    })
      .sort({ name: 1 })
      .lean();

    let inventoryValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    products.forEach((product) => {
      const quantity = Number(
        product.stockQuantity || 0
      );

      const buyingPrice = Number(
        product.buyingPrice || 0
      );

      inventoryValue +=
        quantity * buyingPrice;

      if (quantity === 0) {
        outOfStockCount++;
      } else if (
        quantity <=
        Number(product.minimumStock || 0)
      ) {
        lowStockCount++;
      }
    });

    return res.json({
      success: true,

      report: {
        totalProducts: products.length,
        inventoryValue,
        lowStockCount,
        outOfStockCount,
      },

      products,
    });
  } catch (error) {
    console.error(
      "Inventory report error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to generate inventory report.",
    });
  }
};

/* =========================================================
   SAVE REPORT
========================================================= */

export const saveReport = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const userId = req.user._id;

    const {
      name,
      reportType = "BUSINESS",
      startDate,
      endDate,
      data,
    } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Report name is required.",
      });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message:
          "Start date and end date are required.",
      });
    }

    if (!data) {
      return res.status(400).json({
        success: false,
        message: "Report data is required.",
      });
    }

    const report = await Report.create({
      businessId,
      createdBy: userId,
      name,
      reportType,
      startDate: new Date(
        `${startDate}T00:00:00`
      ),
      endDate: new Date(
        `${endDate}T23:59:59.999`
      ),
      data,
    });

    return res.status(201).json({
      success: true,
      message: "Report saved successfully.",
      report,
    });
  } catch (error) {
    console.error(
      "Save report error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to save report.",
    });
  }
};

/* =========================================================
   GET SAVED REPORTS
========================================================= */

export const getSavedReports = async (
  req,
  res
) => {
  try {
    const businessId = req.user.businessId;

    const reports = await Report.find({
      businessId,
    })
      .sort({
        createdAt: -1,
      })
      .lean();

    return res.json({
      success: true,
      reports,
    });
  } catch (error) {
    console.error(
      "Get saved reports error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to load saved reports.",
    });
  }
};

/* =========================================================
   GET SINGLE SAVED REPORT
========================================================= */

export const getSavedReport = async (
  req,
  res
) => {
  try {
    const businessId = req.user.businessId;

    const report = await Report.findOne({
      _id: req.params.id,
      businessId,
    }).lean();

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Saved report not found.",
      });
    }

    return res.json({
      success: true,
      report,
    });
  } catch (error) {
    console.error(
      "Get saved report error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to load saved report.",
    });
  }
};

/* =========================================================
   DELETE SAVED REPORT
========================================================= */

export const deleteSavedReport = async (
  req,
  res
) => {
  try {
    const businessId = req.user.businessId;

    const report =
      await Report.findOneAndDelete({
        _id: req.params.id,
        businessId,
      });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Saved report not found.",
      });
    }

    return res.json({
      success: true,
      message: "Report deleted successfully.",
    });
  } catch (error) {
    console.error(
      "Delete saved report error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to delete report.",
    });
  }
};