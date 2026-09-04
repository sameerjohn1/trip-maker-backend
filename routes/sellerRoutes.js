import express from "express";
import { dashboard, getSellerProfile, updateSellerProfile, uploadDocuments } from "../controllers/sellerController.js";
import { authorize, protect } from "../middleware/authMiddleware.js";
import { sellerDocumentUpload } from "../middleware/uploadMiddleware.js";
import { sellerRouter as tripSellerRouter } from "./tripRoutes.js";
import { sellerRouter as inquirySellerRouter } from "./interactionRoutes.js";
import { sellerRouter as bookingSellerRouter } from "./bookingRoutes.js";

const router = express.Router();
router.use(protect, authorize("SELLER"));
router.get("/profile", getSellerProfile);
router.put("/profile", updateSellerProfile);
router.post("/documents", sellerDocumentUpload, uploadDocuments);
router.get("/dashboard", dashboard);
router.use("/trips", tripSellerRouter);
router.use("/inquiries", inquirySellerRouter);
router.use("/bookings", bookingSellerRouter);
export default router;