import Chat from "../models/chat.js";
import Message from "../models/message.js";
import { asyncHandler, ApiError } from "../middleware/error.js";
import { buildFileUrl } from "../middleware/upload.js";
import chatService from "../services/chatService.js";
import { getIO, getOnlineUsers } from "../socket/socketHandler.js";


export const sendMessage = asyncHandler(async (req, res) => {
  const { receiverId, content, messageType } = req.body;
  const senderId = req.user._id;

  if (!receiverId) throw new ApiError(400, "receiverId is required");
  if (!content && (!req.files || req.files.length === 0)) {
    throw new ApiError(400, "Message content or attachment is required");
  }
  if (String(receiverId) === String(senderId)) {
    throw new ApiError(400, "Cannot send message to yourself");
  }

  const chat = await Chat.findOrCreateOneToOne(senderId, receiverId);

  const attachments = (req.files || []).map((f) => ({
    url: buildFileUrl(req, f),
    filename: f.originalname,
    mimetype: f.mimetype,
    size: f.size,
  }));

  const message = await Message.create({
    chat: chat._id,
    sender: senderId,
    content: content || "",
    messageType: messageType || (attachments.length ? "file" : "text"),
    attachments,
  });

  chat.lastMessage = message._id;

  const currentUnread = chat.unreadCounts?.get(String(receiverId)) || 0;
  chat.unreadCounts.set(String(receiverId), currentUnread + 1);
  await chat.save();

  const populated = await message.populate([
    { path: "sender", select: "username avatar email" },
  ]);

  const io = getIO();
  const onlineUsers = getOnlineUsers();
  const receiverSocketId = onlineUsers.get(String(receiverId));
  if (receiverSocketId) {
    io.to(receiverSocketId).emit("message:receive", {
      message: populated,
      chatId: chat._id,
    });
  }
  const senderSocketId = onlineUsers.get(String(senderId));
  if (senderSocketId) {
    io.to(senderSocketId).emit("message:sent", {
      message: populated,
      chatId: chat._id,
    });
  }

  res.status(201).json({ success: true, message: populated, chatId: chat._id });
});


export const getMessages = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const { page = 1, limit = 50 } = req.query;

  const chat = await Chat.findById(chatId);
  if (!chat) throw new ApiError(404, "Chat not found");

  const isParticipant = chat.participants.some(
    (p) => String(p) === String(req.user._id)
  );
  if (!isParticipant) throw new ApiError(403, "Not a participant of this chat");

  const skip = (Number(page) - 1) * Number(limit);

  const messages = await Message.find({ chat: chatId, isDeleted: false })
    .populate("sender", "username avatar email")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  const total = await Message.countDocuments({ chat: chatId });

  res.status(200).json({
    success: true,
    messages: messages.reverse(),
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    },
  });
});


export const markAsRead = asyncHandler(async (req, res) => {
  const { chatId } = req.params;

  const chat = await Chat.findById(chatId);
  if (!chat) throw new ApiError(404, "Chat not found");

  await Message.updateMany(
    { chat: chatId, sender: { $ne: req.user._id }, isRead: false },
    { isRead: true, readAt: new Date() }
  );

  chat.unreadCounts.set(String(req.user._id), 0);
  await chat.save();

  
  const io = getIO();
  const onlineUsers = getOnlineUsers();
  chat.participants.forEach((p) => {
    if (String(p) !== String(req.user._id)) {
      const sid = onlineUsers.get(String(p));
      if (sid) io.to(sid).emit("message:read", { chatId, userId: req.user._id });
    }
  });

  res.status(200).json({ success: true, message: "Marked as read" });
});


export const deleteMessage = asyncHandler(async (req, res) => {
  const message = await Message.findById(req.params.messageId);
  if (!message) throw new ApiError(404, "Message not found");
  if (String(message.sender) !== String(req.user._id)) {
    throw new ApiError(403, "You can only delete your own messages");
  }

  await message.softDelete();

  const io = getIO();
  io.to(String(message.chat)).emit("message:deleted", {
    messageId: message._id,
    chatId: message.chat,
  });

  res.status(200).json({ success: true, message: "Message deleted" });
});


export const getChats = asyncHandler(async (req, res) => {
  const chats = await chatService.getUserChats(req.user._id);
  res.status(200).json({ success: true, chats });
});