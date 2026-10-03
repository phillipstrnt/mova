import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    // ==========================================
    // BUSINESS
    // ==========================================

    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },

    // ==========================================
    // LEGACY / PRIMARY BRANCH
    // ==========================================
    // Kept for compatibility with the current
    // MOVA system. New code should gradually
    // use branchIds + activeBranchId.

    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      default: null,
      index: true,
    },

    // ==========================================
    // AUTHORIZED BRANCHES
    // ==========================================
    // Branches this user is allowed to access.

    branchIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Branch",
      },
    ],

    // ==========================================
    // ACTIVE BRANCH
    // ==========================================
    // The branch currently selected by the user.

    activeBranchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      default: null,
      index: true,
    },

    // ==========================================
    // USER INFORMATION
    // ==========================================

    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    passwordHash: {
      type: String,
      required: true,
    },

    // ==========================================
    // ROLE
    // ==========================================

    role: {
      type: String,
      enum: [
        "OWNER",
        "ADMIN",
        "MANAGER",
        "CASHIER",
        "INVENTORY_MANAGER",
        "ACCOUNTANT",
      ],
      default: "CASHIER",
    },

    // ==========================================
    // CONTACT
    // ==========================================

    phone: {
      type: String,
      trim: true,
      default: "",
    },

    // ==========================================
    // ACCOUNT STATUS
    // ==========================================

    status: {
      type: String,
      enum: [
        "ACTIVE",
        "INACTIVE",
        "SUSPENDED",
      ],
      default: "ACTIVE",
    },

    // ==========================================
    // LOGIN INFORMATION
    // ==========================================

    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ==========================================
// UNIQUE EMAIL PER BUSINESS
// ==========================================

userSchema.index(
  {
    businessId: 1,
    email: 1,
  },
  {
    unique: true,
  }
);

const User = mongoose.model(
  "User",
  userSchema
);

export default User;