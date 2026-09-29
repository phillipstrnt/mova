import bcrypt from "bcryptjs";

import User from "../models/User.js";
import Business from "../models/Business.js";
import Branch from "../models/Branch.js";

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
        message: "Password must contain at least 6 characters",
      });
    }

    // ------------------------------------------
    // NORMALIZE EMAIL
    // ------------------------------------------

    const normalizedEmail = email.trim().toLowerCase();

    // ------------------------------------------
    // CHECK EXISTING USER
    // ------------------------------------------

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    // ------------------------------------------
    // CREATE BUSINESS
    // ------------------------------------------

    const business = await Business.create({
      name: businessName.trim(),
      businessType: businessType.trim(),
      email: normalizedEmail,
      phone: phone?.trim() || "",
    });

    try {
      // ------------------------------------------
      // CREATE MAIN BRANCH
      // ------------------------------------------

      const branch = await Branch.create({
        businessId: business._id,
        name: "Main Branch",
        code: "MAIN",
        phone: phone?.trim() || "",
      });

      // ------------------------------------------
      // HASH PASSWORD
      // ------------------------------------------

      const passwordHash = await bcrypt.hash(password, 12);

      // ------------------------------------------
      // CREATE OWNER
      // ------------------------------------------

      const user = await User.create({
        businessId: business._id,
        branchId: branch._id,
        name: ownerName.trim(),
        email: normalizedEmail,
        passwordHash,
        role: "OWNER",
        phone: phone?.trim() || "",
      });

      // ------------------------------------------
      // UPDATE BUSINESS OWNER
      // ------------------------------------------

      business.ownerId = user._id;

      await business.save();

      // ------------------------------------------
      // GENERATE TOKEN
      // ------------------------------------------

      const token = generateToken(user);

      return res.status(201).json({
        success: true,
        message: "MOVA business created successfully",
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          businessId: user.businessId,
          branchId: user.branchId,
        },
        business: {
          id: business._id,
          name: business.name,
          businessType: business.businessType,
        },
        branch: {
          id: branch._id,
          name: branch.name,
          code: branch.code,
        },
      });
    } catch (creationError) {
      // If something failed after creating the business,
      // remove the business so we don't leave orphan data.

      await Business.findByIdAndDelete(business._id);

      throw creationError;
    }
  } catch (error) {
    console.error("Business registration error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create MOVA business",
      error: error.message,
    });
  }
};

// ======================================================
// LOGIN
// ======================================================

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (user.status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        message: "Your account is not active",
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Update last login
    user.lastLoginAt = new Date();

    await user.save();

    const token = generateToken(user);

    const business = await Business.findById(user.businessId).select(
      "-__v"
    );

    const branch = user.branchId
      ? await Branch.findById(user.branchId).select("-__v")
      : null;

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        businessId: user.businessId,
        branchId: user.branchId,
      },
      business,
      branch,
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to login",
    });
  }
};

// ======================================================
// GET CURRENT USER
// ======================================================

const getMe = async (req, res) => {
  try {
    const business = await Business.findById(
      req.user.businessId
    ).select("-__v");

    const branch = req.user.branchId
      ? await Branch.findById(req.user.branchId).select("-__v")
      : null;

    return res.status(200).json({
      success: true,
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        businessId: req.user.businessId,
        branchId: req.user.branchId,
        phone: req.user.phone,
        status: req.user.status,
      },
      business,
      branch,
    });
  } catch (error) {
    console.error("Get current user error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve account information",
    });
  }
};

export {
  registerBusiness,
  login,
  getMe,
};