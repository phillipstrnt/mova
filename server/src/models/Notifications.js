
import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
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

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    type: {
      type: String,
      enum: [
        "LOW_STOCK",
        "OUT_OF_STOCK",
        "SALE",
        "PAYMENT",
        "RETURN",
        "USER",
        "PURCHASE",
        "EXPENSE",
        "SYSTEM",
      ],
      default: "SYSTEM",
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    priority: {
      type: String,
      enum: [
        "LOW",
        "NORMAL",
        "HIGH",
        "CRITICAL",
      ],
      default: "NORMAL",
    },

    link: {
      type: String,
      default: "",
      trim: true,
      maxlength: 300,
    },

    read: {
      type: Boolean,
      default: false,
      index: true,
    },

    readAt: {
      type: Date,
      default: null,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

/*
|----------------------------------------------------------------------
| INDEXES
|----------------------------------------------------------------------
*/

notificationSchema.index({
  businessId: 1,
  userId: 1,
  read: 1,
  createdAt: -1,
});

notificationSchema.index({
  businessId: 1,
  branchId: 1,
  createdAt: -1,
});

/*
|----------------------------------------------------------------------
| MODEL
|----------------------------------------------------------------------
*/

const Notification =
  mongoose.models.Notification ||
  mongoose.model(
    "Notification",
    notificationSchema
  );

export default Notification;