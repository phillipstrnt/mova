import express from "express";

import {
  registerBusiness,
  login,
  getMe,
} from "../controllers/authController.js";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Register a new business and owner
router.post("/register", registerBusiness);

// Login
router.post("/login", login);

// Current authenticated user
router.get("/me", protect, getMe);

export default router;