import express from "express";

import {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deactivateCategory,
  activateCategory,
} from "../controllers/categoryController.js";

import { protect, authorize } from "../middleware/authMiddleware.js";
import { requirePermission } from "../middleware/permissionMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/", requirePermission("categories.view"), getCategories);

router.get("/:id", requirePermission("categories.view"), getCategoryById);

router.post(
  "/",
  authorize("OWNER", "ADMIN", "MANAGER"),
  requirePermission("categories.create"),
  createCategory
);

router.patch(
  "/:id",
  authorize("OWNER", "ADMIN", "MANAGER"),
  requirePermission("categories.update"),
  updateCategory
);

router.patch(
  "/:id/deactivate",
  authorize("OWNER", "ADMIN", "MANAGER"),
  requirePermission("categories.update"),
  deactivateCategory
);

router.patch(
  "/:id/activate",
  authorize("OWNER", "ADMIN", "MANAGER"),
  requirePermission("categories.update"),
  activateCategory
);

export default router;
