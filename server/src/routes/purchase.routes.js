import express from "express";

import {
  getPurchases,
  getPurchaseById,
  createPurchase,
  cancelPurchase,
} from "../controllers/purchaseController.js";

import {
  protect,
  authorize,
} from "../middleware/authMiddleware.js";
import { requirePermission } from "../middleware/permissionMiddleware.js";

const router = express.Router();


// ============================================================
// ALL PURCHASE ROUTES REQUIRE AUTHENTICATION
// ============================================================

router.use(protect);


// ============================================================
// GET ALL PURCHASES
// GET /api/purchases
// ============================================================

router.get(
  "/",
  requirePermission("purchases.view"),
  getPurchases
);


// ============================================================
// GET SINGLE PURCHASE
// GET /api/purchases/:id
// ============================================================

router.get(
  "/:id",
  requirePermission("purchases.view"),
  getPurchaseById
);


// ============================================================
// CREATE PURCHASE
// POST /api/purchases
// ============================================================

router.post(
  "/",
  authorize(
    "OWNER",
    "ADMIN",
    "MANAGER",
    "INVENTORY_MANAGER"
  ),
  requirePermission("purchases.create"),
  createPurchase
);


// ============================================================
// CANCEL PURCHASE
// POST /api/purchases/:id/cancel
// ============================================================

router.post(
  "/:id/cancel",
  authorize(
    "OWNER",
    "ADMIN",
    "MANAGER"
  ),
  requirePermission("purchases.update"),
  cancelPurchase
);


export default router;
