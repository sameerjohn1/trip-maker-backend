import express from "express";
import {
  cancelTravelerBooking, getSellerBooking, getTravelerBooking, listSellerBookings,
  listTravelerBookings, updateSellerBooking,
} from "../controllers/bookingController.js";
import { authorize, protect, requireSellerActive } from "../middleware/authMiddleware.js";

const router = express.Router();
router.use(protect, authorize("TRAVELER"));
router.get("/", listTravelerBookings);
router.get("/:id", getTravelerBooking);
router.patch("/:id/cancel", cancelTravelerBooking);

const sellerRouter = express.Router();
sellerRouter.use(protect, authorize("SELLER"), requireSellerActive);
sellerRouter.get("/", listSellerBookings);
sellerRouter.get("/:id", getSellerBooking);
sellerRouter.patch("/:id/status", updateSellerBooking);

export { sellerRouter };
export default router;