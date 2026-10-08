
import mongoose from "mongoose";

import Notification from "../models/Notification.js";

/*
|----------------------------------------------------------------------
| HELPERS
|----------------------------------------------------------------------
*/

const isOwnerOrAdmin = (user) => {
  return (
    user?.role === "OWNER" ||
    user?.role === "ADMIN"
  );
};

const getAllowedBranchIds = (user) => {
  if (!Array.isArray(user?.branchIds)) {
    return [];
  }

  return user.branchIds.map((id) =>
    String(id)
  );
};

const canAccessBranch = (
  user,
  branchId
) => {
  if (!branchId) {
    return true;
  }

  if (isOwnerOrAdmin(user)) {
    return true;
  }

  const allowedBranches =
    getAllowedBranchIds(user);

  return allowedBranches.includes(
    String(branchId)
  );
};

/*
|----------------------------------------------------------------------
| GET NOTIFICATIONS
| GET /api/notifications
|----------------------------------------------------------------------
*/

export const getNotifications =
  async (req, res) => {
    try {
      const businessId =
        req.user.businessId;

      if (!businessId) {
        return res.status(400).json({
          success: false,
          message:
            "User is not associated with a business.",
        });
      }

      const limit = Math.min(
        Math.max(
          Number(req.query.limit) || 30,
          1
        ),
        100
      );

      const unreadOnly =
        req.query.unread === "true";

      const filter = {
        businessId,
        $or: [
          {
            userId: req.user._id,
          },
          {
            userId: null,
          },
        ],
      };

      if (unreadOnly) {
        filter.read = false;
      }

      /*
       * Branch users should only see notifications
       * belonging to branches they can access.
       */

      if (!isOwnerOrAdmin(req.user)) {
        const allowedBranchIds =
          getAllowedBranchIds(
            req.user
          );

        const branchConditions = [
          {
            branchId: null,
          },
        ];

        for (const branchId of allowedBranchIds) {
          if (
            mongoose.Types.ObjectId.isValid(
              branchId
            )
          ) {
            branchConditions.push({
              branchId:
                new mongoose.Types.ObjectId(
                  branchId
                ),
            });
          }
        }

        filter.$and = [
          {
            $or: branchConditions,
          },
        ];
      }

      const notifications =
        await Notification.find(
          filter
        )
          .sort({
            createdAt: -1,
          })
          .limit(limit)
          .lean();

      const unreadCount =
        await Notification.countDocuments({
          ...filter,
          read: false,
        });

      return res.json({
        success: true,
        notifications,
        unreadCount,
      });
    } catch (error) {
      console.error(
        "Get notifications error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to load notifications.",
      });
    }
  };

/*
|----------------------------------------------------------------------
| GET UNREAD COUNT
| GET /api/notifications/unread-count
|----------------------------------------------------------------------
*/

export const getUnreadNotificationCount =
  async (req, res) => {
    try {
      const businessId =
        req.user.businessId;

      const filter = {
        businessId,
        read: false,
        $or: [
          {
            userId: req.user._id,
          },
          {
            userId: null,
          },
        ],
      };

      if (!isOwnerOrAdmin(req.user)) {
        const allowedBranchIds =
          getAllowedBranchIds(
            req.user
          );

        const validBranchIds =
          allowedBranchIds
            .filter((id) =>
              mongoose.Types.ObjectId.isValid(
                id
              )
            )
            .map(
              (id) =>
                new mongoose.Types.ObjectId(
                  id
                )
            );

        filter.$and = [
          {
            $or: [
              {
                branchId: null,
              },
              {
                branchId: {
                  $in: validBranchIds,
                },
              },
            ],
          },
        ];
      }

      const count =
        await Notification.countDocuments(
          filter
        );

      return res.json({
        success: true,
        unreadCount: count,
      });
    } catch (error) {
      console.error(
        "Unread notification count error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to load notification count.",
      });
    }
  };

/*
|----------------------------------------------------------------------
| MARK ONE AS READ
| PATCH /api/notifications/:id/read
|----------------------------------------------------------------------
*/

export const markNotificationRead =
  async (req, res) => {
    try {
      const { id } =
        req.params;

      if (
        !mongoose.Types.ObjectId.isValid(
          id
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid notification ID.",
        });
      }

      const notification =
        await Notification.findOne({
          _id: id,
          businessId:
            req.user.businessId,
          $or: [
            {
              userId: req.user._id,
            },
            {
              userId: null,
            },
          ],
        });

      if (!notification) {
        return res.status(404).json({
          success: false,
          message:
            "Notification not found.",
        });
      }

      if (
        !canAccessBranch(
          req.user,
          notification.branchId
        )
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You do not have access to this notification.",
        });
      }

      notification.read = true;
      notification.readAt =
        new Date();

      await notification.save();

      return res.json({
        success: true,
        notification,
      });
    } catch (error) {
      console.error(
        "Mark notification read error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to mark notification as read.",
      });
    }
  };

/*
|----------------------------------------------------------------------
| MARK ALL AS READ
| PATCH /api/notifications/read-all
|----------------------------------------------------------------------
*/

export const markAllNotificationsRead =
  async (req, res) => {
    try {
      const filter = {
        businessId:
          req.user.businessId,

        read: false,

        $or: [
          {
            userId: req.user._id,
          },
          {
            userId: null,
          },
        ],
      };

      if (!isOwnerOrAdmin(req.user)) {
        const allowedBranchIds =
          getAllowedBranchIds(
            req.user
          );

        const validBranchIds =
          allowedBranchIds
            .filter((id) =>
              mongoose.Types.ObjectId.isValid(
                id
              )
            )
            .map(
              (id) =>
                new mongoose.Types.ObjectId(
                  id
                )
            );

        filter.$and = [
          {
            $or: [
              {
                branchId: null,
              },
              {
                branchId: {
                  $in: validBranchIds,
                },
              },
            ],
          },
        ];
      }

      const result =
        await Notification.updateMany(
          filter,
          {
            $set: {
              read: true,
              readAt: new Date(),
            },
          }
        );

      return res.json({
        success: true,
        modifiedCount:
          result.modifiedCount || 0,
      });
    } catch (error) {
      console.error(
        "Mark all notifications read error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to mark notifications as read.",
      });
    }
  };

/*
|----------------------------------------------------------------------
| DELETE NOTIFICATION
| DELETE /api/notifications/:id
|----------------------------------------------------------------------
*/

export const deleteNotification =
  async (req, res) => {
    try {
      const { id } =
        req.params;

      if (
        !mongoose.Types.ObjectId.isValid(
          id
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid notification ID.",
        });
      }

      const notification =
        await Notification.findOne({
          _id: id,
          businessId:
            req.user.businessId,
          $or: [
            {
              userId: req.user._id,
            },
            {
              userId: null,
            },
          ],
        });

      if (!notification) {
        return res.status(404).json({
          success: false,
          message:
            "Notification not found.",
        });
      }

      if (
        !canAccessBranch(
          req.user,
          notification.branchId
        )
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You do not have access to this notification.",
        });
      }

      await notification.deleteOne();

      return res.json({
        success: true,
        message:
          "Notification deleted.",
      });
    } catch (error) {
      console.error(
        "Delete notification error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to delete notification.",
      });
    }
  };