import express from "express";

import {
  getUsers,
  getUser,
  createUser,
  updateUser,
  disableUser,
  enableUser,
} from "../controllers/userController.js";

import { protect } from "../middleware/authMiddleware.js";

import {
  requirePermission,
} from "../middleware/permissionMiddleware.js";

const router = express.Router();

router.use(protect);

router.get(
  "/",
  requirePermission("users.view"),
  getUsers
);

router.get(
  "/:id",
  requirePermission("users.view"),
  getUser
);

router.post(
  "/",
  requirePermission("users.create"),
  createUser
);

router.patch(
  "/:id",
  requirePermission("users.update"),
  updateUser
);

router.patch(
  "/:id/disable",
  requirePermission("users.disable"),
  disableUser
);

router.patch(
  "/:id/enable",
  requirePermission("users.disable"),
  enableUser
);

export default router;