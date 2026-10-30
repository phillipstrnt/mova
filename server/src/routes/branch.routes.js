
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

import { protect, authorize } from "../middleware/authMiddleware.js";
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
| Only the business owner can create branches.
|
*/

router.post(
  "/",
  protect,
  authorize("OWNER"),
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
| Only the business owner can delete a branch.
|
*/

router.delete(
  "/:id",
  protect,
  authorize("OWNER"),
  deleteBranch
);

export default router;
