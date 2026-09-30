import mongoose from "mongoose";

const customerSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      trim: true,
      default: "",
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },

    address: {
      type: String,
      trim: true,
      default: "",
    },

    creditLimit: {
      type: Number,
      min: 0,
      default: 0,
    },

    outstandingBalance: {
      type: Number,
      min: 0,
      default: 0,
    },

    totalOrders: {
      type: Number,
      min: 0,
      default: 0,
    },

    totalSpent: {
      type: Number,
      min: 0,
      default: 0,
    },

    notes: {
      type: String,
      trim: true,
      default: "",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

customerSchema.index({
  businessId: 1,
  name: 1,
});

customerSchema.index({
  businessId: 1,
  phone: 1,
});

customerSchema.index({
  businessId: 1,
  email: 1,
});

const Customer = mongoose.model(
  "Customer",
  customerSchema
);

export default Customer;