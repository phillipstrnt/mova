import bcrypt from "bcryptjs";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";

import User from "../models/User.js";
import Business from "../models/Business.js";
import Branch from "../models/Branch.js";

import sendPasswordResetEmail from "../utils/emailService.js";
import generateToken from "../utils/generateToken.js";
import { isValidEmail, normalizeEmail } from "../utils/emailValidation.js";

const hashPasswordResetCode = (email, code) => {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET must be configured to issue password reset codes.");
  return crypto.createHmac("sha256", process.env.JWT_SECRET).update(`${email}:${code}`).digest("hex");
};

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
      typeof password !== "string" ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Business name, business type, owner name, email and password are required",
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    if (password.length < 8 || Buffer.byteLength(password, "utf8") > 72) {
      return res.status(400).json({
        success: false,
        message:
          "Password must contain at least 8 characters and no more than 72 UTF-8 bytes.",
      });
    }

    // ------------------------------------------
    // NORMALIZE EMAIL
    // ------------------------------------------

    const normalizedEmail = normalizeEmail(email);

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

    if (
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Email and password are required",
      });
    }

    const normalizedEmail = normalizeEmail(email);

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
    if (
      !profile?.sub ||
      !isValidEmail(profile.email) ||
      profile.email_verified !== true
    ) {
      return res.status(401).json({
        success: false,
        message: "Use a Google account with a verified email address.",
      });
    }

    const email = normalizeEmail(profile.email);
    let user = await User.findOne({ googleId: profile.sub }).select("+googleId");
    let matchedByEmail = false;
    if (!user) {
      const emailMatches = await User.find({ email }).select("+googleId").limit(2);
      if (emailMatches.length > 1) {
        return res.status(409).json({
          success: false,
          code: "GOOGLE_EMAIL_AMBIGUOUS",
          message: "This email is used by more than one MOVA account. Sign in with your MOVA email and password.",
        });
      }
      user = emailMatches[0] || null;
      matchedByEmail = Boolean(user);
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

      if (matchedByEmail && !user.googleId) {
        const emailDomain = email.split("@")[1] || "";
        const isGmail = emailDomain === "gmail.com";
        const isVerifiedWorkspaceEmail =
          Boolean(profile.hd) && profile.hd.toLowerCase() === emailDomain;
        if (!isGmail && !isVerifiedWorkspaceEmail) {
          return res.status(409).json({
            success: false,
            code: "GOOGLE_LINK_REQUIRES_PASSWORD",
            message: "This email matches an existing MOVA account. Sign in with your MOVA email and password instead.",
          });
        }
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
      "If an account exists for that email, a password reset verification code has been sent.";

    // Check delivery configuration before account lookup so this status never
    // reveals whether a submitted address belongs to a MOVA account.
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      return res.status(503).json({
        success: false,
        message: "Password reset email is not configured yet. Please contact MOVA support or try again later.",
      });
    }

    if (typeof email !== "string" || !isValidEmail(email)) {
      return res.status(200).json({
        success: true,
        message: genericMessage,
      });
    }

    const normalizedEmail = normalizeEmail(email);

    const user =
      await User.findOne({
        email: normalizedEmail,
      }).select(
        "+passwordResetToken +passwordResetCode +passwordResetExpires"
      );

    if (!user) {
      return res.status(200).json({
        success: true,
        message: genericMessage,
      });
    }

    // ------------------------------------------
    // Generate a one-time code and store only its keyed hash.
    const verificationCode = String(crypto.randomInt(100000, 1000000));
    const resetCodeHash = hashPasswordResetCode(normalizedEmail, verificationCode);
    user.passwordResetToken = null;
    user.passwordResetCode = resetCodeHash;

    // TOKEN EXPIRATION
    // ------------------------------------------

    user.passwordResetExpires =
      new Date(
        Date.now() + 10 * 60 * 1000
      );

    await user.save({
      validateBeforeSave: false,
    });

    // ------------------------------------------
    // ------------------------------------------
    // SEND EMAIL
    // ------------------------------------------

    try {
      await sendPasswordResetEmail({
        email: user.email,
        name: user.name,
        verificationCode,
      });
    } catch (emailError) {
      /*
       * Invalidate the token if email delivery fails.
       */
      user.passwordResetToken = null;
      user.passwordResetCode = null;
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
        "If an account exists for that email, a password reset verification code has been sent.",
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

    if (typeof password !== "string" || !password) {
      return res.status(400).json({
        success: false,
        message:
          "New password is required.",
      });
    }

    if (password.length < 8 || Buffer.byteLength(password, "utf8") > 72) {
      return res.status(400).json({
        success: false,
        message:
          "Password must contain at least 8 characters and no more than 72 UTF-8 bytes.",
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
        "+passwordResetToken +passwordResetCode +passwordResetExpires"
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

    user.passwordResetCode = null;

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


const resetPasswordWithCode = async (req, res) => {
  try {
    const { email, code, password } = req.body || {};
    if (typeof email !== "string" || !isValidEmail(email) || !/^\d{6}$/.test(String(code || ""))) {
      return res.status(400).json({ success: false, message: "Enter the email address and six-digit code from your MOVA email." });
    }
    if (typeof password !== "string" || password.length < 8 || Buffer.byteLength(password, "utf8") > 72) {
      return res.status(400).json({ success: false, message: "Password must contain at least 8 characters and no more than 72 UTF-8 bytes." });
    }

    const normalizedEmail = normalizeEmail(email);
    const codeHash = hashPasswordResetCode(normalizedEmail, code);
    const user = await User.findOne({
      email: normalizedEmail,
      passwordResetCode: codeHash,
      passwordResetExpires: { $gt: new Date() },
    }).select("+passwordResetCode +passwordResetToken +passwordResetExpires");

    if (!user) {
      return res.status(400).json({ success: false, message: "That verification code is invalid or has expired. Request a new code and try again." });
    }

    user.passwordHash = await bcrypt.hash(password, 12);
    user.passwordResetCode = null;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save();
    return res.status(200).json({ success: true, message: "Your password has been reset. You can now sign in." });
  } catch (error) {
    console.error("Password reset code error:", error);
    return res.status(500).json({ success: false, message: "Unable to reset your password right now." });
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
  resetPasswordWithCode,
  getMe,
};
