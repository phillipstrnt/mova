import bcrypt from "bcryptjs";

import User from "../models/User.js";
import Business from "../models/Business.js";
import Branch from "../models/Branch.js";
import crypto from "crypto";
import sendPasswordResetEmail from "../utils/emailService.js";

import generateToken from "../utils/generateToken.js";

// ======================================================
// REGISTER BUSINESS + OWNER
// ======================================================

const registerBusiness = async (req, res) => {
  try {
    const {
      businessName,
      businessType,
      ownerName,
      email,
      password,
      phone,
    } = req.body;

    // ------------------------------------------
    // VALIDATION
    // ------------------------------------------

    if (
      !businessName ||
      !businessType ||
      !ownerName ||
      !email ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Business name, business type, owner name, email and password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message:
          "Password must contain at least 6 characters",
      });
    }

    // ------------------------------------------
    // NORMALIZE EMAIL
    // ------------------------------------------

    const normalizedEmail =
      email.trim().toLowerCase();

    // ------------------------------------------
    // CHECK EXISTING USER
    // ------------------------------------------

    const existingUser =
      await User.findOne({
        email: normalizedEmail,
      });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message:
          "An account with this email already exists",
      });
    }

    // ------------------------------------------
    // CREATE BUSINESS
    // ------------------------------------------

    const business =
      await Business.create({
        name: businessName.trim(),
        businessType:
          businessType.trim(),
        email: normalizedEmail,
        phone: phone?.trim() || "",
      });

    let branch = null;
    let user = null;

    try {
      // ----------------------------------------
      // CREATE MAIN BRANCH
      // ----------------------------------------

      branch =
        await Branch.create({
          businessId: business._id,
          name: "Main Branch",
          code: "MAIN",
          phone: phone?.trim() || "",
        });

      // ----------------------------------------
      // HASH PASSWORD
      // ----------------------------------------

      const passwordHash =
        await bcrypt.hash(
          password,
          12
        );

      // ----------------------------------------
      // CREATE OWNER
      // ----------------------------------------

      user =
        await User.create({
          businessId:
            business._id,

          // Existing compatibility field
          branchId:
            branch._id,

          // New multi-branch access
          branchIds: [
            branch._id,
          ],

          // Current branch
          activeBranchId:
            branch._id,

          name:
            ownerName.trim(),

          email:
            normalizedEmail,

          passwordHash,

          role: "OWNER",

          phone:
            phone?.trim() || "",
        });

      // ----------------------------------------
      // UPDATE BUSINESS OWNER
      // ----------------------------------------

      business.ownerId =
        user._id;

      await business.save();

      // ----------------------------------------
      // GENERATE TOKEN
      // ----------------------------------------

      const token =
        generateToken(user);

      return res.status(201).json({
        success: true,

        message:
          "MOVA business created successfully",

        token,

        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,

          businessId:
            user.businessId,

          branchId:
            user.branchId,

          branchIds:
            user.branchIds,

          activeBranchId:
            user.activeBranchId,
        },

        business: {
          id: business._id,
          name: business.name,
          businessType:
            business.businessType,
        },

        branch: {
          id: branch._id,
          name: branch.name,
          code: branch.code,
        },

        branches: [
          {
            id: branch._id,
            name: branch.name,
            code: branch.code,
          },
        ],
      });
    } catch (creationError) {
      // ----------------------------------------
      // CLEAN UP CREATED DATA
      // ----------------------------------------

      if (user?._id) {
        await User.findByIdAndDelete(
          user._id
        );
      }

      if (branch?._id) {
        await Branch.findByIdAndDelete(
          branch._id
        );
      }

      await Business.findByIdAndDelete(
        business._id
      );

      throw creationError;
    }
  } catch (error) {
    console.error(
      "Business registration error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to create MOVA business",
      error: error.message,
    });
  }
};

// ======================================================
// LOGIN
// ======================================================

const login = async (req, res) => {
  try {
    const {
      email,
      password,
    } = req.body;

    // ------------------------------------------
    // VALIDATION
    // ------------------------------------------

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Email and password are required",
      });
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    // ------------------------------------------
    // FIND USER
    // ------------------------------------------

    const user =
      await User.findOne({
        email: normalizedEmail,
      });

    if (!user) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password",
      });
    }

    // ------------------------------------------
    // ACCOUNT STATUS
    // ------------------------------------------

    if (user.status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        message:
          "Your account is not active",
      });
    }

    // ------------------------------------------
    // PASSWORD
    // ------------------------------------------

    const passwordMatches =
      await bcrypt.compare(
        password,
        user.passwordHash
      );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password",
      });
    }

    // ======================================================
