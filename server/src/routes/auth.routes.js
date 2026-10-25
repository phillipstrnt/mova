import express from "express";
import rateLimit from "express-rate-limit";

import {
  registerBusiness,
  login,
  googleAuth,
  forgotPassword,
  resetPassword,
  resetPasswordWithCode,
  getMe,
} from "../controllers/authController.js";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

const createAttemptLimiter = (windowMs, max, message) => rateLimit({
  windowMs,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message },
});

const registrationLimiter = createAttemptLimiter(60 * 60 * 1000, 5, "Too many account creation attempts. Please try again later.");
const signInLimiter = createAttemptLimiter(15 * 60 * 1000, 10, "Too many sign-in attempts. Please wait 15 minutes and try again.");
const recoveryLimiter = createAttemptLimiter(15 * 60 * 1000, 5, "Too many password recovery attempts. Please wait and try again.");
const resetLimiter = createAttemptLimiter(15 * 60 * 1000, 10, "Too many password reset attempts. Please wait and try again.");

/*
|--------------------------------------------------------------------------
| REGISTER
|--------------------------------------------------------------------------
*/

router.post(
  "/register",
  registrationLimiter,
  registerBusiness
);

/*
|--------------------------------------------------------------------------
| LOGIN
|--------------------------------------------------------------------------
*/

router.post(
  "/login",
  signInLimiter,
  login
);

router.post(
  "/google",
  signInLimiter,
  googleAuth
);

/*
|--------------------------------------------------------------------------
| FORGOT PASSWORD
|--------------------------------------------------------------------------
*/

router.post(
  "/forgot-password",
  recoveryLimiter,
  forgotPassword
);

/*
|--------------------------------------------------------------------------
| RESET PASSWORD
|--------------------------------------------------------------------------
*/

router.post(
  "/reset-password",
  resetLimiter,
  resetPasswordWithCode
);

router.post(
  "/reset-password/:token",
  resetLimiter,
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
