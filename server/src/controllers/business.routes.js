
import express from "express";

import {
  getBranches,
  getBranch,
  createBranch,
  updateBranch,
  deleteBranch,
  switchBranch,
  getBranchUsers,
} from "../controllers/branchController.js";

import { protect } from "../middleware/authMiddleware.js";

import {
  requirePermission,
} from "../middleware/permissionMiddleware.js";

import {
  PERMISSIONS,
} from "../config/permissions.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Authentication
|--------------------------------------------------------------------------
|
| Every branch endpoint requires an authenticated MOVA user.
|
|--------------------------------------------------------------------------
*/

router.use(protect);

/*
|--------------------------------------------------------------------------
| GET ALL BRANCHES
|--------------------------------------------------------------------------
|
| OWNER / ADMIN:
|   Can see all active branches in their business.
|
| MANAGER:
|   Can see assigned branches.
|
| CASHIER / INVENTORY_MANAGER / ACCOUNTANT:
|   Can only see assigned branches.
|
|--------------------------------------------------------------------------
*/

router.get(
  "/",
  requirePermission(PERMISSIONS.BRANCHES_VIEW),
  getBranches
);

/*
|--------------------------------------------------------------------------
| SWITCH ACTIVE BRANCH
|--------------------------------------------------------------------------
|
| Only OWNER, ADMIN and MANAGER are allowed to switch.
|
| The controller performs an additional role/security check.
|
|--------------------------------------------------------------------------
*/

router.patch(
  "/switch",
  switchBranch
);

/*
|--------------------------------------------------------------------------
| GET USERS FOR A BRANCH
|--------------------------------------------------------------------------
*/

router.get(
  "/:branchId/users",
  requirePermission(PERMISSIONS.USERS_VIEW),
  getBranchUsers
);

/*
|--------------------------------------------------------------------------
| GET SINGLE BRANCH
|--------------------------------------------------------------------------
*/

router.get(
  "/:id",
  requirePermission(PERMISSIONS.BRANCHES_VIEW),
  getBranch
);

/*
|--------------------------------------------------------------------------
| CREATE BRANCH
|--------------------------------------------------------------------------
|
| OWNER / ADMIN / MANAGER
|
|--------------------------------------------------------------------------
*/

router.post(
  "/",
  requirePermission(PERMISSIONS.BRANCHES_CREATE),
  createBranch
);

/*
|--------------------------------------------------------------------------
| UPDATE BRANCH
|--------------------------------------------------------------------------
|
| OWNER / ADMIN / MANAGER
|
|--------------------------------------------------------------------------
*/

router.put(
  "/:id",
  requirePermission(PERMISSIONS.BRANCHES_UPDATE),
  updateBranch
);

/*
|--------------------------------------------------------------------------
| DEACTIVATE BRANCH
|--------------------------------------------------------------------------
|
| OWNER / ADMIN only.
|
|--------------------------------------------------------------------------
*/

router.delete(
  "/:id",
  requirePermission(PERMISSIONS.BRANCHES_DELETE),
  deleteBranch
);

export default router;