
import mongoose from "mongoose";
import Branch from "../models/Branch.js";
import User from "../models/User.js";
import AuditLog from "../models/AuditLog.js";

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const normalizeRole = (role) => String(role || "").toUpperCase();

const isValidObjectId = (id) =>
  mongoose.Types.ObjectId.isValid(String(id || ""));

const getBusinessId = (req) => {
  const businessId = req.user?.businessId;

  if (!businessId || !isValidObjectId(businessId)) {
    const error = new Error("A valid business is required.");
    error.statusCode = 400;
    throw error;
  }

  return businessId;
};

const getUserBranchIds = (req) => {
  if (!Array.isArray(req.user?.branchIds)) {
    return [];
  }

  return req.user.branchIds.map((id) => String(id));
};

const userHasBranchAccess = (req, branchId) => {
  const role = normalizeRole(req.user?.role);

  if (role === "OWNER" || role === "ADMIN") {
    return true;
  }

  return getUserBranchIds(req).includes(String(branchId));
};

const canManageBranches = (req) => {
  const role = normalizeRole(req.user?.role);

  return (
    role === "OWNER" ||
    role === "ADMIN" ||
    role === "MANAGER"
  );
};

const canDeleteBranches = (req) => {
  const role = normalizeRole(req.user?.role);

  return role === "OWNER" || role === "ADMIN";
};

const audit = async ({
  req,
  action,
  description,
  branchId = null,
  metadata = {},
}) => {
  try {
    if (!AuditLog) return;

    await AuditLog.create({
      businessId: req.user?.businessId,
      branchId,
      userId: req.user?._id,
      action,
      description,
      metadata,
    });
  } catch (error) {
    // Audit failure should not break the main business operation.
    console.error("Audit log error:", error.message);
  }
};

/*
|--------------------------------------------------------------------------
| GET ALL BRANCHES
|--------------------------------------------------------------------------
| OWNER / ADMIN:
|   Can see all business branches.
|
| MANAGER / CASHIER / INVENTORY_MANAGER / ACCOUNTANT:
|   Can only see branches assigned to them.
|--------------------------------------------------------------------------
*/

export const getBranches = async (req, res) => {
  try {
    const businessId = getBusinessId(req);
    const role = normalizeRole(req.user?.role);

    const filter = {
      businessId,
      isActive: true,
    };

    if (role !== "OWNER" && role !== "ADMIN") {
      const branchIds = getUserBranchIds(req);

      if (branchIds.length === 0) {
        return res.json({
          success: true,
          data: [],
          branches: [],
        });
      }

      filter._id = {
        $in: branchIds,
      };
    }

    const branches = await Branch.find(filter)
      .sort({ isMain: -1, name: 1 })
      .lean();

    return res.json({
      success: true,
      data: branches,
      branches,
    });
  } catch (error) {
    console.error("Get branches error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to load branches.",
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET SINGLE BRANCH
|--------------------------------------------------------------------------
*/

export const getBranch = async (req, res) => {
  try {
    const businessId = getBusinessId(req);
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid branch ID.",
      });
    }

    if (!userHasBranchAccess(req, id)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to access this branch.",
      });
    }

    const branch = await Branch.findOne({
      _id: id,
      businessId,
    }).lean();

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: "Branch not found.",
      });
    }

    return res.json({
      success: true,
      data: branch,
      branch,
    });
  } catch (error) {
    console.error("Get branch error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to load branch.",
    });
  }
};

/*
|--------------------------------------------------------------------------
| CREATE BRANCH
|--------------------------------------------------------------------------
| OWNER / ADMIN / MANAGER
|
| If a MANAGER creates a branch, the manager is automatically assigned
| to that branch.
|--------------------------------------------------------------------------
*/

