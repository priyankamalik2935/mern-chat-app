import jwt from "jsonwebtoken";
import User from "../models/user.js";
import Chat from "../models/chat.js";
import Message from "../models/message.js";
import env from "../config/env.js";

let ioInstance = null;
const onlineUsers = new Map(); 

const parseToken = (socket) => {
  const cookieHeader = socket.handshake.headers?.cookie || "";
  const match = cookieHeader.match(/(?:^|;\s*)jwt=([^;]+)/);
  if (match) return decodeURIComponent(match[1]);

  if (socket.handshake.auth?.token) return socket.handshake.auth.token;

  return null;
};


export const initSocket = (io) => {
  ioInstance = io;

  io.use(async (socket, next) => {
    try {
      const token = parseToken(socket);
      if (!token) return next(new Error("Authentication required"));

      const decoded = jwt.verify(token, env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select(
        "-password"
      );
      if (!user) return next(new Error("User not found"));

      socket.user = user;
      next();
    } catch (err) {
      next(new Error("Invalid token: " + err.message));
    }
  });

  io.on("connection", async (socket) => {
    const userId = String(socket.user._id);
    console.log(`🔌 Socket connected: ${socket.id} (user: ${userId})`);

    onlineUsers.set(userId, socket.id);

    socket.join(`user:${userId}`);

    await User.findByIdAndUpdate(userId, {
      isOnline: true,
      lastSeen: new Date(),
    });

    io.emit("users:online", Array.from(onlineUsers.keys()));


    socket.on("chat:join", (chatId) => {
      socket.join(`chat:${chatId}`);
    });

    socket.on("chat:leave", (chatId) => {
      socket.leave(`chat:${chatId}`);
    });


    socket.on("typing:start", ({ chatId, receiverId }) => {
      const payload = { chatId, userId };
      if (receiverId) {
        io.to(`user:${receiverId}`).emit("typing:start", payload);
      } else {
        socket.to(`chat:${chatId}`).emit("typing:start", payload);
      }
    });

    socket.on("typing:stop", ({ chatId, receiverId }) => {
      const payload = { chatId, userId };
      if (receiverId) {
        io.to(`user:${receiverId}`).emit("typing:stop", payload);
      } else {
        socket.to(`chat:${chatId}`).emit("typing:stop", payload);
      }
    });


    socket.on("message:send", async (payload, callback) => {
      try {
        const { receiverId, content, chatId, messageType, attachments } =
          payload || {};

        if (!receiverId) throw new Error("receiverId required");

        let chat;
        if (chatId) {
          chat = await Chat.findById(chatId);
          if (!chat) throw new Error("Chat not found");
        } else {
          chat = await Chat.findOrCreateOneToOne(userId, receiverId);
        }

        const message = await Message.create({
          chat: chat._id,
          sender: userId,
          content: content || "",
          messageType: messageType || "text",
          attachments: attachments || [],
        });

        chat.lastMessage = message._id;
        const current = chat.unreadCounts?.get(String(receiverId)) || 0;
        chat.unreadCounts.set(String(receiverId), current + 1);
        await chat.save();

        const populated = await message.populate(
          "sender",
          "username avatar email"
        );

        io.to(`chat:${chat._id}`).emit("message:receive", {
          message: populated,
          chatId: chat._id,
        });

        io.to(`user:${receiverId}`).emit("message:receive", {
          message: populated,
          chatId: chat._id,
        });

        socket.emit("message:sent", {
          message: populated,
          chatId: chat._id,
        });

        if (typeof callback === "function") {
          callback({ success: true, message: populated, chatId: chat._id });
        }
      } catch (err) {
        console.error("message:send error:", err.message);
        if (typeof callback === "function") {
          callback({ success: false, error: err.message });
        } else {
          socket.emit("error:message", { message: err.message });
        }
      }
    });

    socket.on("message:read", async ({ chatId }) => {
      try {
        await Message.updateMany(
          { chat: chatId, sender: { $ne: userId }, isRead: false },
          { isRead: true, readAt: new Date() }
        );

        const chat = await Chat.findById(chatId);
        if (chat) {
          chat.unreadCounts.set(String(userId), 0);
          await chat.save();

          chat.participants.forEach((p) => {
            if (String(p) !== userId) {
              io.to(`user:${p}`).emit("message:read", { chatId, userId });
            }
          });
        }
      } catch (err) {
        console.error("message:read error:", err.message);
      }
    });


    socket.on("disconnect", async () => {
      console.log(`❌ Socket disconnected: ${socket.id}`);
      onlineUsers.delete(userId);

      await User.findByIdAndUpdate(userId, {
        isOnline: false,
        lastSeen: new Date(),
      });

      io.emit("users:online", Array.from(onlineUsers.keys()));
    });
  });
};

export const getIO = () => {
  if (!ioInstance) throw new Error("Socket.IO not initialized");
  return ioInstance;
};

export const getOnlineUsers = () => onlineUsers;
export const isUserOnline = (userId) => onlineUsers.has(String(userId));