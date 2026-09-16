import { Server } from "socket.io";
import jwt from "jsonwebtoken";

let io = null;

export const initSocket = (server) => {
  const clientUrls = process.env.CLIENT_URL
    ? process.env.CLIENT_URL.split(",").map((u) => u.trim()).filter(Boolean)
    : ["*"];

  io = new Server(server, {
    cors: {
      origin: clientUrls.length > 0 ? (clientUrls.includes("*") ? "*" : clientUrls) : "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      return next(new Error("Authentication error: Token is required"));
    }
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) return next(new Error("Authentication error: Invalid token"));
      socket.userId = decoded.id;
      next();
    });
  });

  io.on("connection", (socket) => {
    console.log(`[Socket] User connected: ${socket.id}, User ID: ${socket.userId}`);

    // Join personal user room for targeted notifications (unread counts etc.)
    if (socket.userId) {
      socket.join(`user_${socket.userId}`);
    }

    // Join room for specific chat conversation
    socket.on("join_chat", (chatId) => {
      if (chatId) {
        const room = `chat_${chatId}`;
        socket.join(room);
        console.log(`[Socket] Socket ${socket.id} joined room ${room}`);
      }
    });

    socket.on("leave_chat", (chatId) => {
      if (chatId) {
        const room = `chat_${chatId}`;
        socket.leave(room);
        console.log(`[Socket] Socket ${socket.id} left room ${room}`);
      }
    });

    socket.on("typing", ({ chatId, userId, userName }) => {
      if (chatId) {
        socket.to(`chat_${chatId}`).emit("user_typing", { chatId, userId, userName });
      }
    });

    socket.on("stop_typing", ({ chatId, userId }) => {
      if (chatId) {
        socket.to(`chat_${chatId}`).emit("user_stopped_typing", { chatId, userId });
      }
    });

    socket.on("disconnect", () => {
      console.log(`[Socket] User disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    console.warn("[Socket] getIO called before initSocket");
  }
  return io;
};
