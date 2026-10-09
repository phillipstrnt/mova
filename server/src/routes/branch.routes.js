
import express from "express";

import {
  getBranches,
  getBranch,
  createBranch,
  updateBranch,
  deleteBranch,
  getBusinessUsers,
  switchBranch,
} from "../controllers/branchController.js";

import { protect } from "../middleware/authMiddleware.js";
import { requirePermission } from "../middleware/permissionMiddleware.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| BRANCH SWITCHING
|--------------------------------------------------------------------------
|
| Must appear before /:id.
|
*/

router.patch(
  "/switch",
  protect,
  switchBranch
);

/*
|--------------------------------------------------------------------------
| BUSINESS BRANCHES
|--------------------------------------------------------------------------
*/

/*
 * Any authenticated user who has branch access can
 * load the business branches available to them.
 */
router.get(
  "/",
  protect,
  requirePermission("branches.view"),
  getBranches
);

/*
|--------------------------------------------------------------------------
| BUSINESS USERS
|--------------------------------------------------------------------------
|
| Used when selecting a branch manager.
|
*/

router.get(
  "/users",
  protect,
  requirePermission("users.view"),
  getBusinessUsers
);

/*
|--------------------------------------------------------------------------
| CREATE BRANCH
|--------------------------------------------------------------------------
|
| OWNER, ADMIN and MANAGER can create branches because
| their roles receive branches.create.
|
*/

router.post(
  "/",
  protect,
  requirePermission("branches.create"),
  createBranch
);

/*
|--------------------------------------------------------------------------
| SINGLE BRANCH
|--------------------------------------------------------------------------
*/

router.get(
  "/:id",
  protect,
  requirePermission("branches.view"),
  getBranch
);

/*
|--------------------------------------------------------------------------
| UPDATE BRANCH
|--------------------------------------------------------------------------
*/

router.put(
  "/:id",
  protect,
  requirePermission("branches.update"),
  updateBranch
);

/*
|--------------------------------------------------------------------------
| DELETE BRANCH
|--------------------------------------------------------------------------
|
| We intentionally keep deletion restricted to OWNER and ADMIN.
| Manager can create/update branches but cannot permanently
| delete a branch.
|
*/

router.delete(
  "/:id",
  protect,
  requirePermission("branches.delete"),
  deleteBranch
);

export default router;
