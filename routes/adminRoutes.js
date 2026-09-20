import express from "express";
import {
  approveTrip,
  dashboard,
  deleteAdminTrip,
  deleteUser,
  getUser,
  listAdminTrips,
  listUsers,
  rejectTrip,
  updateUserStatus,
  listAdminBookings,
  getAdminTrip,
  suspendTrip,
  reactivateTrip,
} from "../controllers/adminController.js";
// We removed getAdminChats for now, unless we want to keep it.
// If chatController exists, we will update it later. Let's comment out for now.
// import { getAdminChats, getAdminChatMessages } from "../controllers/chatController.js";
import { authorize, protect } from "../middleware/authMiddleware.js";

const router = express.Router();
router.use(protect, authorize("ADMIN"));

router.get("/dashboard", dashboard);

router.get("/users", listUsers);
router.get("/users/:id", getUser);
router.patch("/users/:id/status", updateUserStatus);
router.delete("/users/:id", deleteUser);

router.get("/posts", listAdminTrips);
router.get("/posts/:id", getAdminTrip);
// Keep the posts routes working while supporting the admin trips API contract.
router.get("/trips", listAdminTrips);
router.get("/trips/:id", getAdminTrip);
router.patch("/posts/:id/approve", approveTrip);
router.patch("/posts/:id/reject", rejectTrip);
router.patch("/posts/:id/suspend", suspendTrip);
router.patch("/posts/:id/reactivate", reactivateTrip);
router.delete("/posts/:id", deleteAdminTrip);
router.patch("/trips/:id/approve", approveTrip);
router.patch("/trips/:id/reject", rejectTrip);
router.patch("/trips/:id/unpublish", suspendTrip);
router.patch("/trips/:id/suspend", suspendTrip);
router.patch("/trips/:id/reactivate", reactivateTrip);

router.get("/bookings", listAdminBookings);

// router.get("/chats", getAdminChats);
// router.get("/chats/:chatId/messages", getAdminChatMessages);

export default router;
