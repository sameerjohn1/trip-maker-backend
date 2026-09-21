import express from "express";
import {
  createDestination,
  getDestinations,
} from "../controllers/destinationController.js";
import { authorize, protect } from "../middleware/authMiddleware.js";

const router = express.Router();
router.get("/", getDestinations);
router.post("/", protect, authorize("USER", "ADMIN"), createDestination);
export default router;
