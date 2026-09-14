import express from "express";
import {
  getPublicTrip, listPublicTrips, viewTrip
} from "../controllers/tripController.js";
import { createInquiry } from "../controllers/interactionController.js";
import { createBooking } from "../controllers/bookingController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();
router.get("/", listPublicTrips);
router.get("/:id", getPublicTrip);
router.post("/:id/view", viewTrip); // POST /api/v1/trips/:id/view

// Deprecated or can be moved, assuming keeping here for now with updated roles
router.post("/:tripId/inquiries", protect, authorize("USER"), createInquiry);
router.post("/:tripId/bookings", protect, authorize("USER"), createBooking);

export default router;