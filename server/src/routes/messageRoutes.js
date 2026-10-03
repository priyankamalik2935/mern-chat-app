import express from "express";
import {
  sendMessage,
  getMessages,
  markAsRead,
  deleteMessage,
  getChats,
} from "../controllers/messageController.js";
import { protect } from "../middleware/auth.js";
import { uploadAttachments } from "../middleware/upload.js";

const router = express.Router();

router.use(protect); 

router.get("/chats", getChats);
router.post("/", uploadAttachments, sendMessage);
router.get("/:chatId", getMessages);
router.put("/:chatId/read", markAsRead);
router.delete("/:messageId", deleteMessage);

export default router;