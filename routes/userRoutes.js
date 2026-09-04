import express from "express";
import { deactivateAccount, getProfile, updateProfile } from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();
router.use(protect);
router.get("/me", getProfile);
router.put("/me", updateProfile);
router.delete("/me", deactivateAccount);
export default router;