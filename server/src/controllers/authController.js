import bcrypt from "bcryptjs";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";

import User from "../models/User.js";
import Business from "../models/Business.js";
import Branch from "../models/Branch.js";

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
        businessType: businessType.trim(),
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
        await bcrypt.hash(password, 12);

      // ----------------------------------------
      // CREATE OWNER
      // ----------------------------------------

      user =
        await User.create({
          businessId: business._id,

          // Existing compatibility field
          branchId: branch._id,

          // Multi-branch access
          branchIds: [branch._id],

          // Current branch
          activeBranchId: branch._id,

          name: ownerName.trim(),

          email: normalizedEmail,

          passwordHash,

          role: "OWNER",

          phone: phone?.trim() || "",
        });

      // ----------------------------------------
      // UPDATE BUSINESS OWNER
      // ----------------------------------------

      business.ownerId = user._id;

      await business.save();

      // ----------------------------------------
      // GENERATE TOKEN
      // ----------------------------------------

      const token = generateToken(user);

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

          businessId: user.businessId,

          branchId: user.branchId,

          branchIds: user.branchIds,

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
      Boolean(user.passwordHash) &&
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

    if (
      branchIds.length === 0 &&
      user.branchId
    ) {
      branchIds = [
        user.branchId,
      ];

      user.branchIds = branchIds;
    }

    // ------------------------------------------
    // DETERMINE ACTIVE BRANCH
    // ------------------------------------------

    let activeBranchId =
      user.activeBranchId ||
      user.branchId ||
      branchIds[0] ||
      null;

    // ------------------------------------------
    // VERIFY ACTIVE BRANCH ACCESS
    // ------------------------------------------

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

        profileImage:
          user.profileImage || "",

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
// GOOGLE SIGN-IN / BUSINESS REGISTRATION
// ======================================================

const googleClient = new OAuth2Client();

