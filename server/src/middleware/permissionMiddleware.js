
import {
  getRolePermissions,
  hasPermission,
} from "../config/permissions.js";

/*
|--------------------------------------------------------------------------
| Require Permission
|--------------------------------------------------------------------------
|
| Usage:
|
| router.get(
|   "/",
|   protect,
|   requirePermission(PERMISSIONS.CUSTOMERS_VIEW),
|   controller
| );
|
|--------------------------------------------------------------------------
*/

export const requirePermission = (permission) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required.",
        });
      }

      const role = String(req.user.role || "").toUpperCase();

      if (!role) {
        return res.status(403).json({
          success: false,
          message: "User role is not defined.",
        });
      }

      /*
       * OWNER has unrestricted access.
       */
      if (role === "OWNER") {
        return next();
      }

      /*
       * Check whether the role exists.
       */
      const rolePermissions = getRolePermissions(role);

      if (!rolePermissions.length) {
        return res.status(403).json({
          success: false,
          message: `No permissions configured for role: ${role}`,
        });
      }

      /*
       * Check requested permission.
       */
      if (!hasPermission(role, permission)) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to perform this action.",
          permission,
        });
      }

      next();
    } catch (error) {
      console.error("Permission middleware error:", error);

      return res.status(500).json({
        success: false,
        message: "Permission verification failed.",
      });
    }
  };
};

/*
|--------------------------------------------------------------------------
| Require Any Permission
|--------------------------------------------------------------------------
*/

export const requireAnyPermission = (permissions = []) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required.",
        });
      }

      const role = String(req.user.role || "").toUpperCase();

      if (role === "OWNER") {
        return next();
      }

      if (!Array.isArray(permissions) || permissions.length === 0) {
        return res.status(403).json({
          success: false,
          message: "No permissions were specified.",
        });
      }

      const rolePermissions = getRolePermissions(role);

      const allowed = permissions.some((permission) =>
        rolePermissions.includes(permission)
      );

      if (!allowed) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to perform this action.",
        });
      }

      next();
    } catch (error) {
      console.error("Any-permission middleware error:", error);

      return res.status(500).json({
        success: false,
        message: "Permission verification failed.",
      });
    }
  };
};

/*
|--------------------------------------------------------------------------
| Require All Permissions
|--------------------------------------------------------------------------
*/

export const requireAllPermissions = (permissions = []) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required.",
        });
      }

      const role = String(req.user.role || "").toUpperCase();

      if (role === "OWNER") {
        return next();
      }

      if (!Array.isArray(permissions) || permissions.length === 0) {
        return res.status(403).json({
          success: false,
          message: "No permissions were specified.",
        });
      }

      const rolePermissions = getRolePermissions(role);

      const allowed = permissions.every((permission) =>
        rolePermissions.includes(permission)
      );

      if (!allowed) {
        return res.status(403).json({
          success: false,
          message: "You do not have all required permissions.",
        });
      }

      next();
    } catch (error) {
      console.error("All-permissions middleware error:", error);

      return res.status(500).json({
        success: false,
        message: "Permission verification failed.",
      });
    }
  };
};
