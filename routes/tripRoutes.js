import express from "express";
import {
  getPublicTrip, listPublicTrips, viewTrip
} from "../controllers/tripController.js";
import { createInquiry } from "../controllers/interactionController.js";
import { createBooking } from "../controllers/bookingController.js";
import { addFavorite, removeFavorite, checkFavorite } from "../controllers/favoriteController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";
import { createTrip, deleteTrip, getUserPost, listUserPosts, submitTrip, updateTrip, deactivateTrip, activateTrip } from "../controllers/tripController.js";
import { tripUpload } from "../middleware/uploadMiddleware.js";

const router = express.Router();
router.get("/", listPublicTrips);
router.get("/:id", getPublicTrip);
router.post("/:id/view", viewTrip); // POST /api/v1/trips/:id/view

// Favorite toggle via trip route (frontend: POST /api/v1/trips/:id/favorites)
router.post("/:id/favorites", protect, authorize("USER"), addFavorite);
router.delete("/:id/favorites", protect, authorize("USER"), removeFavorite);
router.get("/:id/favorites/check", protect, authorize("USER"), checkFavorite);

router.post("/:tripId/inquiries", protect, authorize("USER"), createInquiry);
router.post("/:tripId/bookings", protect, authorize("USER"), createBooking);

export default router;

// Mounted beneath /api/v1/seller/trips. Kept separate from public routes.
const sellerRouter = express.Router();
sellerRouter.get("/", listUserPosts);
sellerRouter.post("/", tripUpload, createTrip);
sellerRouter.get("/:id", getUserPost);
sellerRouter.put("/:id", tripUpload, updateTrip);
sellerRouter.patch("/:id/deactivate", deactivateTrip);
sellerRouter.patch("/:id/activate", activateTrip);
sellerRouter.post("/:id/submit", submitTrip);
sellerRouter.delete("/:id", deleteTrip);
export { sellerRouter };
