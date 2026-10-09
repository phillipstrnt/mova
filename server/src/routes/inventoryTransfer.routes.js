import express from "express";
import {
  createInventoryTransfer,
  listInventoryTransfers,
  reviewInventoryTransfer,
} from "../controllers/inventoryTransferController.js";
import { protect } from "../middleware/authMiddleware.js";
import { requirePermission } from "../middleware/permissionMiddleware.js";

const router = express.Router();
router.use(protect);
router.get("/", requirePermission("inventory.transfer"), listInventoryTransfers);
router.post("/", requirePermission("inventory.transfer"), createInventoryTransfer);
router.patch("/:id/review", requirePermission("inventory.transfer"), reviewInventoryTransfer);
export default router;
