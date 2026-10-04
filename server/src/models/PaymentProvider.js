import mongoose from "mongoose";

const paymentProviderSchema = new mongoose.Schema(
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

    provider: {
      type: String,
      enum: [
        "PESAPAL",
        "STANBIC",
        "ABSA",
        "FLUTTERWAVE",
        "MTN",
        "AIRTEL",
        "OTHER",
      ],
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },

    displayName: {
      type: String,
      required: true,
      trim: true,
    },

    terminalId: {
      type: String,
      trim: true,
      default: "",
    },

    supportsCard: {
      type: Boolean,
      default: false,
    },

    supportsMobileMoney: {
      type: Boolean,
      default: false,
    },

    supportsBankTransfer: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

paymentProviderSchema.index({
  businessId: 1,
  branchId: 1,
  provider: 1,
});

paymentProviderSchema.index({
  businessId: 1,
  branchId: 1,
  isActive: 1,
});

const PaymentProvider = mongoose.model(
  "PaymentProvider",
  paymentProviderSchema
);

export default PaymentProvider;