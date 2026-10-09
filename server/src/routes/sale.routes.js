import express from "express";

import {
  createSale,
  getSales,
  getSaleById,
} from "../controllers/saleController.js";

import {
  protect,
} from "../middleware/authMiddleware.js";
import { requirePermission, requireAnyPermission } from "../middleware/permissionMiddleware.js";

const router = express.Router();

router.use(protect);

router.get(
  "/",
  requirePermission("sales.view"),
  getSales
);

router.get(
  "/:id",
  requirePermission("sales.view"),
  getSaleById
);

router.post(
  "/",
  requireAnyPermission(["sales.create", "pos.create_sale"]),
  createSale
);

export default router;
