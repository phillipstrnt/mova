import express from "express";

import {
  getInventoryTransactions,
  getProductInventoryTransactions,
  adjustInventory,
} from "../controllers/InventoryTransactionController.js";

import {
  protect,
  authorize,
} from "../middleware/authMiddleware.js";
import { requirePermission } from "../middleware/permissionMiddleware.js";

const router = express.Router();

router.use(protect);

/*
 * View inventory history
 */
router.get("/", requirePermission("inventory.view"), getInventoryTransactions);

/*
 * View one product's inventory history
 */
router.get(
  "/product/:productId",
  requirePermission("inventory.view"),
  getProductInventoryTransactions
);

/*
 * Manually adjust inventory
 *
 * Only authorized staff can make stock adjustments.
 */
router.post(
  "/adjust",
  authorize(
    "OWNER",
    "ADMIN",
    "MANAGER",
    "INVENTORY_MANAGER"
  ),
  requirePermission("inventory.adjust"),
  adjustInventory
);

export default router;
