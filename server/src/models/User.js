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

    /*
     * NEVER store plain-text passwords.
     */
    passwordHash: {
      type: String,
      required: false,
      default: null,
    },

    googleId: {
      type: String,
      default: undefined,
      select: false,
    },

    /*
     * Password reset security.
     *
     * We store the HASH of the reset token here.
     * The actual token is only sent to the user's email.
     */
    passwordResetToken: {
      type: String,
      default: null,
      select: false,
    },

    // Keyed hash of the one-time code emailed during password recovery.
    passwordResetCode: {
      type: String,
      default: null,
      select: false,
    },

    passwordResetExpires: {
      type: Date,
      default: null,
      select: false,
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

    profileImage: {
      type: String,
      default: "",
      maxlength: 700000,
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
| INDEXES
|--------------------------------------------------------------------------
*/

userSchema.index(
  {
    businessId: 1,
    email: 1,
  },
  {
    unique: true,
  }
);

userSchema.index({
  businessId: 1,
  branchIds: 1,
});

userSchema.index({
  businessId: 1,
  activeBranchId: 1,
});

userSchema.index(
  { googleId: 1 },
  { unique: true, sparse: true }
);

/*
 * Automatically remove expired reset-token records
 * after they are no longer useful.
 *
 * This is NOT the only security check.
 * The controller also checks the expiration time.
 */
userSchema.index(
  {
    passwordResetExpires: 1,
  },
  {
    expireAfterSeconds: 0,
  }
);

const User = mongoose.model(
  "User",
  userSchema
);

export default User;
