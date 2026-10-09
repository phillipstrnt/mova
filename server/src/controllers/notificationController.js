
import mongoose from "mongoose";
import Notification from "../models/Notification.js";

const isObjectId = (value) =>
  mongoose.Types.ObjectId.isValid(value);

const normalizeBranchId = (value) => {
  const id = value?._id || value?.id || value;
  return id ? String(id).trim() : "";
};

const getUserBranchIds = (user) => [
  ...(Array.isArray(user?.authorizedBranchIds) ? user.authorizedBranchIds : []),
  ...(Array.isArray(user?.branchIds) ? user.branchIds : []),
  user?.branchId,
]
  .map(normalizeBranchId)
  .filter((id) => isObjectId(id));

/**
 * Determine whether the current user can access a branch.
 *
 * OWNER and ADMIN are allowed to access all branches belonging
 * to their business.
 *
 * Other users are restricted to branchIds assigned to them.
 */
const canAccessBranch = (user, branchId) => {
  if (!branchId) {
    return true;
  }

  const role = String(user?.role || "").toUpperCase();

  if (role === "OWNER" || role === "ADMIN") {
    return true;
  }

  const allowedBranches = getUserBranchIds(user);

  return allowedBranches.includes(normalizeBranchId(branchId));
};

/**
 * Get notifications for the logged-in user.
 *
 * Notifications can be:
 * - specifically assigned to the logged-in user
 * - global notifications for the business
 *
 * Branch-restricted users only receive notifications for:
 * - their assigned branches
 * - business-wide notifications with branchId = null
 */
export const getNotifications = async (req, res) => {
  try {
    const businessId = req.user?.businessId;

    if (!businessId) {
      return res.status(400).json({
        success: false,
        message: "Business information is missing.",
      });
    }

    const {
      unread,
      limit = 30,
      branchId,
      type,
    } = req.query;

    const parsedLimit = Math.min(
      Math.max(Number(limit) || 30, 1),
      100
    );

    const filter = {
      businessId,
      $or: [
        { userId: req.user._id },
        { userId: null },
      ],
    };

    /*
     * Branch filtering.
     */
    if (branchId) {
      if (!isObjectId(branchId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid branch ID.",
        });
      }

      if (!canAccessBranch(req.user, branchId)) {
        return res.status(403).json({
          success: false,
          message: "You do not have access to this branch.",
        });
      }

      filter.$and = [
        {
          $or: [
            { branchId: null },
            { branchId },
          ],
        },
      ];
    } else {
      const role = String(req.user?.role || "").toUpperCase();

      if (role !== "OWNER" && role !== "ADMIN") {
        const branchIds = getUserBranchIds(req.user);

        filter.$and = [
          {
            $or: [
              { branchId: null },
              { branchId: { $in: branchIds } },
            ],
          },
        ];
      }
    }

    if (String(unread).toLowerCase() === "true") {
      filter.read = false;
    }

    if (type) {
      filter.type = String(type).toUpperCase();
    }

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(parsedLimit)
      .lean();

    const unreadFilter = {
      businessId,
      read: false,
      $or: [
        { userId: req.user._id },
        { userId: null },
      ],
    };

    if (branchId) {
      unreadFilter.$and = [
        {
          $or: [
            { branchId: null },
            { branchId },
          ],
        },
      ];
    } else {
      const role = String(req.user?.role || "").toUpperCase();

      if (role !== "OWNER" && role !== "ADMIN") {
        const branchIds = getUserBranchIds(req.user);

        unreadFilter.$and = [
          {
            $or: [
              { branchId: null },
              { branchId: { $in: branchIds } },
            ],
          },
        ];
      }
    }

    const unreadCount = await Notification.countDocuments(
      unreadFilter
    );

    return res.status(200).json({
      success: true,
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error("Get notifications error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load notifications.",
    });
  }
};

/**
 * Get only the unread notification count.
 */
export const getUnreadNotificationCount = async (req, res) => {
  try {
    const businessId = req.user?.businessId;

    if (!businessId) {
      return res.status(400).json({
        success: false,
        message: "Business information is missing.",
      });
    }

    const filter = {
      businessId,
      read: false,
      $or: [
        { userId: req.user._id },
        { userId: null },
      ],
    };

    const role = String(req.user?.role || "").toUpperCase();

    if (role !== "OWNER" && role !== "ADMIN") {
      const branchIds = getUserBranchIds(req.user);

      filter.$and = [
        {
          $or: [
            { branchId: null },
            { branchId: { $in: branchIds } },
          ],
        },
      ];
    }

    const unreadCount = await Notification.countDocuments(filter);

    return res.status(200).json({
      success: true,
      unreadCount,
    });
  } catch (error) {
    console.error(
      "Get unread notification count error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to load unread notification count.",
    });
  }
};

/**
 * Mark one notification as read.
 */
export const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    const businessId = req.user?.businessId;

    if (!isObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification ID.",
      });
    }

    const notification = await Notification.findOne({
      _id: id,
      businessId,
      $or: [
        { userId: req.user._id },
        { userId: null },
      ],
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found.",
      });
    }

    if (
      notification.branchId &&
      !canAccessBranch(req.user, notification.branchId)
    ) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this notification.",
      });
    }

    notification.read = true;
    notification.readAt = new Date();

    await notification.save();

    return res.status(200).json({
      success: true,
      message: "Notification marked as read.",
      notification,
    });
  } catch (error) {
    console.error(
      "Mark notification read error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to mark notification as read.",
    });
  }
};

/**
 * Mark all visible notifications as read.
 */
export const markAllNotificationsRead = async (req, res) => {
  try {
    const businessId = req.user?.businessId;

    if (!businessId) {
      return res.status(400).json({
        success: false,
        message: "Business information is missing.",
      });
    }

    const filter = {
      businessId,
      read: false,
      $or: [
        { userId: req.user._id },
        { userId: null },
      ],
    };

    const branchId = normalizeBranchId(req.body?.branchId);
    if (branchId) {
      if (!isObjectId(branchId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid branch ID.",
        });
      }

      if (!canAccessBranch(req.user, branchId)) {
        return res.status(403).json({
          success: false,
          message: "You do not have access to this branch.",
        });
      }

      filter.$and = [{
        $or: [{ branchId: null }, { branchId }],
      }];
    }

    const role = String(req.user?.role || "").toUpperCase();

    if (!branchId && role !== "OWNER" && role !== "ADMIN") {
      const branchIds = getUserBranchIds(req.user);

      filter.$and = [
        {
          $or: [
            { branchId: null },
            { branchId: { $in: branchIds } },
          ],
        },
      ];
    }

    const result = await Notification.updateMany(
      filter,
      {
        $set: {
          read: true,
          readAt: new Date(),
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read.",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error(
      "Mark all notifications read error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to mark notifications as read.",
    });
  }
};

/**
 * Delete a notification.
 */
export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const businessId = req.user?.businessId;

    if (!isObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification ID.",
      });
    }

    const notification = await Notification.findOne({
      _id: id,
      businessId,
      $or: [
        { userId: req.user._id },
        { userId: null },
      ],
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found.",
      });
    }

    if (
      notification.branchId &&
      !canAccessBranch(req.user, notification.branchId)
    ) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this notification.",
      });
    }

    await Notification.deleteOne({
      _id: notification._id,
    });

    return res.status(200).json({
      success: true,
      message: "Notification deleted.",
    });
  } catch (error) {
    console.error(
      "Delete notification error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to delete notification.",
    });
  }
};
