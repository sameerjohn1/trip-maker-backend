import express from "express";
import {
  createTrip, deleteTrip, getPublicTrip, getSellerTrip, listPublicTrips, listSellerTrips,
  submitTrip, updateTrip,
} from "../controllers/tripController.js";
import { createInquiry } from "../controllers/interactionController.js";
import { createBooking } from "../controllers/bookingController.js";
import { authorize, protect, requireSellerActive } from "../middleware/authMiddleware.js";
import { tripUpload } from "../middleware/uploadMiddleware.js";

const router = express.Router();
router.get("/", listPublicTrips);
router.get("/:id", getPublicTrip);
router.post("/:tripId/inquiries", protect, authorize("TRAVELER"), createInquiry);
router.post("/:tripId/bookings", protect, authorize("TRAVELER"), createBooking);

const sellerRouter = express.Router();
sellerRouter.use(protect, authorize("SELLER"), requireSellerActive);
sellerRouter.get("/", listSellerTrips);
sellerRouter.post("/", tripUpload, createTrip);
sellerRouter.get("/:id", getSellerTrip);
sellerRouter.put("/:id", tripUpload, updateTrip);
sellerRouter.delete("/:id", deleteTrip);
sellerRouter.post("/:id/submit", submitTrip);

export { sellerRouter };
export default router;