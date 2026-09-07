// getSellerToken.js
// Use this script to obtain a JWT token for an approved seller (ahmed@travels.com).
// Run with: node server/data/getSellerToken.js

import "dotenv/config";
import fetch from "node-fetch";

const login = async () => {
  try {
    const response = await fetch(`http://localhost:${process.env.PORT || 5002}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "ahmed@travels.com", password: "123456" }),
    });
    const data = await response.json();
    if (response.ok) {
      console.log("Login successful. JWT token:", data.token);
    } else {
      console.error("Login failed:", data);
    }
  } catch (err) {
    console.error("Error:", err);
  }
};

login();