// FORGOT PASSWORD
// ======================================================

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    /*
     * Always return the same message.
     *
     * This prevents attackers from discovering
     * which email addresses have MOVA accounts.
     */
    const genericMessage =
      "If an account exists for that email, a password reset link has been sent.";

    if (!email) {
      return res.status(200).json({
        success: true,
        message: genericMessage,
      });
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    const user =
      await User.findOne({
        email: normalizedEmail,
      }).select(
        "+passwordResetToken +passwordResetExpires"
      );

    if (!user) {
      return res.status(200).json({
        success: true,
        message: genericMessage,
      });
    }

    /*
     * Generate a cryptographically secure
     * random token.
     *
     * The raw token goes ONLY to the user.
     */
    const resetToken =
      crypto.randomBytes(32).toString("hex");

    /*
     * Store only a SHA-256 hash of the token.
     *
     * If the database is compromised, the attacker
     * cannot directly use the stored value as the
     * reset token.
     */
    const resetTokenHash =
      crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

    user.passwordResetToken =
      resetTokenHash;

    /*
     * Reset link expires after 15 minutes.
     */
    user.passwordResetExpires =
      new Date(
        Date.now() + 15 * 60 * 1000
      );

    await user.save({
      validateBeforeSave: false,
    });

    /*
     * Frontend URL.
     */
    const clientUrl =
      process.env.CLIENT_URL ||
      "http://localhost:5173";

    const resetUrl =
      `${clientUrl}/reset-password/${resetToken}`;

    try {
      await sendPasswordResetEmail({
        email: user.email,
        name: user.name,
        resetUrl,
      });
    } catch (emailError) {
      /*
       * If email delivery fails, invalidate
       * the reset token so it cannot be used.
       */
      user.passwordResetToken = null;
      user.passwordResetExpires = null;

      await user.save({
        validateBeforeSave: false,
      });

      console.error(
        "Password reset email failed:",
        emailError
      );

      /*
       * Do not expose SMTP details to the client.
       */
      return res.status(200).json({
        success: true,
        message: genericMessage,
      });
    }

    return res.status(200).json({
      success: true,
      message: genericMessage,
    });
  } catch (error) {
    console.error(
      "Forgot password error:",
      error
    );

    return res.status(200).json({
      success: true,
      message:
        "If an account exists for that email, a password reset link has been sent.",
    });
  }
};

// ======================================================
// RESET PASSWORD
// ======================================================

