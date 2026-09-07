import express from "express";
import { createDestination, getDestinations } from "../controllers/destinationController.js";
import { authorize, protect, requireSellerActive } from "../middleware/authMiddleware.js";

const router = express.Router();
router.get("/", getDestinations);
router.post("/", protect, authorize("SELLER", "ADMIN"), createDestination);
export default router;