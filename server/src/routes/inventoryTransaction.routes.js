import express from "express";

import {
  getInventoryTransactions,
  getProductInventoryTransactions,
  adjustInventory,
} from "../controllers/inventoryTransactionController.js";

import {
  protect,
  authorize,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

/*
 * View inventory history
 */
router.get("/", getInventoryTransactions);

/*
 * View one product's inventory history
 */
router.get(
  "/product/:productId",
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
  adjustInventory
);

export default router;