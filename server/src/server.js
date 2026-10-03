import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";

import env from "./config/env.js";
import connectDB from "./config/database.js";
import routes from "./routes/index.js";
import { notFound, errorHandler } from "./middleware/error.js";
import { initSocket } from "./socket/socketHandler.js";

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: env.CLIENT_URL,
    credentials: true,
  },
});

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

app.use(
  `/${env.UPLOAD_PATH}`,
  express.static(path.join(process.cwd(), env.UPLOAD_PATH))
);

app.use("/api", routes);

app.get("/", (req, res) => {
  res.json({ success: true, message: "Chat API is running 🚀" });
});

app.use(notFound);
app.use(errorHandler);

initSocket(io);

const start = async () => {
  await connectDB();
  httpServer.listen(env.PORT, () => {
    console.log(`🚀 Server running on port ${env.PORT} [${env.NODE_ENV}]`);
  });
};

process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Rejection:", err.message);
  httpServer.close(() => process.exit(1));
});

process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err.message);
  process.exit(1);
});

start();

export { app, httpServer, io };