const googleAuth = async (req, res) => {
  try {
    const {
      credential,
      businessName,
      businessType,
      ownerName,
      phone,
    } = req.body || {};

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return res.status(503).json({
        success: false,
        message: "Google sign-in is not configured yet.",
      });
    }
    if (!credential) {
      return res.status(400).json({
        success: false,
        message: "Google sign-in could not be verified. Please try again.",
      });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: clientId,
    });
    const profile = ticket.getPayload();
    if (!profile?.sub || !profile.email || profile.email_verified !== true) {
      return res.status(401).json({
        success: false,
        message: "Use a Google account with a verified email address.",
      });
    }

    const email = profile.email.trim().toLowerCase();
    let user = await User.findOne({ googleId: profile.sub }).select("+googleId");
    if (!user) {
      user = await User.findOne({ email }).select("+googleId");
    }

    let business = null;
    let branch = null;
    let createdBusiness = null;

    if (!user) {
      if (!businessName?.trim() || !businessType?.trim()) {
        return res.status(409).json({
          success: false,
          code: "GOOGLE_REGISTRATION_REQUIRED",
          message: "Add your business details to finish creating your MOVA account.",
          profile: {
            name: profile.name || profile.given_name || "",
            email,
            picture: profile.picture || "",
          },
        });
      }

      createdBusiness = await Business.create({
        name: businessName.trim(),
        businessType: businessType.trim(),
        email,
        phone: phone?.trim() || "",
      });

      try {
        branch = await Branch.create({
          businessId: createdBusiness._id,
          name: "Main Branch",
          code: "MAIN",
          phone: phone?.trim() || "",
        });

        user = await User.create({
          businessId: createdBusiness._id,
          branchId: branch._id,
          branchIds: [branch._id],
          activeBranchId: branch._id,
          name: ownerName?.trim() || profile.name || profile.given_name || email,
          email,
          passwordHash: null,
          googleId: profile.sub,
          phone: phone?.trim() || "",
          profileImage: profile.picture || "",
          role: "OWNER",
          status: "ACTIVE",
          lastLoginAt: new Date(),
        });

        createdBusiness.ownerId = user._id;
        await createdBusiness.save();
      } catch (creationError) {
        if (user?._id) await User.findByIdAndDelete(user._id);
        if (branch?._id) await Branch.findByIdAndDelete(branch._id);
        await Business.findByIdAndDelete(createdBusiness._id);
        throw creationError;
      }
    } else {
      if (user.status !== "ACTIVE") {
        return res.status(403).json({
          success: false,
          message: "Your account is not active. Contact your business administrator.",
        });
      }
      if (user.googleId && user.googleId !== profile.sub) {
        return res.status(409).json({
          success: false,
          message: "This email is linked to a different Google account.",
        });
      }

      user.googleId = profile.sub;
      if (!user.profileImage && profile.picture) {
        user.profileImage = profile.picture;
      }
      user.lastLoginAt = new Date();
      await user.save();
    }

    const branchIds = Array.isArray(user.branchIds) && user.branchIds.length
      ? user.branchIds
      : user.branchId ? [user.branchId] : [];
    const activeBranchId = user.activeBranchId || user.branchId || branchIds[0] || null;
    branch = branch || (activeBranchId
      ? await Branch.findOne({
          _id: activeBranchId,
          businessId: user.businessId,
          isActive: true,
        }).select("-__v")
      : null);
    business = createdBusiness || await Business.findById(user.businessId).select("-__v");
    const branches = branchIds.length
      ? await Branch.find({
          _id: { $in: branchIds },
          businessId: user.businessId,
          isActive: true,
        }).select("-__v")
      : [];

    return res.status(createdBusiness ? 201 : 200).json({
      success: true,
      message: createdBusiness ? "MOVA account created successfully." : "Google sign-in successful.",
      token: generateToken(user),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        businessId: user.businessId,
        branchId: activeBranchId,
        branchIds,
        activeBranchId,
        phone: user.phone,
        profileImage: user.profileImage || "",
        status: user.status,
      },
      business,
      branch,
      branches,
    });
  } catch (error) {
    console.error("Google authentication error:", error);
    return res.status(401).json({
      success: false,
      message: "Google sign-in could not be completed. Please try again.",
    });
  }
};

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

    // ------------------------------------------
    // GENERATE SECURE RESET TOKEN
    // ------------------------------------------

    const resetToken =
      crypto
        .randomBytes(32)
        .toString("hex");

    // ------------------------------------------
    // HASH TOKEN BEFORE DATABASE STORAGE
    // ------------------------------------------

    const resetTokenHash =
      crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

    user.passwordResetToken =
      resetTokenHash;

    // ------------------------------------------
    // TOKEN EXPIRATION
    // ------------------------------------------

    user.passwordResetExpires =
      new Date(
        Date.now() + 15 * 60 * 1000
      );

    await user.save({
      validateBeforeSave: false,
    });

    // ------------------------------------------
    // RESET URL
    // ------------------------------------------

    const clientUrl =
      process.env.CLIENT_URL ||
      "http://localhost:5173";

    const resetUrl =
      `${clientUrl}/reset-password/${resetToken}`;

    // ------------------------------------------
    // SEND EMAIL
    // ------------------------------------------

    try {
      await sendPasswordResetEmail({
        email: user.email,
        name: user.name,
        resetUrl,
      });
    } catch (emailError) {
      /*
       * Invalidate the token if email delivery fails.
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
       * Don't expose SMTP details to the client.
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

    /*
     * Keep the response generic.
     */
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

    // ------------------------------------------
    // VALIDATION
    // ------------------------------------------

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

    // ------------------------------------------
    // HASH TOKEN FROM URL
    // ------------------------------------------

    const tokenHash =
      crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

    // ------------------------------------------
    // FIND VALID RESET TOKEN
    // ------------------------------------------

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

    // ------------------------------------------
    // HASH NEW PASSWORD
    // ------------------------------------------

    const passwordHash =
      await bcrypt.hash(
        password,
        12
      );

    user.passwordHash =
      passwordHash;

    // ------------------------------------------
    // INVALIDATE RESET TOKEN
    // ------------------------------------------

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

        profileImage:
          req.user.profileImage || "",

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

// ======================================================
// EXPORTS
// ======================================================

export {
  registerBusiness,
  login,
  googleAuth,
  forgotPassword,
  resetPassword,
  getMe,
};
