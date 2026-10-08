
import express from "express";

import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from "../controllers/notificationController.js";

import {
  protect,
} from "../middleware/authMiddleware.js";

const router =
  express.Router();

/*
|----------------------------------------------------------------------
| ALL NOTIFICATION ROUTES REQUIRE LOGIN
|----------------------------------------------------------------------
*/

router.use(protect);

/*
|----------------------------------------------------------------------
| GET NOTIFICATIONS
|----------------------------------------------------------------------
*/

router.get(
  "/",
  getNotifications
);

/*
|----------------------------------------------------------------------
| GET UNREAD COUNT
|----------------------------------------------------------------------
*/

router.get(
  "/unread-count",
  getUnreadNotificationCount
);

/*
|----------------------------------------------------------------------
| MARK ALL READ
|----------------------------------------------------------------------
*/

router.patch(
  "/read-all",
  markAllNotificationsRead
);

/*
|----------------------------------------------------------------------
| MARK ONE READ
|----------------------------------------------------------------------
*/

router.patch(
  "/:id/read",
  markNotificationRead
);

/*
|----------------------------------------------------------------------
| DELETE
|----------------------------------------------------------------------
*/

router.delete(
  "/:id",
  deleteNotification
);

export default router;