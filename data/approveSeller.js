// approveSeller.js
// This script approves a pending seller (sets status to ACTIVE and verificationStatus to APPROVED)
// Usage: node approveSeller.js (ensure .env is loaded)

import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../configs/db.js";
import User from "../models/User.js";

const approveSeller = async () => {
  try {
    await connectDB();
    const email = "pending@travels.com"; // seller to approve
    const updated = await User.findOneAndUpdate(
      { email },
      {
        $set: {
          status: "ACTIVE",
          "sellerProfile.verificationStatus": "APPROVED",
        },
      },
      { new: true }
    );
    if (!updated) {
      console.log(`Seller with email ${email} not found.`);
    } else {
      console.log(`Seller ${email} approved successfully.`);
    }
  } catch (err) {
    console.error("Error approving seller:", err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

approveSeller();
