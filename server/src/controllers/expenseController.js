import mongoose from "mongoose";
import Expense from "../models/Expense.js";

/*
|--------------------------------------------------------------------------
| Get all expenses
|--------------------------------------------------------------------------
*/
const getExpenses = async (req, res) => {
  try {
    const businessId = req.user.businessId;

    const {
      search = "",
      category = "",
      status = "ACTIVE",
      startDate = "",
      endDate = "",
    } = req.query;

    const query = {
      businessId,
    };

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Filter by category
    if (category) {
      query.category = category;
    }

    // Search
    if (search.trim()) {
      query.$or = [
        {
          description: {
            $regex: search.trim(),
            $options: "i",
          },
        },
        {
          reference: {
            $regex: search.trim(),
            $options: "i",
          },
        },
        {
          category: {
            $regex: search.trim(),
            $options: "i",
          },
        },
      ];
    }

    // Date filtering
    if (startDate || endDate) {
      query.expenseDate = {};

      if (startDate) {
        const start = new Date(`${startDate}T00:00:00`);

        if (Number.isNaN(start.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid start date",
          });
        }

        query.expenseDate.$gte = start;
      }

      if (endDate) {
        const end = new Date(`${endDate}T23:59:59.999`);

        if (Number.isNaN(end.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid end date",
          });
        }

        query.expenseDate.$lte = end;
      }
    }

    const expenses = await Expense.find(query)
      .populate("userId", "name email")
      .sort({
        expenseDate: -1,
        createdAt: -1,
      });

    const total = expenses.reduce(
      (sum, expense) => sum + Number(expense.amount || 0),
      0
    );

    res.json({
      success: true,
      count: expenses.length,
      total,
      expenses,
    });
  } catch (error) {
    console.error("Get expenses error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch expenses",
    });
  }
};

/*
|--------------------------------------------------------------------------
| Get single expense
|--------------------------------------------------------------------------
*/
const getExpenseById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid expense ID",
      });
    }

    const expense = await Expense.findOne({
      _id: id,
      businessId: req.user.businessId,
    }).populate("userId", "name email");

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    res.json({
      success: true,
      expense,
    });
  } catch (error) {
    console.error("Get expense error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch expense",
    });
  }
};

