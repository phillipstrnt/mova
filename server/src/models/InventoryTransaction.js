import mongoose from "mongoose";

const inventoryTransactionSchema = new mongoose.Schema(
  {
    // ==========================================
    // BUSINESS
    // ==========================================
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },

    // ==========================================
    // BRANCH
    // ==========================================
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
      index: true,
    },

    // ==========================================
    // PRODUCT
    // ==========================================
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },

    // ==========================================
    // USER WHO PERFORMED ACTION
    // ==========================================
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // ==========================================
    // TRANSACTION TYPE
    // ==========================================
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

    // ==========================================
    // QUANTITY
    // ==========================================
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },

    // ==========================================
    // STOCK SNAPSHOT
    // ==========================================
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

    // ==========================================
    // REASON
    // ==========================================
    reason: {
      type: String,
      trim: true,
      default: "",
    },

    // ==========================================
    // REFERENCE
    // ==========================================
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

    // ==========================================
    // NOTES
    // ==========================================
    notes: {
      type: String,
      trim: true,
      default: "",
    },

    // Client-generated key makes queued offline adjustments safe to retry.
    clientAdjustmentId: {
      type: String,
      trim: true,
      default: undefined,
    },
  },
  {
    timestamps: true,
  }
);

// ==========================================
// BRANCH PRODUCT HISTORY
// ==========================================

inventoryTransactionSchema.index({
  businessId: 1,
  branchId: 1,
  productId: 1,
  createdAt: -1,
});

// ==========================================
// BRANCH INVENTORY HISTORY
// ==========================================

inventoryTransactionSchema.index({
  businessId: 1,
  branchId: 1,
  createdAt: -1,
});

// ==========================================
// TRANSACTION REFERENCE
// ==========================================

inventoryTransactionSchema.index({
  businessId: 1,
  branchId: 1,
  referenceType: 1,
  referenceId: 1,
});

inventoryTransactionSchema.index(
  { businessId: 1, clientAdjustmentId: 1 },
  { unique: true, partialFilterExpression: { clientAdjustmentId: { $type: "string" } } }
);

// ==========================================
// USER ACTIVITY
// ==========================================

inventoryTransactionSchema.index({
  businessId: 1,
  branchId: 1,
  userId: 1,
  createdAt: -1,
});

const InventoryTransaction = mongoose.model(
  "InventoryTransaction",
  inventoryTransactionSchema
);

export default InventoryTransaction;
