import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },

    /*
     * Legacy single-branch field.
     *
     * We keep this because some existing MOVA modules
     * may still depend on branchId.
     */
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      default: null,
      index: true,
    },

    /*
     * Branches this user is authorized to access.
     */
    branchIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Branch",
      },
    ],

    /*
     * Branch currently being used by the user.
     */
    activeBranchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      default: null,
      index: true,
    },

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

    phone: {
      type: String,
      trim: true,
      default: "",
    },

    status: {
      type: String,
      enum: [
        "ACTIVE",
        "INACTIVE",
        "SUSPENDED",
      ],
      default: "ACTIVE",
    },

    lastLoginAt: {
      type: Date,
      default: null,
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

/*
 * A user email only needs to be unique inside
 * a particular business.
 */
userSchema.index(
  { businessId: 1, email: 1 },
  { unique: true }
);

userSchema.index({
  businessId: 1,
  branchIds: 1,
});

userSchema.index({
  businessId: 1,
  activeBranchId: 1,
});

const User = mongoose.model(
  "User",
  userSchema
);

export default User;