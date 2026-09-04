import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "./configs/db.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import destinationRoutes from "./routes/destinationRoutes.js";
import tripRoutes from "./routes/tripRoutes.js";
import interactionRoutes from "./routes/interactionRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import sellerRoutes from "./routes/sellerRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import { errorHandler, notFound } from "./middleware/errorMiddleware.js";
import { sendSuccess } from "./utils/response.js";

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const api = "/api/v1";

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: process.env.CLIENT_URL?.split(",")?.[0] || true }));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(
  `${api}/auth`,
  rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true }),
  authRoutes,
);

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

// Connect lazily per request so the app can be imported by tests without a live database.
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch {
    res
      .status(503)
      .json({ success: false, message: "Database temporarily unavailable" });
  }
});

app.use(`${api}/users`, userRoutes);
app.use(`${api}/destinations`, destinationRoutes);
app.use(`${api}/trips`, tripRoutes);
app.use(`${api}/bookings`, bookingRoutes);
app.use(`${api}/seller`, sellerRoutes);
app.use(`${api}/admin`, adminRoutes);
app.use(`${api}`, interactionRoutes);
app.use(notFound);
app.use(errorHandler);

if (process.env.NODE_ENV !== "test") {
  const port = process.env.PORT || 5001;

  connectDB()
    .then(() => {
      app.listen(port, () =>
        console.log(`Trip Marketplace API listening on port ${port}`),
      );
    })
    .catch((error) => {
      console.error("MongoDB connection failed:", error.message);
      process.exitCode = 1;
    });
}

export default app;
