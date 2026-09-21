import express from "express";
import {
  dashboard,
  getSellerProfile,
  updateSellerProfile,
  uploadDocuments,
  uploadImage,
} from "../controllers/sellerController.js";
import { authorize, protect } from "../middleware/authMiddleware.js";
import {
  sellerDocumentUpload,
  singleImageUpload,
} from "../middleware/uploadMiddleware.js";
import { sellerRouter as tripSellerRouter } from "./tripRoutes.js";
import { sellerRouter as inquirySellerRouter } from "./interactionRoutes.js";
import { sellerRouter as bookingSellerRouter } from "./bookingRoutes.js";

const router = express.Router();
router.use(protect);

router.get("/profile", authorize("USER", "ADMIN"), getSellerProfile);
router.put("/profile", authorize("USER", "ADMIN"), updateSellerProfile);
router.post(
  "/documents",
  authorize("USER", "ADMIN"),
  sellerDocumentUpload,
  uploadDocuments,
);
router.post("/upload", authorize("USER", "ADMIN"), singleImageUpload, uploadImage);
router.get("/dashboard", authorize("USER", "ADMIN"), dashboard);

router.use("/trips", authorize("USER", "ADMIN"), tripSellerRouter);
router.use("/inquiries", authorize("USER", "ADMIN"), inquirySellerRouter);
router.use("/bookings", authorize("USER", "ADMIN"), bookingSellerRouter);
export default router;
