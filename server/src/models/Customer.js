// server/src/models/Customer.js

import mongoose from "mongoose";


// ============================================================
// CUSTOMER SCHEMA
// ============================================================

const customerSchema = new mongoose.Schema(
  {
    // ========================================================
    // BUSINESS
    // ========================================================

    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },


    // ========================================================
    // BRANCH
    // ========================================================

    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
      index: true,
    },


    // ========================================================
    // CUSTOMER NAME
    // ========================================================

    name: {
      type: String,
      required: true,
      trim: true,
    },


    // ========================================================
    // PHONE
    // ========================================================

    phone: {
      type: String,
      trim: true,
      default: "",
    },


    // ========================================================
    // EMAIL
    // ========================================================

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },


    // ========================================================
    // ADDRESS
    // ========================================================

    address: {
      type: String,
      trim: true,
      default: "",
    },


    // ========================================================
    // CREDIT LIMIT
    // ========================================================

    creditLimit: {
      type: Number,
      min: 0,
      default: 0,
    },


    // ========================================================
    // OUTSTANDING BALANCE
    // ========================================================

    outstandingBalance: {
      type: Number,
      min: 0,
      default: 0,
    },


    // ========================================================
    // TOTAL ORDERS
    // ========================================================

    totalOrders: {
      type: Number,
      min: 0,
      default: 0,
    },


    // ========================================================
    // TOTAL SPENT
    // ========================================================

    totalSpent: {
      type: Number,
      min: 0,
      default: 0,
    },

    loyaltyPoints: {
      type: Number,
      min: 0,
      default: 0,
    },

    lifetimeLoyaltyPoints: {
      type: Number,
      min: 0,
      default: 0,
    },


    // ========================================================
    // NOTES
    // ========================================================

    notes: {
      type: String,
      trim: true,
      default: "",
    },


    // ========================================================
    // ACTIVE STATUS
    // ========================================================

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


// ============================================================
// INDEXES
// ============================================================

// Business + branch + name
customerSchema.index({
  businessId: 1,
  branchId: 1,
  name: 1,
});


// Business + branch + phone
customerSchema.index({
  businessId: 1,
  branchId: 1,
  phone: 1,
});


// Business + branch + email
customerSchema.index({
  businessId: 1,
  branchId: 1,
  email: 1,
});


// Business + branch + active status
customerSchema.index({
  businessId: 1,
  branchId: 1,
  isActive: 1,
});


// ============================================================
// MODEL
// ============================================================

const Customer = mongoose.model(
  "Customer",
  customerSchema
);

export default Customer;
