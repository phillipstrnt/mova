import mongoose from "mongoose";

const saleItemSchema = new mongoose.Schema(
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

const saleSchema = new mongoose.Schema(
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

    cashierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
      index: true,
    },

    receiptNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    items: {
      type: [saleItemSchema],
      required: true,
      validate: {
        validator: (items) =>
          items.length > 0,

        message:
          "A sale must contain at least one item.",
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
      ],
      required: true,
    },

    paymentStatus: {
      type: String,
      enum: [
        "PAID",
        "PENDING",
        "REFUNDED",
      ],
      default: "PAID",
    },

    status: {
      type: String,
      enum: [
        "COMPLETED",
        "CANCELLED",
        "PARTIALLY_REFUNDED",
        "REFUNDED",
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

/*
 * Business + date
 */
saleSchema.index({
  businessId: 1,
  createdAt: -1,
});

/*
 * Business + payment method
 */
saleSchema.index({
  businessId: 1,
  paymentMethod: 1,
});

/*
 * Business + cashier
 */
saleSchema.index({
  businessId: 1,
  cashierId: 1,
});

/*
 * Business + customer + date
 */
saleSchema.index({
  businessId: 1,
  customerId: 1,
  createdAt: -1,
});

const Sale = mongoose.model(
  "Sale",
  saleSchema
);

export default Sale;