
import mongoose from "mongoose";

const inventoryTransactionSchema =
  new mongoose.Schema(
    {
      /*
       * =====================================================
       * BUSINESS
       * =====================================================
       */

      businessId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Business",
        required: true,
        index: true,
      },

      /*
       * =====================================================
       * BRANCH
       * =====================================================
       *
       * Every new inventory movement belongs to
       * a specific branch.
       */

      branchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Branch",
        required: true,
        index: true,
      },

      /*
       * =====================================================
       * PRODUCT
       * =====================================================
       */

      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
        index: true,
      },

      /*
       * =====================================================
       * USER
       * =====================================================
       */

      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },

      /*
       * =====================================================
       * TRANSACTION TYPE
       * =====================================================
       */

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

      /*
       * =====================================================
       * QUANTITY
       * =====================================================
       */

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

      /*
       * =====================================================
       * DESCRIPTION
       * =====================================================
       */

      reason: {
        type: String,
        trim: true,
        default: "",
      },

      notes: {
        type: String,
        trim: true,
        default: "",
      },

      /*
       * =====================================================
       * REFERENCE
       * =====================================================
       */

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
    },
    {
      timestamps: true,
    }
  );

/*
 * =========================================================
 * INVENTORY HISTORY INDEX
 * =========================================================
 */

inventoryTransactionSchema.index({
  businessId: 1,
  branchId: 1,
  productId: 1,
  createdAt: -1,
});

/*
 * =========================================================
 * BRANCH INVENTORY HISTORY
 * =========================================================
 */

inventoryTransactionSchema.index({
  businessId: 1,
  branchId: 1,
  createdAt: -1,
});

/*
 * =========================================================
 * PRODUCT HISTORY
 * =========================================================
 */

inventoryTransactionSchema.index({
  businessId: 1,
  productId: 1,
  createdAt: -1,
});

const InventoryTransaction =
  mongoose.model(
    "InventoryTransaction",
    inventoryTransactionSchema
  );

export default InventoryTransaction;