export const createBranch = async (req, res) => {
  try {
    const businessId = getBusinessId(req);

    if (!canManageBranches(req)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to create branches.",
      });
    }

    const {
      name,
      code,
      address,
      phone,
      email,
      managerId,
      isMain,
    } = req.body || {};

    if (!name || !String(name).trim()) {
      return res.status(400).json({
        success: false,
        message: "Branch name is required.",
      });
    }

    if (!code || !String(code).trim()) {
      return res.status(400).json({
        success: false,
        message: "Branch code is required.",
      });
    }

    const normalizedCode = String(code).trim().toUpperCase();

    const existingBranch = await Branch.findOne({
      businessId,
      code: normalizedCode,
    });

    if (existingBranch) {
      return res.status(409).json({
        success: false,
        message: "A branch with this code already exists.",
      });
    }

    const role = normalizeRole(req.user?.role);

    let assignedManagerId = null;

    if (role === "MANAGER") {
      assignedManagerId = req.user._id;
    } else if (managerId) {
      if (!isValidObjectId(managerId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid manager ID.",
        });
      }

      const manager = await User.findOne({
        _id: managerId,
        businessId,
        role: "MANAGER",
      });

      if (!manager) {
        return res.status(400).json({
          success: false,
          message: "Selected manager was not found in this business.",
        });
      }

      assignedManagerId = manager._id;
    }

    /*
     * Only OWNER / ADMIN can explicitly create a main branch.
     */
    const branchIsMain =
      (role === "OWNER" || role === "ADMIN") &&
      Boolean(isMain);

    if (branchIsMain) {
      await Branch.updateMany(
        {
          businessId,
          isMain: true,
        },
        {
          $set: {
            isMain: false,
          },
        }
      );
    }

    const branch = await Branch.create({
      businessId,
      name: String(name).trim(),
      code: normalizedCode,
      address: address ? String(address).trim() : "",
      phone: phone ? String(phone).trim() : "",
      email: email ? String(email).trim().toLowerCase() : "",
      managerId: assignedManagerId,
      isMain: branchIsMain,
      isActive: true,
    });

    /*
     * Automatically assign a manager to the new branch.
     */
    if (assignedManagerId) {
      await User.findByIdAndUpdate(
        assignedManagerId,
        {
          $addToSet: {
            branchIds: branch._id,
          },
          $set: {
            branchId: branch._id,
            activeBranchId: branch._id,
          },
        }
      );
    }

    await audit({
      req,
      action: "BRANCH_CREATED",
      description: `Created branch ${branch.name} (${branch.code}).`,
      branchId: branch._id,
      metadata: {
        branchName: branch.name,
        branchCode: branch.code,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Branch created successfully.",
      data: branch,
      branch,
    });
  } catch (error) {
    console.error("Create branch error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A branch with this code already exists.",
      });
    }

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to create branch.",
    });
  }
};

/*
|--------------------------------------------------------------------------
| UPDATE BRANCH
|--------------------------------------------------------------------------
| OWNER / ADMIN / MANAGER
|
| Managers may only update branches assigned to them.
|--------------------------------------------------------------------------
*/

