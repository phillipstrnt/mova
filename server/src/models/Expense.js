
import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema(
  {
    // Business that owns this expense
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },

    // Optional branch
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      default: null,
      index: true,
    },

    // User who recorded the expense
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Expense category
    category: {
      type: String,
      required: true,
      trim: true,
    },

    // Description of what the money was spent on
    description: {
      type: String,
      required: true,
      trim: true,
    },

    // Amount spent
    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    // How the expense was paid
    paymentMethod: {
      type: String,
      enum: [
        "CASH",
        "MOBILE_MONEY",
        "CARD",
        "BANK",
      ],
      required: true,
    },

    // Date when the expense occurred
    expenseDate: {
      type: Date,
      required: true,
      default: Date.now,
    },

    // Receipt number, transaction number,
    // invoice number, etc.
    reference: {
      type: String,
      trim: true,
      default: "",
    },

    // Additional information
    notes: {
      type: String,
      trim: true,
      default: "",
    },

    // We cancel expenses instead of deleting
    // them permanently so there is an audit trail.
    status: {
      type: String,
      enum: [
        "ACTIVE",
        "CANCELLED",
      ],
      default: "ACTIVE",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

/*
|--------------------------------------------------------------------------
| Indexes
|--------------------------------------------------------------------------
*/

// Quickly retrieve expenses for a business
// ordered by most recent date.
expenseSchema.index({
  businessId: 1,
  expenseDate: -1,
});

// Quickly filter expenses by category.
expenseSchema.index({
  businessId: 1,
  category: 1,
});

// Quickly filter active/cancelled expenses.
expenseSchema.index({
  businessId: 1,
  status: 1,
});

// Quickly retrieve expenses by payment method.
expenseSchema.index({
  businessId: 1,
  paymentMethod: 1,
});

const Expense = mongoose.model(
  "Expense",
  expenseSchema
);

export default Expense;