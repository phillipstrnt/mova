import mongoose from "mongoose";
import Branch from "../models/Branch.js";

// ==========================================
// CHECK ROLE
// ==========================================

const hasRole = (user, roles) => {
  return roles.includes(user.role);
};

// ==========================================
// RESOLVE USER BRANCH
// ==========================================

const resolveBranch = async (req) => {
  const requestedBranchId =
    req.params.branchId ||
    req.body.branchId ||
    req.query.branchId ||
    req.user.activeBranchId ||
    req.user.branchId;

  if (!requestedBranchId) {
    return null;
  }

  // ========================================
  // VALIDATE OBJECT ID
  // ========================================

  if (!mongoose.Types.ObjectId.isValid(requestedBranchId)) {
    const error = new Error("Invalid branch ID.");
    error.status = 400;
    throw error;
  }

  // ========================================
  // FIND BRANCH
  // ========================================

  const branch = await Branch.findOne({
    _id: requestedBranchId,
    businessId: req.user.businessId,
    isActive: true,
  });

  if (!branch) {
    const error = new Error(
      "Branch not found or inactive."
    );

    error.status = 404;

    throw error;
  }

  // ========================================
  // CHECK AUTHORIZED BRANCHES
  // ========================================

  const authorizedBranches = (
    req.user.branchIds || []
  ).map((id) => String(id));

  // OWNER AND ADMIN
  // can access all branches in their business.

  const isOwnerOrAdmin = hasRole(
    req.user,
    ["OWNER", "ADMIN"]
  );

  // Other users need explicit branch access.

  const hasAccess =
    isOwnerOrAdmin ||
    authorizedBranches.includes(
      String(branch._id)
    );

  if (!hasAccess) {
    const error = new Error(
      "You do not have access to this branch."
    );

    error.status = 403;

    throw error;
  }

  return branch;
};

// ==========================================
// REQUIRED BRANCH ACCESS
// ==========================================

const requireBranchAccess = async (
  req,
  res,
  next
) => {
  try {
    const branch = await resolveBranch(req);

    if (!branch) {
      return res.status(400).json({
        success: false,
        message:
          "An active branch must be selected.",
      });
    }

    req.branch = branch;
    req.branchId = branch._id;

    next();
  } catch (error) {
    console.error(
      "Branch access error:",
      error
    );

    return res.status(
      error.status || 500
    ).json({
      success: false,
      message:
        error.message ||
        "Unable to verify branch access.",
    });
  }
};

// ==========================================
// OPTIONAL BRANCH ACCESS
// ==========================================

const optionalBranchAccess = async (
  req,
  res,
  next
) => {
  try {
    const branch = await resolveBranch(req);

    if (branch) {
      req.branch = branch;
      req.branchId = branch._id;
    }

    next();
  } catch (error) {
    console.error(
      "Optional branch access error:",
      error
    );

    return res.status(
      error.status || 500
    ).json({
      success: false,
      message:
        error.message ||
        "Unable to verify branch access.",
    });
  }
};

export {
  requireBranchAccess,
  optionalBranchAccess,
};