import express from "express";
import { addFavorite, checkFavorite, listFavorites, removeFavorite } from "../controllers/favoriteController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.use(authorize("USER"));

router.get("/", listFavorites);
router.post("/:postId", addFavorite);
router.delete("/:postId", removeFavorite);
router.get("/:postId/check", checkFavorite);

export default router;
