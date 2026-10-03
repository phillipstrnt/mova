import Branch from "../models/Branch.js";
import User from "../models/User.js";

const getBranches = async (req, res) => {
  try {
    const branches = await Branch.find({
      businessId: req.user.businessId,
    })
      .populate("managerId", "name email role")
      .sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      branches,
    });
  } catch (error) {
    console.error("Get branches error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load branches",
    });
  }
};

const getBranch = async (req, res) => {
  try {
    const branch = await Branch.findOne({
      _id: req.params.id,
      businessId: req.user.businessId,
    }).populate("managerId", "name email role");

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
    console.error("Get branch error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load branch",
    });
  }
};

const createBranch = async (req, res) => {
  try {
    const businessId = req.user.businessId;

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

    const normalizedCode = code.trim().toUpperCase();

    const existingBranch = await Branch.findOne({
      businessId,
      code: normalizedCode,
    });

    if (existingBranch) {
      return res.status(409).json({
        success: false,
        message: `Branch code "${normalizedCode}" already exists`,
      });
    }

    if (managerId) {
      const manager = await User.findOne({
        _id: managerId,
        businessId,
      });

      if (!manager) {
        return res.status(400).json({
          success: false,
          message: "Selected branch manager does not belong to this business",
        });
      }
    }

    const branch = await Branch.create({
      businessId,
      name: name.trim(),
      code: normalizedCode,
      phone: phone?.trim() || "",
      address: address?.trim() || "",
      managerId: managerId || null,
      isActive: true,
    });

    /*
     * Add the new branch to the owner's authorized branch list.
     */
    const owner = await User.findById(req.user._id);

    if (owner) {
      if (!owner.branchIds) {
        owner.branchIds = [];
      }

      const alreadyAssigned = owner.branchIds.some(
        (id) => id.toString() === branch._id.toString()
      );

      if (!alreadyAssigned) {
        owner.branchIds.push(branch._id);
      }

      if (!owner.activeBranchId) {
        owner.activeBranchId = branch._id;
      }

      if (!owner.branchId) {
        owner.branchId = branch._id;
      }

      await owner.save();
    }

    return res.status(201).json({
      success: true,
      message: "Branch created successfully",
      branch,
    });
  } catch (error) {
    console.error("Create branch error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create branch",
      error: error.message,
    });
  }
};

const updateBranch = async (req, res) => {
  try {
    const businessId = req.user.businessId;

    const {
      name,
      code,
      phone,
      address,
      managerId,
      isActive,
    } = req.body;

    const branch = await Branch.findOne({
      _id: req.params.id,
      businessId,
    });

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: "Branch not found",
      });
    }

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Branch name cannot be empty",
        });
      }

      branch.name = name.trim();
    }

    if (code !== undefined) {
      const normalizedCode = code.trim().toUpperCase();

      if (!normalizedCode) {
        return res.status(400).json({
          success: false,
          message: "Branch code cannot be empty",
        });
      }

      const duplicate = await Branch.findOne({
        businessId,
        code: normalizedCode,
        _id: { $ne: branch._id },
      });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: `Branch code "${normalizedCode}" already exists`,
        });
      }

      branch.code = normalizedCode;
    }

    if (phone !== undefined) {
      branch.phone = phone.trim();
    }

    if (address !== undefined) {
      branch.address = address.trim();
    }

    if (managerId !== undefined) {
      if (managerId) {
        const manager = await User.findOne({
          _id: managerId,
          businessId,
        });

        if (!manager) {
          return res.status(400).json({
            success: false,
            message: "Selected manager does not belong to this business",
          });
        }
      }

      branch.managerId = managerId || null;
    }

    if (isActive !== undefined) {
      branch.isActive = Boolean(isActive);
    }

    await branch.save();

    const updatedBranch = await Branch.findById(branch._id).populate(
      "managerId",
      "name email role"
    );

    return res.status(200).json({
      success: true,
      message: "Branch updated successfully",
      branch: updatedBranch,
    });
  } catch (error) {
    console.error("Update branch error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update branch",
      error: error.message,
    });
  }
};

const deleteBranch = async (req, res) => {
  try {
    const branch = await Branch.findOne({
      _id: req.params.id,
      businessId: req.user.businessId,
    });

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: "Branch not found",
      });
    }

    const branchCount = await Branch.countDocuments({
      businessId: req.user.businessId,
    });

    if (branchCount <= 1) {
      return res.status(400).json({
        success: false,
        message:
          "A business must have at least one branch. Create another branch before deleting this one.",
      });
    }

    await Branch.findByIdAndDelete(branch._id);

    await User.updateMany(
      {
        businessId: req.user.businessId,
      },
      {
        $pull: {
          branchIds: branch._id,
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: "Branch deleted successfully",
    });
  } catch (error) {
    console.error("Delete branch error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete branch",
    });
  }
};

const getBusinessUsers = async (req, res) => {
  try {
    const users = await User.find({
      businessId: req.user.businessId,
      status: "ACTIVE",
    })
      .select("name email role phone branchId branchIds")
      .sort({ name: 1 });

    return res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    console.error("Get business users error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load business users",
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
};