import mongoose from "mongoose";

const returnItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    sku: {
      type: String,
      required: true,
      trim: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
    },

    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    _id: false,
  }
);

const returnSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },

    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      default: null,
      index: true,
    },

    saleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sale",
      required: true,
      index: true,
    },

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    returnNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    items: {
      type: [returnItemSchema],
      required: true,
      validate: {
        validator: (items) =>
          items.length > 0,
        message:
          "A return must contain at least one item.",
      },
    },

    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },

    refundAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    refundMethod: {
      type: String,
      enum: [
        "CASH",
        "MOBILE_MONEY",
        "CARD",
        "BANK",
        "STORE_CREDIT",
      ],
      required: true,
    },

    reason: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: [
        "COMPLETED",
        "CANCELLED",
      ],
      default: "COMPLETED",
    },

    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

returnSchema.index({
  businessId: 1,
  createdAt: -1,
});

returnSchema.index({
  businessId: 1,
  saleId: 1,
});

returnSchema.index({
  businessId: 1,
  customerId: 1,
  createdAt: -1,
});

const Return = mongoose.model(
  "Return",
  returnSchema
);

export default Return;