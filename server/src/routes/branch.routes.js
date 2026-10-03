import express from "express";

import {
  getBranches,
  getBranch,
  createBranch,
  updateBranch,
  deleteBranch,
  getBusinessUsers,
} from "../controllers/branchController.js";

import {
  protect,
  authorize,
} from "../middleware/authMiddleware.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| BRANCHES
|--------------------------------------------------------------------------
*/

router.get(
  "/",
  protect,
  getBranches
);

router.get(
  "/users",
  protect,
  authorize("OWNER", "ADMIN"),
  getBusinessUsers
);

router.get(
  "/:id",
  protect,
  getBranch
);

router.post(
  "/",
  protect,
  authorize("OWNER", "ADMIN"),
  createBranch
);

router.put(
  "/:id",
  protect,
  authorize("OWNER", "ADMIN"),
  updateBranch
);

router.delete(
  "/:id",
  protect,
  authorize("OWNER", "ADMIN"),
  deleteBranch
);

export default router;