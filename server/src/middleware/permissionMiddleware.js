
import {
  hasPermission,
  getRolePermissions,
} from "../config/permissions.js";

/**
 * Middleware that requires the logged-in user
 * to have a specific permission.
 *
 * Usage:
 *
 * router.get(
 *   "/",
 *   protect,
 *   requirePermission("users.view"),
 *   getUsers
 * );
 */
export const requirePermission = (
  permission
) => {
  return (req, res, next) => {
    try {
      /*
       * protect middleware should always run before
       * this middleware.
       */
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message:
            "Authentication required.",
        });
      }

      const role = String(
        req.user.role || ""
      ).toUpperCase();

      if (!role) {
        return res.status(403).json({
          success: false,
          message:
            "Your account does not have a valid role.",
        });
      }

      const allowed =
        hasPermission(
          role,
          permission
        );

      if (!allowed) {
        return res.status(403).json({
          success: false,
          message:
            "You do not have permission to perform this action.",
          permission,
          role,
        });
      }

      /*
       * Store the permission information on the
       * request so controllers can use it if necessary.
       */
      req.permission = permission;

      next();
    } catch (error) {
      console.error(
        "Permission middleware error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to verify user permissions.",
      });
    }
  };
};

/**
 * Middleware that allows access when the user
 * has at least one of the supplied permissions.
 *
 * Example:
 *
 * requireAnyPermission([
 *   "sales.view",
 *   "reports.view"
 * ])
 */
export const requireAnyPermission = (
  permissions = []
) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message:
            "Authentication required.",
        });
      }

      if (
        !Array.isArray(permissions) ||
        permissions.length === 0
      ) {
        return res.status(500).json({
          success: false,
          message:
            "No permissions were configured for this route.",
        });
      }

      const role = String(
        req.user.role || ""
      ).toUpperCase();

      const allowed =
        permissions.some(
          (permission) =>
            hasPermission(
              role,
              permission
            )
        );

      if (!allowed) {
        return res.status(403).json({
          success: false,
          message:
            "You do not have permission to perform this action.",
          role,
          requiredPermissions:
            permissions,
        });
      }

      req.permissions =
        permissions;

      next();
    } catch (error) {
      console.error(
        "Any permission middleware error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to verify user permissions.",
      });
    }
  };
};

/**
 * Middleware for checking whether the current
 * user has one of several permissions and storing
 * all permissions available to their role.
 *
 * This is useful for controllers that need to make
 * additional decisions based on the user's role.
 */
export const attachPermissions = (
  req,
  res,
  next
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required.",
      });
    }

    const role = String(
      req.user.role || ""
    ).toUpperCase();

    req.userPermissions =
      getRolePermissions(role);

    next();
  } catch (error) {
    console.error(
      "Attach permissions middleware error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load user permissions.",
    });
  }
};