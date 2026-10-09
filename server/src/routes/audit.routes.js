
import express from "express";

import {
  getAuditLogs,
  getAuditLog,
  createPosAuditEvent,
} from "../controllers/auditController.js";

import { protect } from "../middleware/authMiddleware.js";

import {
  requirePermission,
} from "../middleware/permissionMiddleware.js";

const router = express.Router();

router.use(protect);

router.post("/events", requirePermission("audit.create"), createPosAuditEvent);

/*
|--------------------------------------------------------------------------
| AUDIT LOGS
|--------------------------------------------------------------------------
|
| Only users with audit.view can access these endpoints.
|
*/

router.get(
  "/",
  requirePermission("audit.view"),
  getAuditLogs
);

router.get(
  "/:id",
  requirePermission("audit.view"),
  getAuditLog
);

export default router;