/*
|--------------------------------------------------------------------------
| Create expense
|--------------------------------------------------------------------------
*/
const createExpense = async (req, res) => {
  try {
    const {
      category,
      description,
      amount,
      paymentMethod,
      expenseDate,
      reference,
      notes,
    } = req.body;

    /*
    |--------------------------------------------------------------------------
    | Validate category
    |--------------------------------------------------------------------------
    */
    if (
      typeof category !== "string" ||
      !category.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Expense category is required",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Validate description
    |--------------------------------------------------------------------------
    */
    if (
      typeof description !== "string" ||
      !description.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Expense description is required",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Validate amount
    |--------------------------------------------------------------------------
    */
    const numericAmount = Number(amount);

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Expense amount must be greater than zero",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Validate payment method
    |--------------------------------------------------------------------------
    */
    const validPaymentMethods = [
      "CASH",
      "MOBILE_MONEY",
      "CARD",
      "BANK",
    ];

    if (!validPaymentMethods.includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment method",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Validate expense date
    |--------------------------------------------------------------------------
    */
    let finalExpenseDate = new Date();

    if (expenseDate) {
      finalExpenseDate = new Date(expenseDate);

      if (Number.isNaN(finalExpenseDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid expense date",
        });
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Create expense
    |--------------------------------------------------------------------------
    */
    const expense = await Expense.create({
      businessId: req.user.businessId,
      branchId: req.user.branchId || null,
      userId: req.user._id,

      category: category.trim(),

      description: description.trim(),

      amount: numericAmount,

      paymentMethod,

      expenseDate: finalExpenseDate,

      reference:
        typeof reference === "string"
          ? reference.trim()
          : "",

      notes:
        typeof notes === "string"
          ? notes.trim()
          : "",

      status: "ACTIVE",
    });

    /*
    |--------------------------------------------------------------------------
    | Return created expense
    |--------------------------------------------------------------------------
    */
    const populatedExpense = await Expense.findById(
      expense._id
    ).populate("userId", "name email");

    res.status(201).json({
      success: true,
      message: "Expense recorded successfully",
      expense: populatedExpense,
    });
  } catch (error) {
    console.error("Create expense error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create expense",
    });
  }
};

/*
|--------------------------------------------------------------------------
| Update expense
|--------------------------------------------------------------------------
*/
const updateExpense = async (req, res) => {
  try {
    const { id } = req.params;

    /*
    |--------------------------------------------------------------------------
    | Validate ID
    |--------------------------------------------------------------------------
    */
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid expense ID",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Find expense
    |--------------------------------------------------------------------------
    */
    const expense = await Expense.findOne({
      _id: id,
      businessId: req.user.businessId,
    });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Do not edit cancelled expenses
    |--------------------------------------------------------------------------
    */
    if (expense.status === "CANCELLED") {
      return res.status(400).json({
        success: false,
        message: "Cancelled expenses cannot be edited",
      });
    }

    const {
      category,
      description,
      amount,
      paymentMethod,
      expenseDate,
      reference,
      notes,
    } = req.body;

    /*
    |--------------------------------------------------------------------------
    | Category
    |--------------------------------------------------------------------------
    */
    if (category !== undefined) {
      if (
        typeof category !== "string" ||
        !category.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "Category cannot be empty",
        });
      }

      expense.category = category.trim();
    }

    /*
    |--------------------------------------------------------------------------
    | Description
    |--------------------------------------------------------------------------
    */
    if (description !== undefined) {
      if (
        typeof description !== "string" ||
        !description.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "Description cannot be empty",
        });
      }

      expense.description = description.trim();
    }

    /*
    |--------------------------------------------------------------------------
    | Amount
    |--------------------------------------------------------------------------
    */
    if (amount !== undefined) {
      const numericAmount = Number(amount);

      if (
        !Number.isFinite(numericAmount) ||
        numericAmount <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Amount must be greater than zero",
        });
      }

      expense.amount = numericAmount;
    }

    /*
    |--------------------------------------------------------------------------
    | Payment method
    |--------------------------------------------------------------------------
    */
    if (paymentMethod !== undefined) {
      const validPaymentMethods = [
        "CASH",
        "MOBILE_MONEY",
        "CARD",
        "BANK",
      ];

      if (!validPaymentMethods.includes(paymentMethod)) {
        return res.status(400).json({
          success: false,
          message: "Invalid payment method",
        });
      }

      expense.paymentMethod = paymentMethod;
    }

    /*
    |--------------------------------------------------------------------------
    | Expense date
    |--------------------------------------------------------------------------
    */
    if (expenseDate !== undefined) {
      const newDate = new Date(expenseDate);

      if (Number.isNaN(newDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid expense date",
        });
      }

      expense.expenseDate = newDate;
    }

    /*
    |--------------------------------------------------------------------------
    | Reference
    |--------------------------------------------------------------------------
    */
    if (reference !== undefined) {
      expense.reference =
        typeof reference === "string"
          ? reference.trim()
          : "";
    }

    /*
    |--------------------------------------------------------------------------
    | Notes
    |--------------------------------------------------------------------------
    */
    if (notes !== undefined) {
      expense.notes =
        typeof notes === "string"
          ? notes.trim()
          : "";
    }

    await expense.save();

    const updatedExpense = await Expense.findById(
      expense._id
    ).populate("userId", "name email");

    res.json({
      success: true,
      message: "Expense updated successfully",
      expense: updatedExpense,
    });
  } catch (error) {
    console.error("Update expense error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update expense",
    });
  }
};

/*
|--------------------------------------------------------------------------
| Cancel expense
|--------------------------------------------------------------------------
*/
const cancelExpense = async (req, res) => {
  try {
    const { id } = req.params;

    /*
    |--------------------------------------------------------------------------
    | Validate ID
    |--------------------------------------------------------------------------
    */
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid expense ID",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Find expense
    |--------------------------------------------------------------------------
    */
    const expense = await Expense.findOne({
      _id: id,
      businessId: req.user.businessId,
    });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Already cancelled
    |--------------------------------------------------------------------------
    */
    if (expense.status === "CANCELLED") {
      return res.status(400).json({
        success: false,
        message: "Expense is already cancelled",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Cancel instead of deleting
    |--------------------------------------------------------------------------
    */
    expense.status = "CANCELLED";

    await expense.save();

    const cancelledExpense = await Expense.findById(
      expense._id
    ).populate("userId", "name email");

    res.json({
      success: true,
      message: "Expense cancelled successfully",
      expense: cancelledExpense,
    });
  } catch (error) {
    console.error("Cancel expense error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to cancel expense",
    });
  }
};

export {
  getExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  cancelExpense,
};