
import Branch from "../models/Branch.js";
import User from "../models/User.js";

/*
|--------------------------------------------------------------------------
| GET ALL BUSINESS BRANCHES
|--------------------------------------------------------------------------
*/

const getBranches = async (req, res) => {
  try {
    const branches = await Branch.find({
      businessId: req.user.businessId,
    })
      .populate(
        "managerId",
        "name email role"
      )
      .sort({
        createdAt: 1,
      });

    return res.status(200).json({
      success: true,
      branches,
    });
  } catch (error) {
    console.error(
      "Get branches error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to load branches",
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET SINGLE BRANCH
|--------------------------------------------------------------------------
*/

const getBranch = async (req, res) => {
  try {
    const branch =
      await Branch.findOne({
        _id: req.params.id,
        businessId: req.user.businessId,
      }).populate(
        "managerId",
        "name email role"
      );

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: "Branch not found",
      });
    }

    return res.status(200).json({
      success: true,
      branch,
    });
  } catch (error) {
    console.error(
      "Get branch error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to load branch",
    });
  }
};

/*
|--------------------------------------------------------------------------
| CREATE BRANCH
|--------------------------------------------------------------------------
*/

const createBranch = async (req, res) => {
  try {
    const businessId =
      req.user.businessId;

    const {
      name,
      code,
      phone,
      address,
      managerId,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Branch name is required",
      });
    }

    if (!code || !code.trim()) {
      return res.status(400).json({
        success: false,
        message: "Branch code is required",
      });
    }

    const normalizedCode =
      code.trim().toUpperCase();

    const existingBranch =
      await Branch.findOne({
        businessId,
        code: normalizedCode,
      });

    if (existingBranch) {
      return res.status(409).json({
        success: false,
        message: `Branch code "${normalizedCode}" already exists`,
      });
    }

    /*
     * --------------------------------------------------------------
     * DETERMINE BRANCH MANAGER
     * --------------------------------------------------------------
     *
     * If OWNER/ADMIN supplies a managerId, validate it.
     *
     * If a MANAGER creates a branch without selecting another
     * manager, the current manager becomes the branch manager.
     */

    let selectedManagerId =
      managerId || null;

    if (
      !selectedManagerId &&
      req.user.role === "MANAGER"
    ) {
      selectedManagerId =
        req.user._id;
    }

    /*
     * Validate selected manager.
     */

    if (selectedManagerId) {
      const manager =
        await User.findOne({
          _id: selectedManagerId,
          businessId,
          status: "ACTIVE",
        });

      if (!manager) {
        return res.status(400).json({
          success: false,
          message:
            "Selected branch manager does not belong to this business",
        });
      }

      /*
       * Only appropriate management roles should be
       * assigned as branch managers.
       */

      if (
        ![
          "OWNER",
          "ADMIN",
          "MANAGER",
        ].includes(manager.role)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Only an Owner, Admin or Manager can be assigned as a branch manager",
        });
      }
    }

    /*
     * --------------------------------------------------------------
     * CREATE BRANCH
     * --------------------------------------------------------------
     */

    const branch =
      await Branch.create({
        businessId,
        name: name.trim(),
        code: normalizedCode,
        phone: phone?.trim() || "",
        address: address?.trim() || "",
        managerId:
          selectedManagerId || null,
        isActive: true,
      });

    /*
     * --------------------------------------------------------------
     * ADD BRANCH TO CREATOR'S AUTHORIZED BRANCHES
     * --------------------------------------------------------------
     */

    const creator =
      await User.findById(
        req.user._id
      );

    if (creator) {
      if (!Array.isArray(creator.branchIds)) {
        creator.branchIds = [];
      }

      const alreadyAssigned =
        creator.branchIds.some(
          (id) =>
            id.toString() ===
            branch._id.toString()
        );

      if (!alreadyAssigned) {
        creator.branchIds.push(
          branch._id
        );
      }

      if (!creator.activeBranchId) {
        creator.activeBranchId =
          branch._id;
      }

      if (!creator.branchId) {
        creator.branchId =
          branch._id;
      }

      await creator.save();
    }

    /*
     * --------------------------------------------------------------
     * ADD BRANCH TO MANAGER
     * --------------------------------------------------------------
     */

    if (selectedManagerId) {
      const manager =
        await User.findOne({
          _id: selectedManagerId,
          businessId,
        });

      if (manager) {
        if (!Array.isArray(manager.branchIds)) {
          manager.branchIds = [];
        }

        const alreadyAssigned =
          manager.branchIds.some(
            (id) =>
              id.toString() ===
              branch._id.toString()
          );

        if (!alreadyAssigned) {
          manager.branchIds.push(
            branch._id
          );
        }

        if (!manager.activeBranchId) {
          manager.activeBranchId =
            branch._id;
        }

        if (!manager.branchId) {
          manager.branchId =
            branch._id;
        }

        await manager.save();
      }
    }

    /*
     * --------------------------------------------------------------
     * RETURN POPULATED BRANCH
     * --------------------------------------------------------------
     */

    const createdBranch =
      await Branch.findById(
        branch._id
      ).populate(
        "managerId",
        "name email role"
      );

    return res.status(201).json({
      success: true,
      message:
        "Branch created successfully",
      branch: createdBranch,
    });
  } catch (error) {
    console.error(
      "Create branch error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to create branch",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| UPDATE BRANCH
|--------------------------------------------------------------------------
*/

const updateBranch = async (req, res) => {
  try {
    const businessId =
      req.user.businessId;

    const {
      name,
      code,
      phone,
      address,
      managerId,
      isActive,
    } = req.body;

    const branch =
      await Branch.findOne({
        _id: req.params.id,
        businessId,
      });

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: "Branch not found",
      });
    }

    /*
     * NAME
     */

    if (name !== undefined) {
      if (!String(name).trim()) {
        return res.status(400).json({
          success: false,
          message:
            "Branch name cannot be empty",
        });
      }

      branch.name =
        String(name).trim();
    }

    /*
     * CODE
     */

    if (code !== undefined) {
      const normalizedCode =
        String(code)
          .trim()
          .toUpperCase();

      if (!normalizedCode) {
        return res.status(400).json({
          success: false,
          message:
            "Branch code cannot be empty",
        });
      }

      const duplicate =
        await Branch.findOne({
          businessId,
          code: normalizedCode,
          _id: {
            $ne: branch._id,
          },
        });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message:
            `Branch code "${normalizedCode}" already exists`,
        });
      }

      branch.code =
        normalizedCode;
    }

    /*
     * PHONE
     */

    if (phone !== undefined) {
      branch.phone =
        String(phone).trim();
    }

    /*
     * ADDRESS
     */

    if (address !== undefined) {
      branch.address =
        String(address).trim();
    }

    /*
     * MANAGER
     */

    if (managerId !== undefined) {
      if (managerId) {
        const manager =
          await User.findOne({
            _id: managerId,
            businessId,
            status: "ACTIVE",
          });

        if (!manager) {
          return res.status(400).json({
            success: false,
            message:
              "Selected manager does not belong to this business",
          });
        }

        if (
          ![
            "OWNER",
            "ADMIN",
            "MANAGER",
          ].includes(manager.role)
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Only an Owner, Admin or Manager can be assigned as a branch manager",
          });
        }

        if (!Array.isArray(manager.branchIds)) {
          manager.branchIds = [];
        }

        const alreadyAssigned =
          manager.branchIds.some(
            (id) =>
              id.toString() ===
              branch._id.toString()
          );

        if (!alreadyAssigned) {
          manager.branchIds.push(
            branch._id
          );
        }

        if (!manager.activeBranchId) {
          manager.activeBranchId =
            branch._id;
        }

        if (!manager.branchId) {
          manager.branchId =
            branch._id;
        }

        await manager.save();
      }

      branch.managerId =
        managerId || null;
    }

    /*
     * ACTIVE STATUS
     */

    if (isActive !== undefined) {
      branch.isActive =
        Boolean(isActive);
    }

    await branch.save();

    const updatedBranch =
      await Branch.findById(
        branch._id
      ).populate(
        "managerId",
        "name email role"
      );

    return res.status(200).json({
      success: true,
      message:
        "Branch updated successfully",
      branch: updatedBranch,
    });
  } catch (error) {
    console.error(
      "Update branch error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update branch",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| DELETE BRANCH
|--------------------------------------------------------------------------
|
| Deletion remains restricted to OWNER / ADMIN at the
| route/security level.
|
*/

const deleteBranch = async (req, res) => {
  try {
    if (
      !["OWNER", "ADMIN"].includes(
        req.user.role
      )
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Only an Owner or Admin can delete a branch",
      });
    }

    const businessId =
      req.user.businessId;

    const branch =
      await Branch.findOne({
        _id: req.params.id,
        businessId,
      });

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: "Branch not found",
      });
    }

    const branchCount =
      await Branch.countDocuments({
        businessId,
        isActive: true,
      });

    if (branchCount <= 1) {
      return res.status(400).json({
        success: false,
        message:
          "A business must have at least one active branch.",
      });
    }

    const users =
      await User.find({
        businessId,
        branchIds: branch._id,
      });

    for (const user of users) {
      user.branchIds =
        user.branchIds.filter(
          (id) =>
            id.toString() !==
            branch._id.toString()
        );

      if (
        user.activeBranchId &&
        user.activeBranchId.toString() ===
          branch._id.toString()
      ) {
        user.activeBranchId =
          user.branchIds[0] || null;
      }

      if (
        user.branchId &&
        user.branchId.toString() ===
          branch._id.toString()
      ) {
        user.branchId =
          user.activeBranchId ||
          user.branchIds[0] ||
          null;
      }

      await user.save();
    }

    await Branch.findByIdAndDelete(
      branch._id
    );

    return res.status(200).json({
      success: true,
      message:
        "Branch deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete branch error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to delete branch",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET BUSINESS USERS
|--------------------------------------------------------------------------
*/

const getBusinessUsers = async (
  req,
  res
) => {
  try {
    const users =
      await User.find({
        businessId:
          req.user.businessId,
        status: "ACTIVE",
      })
        .select(
          "name email role phone branchId branchIds activeBranchId"
        )
        .sort({
          name: 1,
        });

    return res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    console.error(
      "Get business users error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to load business users",
    });
  }
};

/*
|--------------------------------------------------------------------------
| SWITCH ACTIVE BRANCH
|--------------------------------------------------------------------------
*/

const switchBranch = async (
  req,
  res
) => {
  try {
    const userId =
      req.user._id;

    const businessId =
      req.user.businessId;

    const { branchId } =
      req.body;

    if (!branchId) {
      return res.status(400).json({
        success: false,
        message:
          "Branch ID is required",
      });
    }

    const branch =
      await Branch.findOne({
        _id: branchId,
        businessId,
        isActive: true,
      });

    if (!branch) {
      return res.status(404).json({
        success: false,
        message:
          "Branch not found or inactive",
      });
    }

    const user =
      await User.findOne({
        _id: userId,
        businessId,
        status: "ACTIVE",
      });

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "User account not found",
      });
    }

    const hasBranchAccess =
      Array.isArray(user.branchIds) &&
      user.branchIds.some(
        (id) =>
          id.toString() ===
          branch._id.toString()
      );

    const businessWideRole =
      ["OWNER", "ADMIN"].includes(
        user.role
      );

    if (
      !hasBranchAccess &&
      !businessWideRole
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You are not authorized to access this branch",
      });
    }

    if (
      businessWideRole &&
      !hasBranchAccess
    ) {
      if (!Array.isArray(user.branchIds)) {
        user.branchIds = [];
      }

      user.branchIds.push(
        branch._id
      );
    }

    user.activeBranchId =
      branch._id;

    user.branchId =
      branch._id;

    await user.save();

    const updatedUser =
      await User.findById(
        user._id
      )
        .select(
          "name email role phone status businessId branchId branchIds activeBranchId"
        )
        .populate(
          "activeBranchId",
          "name code phone address isActive"
        );

    return res.status(200).json({
      success: true,
      message:
        "Branch switched successfully",
      branch,
      user: updatedUser,
    });
  } catch (error) {
    console.error(
      "Switch branch error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to switch branch",
    });
  }
};

export {
  getBranches,
  getBranch,
  createBranch,
  updateBranch,
  deleteBranch,
  getBusinessUsers,
  switchBranch,
};
