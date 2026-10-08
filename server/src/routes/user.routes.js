
import express from "express";

import {
  getUsers,
  getUser,
  createUser,
  updateUser,
  disableUser,
  enableUser,
} from "../controllers/userController.js";

import {
  protect,
  authorize,
} from "../middleware/authMiddleware.js";

import {
  requirePermission,
} from "../middleware/permissionMiddleware.js";

import {
  PERMISSIONS,
} from "../config/permissions.js";

const router =
  express.Router();

/*
|--------------------------------------------------------------------------
| ALL USER ROUTES REQUIRE LOGIN
|--------------------------------------------------------------------------
*/

router.use(protect);

/*
|--------------------------------------------------------------------------
| GET USERS
|--------------------------------------------------------------------------
*/

router.get(
  "/",
  requirePermission(
    PERMISSIONS.USERS_VIEW
  ),
  getUsers
);

/*
|--------------------------------------------------------------------------
| GET ONE USER
|--------------------------------------------------------------------------
*/

router.get(
  "/:id",
  requirePermission(
    PERMISSIONS.USERS_VIEW
  ),
  getUser
);

/*
|--------------------------------------------------------------------------
| CREATE USER
|--------------------------------------------------------------------------
*/

router.post(
  "/",
  requirePermission(
    PERMISSIONS.USERS_CREATE
  ),
  createUser
);

/*
|--------------------------------------------------------------------------
| UPDATE USER
|--------------------------------------------------------------------------
*/

router.patch(
  "/:id",
  requirePermission(
    PERMISSIONS.USERS_UPDATE
  ),
  updateUser
);

/*
|--------------------------------------------------------------------------
| DISABLE USER
|--------------------------------------------------------------------------
*/

router.patch(
  "/:id/disable",
  requirePermission(
    PERMISSIONS.USERS_DISABLE
  ),
  disableUser
);

/*
|--------------------------------------------------------------------------
| ENABLE USER
|--------------------------------------------------------------------------
*/

router.patch(
  "/:id/enable",
  requirePermission(
    PERMISSIONS.USERS_DISABLE
  ),
  enableUser
);

export default router;