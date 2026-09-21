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

router.get("/profile", authorize("SELLER"), getSellerProfile);
router.put("/profile", authorize("SELLER"), updateSellerProfile);
router.post(
  "/documents",
  authorize("SELLER"),
  sellerDocumentUpload,
  uploadDocuments,
);
router.post("/upload", authorize("SELLER"), singleImageUpload, uploadImage);
router.get("/dashboard", authorize("SELLER"), dashboard);

router.use("/trips", authorize("USER", "ADMIN"), tripSellerRouter);
router.use("/inquiries", authorize("SELLER"), inquirySellerRouter);
router.use("/bookings", authorize("USER", "ADMIN"), bookingSellerRouter);
export default router;
