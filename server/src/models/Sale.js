import mongoose from "mongoose";

/*
|--------------------------------------------------------------------------
| SALE ITEM SCHEMA
|--------------------------------------------------------------------------
*/

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

/*
|--------------------------------------------------------------------------
| SALE SCHEMA
|--------------------------------------------------------------------------
*/

const saleSchema = new mongoose.Schema(
  {
    /*
    |--------------------------------------------------------------------------
    | BUSINESS
    |--------------------------------------------------------------------------
    */

    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | BRANCH
    |--------------------------------------------------------------------------
    |
    | Every sale belongs to a specific branch.
    |
    */

    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | CASHIER
    |--------------------------------------------------------------------------
    */

    cashierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | CUSTOMER
    |--------------------------------------------------------------------------
    */

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | RECEIPT
    |--------------------------------------------------------------------------
    */

    receiptNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    // Client-generated key makes a queued PWA sale safe to retry after a
    // timeout or interrupted connection without charging stock twice.
    offlineClientSaleId: {
      type: String,
      trim: true,
      default: undefined,
      maxlength: 100,
    },

    /*
    |--------------------------------------------------------------------------
    | ITEMS
    |--------------------------------------------------------------------------
    */

    items: {
      type: [saleItemSchema],

      required: true,

      validate: {
        validator: (items) =>
          Array.isArray(items) &&
          items.length > 0,

        message:
          "A sale must contain at least one item.",
      },
    },

    /*
    |--------------------------------------------------------------------------
    | TOTALS
    |--------------------------------------------------------------------------
    */

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

    loyaltyPointsEarned: {
      type: Number,
      min: 0,
      default: 0,
    },

    loyaltyPointsReversed: {
      type: Number,
      min: 0,
      default: 0,
    },

    loyaltyPointsRedeemed: {
      type: Number,
      min: 0,
      default: 0,
    },
    loyaltyPointsRestored: {
      type: Number,
      min: 0,
      default: 0,
    },

    total: {
      type: Number,
      required: true,
      min: 0,
    },

    /*
    |--------------------------------------------------------------------------
    | PAYMENT
    |--------------------------------------------------------------------------
    */

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
        "REFUNDED",
      ],

      default: "PAID",
    },

    /*
    |--------------------------------------------------------------------------
    | SALE STATUS
    |--------------------------------------------------------------------------
    */

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

    /*
    |--------------------------------------------------------------------------
    | NOTES
    |--------------------------------------------------------------------------
    */

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
|--------------------------------------------------------------------------
| INDEXES
|--------------------------------------------------------------------------
|
| These indexes are important because MOVA will frequently ask:
|
| "Show me sales for THIS business and THIS branch."
|
*/

/*
 * Business + branch + date
 */
saleSchema.index({
  businessId: 1,
  branchId: 1,
  createdAt: -1,
});

/*
 * Business + branch + payment method
 */
saleSchema.index({
  businessId: 1,
  branchId: 1,
  paymentMethod: 1,
});

/*
 * Business + branch + cashier
 */
saleSchema.index({
  businessId: 1,
  branchId: 1,
  cashierId: 1,
});

/*
 * Business + branch + customer + date
 */
saleSchema.index({
  businessId: 1,
  branchId: 1,
  customerId: 1,
  createdAt: -1,
});

/*
 * Business + receipt
 */
saleSchema.index({
  businessId: 1,
  receiptNumber: 1,
});

saleSchema.index(
  { businessId: 1, cashierId: 1, offlineClientSaleId: 1 },
  { unique: true, partialFilterExpression: { offlineClientSaleId: { $type: "string" } } }
);

/*
|--------------------------------------------------------------------------
| MODEL
|--------------------------------------------------------------------------
*/

const Sale = mongoose.model(
  "Sale",
  saleSchema
);

export default Sale;
