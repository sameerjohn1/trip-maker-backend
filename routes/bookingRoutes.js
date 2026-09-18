import express from "express";
import {
  cancelBooking,
  createBooking,
  getBooking,
  listBookings,
  updateOwnedBooking,
} from "../controllers/bookingController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();
router.use(protect);
router.use(authorize("USER"));

router.post("/", createBooking);
router.get("/", listBookings);
router.get("/:id", getBooking);

const sellerRouter = express.Router();
sellerRouter.use(protect, authorize("SELLER"));
sellerRouter.patch("/:bookingId/status", updateOwnedBooking);

export { sellerRouter };
router.patch("/:bookingId/cancel", cancelBooking);

export default router;
