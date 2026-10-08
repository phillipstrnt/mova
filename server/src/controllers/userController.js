
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

import User from "../models/User.js";
import Branch from "../models/Branch.js";

import {
  auditUserCreated,
  auditUserUpdated,
  auditUserDisabled,
  auditUserEnabled,
} from "../services/auditService.js";

const ALLOWED_ROLES = [
  "ADMIN",
  "MANAGER",
  "CASHIER",
  "INVENTORY_MANAGER",
  "ACCOUNTANT",
];

const isObjectId = (value) => {
  return mongoose.Types.ObjectId.isValid(value);
};

/**
 * Convert a user document into a safe response.
 *
 * Never send password fields back to the frontend.
 */
const cleanUser = (user) => {
  const data =
    typeof user.toObject === "function"
      ? user.toObject()
      : { ...user };

  delete data.password;
  delete data.passwordHash;
  delete data.resetPasswordToken;
  delete data.resetPasswordExpires;

  return data;
};

/**
 * Check whether the current user can manage
 * the requested user.
 */
const canManageUser = (currentUser, targetUser) => {
  const currentRole = String(
    currentUser?.role || ""
  ).toUpperCase();

  const targetRole = String(
    targetUser?.role || ""
  ).toUpperCase();

  /*
   * OWNER can manage all users except another OWNER.
   */
  if (currentRole === "OWNER") {
    return targetRole !== "OWNER";
  }

  /*
   * ADMIN can manage non-owner users.
   */
  if (currentRole === "ADMIN") {
    return targetRole !== "OWNER";
  }

  return false;
};

/**
 * Validate branch IDs and make sure they belong
 * to the logged-in business.
 */
const validateBranches = async (
  branchIds,
  businessId
) => {
  if (!Array.isArray(branchIds) || branchIds.length === 0) {
    return {
      valid: false,
      message: "At least one branch must be assigned.",
    };
  }

  const uniqueBranchIds = [
    ...new Set(
      branchIds.map((id) => String(id))
    ),
  ];

  for (const id of uniqueBranchIds) {
    if (!isObjectId(id)) {
      return {
        valid: false,
        message: `Invalid branch ID: ${id}`,
      };
    }
  }

  const branches = await Branch.find({
    _id: {
      $in: uniqueBranchIds,
    },
    businessId,
  }).select("_id name code isActive");

  if (branches.length !== uniqueBranchIds.length) {
    return {
      valid: false,
      message:
        "One or more selected branches do not belong to this business.",
    };
  }

  /*
   * Branch model uses `isActive`, not `active`.
   */
  const inactiveBranch = branches.find(
    (branch) => branch.isActive === false
  );

  if (inactiveBranch) {
    return {
      valid: false,
      message: `Branch "${inactiveBranch.name}" is inactive.`,
    };
  }

  return {
    valid: true,
    branchIds: uniqueBranchIds,
    branches,
  };
};

/**
 * Get users belonging to the current business.
 *
 * GET /api/users
 */
export const getUsers = async (req, res) => {
  try {
    const businessId = req.user?.businessId;

    if (!businessId) {
      return res.status(400).json({
        success: false,
        message: "Business information is missing.",
      });
    }

    const {
      search = "",
      role,
      active,
      branchId,
    } = req.query;

    const filter = {
      businessId,
    };

    /*
     * Branch restrictions.
     */
    const currentRole = String(
      req.user?.role || ""
    ).toUpperCase();

    if (
      currentRole !== "OWNER" &&
      currentRole !== "ADMIN"
    ) {
      const assignedBranches = Array.isArray(
        req.user?.branchIds
      )
        ? req.user.branchIds
        : [];

      filter.branchIds = {
        $in: assignedBranches,
      };
    } else if (branchId) {
      if (!isObjectId(branchId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid branch ID.",
        });
      }

      filter.branchIds = branchId;
    }

    if (role) {
      filter.role = String(role).toUpperCase();
    }

    if (active !== undefined) {
      if (
        active === "true" ||
        active === true
      ) {
        filter.active = true;
      }

      if (
        active === "false" ||
        active === false
      ) {
        filter.active = false;
      }
    }

    if (String(search).trim()) {
      const searchValue =
        String(search).trim();

      filter.$or = [
        {
          name: {
            $regex: searchValue,
            $options: "i",
          },
        },
        {
          email: {
            $regex: searchValue,
            $options: "i",
          },
        },
        {
          phone: {
            $regex: searchValue,
            $options: "i",
          },
        },
      ];
    }

    const users = await User.find(filter)
      .select("-password -passwordHash")
      .populate(
        "branchIds",
        "name code isActive"
      )
      .sort({
        createdAt: -1,
      })
      .lean();

    return res.status(200).json({
      success: true,
      users,
      count: users.length,
    });
  } catch (error) {
    console.error(
      "Get users error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to load users.",
    });
  }
};

/**
 * Get a single user.
 *
 * GET /api/users/:id
 */
