import mongoose from "mongoose";

const paymentTransactionSchema = new mongoose.Schema(
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
      required: true,
      index: true,
    },

    saleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sale",
      default: null,
      index: true,
    },

    cashierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    method: {
      type: String,
      enum: [
        "CASH",
        "CARD",
        "MOBILE_MONEY",
        "BANK_TRANSFER",
      ],
      required: true,
      index: true,
    },

    provider: {
      type: String,
      enum: [
        "NONE",
        "PESAPAL",
        "STANBIC",
        "ABSA",
        "FLUTTERWAVE",
        "MTN",
        "AIRTEL",
        "OTHER",
      ],
      default: "NONE",
      index: true,
    },

    terminalId: {
      type: String,
      trim: true,
      default: "",
    },

    terminalName: {
      type: String,
      trim: true,
      default: "",
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      trim: true,
      uppercase: true,
      default: "UGX",
    },

    status: {
      type: String,
      enum: [
        "PENDING",
        "PROCESSING",
        "APPROVED",
        "DECLINED",
        "CANCELLED",
        "FAILED",
        "REFUNDED",
      ],
      default: "PENDING",
      index: true,
    },

    transactionReference: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },

    providerReference: {
      type: String,
      trim: true,
      default: "",
    },

    authorizationCode: {
      type: String,
      trim: true,
      default: "",
    },

    paymentOption: {
      type: String,
      trim: true,
      default: "",
    },

    providerResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    failureReason: {
      type: String,
      trim: true,
      default: "",
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    processedAt: {
      type: Date,
      default: null,
    },

    verifiedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

paymentTransactionSchema.index({
  businessId: 1,
  branchId: 1,
  createdAt: -1,
});

paymentTransactionSchema.index({
  businessId: 1,
  branchId: 1,
  status: 1,
  createdAt: -1,
});

paymentTransactionSchema.index({
  businessId: 1,
  saleId: 1,
});

paymentTransactionSchema.index({
  businessId: 1,
  transactionReference: 1,
});

const PaymentTransaction = mongoose.model(
  "PaymentTransaction",
  paymentTransactionSchema
);

export default PaymentTransaction;