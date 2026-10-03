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

import {
  protect,
  authorize,
} from "../middleware/authMiddleware.js";

const router =
  express.Router();

/*
|--------------------------------------------------------------------------
| BRANCH SWITCHING
|--------------------------------------------------------------------------
|
| IMPORTANT:
| This route must be before /:id.
|
*/

router.post(
  "/switch",
  protect,
  switchBranch
);

/*
|--------------------------------------------------------------------------
| BUSINESS BRANCHES
|--------------------------------------------------------------------------
*/

router.get(
  "/",
  protect,
  getBranches
);

/*
|--------------------------------------------------------------------------
| BUSINESS USERS
|--------------------------------------------------------------------------
*/

router.get(
  "/users",
  protect,
  authorize(
    "OWNER",
    "ADMIN"
  ),
  getBusinessUsers
);

/*
|--------------------------------------------------------------------------
| CREATE BRANCH
|--------------------------------------------------------------------------
*/

router.post(
  "/",
  protect,
  authorize(
    "OWNER",
    "ADMIN"
  ),
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
  authorize(
    "OWNER",
    "ADMIN"
  ),
  updateBranch
);

/*
|--------------------------------------------------------------------------
| DELETE BRANCH
|--------------------------------------------------------------------------
*/

router.delete(
  "/:id",
  protect,
  authorize(
    "OWNER",
    "ADMIN"
  ),
  deleteBranch
);

export default router;