import express from "express";
import {
  approveSeller, approveTrip, dashboard, deleteAdminTrip, deleteUser, getAdminBooking, getAdminTrip, getUser,
  listAdminBookings, listAdminTrips, listSellers, listUsers, rejectSeller, rejectTrip,
  unpublishTrip, updateUserStatus,
} from "../controllers/adminController.js";
import { authorize, protect } from "../middleware/authMiddleware.js";

const router = express.Router();
router.use(protect, authorize("ADMIN"));
router.get("/dashboard", dashboard);
router.get("/users", listUsers);
router.get("/users/:id", getUser);
router.patch("/users/:id/status", updateUserStatus);
router.delete("/users/:id", deleteUser);
router.get("/sellers", listSellers);
router.get("/sellers/:id", getUser);
router.patch("/sellers/:id/approve", approveSeller);
router.patch("/sellers/:id/reject", rejectSeller);
router.get("/trips", listAdminTrips);
router.get("/trips/:id", getAdminTrip);
router.patch("/trips/:id/approve", approveTrip);
router.patch("/trips/:id/reject", rejectTrip);
router.patch("/trips/:id/unpublish", unpublishTrip);
router.delete("/trips/:id", deleteAdminTrip);
router.get("/bookings", listAdminBookings);
router.get("/bookings/:id", getAdminBooking);
export default router;