import jwt from "jsonwebtoken";
import User from "../models/user.js";
import env from "../config/env.js";
import { asyncHandler, } from "../middleware/error.js";

const signToken = (userId) =>
  jwt.sign({ userId }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });

const setCookie = (res, token) => {
  res.cookie("jwt", token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: env.NODE_ENV === "production" ? "strict" : "lax",
    maxAge: env.COOKIE_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
  });
};

 
export const register = asyncHandler(async (req, res) => {
  const { username, email, password, avatar } = req.body;

  if (!username || !email || !password) {
    throw new ApiError(400, "Username, email and password are required");
  }

  const existing = await User.findOne({
    $or: [{ email }, { username }],
  });
  if (existing) {
    throw new ApiError(400, "User with this email or username already exists");
  }

  const user = await User.create({
    username,
    email,
    password,
    avatar: avatar || "",
  });

  const token = signToken(user._id);
  setCookie(res, token);

  res.status(201).json({
    success: true,
    message: "Registered successfully",
    token,
    user: user.toPublicJSON(),
  });
});




export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  const user = await User.findOne({ email }).select("+password");
  if (!user) throw new ApiError(401, "Invalid credentials");

  const isMatch = await user.comparePassword(password);
  if (!isMatch) throw new ApiError(401, "Invalid credentials");

  user.isOnline = true;
  user.lastSeen = new Date();
  await user.save({ validateBeforeSave: false });

  const token = signToken(user._id);
  setCookie(res, token);

  res.status(200).json({
    success: true,
    message: "Logged in successfully",
    token,
    user: user.toPublicJSON(),
  });
});


export const logout = asyncHandler(async (req, res) => {
  if (req.user?._id) {
    await User.findByIdAndUpdate(req.user._id, {
      isOnline: false,
      lastSeen: new Date(),
    });
  }

  res.cookie("jwt", "", {
    httpOnly: true,
    expires: new Date(0),
  });

  res.status(200).json({ success: true, message: "Logged out" });
});


export const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, user: req.user.toPublicJSON() });
});


export const updateMe = asyncHandler(async (req, res) => {
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