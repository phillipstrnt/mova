
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

import User from "../models/User.js";
import Branch from "../models/Branch.js";

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

const cleanUser = (user) => {
  if (!user) {
    return null;
  }

  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone || "",
    role: user.role,
    businessId: user.businessId,
    branchId: user.branchId || null,
    branchIds: user.branchIds || [],
    activeBranchId:
      user.activeBranchId || null,
    active: user.active !== false,
    lastLogin: user.lastLogin || null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

const isObjectId = (value) => {
  return mongoose.Types.ObjectId.isValid(
    value
  );
};

/*
|--------------------------------------------------------------------------
| GET USERS
|--------------------------------------------------------------------------
|
| GET /api/users
|--------------------------------------------------------------------------
*/

export const getUsers = async (
  req,
  res
) => {
  try {
    const {
      role,
      active,
      branchId,
      search,
    } = req.query;

    const filter = {
      businessId: req.user.businessId,
    };

    if (role) {
      filter.role = role;
    }

    if (
      active === "true" ||
      active === "false"
    ) {
      filter.active = active === "true";
    }

    if (branchId) {
      if (!isObjectId(branchId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid branch ID.",
        });
      }

      filter.branchIds = branchId;
    }

    if (search?.trim()) {
      const keyword =
        search.trim();

      filter.$or = [
        {
          name: {
            $regex: keyword,
            $options: "i",
          },
        },
        {
          email: {
            $regex: keyword,
            $options: "i",
          },
        },
        {
          phone: {
            $regex: keyword,
            $options: "i",
          },
        },
      ];
    }

    const users =
      await User.find(filter)
        .select(
          "-password -resetPasswordToken -resetPasswordExpires"
        )
        .populate(
          "branchIds",
          "name code"
        )
        .sort({
          createdAt: -1,
        })
        .lean();

    return res.json({
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

/*
|--------------------------------------------------------------------------
| GET ONE USER
|--------------------------------------------------------------------------
|
| GET /api/users/:id
|--------------------------------------------------------------------------
*/

export const getUser = async (
  req,
  res
) => {
  try {
    const { id } =
      req.params;

    if (!isObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID.",
      });
    }

    const user =
      await User.findOne({
        _id: id,
        businessId:
          req.user.businessId,
      })
        .select(
          "-password -resetPasswordToken -resetPasswordExpires"
        )
        .populate(
          "branchIds",
          "name code"
        );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.json({
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

/*
|--------------------------------------------------------------------------
| CREATE USER
|--------------------------------------------------------------------------
|
| POST /api/users
|--------------------------------------------------------------------------
*/

export const createUser = async (
  req,
  res
) => {
  try {
    const {
      name,
      email,
      phone = "",
      password,
      role,
      branchIds = [],
      active = true,
    } = req.body;

    /*
    |--------------------------------------------------------------------------
    | VALIDATION
    |--------------------------------------------------------------------------
    */

    if (
      !name?.trim() ||
      !email?.trim() ||
      !password ||
      !role
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Name, email, password and role are required.",
      });
    }

    const allowedRoles = [
      "ADMIN",
      "MANAGER",
      "CASHIER",
      "INVENTORY_MANAGER",
      "ACCOUNTANT",
    ];

    /*
    |--------------------------------------------------------------------------
    | NEVER CREATE ANOTHER OWNER
    |--------------------------------------------------------------------------
    */

    if (
      role === "OWNER"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "A new OWNER account cannot be created here.",
      });
    }

    if (
      !allowedRoles.includes(role)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid user role.",
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
    |--------------------------------------------------------------------------
    | NORMALIZE EMAIL
    |--------------------------------------------------------------------------
    */

    const normalizedEmail =
      email
        .trim()
        .toLowerCase();

    /*
    |--------------------------------------------------------------------------
    | CHECK DUPLICATE EMAIL
    |--------------------------------------------------------------------------
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
    |--------------------------------------------------------------------------
    | BRANCHES
    |--------------------------------------------------------------------------
    */

    let normalizedBranchIds =
      Array.isArray(branchIds)
        ? branchIds
        : [];

    normalizedBranchIds =
      normalizedBranchIds.filter(
        (id) => isObjectId(id)
      );

    if (
      normalizedBranchIds.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "At least one branch must be assigned.",
      });
    }

    const branches =
      await Branch.find({
        _id: {
          $in: normalizedBranchIds,
        },
        businessId:
          req.user.businessId,
        isActive: true,
      });

    if (
      branches.length !==
      normalizedBranchIds.length
    ) {
      return res.status(400).json({
        success: false,
        message:
          "One or more selected branches are invalid.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | HASH PASSWORD
    |--------------------------------------------------------------------------
    */

    const hashedPassword =
      await bcrypt.hash(
        password,
        12
      );

    /*
    |--------------------------------------------------------------------------
    | CREATE USER
    |--------------------------------------------------------------------------
    */

    const user =
      await User.create({
        name: name.trim(),

        email:
          normalizedEmail,

        phone:
          phone?.trim() || "",

        password:
          hashedPassword,

        role,

        businessId:
          req.user.businessId,

        branchIds:
          normalizedBranchIds,

        branchId:
          normalizedBranchIds[0],

        activeBranchId:
          normalizedBranchIds[0],

        active:
          active !== false,
      });

    /*
    |--------------------------------------------------------------------------
    | RESPONSE
    |--------------------------------------------------------------------------
    */

    return res.status(201).json({
      success: true,
      message:
        "User created successfully.",
      user: cleanUser(user),
    });
  } catch (error) {
    console.error(
      "Create user error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to create user.",
    });
  }
};

/*
|--------------------------------------------------------------------------
| UPDATE USER
|--------------------------------------------------------------------------
|
| PATCH /api/users/:id
|--------------------------------------------------------------------------
*/

export const updateUser = async (
  req,
  res
) => {
  try {
    const { id } =
      req.params;

    if (!isObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID.",
      });
    }

    const user =
      await User.findOne({
        _id: id,
        businessId:
          req.user.businessId,
      });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | DO NOT MODIFY OWNER THROUGH THIS ENDPOINT
    |--------------------------------------------------------------------------
    */

    if (
      user.role === "OWNER"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "The business owner cannot be modified from this endpoint.",
      });
    }

    const {
      name,
      phone,
      role,
      branchIds,
      active,
      password,
    } = req.body;

    if (name !== undefined) {
      user.name =
        String(name).trim();
    }

    if (phone !== undefined) {
      user.phone =
        String(phone).trim();
    }

    if (role !== undefined) {
      const allowedRoles = [
        "ADMIN",
        "MANAGER",
        "CASHIER",
        "INVENTORY_MANAGER",
        "ACCOUNTANT",
      ];

      if (
        !allowedRoles.includes(
          role
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid role.",
        });
      }

      user.role = role;
    }

    if (active !== undefined) {
      user.active =
        Boolean(active);
    }

    /*
    |--------------------------------------------------------------------------
    | UPDATE BRANCHES
    |--------------------------------------------------------------------------
    */

    if (
      branchIds !== undefined
    ) {
      if (
        !Array.isArray(
          branchIds
        ) ||
        branchIds.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "At least one branch must be assigned.",
        });
      }

      const validIds =
        branchIds.filter(
          (branchId) =>
            isObjectId(
              branchId
            )
        );

      if (
        validIds.length !==
        branchIds.length
      ) {
        return res.status(400).json({
          success: false,
          message:
            "One or more branch IDs are invalid.",
        });
      }

      const branches =
        await Branch.find({
          _id: {
            $in: validIds,
          },
          businessId:
            req.user.businessId,
          isActive: true,
        });

      if (
        branches.length !==
        validIds.length
      ) {
        return res.status(400).json({
          success: false,
          message:
            "One or more selected branches are invalid.",
        });
      }

      user.branchIds =
        validIds;

      user.branchId =
        validIds[0];

      if (
        !validIds
          .map(String)
          .includes(
            String(
              user.activeBranchId
            )
          )
      ) {
        user.activeBranchId =
          validIds[0];
      }
    }

    /*
    |--------------------------------------------------------------------------
    | OPTIONAL PASSWORD CHANGE
    |--------------------------------------------------------------------------
    */

    if (password) {
      if (
        password.length < 6
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Password must contain at least 6 characters.",
        });
      }

      user.password =
        await bcrypt.hash(
          password,
          12
        );
    }

    await user.save();

    return res.json({
      success: true,
      message:
        "User updated successfully.",
      user: cleanUser(user),
    });
  } catch (error) {
    console.error(
      "Update user error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update user.",
    });
  }
};

