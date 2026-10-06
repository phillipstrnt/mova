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
| DASHBOARD
|--------------------------------------------------------------------------
| GET /api/dashboard
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
| GET /api/dashboard/overview
|--------------------------------------------------------------------------
|
| The frontend Dashboard.jsx currently requests this endpoint.
| It uses the same controller as the main dashboard endpoint.
|
*/

router.get(
  "/overview",
  protect,
  getDashboard
);

export default router;