export const getUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID.",
      });
    }

    const user = await User.findOne({
      _id: id,
      businessId: req.user.businessId,
    })
      .select("-password -passwordHash")
      .populate(
        "branchIds",
        "name code isActive"
      )
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    /*
     * Non-admin users can only see users
     * assigned to one of their branches.
     */
    const currentRole = String(
      req.user?.role || ""
    ).toUpperCase();

    if (
      currentRole !== "OWNER" &&
      currentRole !== "ADMIN"
    ) {
      const allowedBranches = Array.isArray(
        req.user?.branchIds
      )
        ? req.user.branchIds.map((id) =>
            String(id)
          )
        : [];

      const userBranches = Array.isArray(
        user.branchIds
      )
        ? user.branchIds.map((branch) =>
            String(branch._id)
          )
        : [];

      const hasSharedBranch =
        userBranches.some((branchId) =>
          allowedBranches.includes(branchId)
        );

      if (!hasSharedBranch) {
        return res.status(403).json({
          success: false,
          message:
            "You do not have access to this user.",
        });
      }
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error(
      "Get user error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to load user.",
    });
  }
};

/**
 * Create a new user.
 *
 * POST /api/users
 */
export const createUser = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      role,
      branchIds,
    } = req.body;

    const businessId = req.user?.businessId;

    if (!businessId) {
      return res.status(400).json({
        success: false,
        message:
          "Business information is missing.",
      });
    }

    if (!name || !String(name).trim()) {
      return res.status(400).json({
        success: false,
        message: "Name is required.",
      });
    }

    if (!email || !String(email).trim()) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Password is required.",
      });
    }

    if (String(password).length < 6) {
      return res.status(400).json({
        success: false,
        message:
          "Password must contain at least 6 characters.",
      });
    }

    const normalizedEmail = String(email)
      .trim()
      .toLowerCase();

    const normalizedRole = String(
      role || "CASHIER"
    ).toUpperCase();

    /*
     * OWNER accounts cannot be created
     * through this endpoint.
     */
    if (normalizedRole === "OWNER") {
      return res.status(403).json({
        success: false,
        message:
          "An OWNER account cannot be created from the user management page.",
      });
    }

    if (!ALLOWED_ROLES.includes(normalizedRole)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid user role.",
      });
    }

    /*
     * Only OWNER should be able to create ADMIN accounts.
     */
    const currentRole = String(
      req.user?.role || ""
    ).toUpperCase();

    if (
      normalizedRole === "ADMIN" &&
      currentRole !== "OWNER"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Only the business owner can create an ADMIN account.",
      });
    }

    /*
     * Check duplicate email.
     */
    const existingUser =
      await User.findOne({
        email: normalizedEmail,
      });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message:
          "A user with this email already exists.",
      });
    }

    /*
     * Validate branches.
     */
    const branchValidation =
      await validateBranches(
        branchIds,
        businessId
      );

    if (!branchValidation.valid) {
      return res.status(400).json({
        success: false,
        message:
          branchValidation.message,
      });
    }

    /*
     * Hash password.
     */
    const hashedPassword =
      await bcrypt.hash(
        String(password),
        12
      );

    /*
     * IMPORTANT:
     * User model requires `passwordHash`.
     *
     * Previously this was being saved as:
     *
     * password: hashedPassword
     *
     * which caused:
     *
     * ValidationError:
     * passwordHash: Path `passwordHash`
     * is required.
     */
    const newUser = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      phone: phone
        ? String(phone).trim()
        : "",

      passwordHash: hashedPassword,

      role: normalizedRole,
      businessId,

      branchIds:
        branchValidation.branchIds,

      branchId:
        branchValidation.branchIds[0],

      activeBranchId:
        branchValidation.branchIds[0],

      active: true,
    });

    /*
     * Audit trail.
     */
    await auditUserCreated({
      req,
      user: newUser,
    });

    const safeUser =
      cleanUser(newUser);

    return res.status(201).json({
      success: true,
      message:
        "User created successfully.",
      user: safeUser,
    });
  } catch (error) {
    console.error(
      "Create user error:",
      error
    );

    /*
     * Mongo duplicate-key protection.
     */
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "A user with this email already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create user.",
    });
  }
};

