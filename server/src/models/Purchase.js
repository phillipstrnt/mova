import mongoose from "mongoose";

const purchaseItemSchema = new mongoose.Schema(
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

    buyingPrice: {
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

const purchaseSchema = new mongoose.Schema(
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

    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    purchaseNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    invoiceNumber: {
      type: String,
      trim: true,
      default: "",
    },

    items: {
      type: [purchaseItemSchema],
      required: true,
      validate: {
        validator: (items) =>
          items.length > 0,
        message:
          "A purchase must contain at least one item.",
      },
    },

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

    paymentStatus: {
      type: String,
      enum: [
        "PAID",
        "PENDING",
        "PARTIALLY_PAID",
      ],
      default: "PAID",
    },

    status: {
      type: String,
      enum: [
        "RECEIVED",
        "CANCELLED",
      ],
      default: "RECEIVED",
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

purchaseSchema.index({
  businessId: 1,
  createdAt: -1,
});

purchaseSchema.index({
  businessId: 1,
  supplierId: 1,
  createdAt: -1,
});

const Purchase = mongoose.model(
  "Purchase",
  purchaseSchema
);

export default Purchase;