export const updateBranch = async (req, res) => {
  try {
    const businessId = getBusinessId(req);
    const { id } = req.params;

    if (!canManageBranches(req)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to update branches.",
      });
    }

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid branch ID.",
      });
    }

    if (!userHasBranchAccess(req, id)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update this branch.",
      });
    }

    const branch = await Branch.findOne({
      _id: id,
      businessId,
    });

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: "Branch not found.",
      });
    }

    const {
      name,
      code,
      address,
      phone,
      email,
      managerId,
      isMain,
      isActive,
    } = req.body || {};

    const role = normalizeRole(req.user?.role);

    if (name !== undefined) {
      if (!String(name).trim()) {
        return res.status(400).json({
          success: false,
          message: "Branch name cannot be empty.",
        });
      }

      branch.name = String(name).trim();
    }

    if (code !== undefined) {
      const normalizedCode = String(code).trim().toUpperCase();

      if (!normalizedCode) {
        return res.status(400).json({
          success: false,
          message: "Branch code cannot be empty.",
        });
      }

      const duplicate = await Branch.findOne({
        businessId,
        code: normalizedCode,
        _id: {
          $ne: branch._id,
        },
      });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "Another branch already uses this code.",
        });
      }

      branch.code = normalizedCode;
    }

    if (address !== undefined) {
      branch.address = String(address || "").trim();
    }

    if (phone !== undefined) {
      branch.phone = String(phone || "").trim();
    }

    if (email !== undefined) {
      branch.email = String(email || "").trim().toLowerCase();
    }

    /*
     * Only OWNER / ADMIN can change branch manager explicitly.
     * Managers remain assigned to branches they manage.
     */
    if (
      managerId !== undefined &&
      (role === "OWNER" || role === "ADMIN")
    ) {
      if (managerId === null || managerId === "") {
        branch.managerId = null;
      } else {
        if (!isValidObjectId(managerId)) {
          return res.status(400).json({
            success: false,
            message: "Invalid manager ID.",
          });
        }

        const manager = await User.findOne({
          _id: managerId,
          businessId,
          role: "MANAGER",
        });

        if (!manager) {
          return res.status(400).json({
            success: false,
            message: "Selected manager was not found in this business.",
          });
        }

        branch.managerId = manager._id;

        await User.findByIdAndUpdate(
          manager._id,
          {
            $addToSet: {
              branchIds: branch._id,
            },
          }
        );
      }
    }

    /*
     * Only OWNER / ADMIN can change main status.
     */
    if (
      isMain !== undefined &&
      (role === "OWNER" || role === "ADMIN")
    ) {
      if (Boolean(isMain)) {
        await Branch.updateMany(
          {
            businessId,
            _id: {
              $ne: branch._id,
            },
            isMain: true,
          },
          {
            $set: {
              isMain: false,
            },
          }
        );
      }

      branch.isMain = Boolean(isMain);
    }

    /*
     * Only OWNER / ADMIN can deactivate branches.
     */
    if (
      isActive !== undefined &&
      (role === "OWNER" || role === "ADMIN")
    ) {
      branch.isActive = Boolean(isActive);
    }

    await branch.save();

    await audit({
      req,
      action: "BRANCH_UPDATED",
      description: `Updated branch ${branch.name} (${branch.code}).`,
      branchId: branch._id,
      metadata: {
        branchName: branch.name,
        branchCode: branch.code,
      },
    });

    return res.json({
      success: true,
      message: "Branch updated successfully.",
      data: branch,
      branch,
    });
  } catch (error) {
    console.error("Update branch error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A branch with this code already exists.",
      });
    }

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to update branch.",
    });
  }
};

/*
|--------------------------------------------------------------------------
| DELETE / DEACTIVATE BRANCH
|--------------------------------------------------------------------------
|
| We use a soft delete rather than physically deleting the branch.
| This protects historical sales, inventory, payments and reports.
|--------------------------------------------------------------------------
*/

export const deleteBranch = async (req, res) => {
  try {
    const businessId = getBusinessId(req);
    const { id } = req.params;

    if (!canDeleteBranches(req)) {
      return res.status(403).json({
        success: false,
        message: "Only owners and administrators can deactivate branches.",
      });
    }

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid branch ID.",
      });
    }

    const branch = await Branch.findOne({
      _id: id,
      businessId,
    });

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: "Branch not found.",
      });
    }

    if (branch.isMain) {
      return res.status(400).json({
        success: false,
        message:
          "The main branch cannot be deactivated. Set another branch as the main branch first.",
      });
    }

    branch.isActive = false;

    await branch.save();

    /*
     * Remove the branch from users' assigned branch lists.
     */
    await User.updateMany(
      {
        businessId,
        branchIds: branch._id,
      },
      {
        $pull: {
          branchIds: branch._id,
        },
      }
    );

    await audit({
      req,
      action: "BRANCH_DEACTIVATED",
      description: `Deactivated branch ${branch.name} (${branch.code}).`,
      branchId: branch._id,
    });

    return res.json({
      success: true,
      message: "Branch deactivated successfully.",
    });
  } catch (error) {
    console.error("Delete branch error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to deactivate branch.",
    });
  }
};

/*
|--------------------------------------------------------------------------
| SWITCH ACTIVE BRANCH
|--------------------------------------------------------------------------
| OWNER / ADMIN / MANAGER only.
|
| CASHIERS and other restricted users cannot switch branches.
|--------------------------------------------------------------------------
*/

