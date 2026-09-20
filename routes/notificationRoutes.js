import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { listNotifications, markAllNotificationsRead, markNotificationRead } from "../controllers/notificationController.js";

const router = express.Router();
router.use(protect);
router.get("/", listNotifications);
router.patch("/read", markAllNotificationsRead);
router.patch("/:id/read", markNotificationRead);
export default router;
