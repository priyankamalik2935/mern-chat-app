import express from "express";
import {
  register,
  login,
  logout,
  getMe,
  updateMe,
} from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";
import { uploadAvatar } from "../middleware/upload.js";
import { uploadUserAvatar } from "../controllers/userController.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", protect, logout);
router.get("/me", protect, getMe);
router.put("/me", protect, updateMe);
router.post("/me/avatar", protect, uploadAvatar, uploadUserAvatar);

export default router;