const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message:
          "Password reset token is required.",
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message:
          "New password is required.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message:
          "Password must contain at least 6 characters.",
      });
    }

    /*
     * Hash the token received from the URL.
     */
    const tokenHash =
      crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

    /*
     * Find the account with:
     *
     * 1. Matching reset token
     * 2. Token that has not expired
     */
    const user =
      await User.findOne({
        passwordResetToken: tokenHash,
        passwordResetExpires: {
          $gt: new Date(),
        },
      }).select(
        "+passwordResetToken +passwordResetExpires"
      );

    if (!user) {
      return res.status(400).json({
        success: false,
        message:
          "This password reset link is invalid or has expired.",
      });
    }

    /*
     * Hash the new password using bcrypt.
     */
    const passwordHash =
      await bcrypt.hash(
        password,
        12
      );

    user.passwordHash =
      passwordHash;

    /*
     * Invalidate the reset token immediately.
     *
     * This makes the reset link one-time use.
     */
    user.passwordResetToken =
      null;

    user.passwordResetExpires =
      null;

    await user.save();

    return res.status(200).json({
      success: true,
      message:
        "Your password has been reset successfully. You can now sign in.",
    });
  } catch (error) {
    console.error(
      "Reset password error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to reset your password.",
    });
  }
};

    // ------------------------------------------
    // GET USER BRANCHES
    // ------------------------------------------

    let branchIds =
      Array.isArray(user.branchIds)
        ? user.branchIds
        : [];

    // ------------------------------------------
    // BACKWARD COMPATIBILITY
    // ------------------------------------------

    // Existing users may only have branchId.

    if (
      branchIds.length === 0 &&
      user.branchId
    ) {
      branchIds = [
        user.branchId,
      ];

      user.branchIds =
        branchIds;
    }

    // ------------------------------------------
    // DETERMINE ACTIVE BRANCH
    // ------------------------------------------

    let activeBranchId =
      user.activeBranchId ||
      user.branchId ||
      branchIds[0] ||
      null;

    // Make sure the active branch is actually
    // one of the branches the user can access.

    if (
      activeBranchId &&
      !branchIds.some(
        (id) =>
          id.toString() ===
          activeBranchId.toString()
      )
    ) {
      activeBranchId =
        branchIds[0] || null;
    }

    // ------------------------------------------
    // KEEP LEGACY FIELD SYNCHRONIZED
    // ------------------------------------------

    if (activeBranchId) {
      user.branchId =
        activeBranchId;

      user.activeBranchId =
        activeBranchId;
    }

    // ------------------------------------------
    // UPDATE LAST LOGIN
    // ------------------------------------------

    user.lastLoginAt =
      new Date();

    await user.save();

    // ------------------------------------------
    // BUSINESS
    // ------------------------------------------

    const business =
      await Business.findById(
        user.businessId
      ).select("-__v");

    // ------------------------------------------
    // BRANCHES
    // ------------------------------------------

    const branches =
      branchIds.length > 0
        ? await Branch.find({
            _id: {
              $in: branchIds,
            },
            businessId:
              user.businessId,
            isActive: true,
          }).select("-__v")
        : [];

    // ------------------------------------------
    // ACTIVE BRANCH
    // ------------------------------------------

    const branch =
      activeBranchId
        ? branches.find(
            (item) =>
              item._id.toString() ===
              activeBranchId.toString()
          ) ||
          (await Branch.findById(
            activeBranchId
          ).select("-__v"))
        : null;

    // ------------------------------------------
    // TOKEN
    // ------------------------------------------

    const token =
      generateToken(user);

    // ------------------------------------------
    // RESPONSE
    // ------------------------------------------

    return res.status(200).json({
      success: true,

      message:
        "Login successful",

      token,

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,

        businessId:
          user.businessId,

        branchId:
          user.branchId,

        branchIds:
          user.branchIds,

        activeBranchId:
          user.activeBranchId,

        phone:
          user.phone,

        status:
          user.status,
      },

      business,

      branch,

      branches,
    });
  } catch (error) {
    console.error(
      "Login error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to login",
    });
  }
};

// ======================================================
// GET CURRENT USER
// ======================================================

const getMe = async (
  req,
  res
) => {
  try {
    // ------------------------------------------
    // BUSINESS
    // ------------------------------------------

    const business =
      await Business.findById(
        req.user.businessId
      ).select("-__v");

    // ------------------------------------------
    // DETERMINE BRANCH ACCESS
    // ------------------------------------------

    let branchIds =
      Array.isArray(req.user.branchIds)
        ? req.user.branchIds
        : [];

    if (
      branchIds.length === 0 &&
      req.user.branchId
    ) {
      branchIds = [
        req.user.branchId,
      ];
    }

    // ------------------------------------------
    // ACTIVE BRANCH
    // ------------------------------------------

    const activeBranchId =
      req.user.activeBranchId ||
      req.user.branchId ||
      branchIds[0] ||
      null;

    // ------------------------------------------
    // LOAD BRANCHES
    // ------------------------------------------

    const branches =
      branchIds.length > 0
        ? await Branch.find({
            _id: {
              $in: branchIds,
            },
            businessId:
              req.user.businessId,
            isActive: true,
          }).select("-__v")
        : [];

    // ------------------------------------------
    // ACTIVE BRANCH OBJECT
    // ------------------------------------------

    const branch =
      activeBranchId
        ? branches.find(
            (item) =>
              item._id.toString() ===
              activeBranchId.toString()
          ) || null
        : null;

    // ------------------------------------------
    // RESPONSE
    // ------------------------------------------

    return res.status(200).json({
      success: true,

      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,

        businessId:
          req.user.businessId,

        branchId:
          req.user.branchId,

        branchIds,

        activeBranchId,

        phone:
          req.user.phone,

        status:
          req.user.status,
      },

      business,

      branch,

      branches,
    });
  } catch (error) {
    console.error(
      "Get current user error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to retrieve account information",
    });
  }
};

export {
  registerBusiness,
  login,
  forgotPassword,
  resetPassword,
  getMe,
};