import dotenv from "dotenv";

dotenv.config();

const requiredEnvVars = ["MONGO_URI", "JWT_SECRET"];

requiredEnvVars.forEach((key) => {
  if (!process.env[key]) {
    console.error(`❌ Missing required env variable: ${key}`);
    process.exit(1);
  }
});

const env = {
  PORT: process.env.PORT || 7777,
  NODE_ENV: "development",
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN:  "7d",
  CLIENT_URL: process.env.CLIENT_URL || "http://localhost:5173",
  COOKIE_EXPIRES_DAYS: Number(process.env.COOKIE_EXPIRES_DAYS) || 7,
  MAX_FILE_SIZE: Number(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB
  UPLOAD_PATH: process.env.UPLOAD_PATH || "uploads",
};

export default env;