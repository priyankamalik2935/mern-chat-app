import express from "express";
import {
  getUsers,
  getUserById,
  updateProfile,
  uploadUserAvatar,
  startChat,
  getOnlineUsers,
} from "../controllers/userController.js";
import { protect } from "../middleware/auth.js";
import { uploadAvatar } from "../middleware/upload.js";

const router = express.Router();

router.use(protect);

router.get("/", getUsers);
router.get("/online", getOnlineUsers);
router.put("/profile", updateProfile);
router.post("/avatar", uploadAvatar, uploadUserAvatar);
router.post("/chat/:userId", startChat);
router.get("/:id", getUserById);

export default router;