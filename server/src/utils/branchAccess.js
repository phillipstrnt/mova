
import mongoose from "mongoose";
import Branch from "../models/Branch.js";

/* ============================================================
   GET ACTIVE BRANCH ID
============================================================ */

/**
 * Returns the authenticated user's active branch ID.
 *
 * The function checks the new activeBranchId first,
 * then falls back to the legacy branchId.
 */
export const getActiveBranchId = (
  req
) => {
  const activeBranchId =
    req.user?.activeBranchId;

  const branchId =
    req.user?.branchId;

  const value =
    activeBranchId ||
    branchId ||
    req.branchId ||
    null;

  if (!value) {
    return null;
  }

  return value.toString();
};

/* ============================================================
   REQUIRE ACTIVE BRANCH
============================================================ */

/**
 * Middleware for operations that MUST happen
 * inside a specific branch.
 *
 * Example:
 *
 * router.post(
 *   "/",
 *   protect,
 *   requireActiveBranch,
 *   createSale
 * );
 */
export const requireActiveBranch = (
  req,
  res,
  next
) => {
  const branchId =
    getActiveBranchId(req);

  if (!branchId) {
    return res.status(400).json({
      success: false,
      message:
        "No active branch has been selected. Please select a branch and try again.",
    });
  }

  req.branchId =
    branchId;

  next();
};

/* ============================================================
   GET AUTHORIZED BRANCH IDS
============================================================ */

/**
 * Returns the branch IDs the current user
 * is allowed to access.
 */
export const getAuthorizedBranchIds = (
  req
) => {
  const ids =
    req.user?.authorizedBranchIds;

  if (
    Array.isArray(ids)
  ) {
    return ids.map(
      (id) => id.toString()
    );
  }

  const branchIds =
    req.user?.branchIds;

  if (
    Array.isArray(branchIds)
  ) {
    return branchIds
      .filter(Boolean)
      .map(
        (branch) =>
          (
            branch?._id ||
            branch
          ).toString()
      );
  }

  const fallback =
    getActiveBranchId(req);

  return fallback
    ? [fallback]
    : [];
};

/* ============================================================
   CHECK BRANCH ACCESS
============================================================ */

/**
 * Checks whether the authenticated user
 * has access to a specific branch.
 *
 * OWNER and ADMIN are allowed to operate
 * across business branches.
 *
 * Other users must have the branch assigned
 * to their account.
 */
export const hasBranchAccess = (
  req,
  branchId
) => {
  if (!req.user || !branchId) {
    return false;
  }

  const requestedBranchId =
    branchId.toString();

  /*
   * OWNER and ADMIN have business-level
   * administrative access.
   */
  if (
    req.user.role === "OWNER" ||
    req.user.role === "ADMIN"
  ) {
    return true;
  }

  const authorizedIds =
    getAuthorizedBranchIds(req);

  return authorizedIds.includes(
    requestedBranchId
  );
};

/* ============================================================
   REQUIRE BRANCH ACCESS
============================================================ */

/**
 * Middleware that validates a branch ID
 * against the authenticated user's access.
 *
 * It can receive the branch ID from:
 *
 * req.params.branchId
 * req.body.branchId
 * req.query.branchId
 */
export const requireBranchAccess = (
  req,
  res,
  next
) => {
  const requestedBranchId =
    req.params?.branchId ||
    req.body?.branchId ||
    req.query?.branchId;

  if (!requestedBranchId) {
    return res.status(400).json({
      success: false,
      message:
        "Branch ID is required.",
    });
  }

  if (
    !mongoose.Types.ObjectId.isValid(
      requestedBranchId
    )
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Invalid branch ID.",
    });
  }

  if (
    !hasBranchAccess(
      req,
      requestedBranchId
    )
  ) {
    return res.status(403).json({
      success: false,
      message:
        "You do not have access to this branch.",
    });
  }

  req.branchId =
    requestedBranchId;

  next();
};

/* ============================================================
   BUILD ACTIVE BRANCH QUERY
============================================================ */

/**
 * Returns a MongoDB filter containing
 * businessId + active branch.
 *
 * This is useful for controllers.
 *
 * Example:
 *
 * const query = {
 *   ...buildActiveBranchQuery(req),
 *   status: "COMPLETED"
 * };
 */
export const buildActiveBranchQuery = (
  req
) => {
  const branchId =
    getActiveBranchId(req);

  const businessId =
    req.user?.businessId;

  const query = {};

  if (businessId) {
    query.businessId =
      businessId;
  }

  if (branchId) {
    query.branchId =
      branchId;
  }

  return query;
};

/* ============================================================
   BUILD BUSINESS-ONLY QUERY
============================================================ */

/**
 * Useful for records that belong to the
 * business as a whole rather than a specific
 * branch.
 */
export const buildBusinessQuery = (
  req
) => {
  const businessId =
    req.user?.businessId;

  return businessId
    ? {
        businessId,
      }
    : {};
};

/* ============================================================
   VERIFY BRANCH BELONGS TO BUSINESS
============================================================ */

/**
 * Makes sure a branch belongs to the
 * authenticated user's business.
 */
export const getBusinessBranch =
  async (
    req,
    branchId
  ) => {
    if (
      !branchId ||
      !mongoose.Types.ObjectId.isValid(
        branchId
      )
    ) {
      return null;
    }

    if (!req.user?.businessId) {
      return null;
    }

    return Branch.findOne({
      _id: branchId,
      businessId:
        req.user.businessId,
      isActive: true,
    });
  };

/* ============================================================
   REQUIRE BUSINESS BRANCH
============================================================ */

/**
 * Validates that a branch exists,
 * is active and belongs to the user's
 * business.
 */
export const requireBusinessBranch =
  async (
    req,
    res,
    next
  ) => {
    try {
      const branchId =
        req.params?.branchId ||
        req.body?.branchId ||
        req.query?.branchId ||
        getActiveBranchId(req);

      if (!branchId) {
        return res.status(400).json({
          success: false,
          message:
            "No branch was specified.",
        });
      }

      const branch =
        await getBusinessBranch(
          req,
          branchId
        );

      if (!branch) {
        return res.status(404).json({
          success: false,
          message:
            "Branch not found or inactive.",
        });
      }

      if (
        !hasBranchAccess(
          req,
          branch._id
        )
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You do not have access to this branch.",
        });
      }

      req.branchId =
        branch._id;

      req.activeBranch =
        branch;

      next();
    } catch (error) {
      next(error);
    }
  };

/* ============================================================
   BRANCH FILTER FOR USER
============================================================ */

/**
 * Returns either:
 *
 * { branchId: activeBranchId }
 *
 * or, for OWNER/ADMIN all authorized
 * business branches can be queried when
 * explicitly requested.
 */
export const getBranchFilter = (
  req,
  options = {}
) => {
  const {
    allowAll = false,
  } = options;

  const activeBranchId =
    getActiveBranchId(req);

  /*
   * Default behavior is ALWAYS the active branch.
   *
   * This prevents ordinary application
   * requests from accidentally becoming
   * cross-branch queries.
   */
  if (
    !allowAll ||
    !(
      req.user?.role ===
        "OWNER" ||
      req.user?.role ===
        "ADMIN"
    )
  ) {
    return activeBranchId
      ? {
          branchId:
            activeBranchId,
        }
      : {};
  }

  /*
   * For OWNER/ADMIN, callers may explicitly
   * request all business branches.
   *
   * We still restrict the query to the
   * authenticated business.
   */
  return {};
};
