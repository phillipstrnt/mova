import express from "express";

import {
  registerBusiness,
  login,
  googleAuth,
  forgotPassword,
  resetPassword,
  getMe,
} from "../controllers/authController.js";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| REGISTER
|--------------------------------------------------------------------------
*/

router.post(
  "/register",
  registerBusiness
);

/*
|--------------------------------------------------------------------------
| LOGIN
|--------------------------------------------------------------------------
*/

router.post(
  "/login",
  login
);

router.post(
  "/google",
  googleAuth
);

/*
|--------------------------------------------------------------------------
| FORGOT PASSWORD
|--------------------------------------------------------------------------
*/

router.post(
  "/forgot-password",
  forgotPassword
);

/*
|--------------------------------------------------------------------------
| RESET PASSWORD
|--------------------------------------------------------------------------
*/

router.post(
  "/reset-password/:token",
  resetPassword
);

/*
|--------------------------------------------------------------------------
| CURRENT AUTHENTICATED USER
|--------------------------------------------------------------------------
*/

router.get(
  "/me",
  protect,
  getMe
);

export default router;
