import express from "express";
import { deactivateAccount, getProfile, getUserAnalytics, updateProfile } from "../controllers/userController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";
import {
  createTrip, deleteTrip, getUserPost, listUserPosts, submitTrip, updateTrip
} from "../controllers/tripController.js";
import { listFavorites } from "../controllers/favoriteController.js";
import { blockUser, unblockUser, getBlockedUsers } from "../controllers/blockController.js";
import { getOwnedBookings, updateOwnedBooking } from "../controllers/bookingController.js";
import { listBookings } from "../controllers/bookingController.js";
import { listNotifications, markAllNotificationsRead, markNotificationRead } from "../controllers/notificationController.js";
import { tripUpload } from "../middleware/uploadMiddleware.js";

const router = express.Router();
router.use(protect);
router.use(authorize("USER", "ADMIN"));

router.get("/me", getProfile);
router.put("/me", updateProfile);
router.delete("/me", deactivateAccount);

router.get("/analytics", getUserAnalytics);

// Profile-screen aliases retained under /users for the current frontend.
router.get("/bookings", listBookings);
router.get("/me/notifications", listNotifications);
router.patch("/me/notifications/read", markAllNotificationsRead);
router.patch("/me/notifications/:id/read", markNotificationRead);

// Favorites alias: frontend calls GET /api/v1/users/favorites
router.get("/favorites", listFavorites);

// Block / Unblock
router.get("/blocked", getBlockedUsers);
router.post("/:userId/block", blockUser);
router.delete("/:userId/block", unblockUser);

// Posts
router.post("/posts", tripUpload, createTrip);
router.get("/my-posts", listUserPosts);
router.get("/posts/:id", getUserPost);
router.patch("/posts/:id", tripUpload, updateTrip);
router.delete("/posts/:id", deleteTrip);
router.post("/posts/:id/submit", submitTrip);

// Owned Bookings
router.get("/owned-bookings", getOwnedBookings);
router.patch("/owned-bookings/:bookingId", updateOwnedBooking);

export default router;
