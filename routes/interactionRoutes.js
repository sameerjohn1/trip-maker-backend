import express from "express";
import {
  addFavorite,
  getSellerInquiry,
  getTravelerInquiry,
  listFavorites,
  listSellerInquiries,
  listTravelerInquiries,
  removeFavorite,
  updateSellerInquiry,
} from "../controllers/interactionController.js";
import {
  authorize,
  protect,
  requireSellerActive,
} from "../middleware/authMiddleware.js";

const router = express.Router();
router.use(protect, authorize("USER", "ADMIN"));
router.get("/favorites", listFavorites);
router.post("/favorites/:tripId", addFavorite);
router.delete("/favorites/:tripId", removeFavorite);
router.get("/inquiries", listTravelerInquiries);
router.get("/inquiries/:id", getTravelerInquiry);

const sellerRouter = express.Router();
sellerRouter.use(protect, authorize("USER", "ADMIN"), requireSellerActive);
sellerRouter.get("/", listSellerInquiries);
sellerRouter.get("/:id", getSellerInquiry);
sellerRouter.patch("/:id/status", updateSellerInquiry);

export { sellerRouter };
export default router;
