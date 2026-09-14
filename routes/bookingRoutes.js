import express from "express";
import {
  createBooking, getBooking, listBookings
} from "../controllers/bookingController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();
router.use(protect);
router.use(authorize("USER"));

router.post("/", createBooking);
router.get("/", listBookings);
router.get("/:id", getBooking);

export default router;