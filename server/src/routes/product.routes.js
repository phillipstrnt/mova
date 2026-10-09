import express from "express";

import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deactivateProduct,
  activateProduct,
} from "../controllers/productController.js";

import { protect, authorize } from "../middleware/authMiddleware.js";
import { requirePermission, requireAnyPermission } from "../middleware/permissionMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/", requireAnyPermission(["products.view", "pos.view"]), getProducts);

router.get("/:id", requirePermission("products.view"), getProductById);

router.post(
  "/",
  authorize(
    "OWNER",
    "ADMIN",
    "MANAGER",
    "INVENTORY_MANAGER"
  ),
  requirePermission("products.create"),
  createProduct
);

router.patch(
  "/:id",
  authorize(
    "OWNER",
    "ADMIN",
    "MANAGER",
    "INVENTORY_MANAGER"
  ),
  requirePermission("products.update"),
  updateProduct
);

router.patch(
  "/:id/deactivate",
  authorize("OWNER", "ADMIN", "MANAGER"),
  requirePermission("products.update"),
  deactivateProduct
);

router.patch(
  "/:id/activate",
  authorize("OWNER", "ADMIN", "MANAGER"),
  requirePermission("products.update"),
  activateProduct
);

export default router;