/**
 * Update a user.
 *
 * PATCH /api/users/:id
 */
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID.",
      });
    }

    const targetUser =
      await User.findOne({
        _id: id,
        businessId: req.user.businessId,
      });

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (
      !canManageUser(
        req.user,
        targetUser
      )
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to manage this user.",
      });
    }

    const {
      name,
      email,
      phone,
      password,
      role,
      branchIds,
      active,
    } = req.body;

    const changes = {};

    if (name !== undefined) {
      if (!String(name).trim()) {
        return res.status(400).json({
          success: false,
          message: "Name cannot be empty.",
        });
      }

      changes.name =
        String(name).trim();
    }

    if (email !== undefined) {
      const normalizedEmail =
        String(email)
          .trim()
          .toLowerCase();

      const duplicateUser =
        await User.findOne({
          email: normalizedEmail,
          _id: {
            $ne: targetUser._id,
          },
        });

      if (duplicateUser) {
        return res.status(409).json({
          success: false,
          message:
            "Another user already uses this email.",
        });
      }

      changes.email =
        normalizedEmail;
    }

    if (phone !== undefined) {
      changes.phone =
        String(phone).trim();
    }

    if (role !== undefined) {
      const newRole =
        String(role).toUpperCase();

      if (newRole === "OWNER") {
        return res.status(403).json({
          success: false,
          message:
            "A user cannot be changed to OWNER.",
        });
      }

      if (
        !ALLOWED_ROLES.includes(
          newRole
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid user role.",
        });
      }

      const currentRole = String(
        req.user?.role || ""
      ).toUpperCase();

      if (
        newRole === "ADMIN" &&
        currentRole !== "OWNER"
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Only the business owner can assign the ADMIN role.",
        });
      }

      changes.role = newRole;
    }

    if (branchIds !== undefined) {
      const branchValidation =
        await validateBranches(
          branchIds,
          req.user.businessId
        );

      if (!branchValidation.valid) {
        return res.status(400).json({
          success: false,
          message:
            branchValidation.message,
        });
      }

      /*
       * Prevent non-owner/admin users from
       * assigning users to branches they cannot access.
       */
      const currentRole = String(
        req.user?.role || ""
      ).toUpperCase();

      if (
        currentRole !== "OWNER" &&
        currentRole !== "ADMIN"
      ) {
        const allowedBranches =
          Array.isArray(
            req.user?.branchIds
          )
            ? req.user.branchIds.map(
                (branch) =>
                  String(branch)
              )
            : [];

        const invalidAssignment =
          branchValidation.branchIds.some(
            (branch) =>
              !allowedBranches.includes(
                String(branch)
              )
          );

        if (invalidAssignment) {
          return res.status(403).json({
            success: false,
            message:
              "You cannot assign a user to a branch you do not manage.",
          });
        }
      }

      changes.branchIds =
        branchValidation.branchIds;

      changes.branchId =
        branchValidation.branchIds[0];

      changes.activeBranchId =
        branchValidation.branchIds[0];
    }

    if (active !== undefined) {
      changes.active =
        Boolean(active);
    }

    /*
     * Password update.
     *
     * IMPORTANT:
     * Store the hash in passwordHash,
     * not password.
     */
    if (password !== undefined) {
      if (
        String(password).length < 6
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Password must contain at least 6 characters.",
        });
      }

      changes.passwordHash =
        await bcrypt.hash(
          String(password),
          12
        );
    }

    /*
     * Don't allow a user to disable themselves
     * through the general edit endpoint.
     */
    if (
      String(targetUser._id) ===
        String(req.user._id) &&
      changes.active === false
    ) {
      return res.status(400).json({
        success: false,
        message:
          "You cannot disable your own account.",
      });
    }

    Object.assign(
      targetUser,
      changes
    );

    await targetUser.save();

    /*
     * Audit trail.
     */
    await auditUserUpdated({
      req,
      user: targetUser,
      changes,
    });

    return res.status(200).json({
      success: true,
      message:
        "User updated successfully.",
      user: cleanUser(
        targetUser
      ),
    });
  } catch (error) {
    console.error(
      "Update user error:",
      error
    );

    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "A user with this email already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update user.",
    });
  }
};

/**
 * Disable a user.
 *
 * PATCH /api/users/:id/disable
 */
export const disableUser = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    if (!isObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID.",
      });
    }

    const user =
      await User.findOne({
        _id: id,
        businessId: req.user.businessId,
      });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (
      String(user._id) ===
      String(req.user._id)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "You cannot disable your own account.",
      });
    }

    if (
      !canManageUser(
        req.user,
        user
      )
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to disable this user.",
      });
    }

    if (user.active === false) {
      return res.status(400).json({
        success: false,
        message:
          "This user is already disabled.",
      });
    }

    user.active = false;

    await user.save();

    /*
     * Audit trail.
     */
    await auditUserDisabled({
      req,
      user,
    });

    return res.status(200).json({
      success: true,
      message:
        "User disabled successfully.",
      user: cleanUser(user),
    });
  } catch (error) {
    console.error(
      "Disable user error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to disable user.",
    });
  }
};

/**
 * Enable a user.
 *
 * PATCH /api/users/:id/enable
 */
export const enableUser = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    if (!isObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID.",
      });
    }

    const user =
      await User.findOne({
        _id: id,
        businessId: req.user.businessId,
      });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (
      !canManageUser(
        req.user,
        user
      )
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to enable this user.",
      });
    }

    if (user.active === true) {
      return res.status(400).json({
        success: false,
        message:
          "This user is already active.",
      });
    }

    user.active = true;

    await user.save();

    /*
     * Audit trail.
     */
    await auditUserEnabled({
      req,
      user,
    });

    return res.status(200).json({
      success: true,
      message:
        "User enabled successfully.",
      user: cleanUser(user),
    });
  } catch (error) {
    console.error(
      "Enable user error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to enable user.",
    });
  }
};