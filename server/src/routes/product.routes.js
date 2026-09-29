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

const router = express.Router();

router.use(protect);

router.get("/", getProducts);

router.get("/:id", getProductById);

router.post(
  "/",
  authorize(
    "OWNER",
    "ADMIN",
    "MANAGER",
    "INVENTORY_MANAGER"
  ),
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
  updateProduct
);

router.patch(
  "/:id/deactivate",
  authorize("OWNER", "ADMIN", "MANAGER"),
  deactivateProduct
);

router.patch(
  "/:id/activate",
  authorize("OWNER", "ADMIN", "MANAGER"),
  activateProduct
);

export default router;