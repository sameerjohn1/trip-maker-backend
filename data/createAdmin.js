import "dotenv/config";
import bcrypt from "bcryptjs";
import connectDB from "../configs/db.js";
import User from "../models/User.js";

// "email": "admin@example.com",
// "password": "Admin123!"

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
const name = process.env.ADMIN_NAME || "Platform Admin";

if (!email || !password) {
  console.error(
    "Set ADMIN_EMAIL and ADMIN_PASSWORD before running: npm run admin",
  );
  process.exit(1);
}

try {
  await connectDB();
  const user = await User.findOneAndUpdate(
    { email: email.toLowerCase() },
    {
      name,
      email: email.toLowerCase(),
      password: await bcrypt.hash(password, 12),
      role: "ADMIN",
      status: "ACTIVE",
      emailVerified: true,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  console.log(`Admin ready: ${user.email}`);
} catch (error) {
  console.error("Admin creation failed:", error.message);
  process.exitCode = 1;
} finally {
  process.exit();
}
