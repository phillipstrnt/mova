import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import { exportBusinessBackup, getBackupStatusController, restoreBusinessBackup } from "../controllers/backupController.js";

const router = express.Router();
router.use(protect, authorize("OWNER"));
router.get("/status", getBackupStatusController);
router.get("/export", exportBusinessBackup);
router.post("/restore", restoreBusinessBackup);

export default router;
