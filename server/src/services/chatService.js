import Chat from "../models/chat.js";
import Message from "../models/message.js";


const getUserChats = async (userId) => {
  const chats = await Chat.find({ participants: userId })
    .populate("participants", "username avatar email isOnline lastSeen")
    .populate({
      path: "lastMessage",
      populate: { path: "sender", select: "username avatar" },
    })
    .sort({ updatedAt: -1 })
    .lean();

  return chats.map((chat) => ({
    ...chat,
    unreadCount: chat.unreadCounts?.[String(userId)] || 0,
  }));
};


const getOrCreateChat = async (userA, userB) => {
  return Chat.findOrCreateOneToOne(userA, userB);
};


const getChatById = async (chatId, userId) => {
  const chat = await Chat.findById(chatId).populate(
    "participants",
    "username avatar email isOnline lastSeen"
  );
  if (!chat) throw new Error("Chat not found");
  const isMember = chat.participants.some(
    (p) => String(p._id) === String(userId)
  );
  if (!isMember) throw new Error("Forbidden");
  return chat;
};


const incrementUnread = async (chatId, userId, amount = 1) => {
  const chat = await Chat.findById(chatId);
  if (!chat) return;
  const current = chat.unreadCounts.get(String(userId)) || 0;
  chat.unreadCounts.set(String(userId), current + amount);
  await chat.save();
};

const resetUnread = async (chatId, userId) => {
  const chat = await Chat.findById(chatId);
  if (!chat) return;
  chat.unreadCounts.set(String(userId), 0);
  await chat.save();
};


const deleteChat = async (chatId, userId) => {
  const chat = await Chat.findById(chatId);
  if (!chat) throw new Error("Chat not found");
  const isMember = chat.participants.some((p) => String(p) === String(userId));
  if (!isMember) throw new Error("Forbidden");

  await Message.deleteMany({ chat: chatId });
  await Chat.findByIdAndDelete(chatId);
};

export default {
  getUserChats,
  getOrCreateChat,
  getChatById,
  incrementUnread,
  resetUnread,
  deleteChat,
};