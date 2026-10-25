import express from "express";

import {
  getReceiptSettings,
  updateReceiptSettings,
} from "../controllers/receiptController.js";
import {
  authorize,
  protect,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/", getReceiptSettings);
router.put(
  "/",
  authorize("OWNER", "ADMIN"),
  updateReceiptSettings
);

export default router;
