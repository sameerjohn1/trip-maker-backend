import express from "express";
import { deactivateAccount, getProfile, getUserAnalytics, updateProfile } from "../controllers/userController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";
import {
  createTrip, deleteTrip, getUserPost, listUserPosts, submitTrip, updateTrip
} from "../controllers/tripController.js";
import { tripUpload } from "../middleware/uploadMiddleware.js";

const router = express.Router();
router.use(protect);
router.use(authorize("USER", "ADMIN"));

router.get("/me", getProfile);
router.put("/me", updateProfile);
router.delete("/me", deactivateAccount);

router.get("/analytics", getUserAnalytics);

// Posts
router.post("/posts", tripUpload, createTrip);
router.get("/my-posts", listUserPosts);
router.get("/posts/:id", getUserPost);
router.patch("/posts/:id", tripUpload, updateTrip);
router.delete("/posts/:id", deleteTrip);
router.post("/posts/:id/submit", submitTrip);

export default router;