/*
|--------------------------------------------------------------------------
| DISABLE USER
|--------------------------------------------------------------------------
|
| PATCH /api/users/:id/disable
|--------------------------------------------------------------------------
*/

export const disableUser =
  async (
    req,
    res
  ) => {
    try {
      const { id } =
        req.params;

      if (!isObjectId(id)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid user ID.",
        });
      }

      const user =
        await User.findOne({
          _id: id,
          businessId:
            req.user.businessId,
        });

      if (!user) {
        return res.status(404).json({
          success: false,
          message:
            "User not found.",
        });
      }

      if (
        user.role === "OWNER"
      ) {
        return res.status(403).json({
          success: false,
          message:
            "The owner account cannot be disabled.",
        });
      }

      user.active =
        false;

      await user.save();

      return res.json({
        success: true,
        message:
          "User account disabled.",
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

/*
|--------------------------------------------------------------------------
| ENABLE USER
|--------------------------------------------------------------------------
|
| PATCH /api/users/:id/enable
|--------------------------------------------------------------------------
*/

export const enableUser =
  async (
    req,
    res
  ) => {
    try {
      const { id } =
        req.params;

      if (!isObjectId(id)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid user ID.",
        });
      }

      const user =
        await User.findOne({
          _id: id,
          businessId:
            req.user.businessId,
        });

      if (!user) {
        return res.status(404).json({
          success: false,
          message:
            "User not found.",
        });
      }

      user.active =
        true;

      await user.save();

      return res.json({
        success: true,
        message:
          "User account enabled.",
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