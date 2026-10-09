import express from "express";

import {
  getReturns,
  getReturnById,
  getSaleReturnableItems,
  createReturn,
} from "../controllers/returnController.js";

import { protect } from "../middleware/authMiddleware.js";
import { requirePermission } from "../middleware/permissionMiddleware.js";

const router = express.Router();

router.use(protect);

router.get(
  "/",
  requirePermission("returns.view"),
  getReturns
);

router.get(
  "/sale/:saleId",
  requirePermission("returns.view"),
  getSaleReturnableItems
);

router.get(
  "/:id",
  requirePermission("returns.view"),
  getReturnById
);

router.post(
  "/",
  requirePermission("returns.create"),
  createReturn
);

export default router;
