import mongoose from "mongoose";

const purchaseItemSchema = new mongoose.Schema(
  {
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
    // PRODUCT SNAPSHOT
    // ==========================================
    name: {
      type: String,
      required: true,
      trim: true,
    },

    sku: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    // ==========================================
    // QUANTITY
    // ==========================================
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },

    // ==========================================
    // BUYING PRICE
    // ==========================================
    buyingPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    // ==========================================
    // ITEM SUBTOTAL
    // ==========================================
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },

    batchCode: {
      type: String,
      trim: true,
      default: "",
    },
    expiryDate: {
      type: Date,
      default: null,
    },
  },
  {
    _id: false,
  }
);

const purchaseSchema = new mongoose.Schema(
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
      default: null,
      index: true,
    },

    // ==========================================
    // SUPPLIER
    // ==========================================
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
      index: true,
    },

    // ==========================================
    // USER WHO CREATED PURCHASE
    // ==========================================
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // ==========================================
    // PURCHASE NUMBER
    // ==========================================
    purchaseNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    // ==========================================
    // SUPPLIER INVOICE NUMBER
    // ==========================================
    invoiceNumber: {
      type: String,
      trim: true,
      default: "",
    },

    // ==========================================
    // PURCHASE ITEMS
    // ==========================================
    items: {
      type: [purchaseItemSchema],
      required: true,
      validate: {
        validator: (items) =>
          Array.isArray(items) &&
          items.length > 0,
        message:
          "A purchase must contain at least one item.",
      },
    },

    // ==========================================
    // FINANCIAL TOTALS
    // ==========================================
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },

    discount: {
      type: Number,
      default: 0,
      min: 0,
    },

    total: {
      type: Number,
      required: true,
      min: 0,
    },

    // ==========================================
    // PAYMENT METHOD
    // ==========================================
    paymentMethod: {
      type: String,
      enum: [
        "CASH",
        "MOBILE_MONEY",
        "CARD",
        "BANK",
        "CREDIT",
      ],
      required: true,
    },

    // ==========================================
    // PAYMENT STATUS
    // ==========================================
    paymentStatus: {
      type: String,
      enum: [
        "PAID",
        "PENDING",
        "PARTIALLY_PAID",
      ],
      default: "PAID",
    },

    // ==========================================
    // PURCHASE STATUS
    // ==========================================
    status: {
      type: String,
      enum: [
        "RECEIVED",
        "CANCELLED",
      ],
      default: "RECEIVED",
      index: true,
    },

    // ==========================================
    // NOTES
    // ==========================================
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

// ==========================================
// BUSINESS PURCHASE HISTORY
// ==========================================

purchaseSchema.index({
  businessId: 1,
  createdAt: -1,
});

// ==========================================
// BRANCH PURCHASE HISTORY
// ==========================================

purchaseSchema.index({
  businessId: 1,
  branchId: 1,
  createdAt: -1,
});

// ==========================================
// SUPPLIER PURCHASE HISTORY
// ==========================================

purchaseSchema.index({
  businessId: 1,
  supplierId: 1,
  createdAt: -1,
});

// ==========================================
// STATUS FILTERING
// ==========================================

purchaseSchema.index({
  businessId: 1,
  status: 1,
  createdAt: -1,
});

// ==========================================
// PAYMENT STATUS FILTERING
// ==========================================

purchaseSchema.index({
  businessId: 1,
  paymentStatus: 1,
  createdAt: -1,
});

// ==========================================
// USER ACTIVITY
// ==========================================

purchaseSchema.index({
  businessId: 1,
  userId: 1,
  createdAt: -1,
});

const Purchase = mongoose.model(
  "Purchase",
  purchaseSchema
);

export default Purchase;
