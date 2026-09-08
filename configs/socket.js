import { Server } from "socket.io";

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

  io.on("connection", (socket) => {
    console.log(`[Socket] User connected: ${socket.id}`);

    // Join room for specific chat conversation
    socket.on("join_chat", (chatId) => {
      if (chatId) {
        const room = `chat_${chatId}`;
        socket.join(room);
        console.log(`[Socket] Socket ${socket.id} joined room ${room}`);
      }
    });

    // Leave room for specific chat conversation
    socket.on("leave_chat", (chatId) => {
      if (chatId) {
        const room = `chat_${chatId}`;
        socket.leave(room);
        console.log(`[Socket] Socket ${socket.id} left room ${room}`);
      }
    });

    // Handle typing events
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
