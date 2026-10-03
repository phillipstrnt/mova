
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Branch from "../models/Branch.js";

const protect = async (
  req,
  res,
  next
) => {
  try {
    /* =========================================================
       CHECK AUTHORIZATION HEADER
    ========================================================= */

    const authHeader =
      req.headers.authorization;

    if (
      !authHeader ||
      !authHeader.startsWith("Bearer ")
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required",
      });
    }

    /* =========================================================
       EXTRACT TOKEN
    ========================================================= */

    const token =
      authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication token is missing",
      });
    }

    /* =========================================================
       VERIFY TOKEN
    ========================================================= */

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    if (!decoded?.userId) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid authentication token",
      });
    }

    /* =========================================================
       LOAD USER
    ========================================================= */

    const user =
      await User.findById(
        decoded.userId
      )
        .select("-passwordHash")
        .populate(
          "activeBranchId",
          "businessId name code phone address isActive"
        )
        .populate(
          "branchIds",
          "businessId name code phone address isActive"
        );

    if (!user) {
      return res.status(401).json({
        success: false,
        message:
          "User account no longer exists",
      });
    }

    /* =========================================================
       CHECK USER STATUS
    ========================================================= */

    if (user.status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        message:
          "This account is not active",
      });
    }

    /* =========================================================
       CHECK BUSINESS
       A user must belong to a business.
    ========================================================= */

    if (!user.businessId) {
      return res.status(403).json({
        success: false,
        message:
          "Your account is not connected to a business.",
      });
    }

    /* =========================================================
       BUILD AUTHORIZED BRANCH LIST
    ========================================================= */

    const populatedBranches =
      Array.isArray(user.branchIds)
        ? user.branchIds.filter(Boolean)
        : [];

    const authorizedBranchIds =
      populatedBranches.map((branch) =>
        branch._id.toString()
      );

    /*
     * Backward compatibility:
     *
     * Older MOVA users may still have only
     * branchId or activeBranchId populated.
     */

    if (
      user.branchId &&
      !authorizedBranchIds.includes(
        user.branchId.toString()
      )
    ) {
      authorizedBranchIds.push(
        user.branchId.toString()
      );
    }

    if (
      user.activeBranchId?._id &&
      !authorizedBranchIds.includes(
        user.activeBranchId._id.toString()
      )
    ) {
      authorizedBranchIds.push(
        user.activeBranchId._id.toString()
      );
    }

    /* =========================================================
       DETERMINE ACTIVE BRANCH
    ========================================================= */

    let activeBranch =
      user.activeBranchId || null;

    /*
     * If activeBranchId exists but the branch
     * is inactive, do not allow it to become
     * the active operating branch.
     */

    if (
      activeBranch &&
      activeBranch.isActive === false
    ) {
      activeBranch = null;
    }

    /*
     * Legacy users may have branchId but no
     * activeBranchId.
     */

    if (
      !activeBranch &&
      user.branchId
    ) {
      const legacyBranch =
        populatedBranches.find(
          (branch) =>
            branch._id.toString() ===
            user.branchId.toString()
        );

      if (
        legacyBranch &&
        legacyBranch.isActive !== false
      ) {
        activeBranch =
          legacyBranch;
      }
    }

    /*
     * OWNER and ADMIN accounts can be
     * migrated safely if they have no
     * branch assignment yet.
     *
     * We intentionally do NOT automatically
     * grant ordinary users access to branches.
     */

    if (
      !activeBranch &&
      (user.role === "OWNER" ||
        user.role === "ADMIN")
    ) {
      const fallbackBranch =
        await Branch.findOne({
          businessId:
            user.businessId,
          isActive: true,
        }).select(
          "businessId name code phone address isActive"
        );

      if (fallbackBranch) {
        activeBranch =
          fallbackBranch;

        if (
          !authorizedBranchIds.includes(
            fallbackBranch._id.toString()
          )
        ) {
          authorizedBranchIds.push(
            fallbackBranch._id.toString()
          );
        }
      }
    }

    /* =========================================================
       VERIFY ACTIVE BRANCH BELONGS TO USER'S BUSINESS
    ========================================================= */

    if (activeBranch) {
      if (
        activeBranch.businessId?.toString() !==
        user.businessId.toString()
      ) {
        activeBranch = null;
      }
    }

    /* =========================================================
       EXPOSE BRANCH CONTEXT TO REQUEST
    ========================================================= */

    /*
     * req.user remains the Mongoose user document
     * so existing controllers continue working.
     *
     * These additional request properties provide
     * a clean branch-aware context for new and
     * updated controllers.
     */

    req.user = user;

    req.user.activeBranch =
      activeBranch;

    req.user.authorizedBranchIds =
      authorizedBranchIds;

    /*
     * Keep the legacy branchId field
     * synchronized for existing controllers.
     */

    req.user.activeBranchId =
      activeBranch?._id ||
      user.activeBranchId ||
      null;

    req.user.branchId =
      activeBranch?._id ||
      user.branchId ||
      null;

    /*
     * These request-level values are useful
     * for branch-aware controllers.
     */

    req.businessId =
      user.businessId;

    req.branchId =
      activeBranch?._id ||
      user.branchId ||
      null;

    req.activeBranch =
      activeBranch;

    req.authorizedBranchIds =
      authorizedBranchIds;

    next();
  } catch (error) {
    console.error(
      "Authentication error:",
      error.message
    );

    if (
      error.name ===
        "JsonWebTokenError" ||
      error.name ===
        "TokenExpiredError"
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid or expired authentication token",
      });
    }

    return res.status(401).json({
      success: false,
      message:
        "Authentication failed",
    });
  }
};

/* ============================================================
   ROLE AUTHORIZATION
============================================================ */

const authorize = (...roles) => {
  return (
    req,
    res,
    next
  ) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required",
      });
    }

    if (
      !roles.includes(
        req.user.role
      )
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to perform this action",
      });
    }

    next();
  };
};

export {
  protect,
  authorize,
};
