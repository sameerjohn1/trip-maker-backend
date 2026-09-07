import express from "express";
import { singleImageUpload } from "../middleware/uploadMiddleware.js";
import { uploadSingleImage } from "../controllers/uploadController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/image", protect, singleImageUpload, uploadSingleImage);
router.post("/", protect, singleImageUpload, uploadSingleImage);

export default router;
