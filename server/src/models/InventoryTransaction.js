import mongoose from "mongoose";

const inventoryTransactionSchema = new mongoose.Schema(
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

    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: [
        "OPENING_STOCK",
        "STOCK_RECEIVED",
        "SALE",
        "RETURN",
        "ADJUSTMENT_IN",
        "ADJUSTMENT_OUT",
        "DAMAGE",
        "LOSS",
        "TRANSFER_IN",
        "TRANSFER_OUT",
      ],
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 0,
    },

    stockBefore: {
      type: Number,
      required: true,
      min: 0,
    },

    stockAfter: {
      type: Number,
      required: true,
      min: 0,
    },

    reason: {
      type: String,
      trim: true,
      default: "",
    },

    referenceType: {
      type: String,
      enum: [
        "SALE",
        "PURCHASE",
        "RETURN",
        "ADJUSTMENT",
        "TRANSFER",
        "OTHER",
      ],
      default: "OTHER",
    },

    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
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

inventoryTransactionSchema.index({
  businessId: 1,
  productId: 1,
  createdAt: -1,
});

inventoryTransactionSchema.index({
  businessId: 1,
  createdAt: -1,
});

const InventoryTransaction = mongoose.model(
  "InventoryTransaction",
  inventoryTransactionSchema
);

export default InventoryTransaction;