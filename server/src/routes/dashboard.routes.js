import express from "express";

import {
  getDashboard,
} from "../controllers/dashboardController.js";

import {
  protect,
} from "../middleware/authMiddleware.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| MAIN DASHBOARD
|--------------------------------------------------------------------------
*/

router.get(
  "/",
  protect,
  getDashboard
);

/*
|--------------------------------------------------------------------------
| DASHBOARD OVERVIEW
|--------------------------------------------------------------------------
|
| Dashboard.jsx requests:
|
| GET /api/dashboard/overview
|
|--------------------------------------------------------------------------
*/

router.get(
  "/overview",
  protect,
  getDashboard
);

export default router;