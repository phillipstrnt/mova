
import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    // The business that owns this notification
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },

    // Optional branch associated with the notification
    // null means the notification applies to the whole business
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      default: null,
      index: true,
    },

    // Optional specific user
    // null means the notification is available to everyone
    // who has access to the relevant business/branch
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    // Notification category
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

    // Notification heading
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    // Notification message
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    // How important the notification is
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

    // Optional frontend route
    // Example: /inventory
    // Example: /users
    // Example: /sales
    link: {
      type: String,
      default: "",
      trim: true,
      maxlength: 300,
    },

    // Whether the notification has been read
    read: {
      type: Boolean,
      default: false,
      index: true,
    },

    // Date when it was read
    readAt: {
      type: Date,
      default: null,
    },

    // Extra information related to the notification
    // Example:
    // {
    //   productId: "...",
    //   productName: "Sugar",
    //   quantity: 3
    // }
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
|--------------------------------------------------------------------------
| Indexes
|--------------------------------------------------------------------------
*/

// Used when retrieving notifications for a specific user
// and calculating unread notifications.
notificationSchema.index({
  businessId: 1,
  userId: 1,
  read: 1,
  createdAt: -1,
});

// Used for branch-based notification filtering.
notificationSchema.index({
  businessId: 1,
  branchId: 1,
  createdAt: -1,
});

/*
|--------------------------------------------------------------------------
| Model
|--------------------------------------------------------------------------
|
| Prevents Mongoose from creating the model more than once
| when nodemon reloads files during development.
|
*/
const Notification =
  mongoose.models.Notification ||
  mongoose.model("Notification", notificationSchema);

export default Notification;