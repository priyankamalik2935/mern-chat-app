import User from "../models/user.js";
import Chat from "../models/chat.js";
import { asyncHandler, ApiError } from "../middleware/error.js";
import { buildFileUrl } from "../middleware/upload.js";


export const getUsers = asyncHandler(async (req, res) => {
  const { search, page = 1, limit = 30 } = req.query;
  const query = { _id: { $ne: req.user._id } };

  if (search) {
    query.$or = [
      { username: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [users, total] = await Promise.all([
    User.find(query)
      .select("username email avatar bio isOnline lastSeen")
      .sort({ username: 1 })
      .skip(skip)
      .limit(Number(limit)),
    User.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    users,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    },
  });
});


export const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select(
    "username email avatar bio isOnline lastSeen createdAt"
  );
  if (!user) throw new ApiError(404, "User not found");
  res.status(200).json({ success: true, user });
});


export const updateProfile = asyncHandler(async (req, res) => {
  const { username, bio, avatar } = req.body;
  const updates = {};
  if (username) updates.username = username;
  if (bio !== undefined) updates.bio = bio;
  if (avatar !== undefined) updates.avatar = avatar;

  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({ success: true, user: user.toPublicJSON() });
});


export const uploadUserAvatar = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, "No file uploaded");

  const url = buildFileUrl(req, req.file);
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { avatar: url },
    { new: true }
  );

  res.status(200).json({
    success: true,
    message: "Avatar updated",
    avatar: url,
    user: user.toPublicJSON(),
  });
});


export const startChat = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  if (String(userId) === String(req.user._id)) {
    throw new ApiError(400, "Cannot chat with yourself");
  }

  const other = await User.findById(userId);
  if (!other) throw new ApiError(404, "User not found");

  const chat = await Chat.findOrCreateOneToOne(req.user._id, userId);
  const populated = await chat.populate(
    "participants",
    "username avatar email isOnline lastSeen"
  );

  res.status(200).json({ success: true, chat: populated });
});


export const getOnlineUsers = asyncHandler(async (req, res) => {
  const users = await User.find({
    _id: { $ne: req.user._id },
    isOnline: true,
  }).select("username avatar email isOnline lastSeen");

  res.status(200).json({ success: true, users });
});