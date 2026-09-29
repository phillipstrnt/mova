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

const router = express.Router();

router.use(protect);

router.get("/", getCategories);

router.get("/:id", getCategoryById);

router.post(
  "/",
  authorize("OWNER", "ADMIN", "MANAGER"),
  createCategory
);

router.patch(
  "/:id",
  authorize("OWNER", "ADMIN", "MANAGER"),
  updateCategory
);

router.patch(
  "/:id/deactivate",
  authorize("OWNER", "ADMIN", "MANAGER"),
  deactivateCategory
);

router.patch(
  "/:id/activate",
  authorize("OWNER", "ADMIN", "MANAGER"),
  activateCategory
);

export default router;