export const switchBranch = async (req, res) => {
  try {
    const businessId = getBusinessId(req);
    const { branchId } = req.body || {};

    const role = normalizeRole(req.user?.role);

    if (
      role !== "OWNER" &&
      role !== "ADMIN" &&
      role !== "MANAGER"
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to switch branches.",
      });
    }

    if (!branchId || !isValidObjectId(branchId)) {
      return res.status(400).json({
        success: false,
        message: "A valid branch ID is required.",
      });
    }

    const branch = await Branch.findOne({
      _id: branchId,
      businessId,
      isActive: true,
    });

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: "Branch not found or inactive.",
      });
    }

    /*
     * Managers may only switch to branches assigned to them.
     */
    if (
      role === "MANAGER" &&
      !getUserBranchIds(req).includes(String(branch._id))
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not assigned to this branch.",
      });
    }

    /*
     * OWNER / ADMIN may switch to any active branch.
     */
    req.user.activeBranchId = branch._id;
    req.user.branchId = branch._id;

    await req.user.save();

    /*
     * IMPORTANT:
     * Do not populate/select fields that don't exist in the User model.
     */
    const updatedUser = await User.findById(req.user._id)
      .select(
        "name email role phone status businessId branchId branchIds activeBranchId"
      )
      .lean();

    await audit({
      req,
      action: "BRANCH_SWITCHED",
      description: `Switched active branch to ${branch.name}.`,
      branchId: branch._id,
      metadata: {
        branchName: branch.name,
      },
    });

    return res.json({
      success: true,
      message: `Active branch switched to ${branch.name}.`,
      data: {
        user: updatedUser,
        branch,
      },
      user: updatedUser,
      branch,
    });
  } catch (error) {
    console.error("Switch branch error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to switch branch.",
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET USERS FOR A BRANCH
|--------------------------------------------------------------------------
|
| OWNER / ADMIN:
|   Can see users from any branch in their business.
|
| MANAGER:
|   Can only see users belonging to their assigned branches.
|
| CASHIER / INVENTORY_MANAGER / ACCOUNTANT:
|   Their route should normally be blocked by permission middleware.
|--------------------------------------------------------------------------
*/

export const getBranchUsers = async (req, res) => {
  try {
    const businessId = getBusinessId(req);

    /*
     * Support both:
     *   GET /branches/users?branchId=...
     * and
     *   GET /branches/:id/users
     */
    const branchId =
      req.params?.id ||
      req.query?.branchId ||
      req.query?.branch;

    if (branchId && !isValidObjectId(branchId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid branch ID.",
      });
    }

    const role = normalizeRole(req.user?.role);

    const filter = {
      businessId,
    };

    if (branchId) {
      if (!userHasBranchAccess(req, branchId)) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to view users in this branch.",
        });
      }

      filter.branchIds = branchId;
    } else if (role !== "OWNER" && role !== "ADMIN") {
      /*
       * Never return every business user to a restricted role.
       */
      const allowedBranchIds = getUserBranchIds(req);

      if (allowedBranchIds.length === 0) {
        return res.json({
          success: true,
          data: [],
          users: [],
        });
      }

      filter.branchIds = {
        $in: allowedBranchIds,
      };
    }

    const users = await User.find(filter)
      .select(
        "name email role phone status businessId branchId branchIds activeBranchId active createdAt updatedAt"
      )
      .populate({
        path: "branchIds",
        select: "name code isActive isMain",
      })
      .sort({ name: 1 })
      .lean();

    return res.json({
      success: true,
      data: users,
      users,
    });
  } catch (error) {
    console.error("Get branch users error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to load branch users.",
    });
  }
};

/*
|--------------------------------------------------------------------------
| COMPATIBILITY ALIAS
|--------------------------------------------------------------------------
|
| Your current branch.routes.js imports:
|
|     getBusinessUsers
|
| The newer controller uses:
|
|     getBranchUsers
|
| Exporting both keeps the existing route working without forcing you
| to change the route file immediately.
|--------------------------------------------------------------------------
*/

export const getBusinessUsers = getBranchUsers;

/*
|--------------------------------------------------------------------------
| DEFAULT EXPORT
|--------------------------------------------------------------------------
*/

export default {
  getBranches,
  getBranch,
  createBranch,
  updateBranch,
  deleteBranch,
  switchBranch,
  getBranchUsers,
  getBusinessUsers,
};
