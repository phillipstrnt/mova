
import {
  hasPermission,
} from "../config/permissions.js";

/*
|--------------------------------------------------------------------------
| REQUIRE PERMISSION
|--------------------------------------------------------------------------
*/

export const requirePermission = (
  permission
) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required.",
        });
      }

      const allowed =
        hasPermission(
          req.user.role,
          permission
        );

      if (!allowed) {
        return res.status(403).json({
          success: false,
          message:
            "You do not have permission to perform this action.",
          permission,
        });
      }

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

/*
|--------------------------------------------------------------------------
| REQUIRE ANY PERMISSION
|--------------------------------------------------------------------------
*/

export const requireAnyPermission = (
  permissions = []
) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const allowed =
      permissions.some((permission) =>
        hasPermission(
          req.user.role,
          permission
        )
      );

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to perform this action.",
      });
    }

    next();
  };
};