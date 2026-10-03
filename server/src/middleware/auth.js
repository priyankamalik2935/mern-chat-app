import jwt from "jsonwebtoken";
import User from "../models/user.js";
import env from "../config/env.js";
import ApiError from "../utils/ApiError.js"; 

export const protect = async (req, res, next) => {
  try {
    let token = req.cookies?.jwt;

    if (!token && req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return next(new ApiError(401, "Not authorized, no token provided"));
    }

    const decoded = jwt.verify(token, env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return next(new ApiError(401, "User no longer exists"));
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return next(new ApiError(401, "Token expired, please login again"));
    }
    if (err.name === "JsonWebTokenError") {
      return next(new ApiError(401, "Invalid token"));
    }
    next(new ApiError(401, err.message || "Not authorized"));
  }
};

export const optionalAuth = async (req, res, next) => {
  try {
    let token = req.cookies?.jwt;
    if (!token && req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }
    if (!token) return next();

    const decoded = jwt.verify(token, env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("-password");
    if (user) req.user = user;
    next();
  } catch {
    next();
  }
};

export const authorize =
  (...roles) =>
  (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ApiError(403, "Forbidden — insufficient permissions"));
    }
    next();
  };