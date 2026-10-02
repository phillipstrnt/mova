import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
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

    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0.01,
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

    reference: {
      type: String,
      trim: true,
      default: "",
    },

    notes: {
      type: String,
      trim: true,
      default: "",
    },

    status: {
      type: String,
      enum: [
        "COMPLETED",
        "CANCELLED",
        "REFUNDED",
      ],
      default: "COMPLETED",
      index: true,
    },

    paymentDate: {
      type: Date,
      default: Date.now,
      index: true,
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
*/

paymentSchema.index({
  businessId: 1,
  paymentDate: -1,
});

paymentSchema.index({
  businessId: 1,
  saleId: 1,
});

paymentSchema.index({
  businessId: 1,
  paymentMethod: 1,
});

paymentSchema.index({
  businessId: 1,
  status: 1,
});

paymentSchema.index({
  businessId: 1,
  customerId: 1,
});

/*
|--------------------------------------------------------------------------
| MODEL
|--------------------------------------------------------------------------
*/

const Payment = mongoose.model(
  "Payment",
  paymentSchema
);

export default Payment;