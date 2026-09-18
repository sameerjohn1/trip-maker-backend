import "dotenv/config";
import express from "express";
import http from "http";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "./configs/db.js";
import { initSocket } from "./configs/socket.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import destinationRoutes from "./routes/destinationRoutes.js";
import tripRoutes from "./routes/tripRoutes.js";
import favoriteRoutes from "./routes/favoriteRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import { sellerRouter as sellerBookingRoutes } from "./routes/bookingRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import { errorHandler, notFound } from "./middleware/errorMiddleware.js";
import { sendSuccess } from "./utils/response.js";

const app = express();
const server = http.createServer(app);
initSocket(server);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const api = "/api/v1";

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
const clientUrls = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(",")
      .map((u) => u.trim())
      .filter(Boolean)
  : [];

app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        clientUrls.length === 0 ||
        clientUrls.includes(origin) ||
        clientUrls.includes("*")
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (req, res) =>
  sendSuccess(res, 200, "Trip Marketplace API is running", {
    version: "v1",
    docs: "Import postman_collection.json from the server folder",
  }),
);
app.get("/health", (req, res) =>
  sendSuccess(res, 200, "Healthy", {
    database: "connection checked per request",
  }),
);

// Connect lazily per request so serverless invocations (Vercel) and cold starts always connect before executing queries.
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("Database connection error:", err.message);
    res
      .status(503)
      .json({
        success: false,
        message: "Database temporarily unavailable",
        error: err.message,
      });
  }
});

app.use(
  `${api}/auth`,
  rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true }),
  authRoutes,
);

app.use(`${api}/users`, userRoutes);
app.use(`${api}/destinations`, destinationRoutes);
app.use(`${api}/trips`, tripRoutes);
app.use(`${api}/bookings`, bookingRoutes);
app.use(`${api}/seller/bookings`, sellerBookingRoutes);
app.use(`${api}/admin`, adminRoutes);
app.use(`${api}/chats`, chatRoutes);
app.use(`${api}/upload`, uploadRoutes);
app.use(`${api}/favorites`, favoriteRoutes);
app.use(notFound);
app.use(errorHandler);

if (process.env.NODE_ENV !== "test") {
  const port = process.env.PORT || 5001;

  connectDB()
    .then(() => {
      server.listen(port, () =>
        console.log(`Trip Marketplace API listening on port ${port}`),
      );
    })
    .catch((error) => {
      console.error("MongoDB connection failed:", error.message);
      process.exitCode = 1;
    });
}

export default app;
