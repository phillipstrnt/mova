
import mongoose from "mongoose";

const receiptSettingsSchema =
  new mongoose.Schema(
    {
      businessId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Business",
        required: true,
        unique: true,
        index: true,
      },

      prefix: {
        type: String,
        trim: true,
        uppercase: true,
        default: "MOVA",
      },

      footerMessage: {
        type: String,
        trim: true,
        default:
          "Thank you for shopping with us.",
      },

      showLogo: {
        type: Boolean,
        default: true,
      },

      showPhone: {
        type: Boolean,
        default: true,
      },

      showAddress: {
        type: Boolean,
        default: true,
      },

      showCashier: {
        type: Boolean,
        default: true,
      },
    },
    {
      timestamps: true,
    }
  );

const ReceiptSettings =
  mongoose.model(
    "ReceiptSettings",
    receiptSettingsSchema
  );

export default ReceiptSettings;