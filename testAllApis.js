// Using native global fetch available in Node.js 18+

const BASE_URL = "http://localhost:5000";
const API_URL = `${BASE_URL}/api/v1`;

let passed = 0;
let failed = 0;
const results = [];

function record(suite, testName, isOk, details = "") {
  if (isOk) {
    passed++;
    console.log(`  [PASS] ${suite} -> ${testName} ${details ? "(" + details + ")" : ""}`);
    results.push({ suite, testName, status: "PASS", details });
  } else {
    failed++;
    console.error(`  [FAIL] ${suite} -> ${testName}: ${details}`);
    results.push({ suite, testName, status: "FAIL", details });
  }
}

async function request(method, path, { headers = {}, body = null } = {}) {
  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;
  const options = {
    method,
    headers: { ...headers },
  };

  if (body !== null) {
    if (typeof body === "object") {
      options.headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(body);
    } else {
      options.body = body;
    }
  }

  try {
    const res = await fetch(url, options);
    let data;
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      data = await res.json();
    } else {
      data = await res.text();
    }
    return { status: res.status, data, ok: res.ok };
  } catch (err) {
    return { status: 0, data: null, error: err.message, ok: false };
  }
}

async function runTests() {
  console.log("\n========================================================");
  console.log("       TRIP MARKETPLACE COMPLETE API TEST SUITE        ");
  console.log("========================================================\n");

  // 1. Root & Health Check
  console.log("--- 1. Base & Health Endpoints ---");
  {
    const res = await request("GET", "/");
    record("Base", "GET / (Welcome/Root)", res.status === 200 && res.data?.success === true, `Status: ${res.status}`);

    const health = await request("GET", "/health");
    record("Base", "GET /health", health.status === 200 && health.data?.data?.database === "connection checked per request", `Status: ${health.status}`);
  }

  // 2. Authentication Flow & Error Handling
  console.log("\n--- 2. Auth Routes (/api/v1/auth) ---");
  let adminToken, sellerToken, travelerToken, travelerRefreshToken;
  let travelerId, sellerId;
  const uniqueTimestamp = Date.now();
  const testTravelerEmail = `test_traveler_${uniqueTimestamp}@example.com`;
  const testSellerEmail = `test_seller_${uniqueTimestamp}@example.com`;

  {
    // Register Traveler
    const regTraveler = await request("POST", "/api/v1/auth/register", {
      body: {
        name: "Test Traveler",
        email: testTravelerEmail,
        password: "password123",
        role: "TRAVELER"
      }
    });
    record("Auth", "POST /api/v1/auth/register (Traveler)", regTraveler.status === 201 && regTraveler.data?.data?.user?.email === testTravelerEmail, `Status: ${regTraveler.status}`);

    // Register Duplicate Email (Error Handling)
    const dupReg = await request("POST", "/api/v1/auth/register", {
      body: {
        name: "Test Traveler",
        email: testTravelerEmail,
        password: "password123",
        role: "TRAVELER"
      }
    });
    record("Auth", "POST /api/v1/auth/register (Duplicate Email -> 409)", dupReg.status === 409 && dupReg.data?.success === false, `Status: ${dupReg.status}, Message: ${dupReg.data?.message}`);

    // Register Validation Error (Short Password -> 400)
    const valReg = await request("POST", "/api/v1/auth/register", {
      body: {
        name: "Short Pass",
        email: `short_${uniqueTimestamp}@example.com`,
        password: "123",
        role: "TRAVELER"
      }
    });
    record("Auth", "POST /api/v1/auth/register (Validation Error Short Pass -> 400)", valReg.status === 400 && valReg.data?.success === false, `Status: ${valReg.status}`);

    // Register Seller
    const regSeller = await request("POST", "/api/v1/auth/register", {
      body: {
        name: "New Agency",
        email: testSellerEmail,
        password: "password123",
        role: "SELLER"
      }
    });
    record("Auth", "POST /api/v1/auth/register (Seller PENDING)", regSeller.status === 201 && regSeller.data?.data?.user?.status === "PENDING", `Status: ${regSeller.status}`);

    // Login Traveler
    const loginTraveler = await request("POST", "/api/v1/auth/login", {
      body: { email: "ali@example.com", password: "123456" }
    });
    record("Auth", "POST /api/v1/auth/login (Traveler Login)", loginTraveler.status === 200 && Boolean(loginTraveler.data?.data?.accessToken), `Status: ${loginTraveler.status}`);
    travelerToken = loginTraveler.data?.data?.accessToken;
    travelerRefreshToken = loginTraveler.data?.data?.refreshToken;
    travelerId = loginTraveler.data?.data?.user?._id;

    // Login Approved Seller
    const loginSeller = await request("POST", "/api/v1/auth/login", {
      body: { email: "ahmed@travels.com", password: "123456" }
    });
    record("Auth", "POST /api/v1/auth/login (Seller Login)", loginSeller.status === 200 && Boolean(loginSeller.data?.data?.accessToken), `Status: ${loginSeller.status}`);
    sellerToken = loginSeller.data?.data?.accessToken;
    sellerId = loginSeller.data?.data?.user?._id;

    // Login Admin
    const loginAdmin = await request("POST", "/api/v1/auth/login", {
      body: { email: "admin@example.com", password: "Admin123!" }
    });
    record("Auth", "POST /api/v1/auth/login (Admin Login)", loginAdmin.status === 200 && loginAdmin.data?.data?.user?.role === "ADMIN", `Status: ${loginAdmin.status}`);
    adminToken = loginAdmin.data?.data?.accessToken;

    // Login Wrong Password (401 Error)
    const badLogin = await request("POST", "/api/v1/auth/login", {
      body: { email: "ali@example.com", password: "wrongpassword" }
    });
    record("Auth", "POST /api/v1/auth/login (Invalid Creds -> 401)", badLogin.status === 401 && badLogin.data?.success === false, `Status: ${badLogin.status}`);

    // GET /me (Protected)
    const meRes = await request("GET", "/api/v1/auth/me", {
      headers: { Authorization: `Bearer ${travelerToken}` }
    });
    record("Auth", "GET /api/v1/auth/me (Current User Profile)", meRes.status === 200 && meRes.data?.data?.user?.email === "ali@example.com", `Status: ${meRes.status}`);

    // GET /me Without Token (401 Error)
    const meNoToken = await request("GET", "/api/v1/auth/me");
    record("Auth", "GET /api/v1/auth/me (Missing Token -> 401)", meNoToken.status === 401 && meNoToken.data?.success === false, `Status: ${meNoToken.status}`);

    // GET /me Invalid Token (401 Error)
    const meBadToken = await request("GET", "/api/v1/auth/me", {
      headers: { Authorization: "Bearer invalid_token_xyz" }
    });
    record("Auth", "GET /api/v1/auth/me (Invalid Token -> 401)", meBadToken.status === 401, `Status: ${meBadToken.status}`);

    // Refresh Token
    const refreshRes = await request("POST", "/api/v1/auth/refresh-token", {
      body: { refreshToken: travelerRefreshToken }
    });
    record("Auth", "POST /api/v1/auth/refresh-token", refreshRes.status === 200 && Boolean(refreshRes.data?.data?.accessToken), `Status: ${refreshRes.status}`);

    // Forgot Password & Reset Password Flow
    const forgotRes = await request("POST", "/api/v1/auth/forgot-password", {
      body: { email: testTravelerEmail }
    });
    const resetToken = forgotRes.data?.data?.resetToken;
    record("Auth", "POST /api/v1/auth/forgot-password", forgotRes.status === 200 && Boolean(resetToken), `Status: ${forgotRes.status}`);

    if (resetToken) {
      const resetRes = await request("POST", "/api/v1/auth/reset-password", {
        body: { token: resetToken, password: "newpassword123" }
      });
      record("Auth", "POST /api/v1/auth/reset-password", resetRes.status === 200, `Status: ${resetRes.status}`);
    }

    // Change Password (with Traveler Token)
    const changePassRes = await request("PUT", "/api/v1/auth/change-password", {
      headers: { Authorization: `Bearer ${travelerToken}` },
      body: { currentPassword: "123456", newPassword: "123456" }
    });
    record("Auth", "PUT /api/v1/auth/change-password", changePassRes.status === 200, `Status: ${changePassRes.status}`);
    // re-login traveler to get fresh token
    const reLoginTraveler = await request("POST", "/api/v1/auth/login", {
      body: { email: "ali@example.com", password: "123456" }
    });
    travelerToken = reLoginTraveler.data?.data?.accessToken;
  }

  // 3. User Profile Routes (/api/v1/users)
  console.log("\n--- 3. User Profile Routes (/api/v1/users) ---");
  {
    const profileRes = await request("GET", "/api/v1/users/me", {
      headers: { Authorization: `Bearer ${travelerToken}` }
    });
    record("Users", "GET /api/v1/users/me", profileRes.status === 200 && profileRes.data?.data?.user?.email === "ali@example.com", `Status: ${profileRes.status}`);

    const updateRes = await request("PUT", "/api/v1/users/me", {
      headers: { Authorization: `Bearer ${travelerToken}` },
      body: { name: "Ali Khan Updated" }
    });
    record("Users", "PUT /api/v1/users/me (Update Name)", updateRes.status === 200 && updateRes.data?.data?.user?.name === "Ali Khan Updated", `Status: ${updateRes.status}`);

    // Revert name back to Ali Khan
    await request("PUT", "/api/v1/users/me", {
      headers: { Authorization: `Bearer ${travelerToken}` },
      body: { name: "Ali Khan" }
    });

    // Test Deactivate Account on a dedicated test user
    const loginTestUser = await request("POST", "/api/v1/auth/login", {
      body: { email: testTravelerEmail, password: "newpassword123" }
    });
    if (loginTestUser.data?.data?.accessToken) {
      const deactRes = await request("DELETE", "/api/v1/users/me", {
        headers: { Authorization: `Bearer ${loginTestUser.data.data.accessToken}` }
      });
      record("Users", "DELETE /api/v1/users/me (Deactivate)", deactRes.status === 200, `Status: ${deactRes.status}`);
    }
  }

  // 4. Destination Routes (/api/v1/destinations)
  console.log("\n--- 4. Destination Routes (/api/v1/destinations) ---");
  let sampleDestinationId;
  {
    const allDest = await request("GET", "/api/v1/destinations");
    record("Destinations", "GET /api/v1/destinations (List All)", allDest.status === 200 && allDest.data?.data?.destinations?.length > 0, `Count: ${allDest.data?.data?.destinations?.length}`);
    sampleDestinationId = allDest.data?.data?.destinations?.[0]?._id;

    const filterRegion = await request("GET", "/api/v1/destinations?region=Europe");
    record("Destinations", "GET /api/v1/destinations?region=Europe", filterRegion.status === 200 && filterRegion.data?.data?.destinations?.every(d => d.region === "Europe"), `Count: ${filterRegion.data?.data?.destinations?.length}`);

    const searchDest = await request("GET", "/api/v1/destinations?search=Paris");
    record("Destinations", "GET /api/v1/destinations?search=Paris", searchDest.status === 200 && searchDest.data?.data?.destinations?.some(d => d.name === "Paris"), `Found: ${searchDest.data?.data?.destinations?.length}`);
  }

  // 5. Public Trip Routes (/api/v1/trips)
  console.log("\n--- 5. Public Trip Routes (/api/v1/trips) ---");
  let publishedTripId, tripDateId;
  {
    const tripsRes = await request("GET", "/api/v1/trips");
    record("Trips", "GET /api/v1/trips (List Public)", tripsRes.status === 200 && tripsRes.data?.data?.trips?.length > 0, `Total: ${tripsRes.data?.pagination?.total}`);
    const firstTrip = tripsRes.data?.data?.trips?.[0];
    publishedTripId = firstTrip?._id;

    // Filter & sort
    const filterTrip = await request("GET", "/api/v1/trips?category=Cultural&sort=price_asc");
    record("Trips", "GET /api/v1/trips with Query Filters", filterTrip.status === 200, `Status: ${filterTrip.status}`);

    // Single public trip
    const singleTrip = await request("GET", `/api/v1/trips/${publishedTripId}`);
    record("Trips", `GET /api/v1/trips/:id (Single Public Trip)`, singleTrip.status === 200 && singleTrip.data?.data?.trip?.title === firstTrip.title, `Title: ${singleTrip.data?.data?.trip?.title}`);
    tripDateId = singleTrip.data?.data?.trip?.availability?.[0]?._id;

    // Trip Not Found (404 Error)
    const notFoundTrip = await request("GET", "/api/v1/trips/666666666666666666666666");
    record("Trips", "GET /api/v1/trips/:id (Non-existent ID -> 404)", notFoundTrip.status === 404, `Status: ${notFoundTrip.status}`);

    // Malformed ID (Cast Error -> 400)
    const badIdTrip = await request("GET", "/api/v1/trips/invalid_object_id_123");
    record("Trips", "GET /api/v1/trips/:id (Malformed ID -> 400)", badIdTrip.status === 400, `Status: ${badIdTrip.status}`);
  }

  // 6. Traveler Interactions: Favorites, Inquiries, Bookings
  console.log("\n--- 6. Traveler Interactions (Favorites, Inquiries, Bookings) ---");
  let createdBookingId, createdInquiryId;
  {
    // List Favorites
    const favsList = await request("GET", "/api/v1/favorites", {
      headers: { Authorization: `Bearer ${travelerToken}` }
    });
    record("Favorites", "GET /api/v1/favorites", favsList.status === 200, `Count: ${favsList.data?.data?.favorites?.length}`);

    // Add Favorite
    const addFav = await request("POST", `/api/v1/favorites/${publishedTripId}`, {
      headers: { Authorization: `Bearer ${travelerToken}` }
    });
    // Can be 201 or 409 if already favorited in seed
    record("Favorites", "POST /api/v1/favorites/:tripId", [201, 409].includes(addFav.status), `Status: ${addFav.status}`);

    // Remove Favorite
    const delFav = await request("DELETE", `/api/v1/favorites/${publishedTripId}`, {
      headers: { Authorization: `Bearer ${travelerToken}` }
    });
    record("Favorites", "DELETE /api/v1/favorites/:tripId", delFav.status === 200, `Status: ${delFav.status}`);

    // Remove non-existent favorite (404 Error)
    const delFav404 = await request("DELETE", `/api/v1/favorites/${publishedTripId}`, {
      headers: { Authorization: `Bearer ${travelerToken}` }
    });
    record("Favorites", "DELETE /api/v1/favorites/:tripId (Not found -> 404)", delFav404.status === 404, `Status: ${delFav404.status}`);

    // Add back to favorites
    await request("POST", `/api/v1/favorites/${publishedTripId}`, {
      headers: { Authorization: `Bearer ${travelerToken}` }
    });

    // Traveler Send Inquiry
    const createInq = await request("POST", `/api/v1/trips/${publishedTripId}/inquiries`, {
      headers: { Authorization: `Bearer ${travelerToken}` },
      body: {
        name: "Ali Khan",
        email: "ali@example.com",
        phone: "+923001234567",
        message: "Can we customize the return flight date?"
      }
    });
    record("Inquiries", "POST /api/v1/trips/:tripId/inquiries", createInq.status === 201, `Status: ${createInq.status}`);
    createdInquiryId = createInq.data?.data?.inquiry?._id;

    // Inquiry validation failure (Missing message -> 400)
    const inqFail = await request("POST", `/api/v1/trips/${publishedTripId}/inquiries`, {
      headers: { Authorization: `Bearer ${travelerToken}` },
      body: { name: "Ali Khan", email: "ali@example.com" }
    });
    record("Inquiries", "POST /api/v1/trips/:tripId/inquiries (Missing Fields -> 400)", inqFail.status === 400, `Status: ${inqFail.status}`);

    // List Traveler Inquiries
    const travInqs = await request("GET", "/api/v1/inquiries", {
      headers: { Authorization: `Bearer ${travelerToken}` }
    });
    record("Inquiries", "GET /api/v1/inquiries (Traveler List)", travInqs.status === 200, `Count: ${travInqs.data?.data?.inquiries?.length}`);

    // Get Single Traveler Inquiry
    if (createdInquiryId) {
      const singleInq = await request("GET", `/api/v1/inquiries/${createdInquiryId}`, {
        headers: { Authorization: `Bearer ${travelerToken}` }
      });
      record("Inquiries", "GET /api/v1/inquiries/:id (Traveler Single)", singleInq.status === 200, `Status: ${singleInq.status}`);
    }

    // Traveler Create Booking
    const bookRes = await request("POST", `/api/v1/trips/${publishedTripId}/bookings`, {
      headers: { Authorization: `Bearer ${travelerToken}` },
      body: {
        tripDateId,
        travelers: 1
      }
    });
    record("Bookings", "POST /api/v1/trips/:tripId/bookings", bookRes.status === 201, `Status: ${bookRes.status}`);
    createdBookingId = bookRes.data?.data?.booking?._id;

    // Booking seat shortage error (999 seats -> 409)
    const bookFail = await request("POST", `/api/v1/trips/${publishedTripId}/bookings`, {
      headers: { Authorization: `Bearer ${travelerToken}` },
      body: {
        tripDateId,
        travelers: 999
      }
    });
    record("Bookings", "POST /api/v1/trips/:tripId/bookings (Not Enough Seats -> 409)", bookFail.status === 409, `Status: ${bookFail.status}`);

    // List Traveler Bookings
    const travBookings = await request("GET", "/api/v1/bookings", {
      headers: { Authorization: `Bearer ${travelerToken}` }
    });
    record("Bookings", "GET /api/v1/bookings (Traveler List)", travBookings.status === 200, `Count: ${travBookings.data?.data?.bookings?.length}`);

    // Single Traveler Booking
    if (createdBookingId) {
      const singleBk = await request("GET", `/api/v1/bookings/${createdBookingId}`, {
        headers: { Authorization: `Bearer ${travelerToken}` }
      });
      record("Bookings", "GET /api/v1/bookings/:id (Traveler Single)", singleBk.status === 200, `Status: ${singleBk.status}`);

      // Cancel Traveler Booking
      const cancelBk = await request("PATCH", `/api/v1/bookings/${createdBookingId}/cancel`, {
        headers: { Authorization: `Bearer ${travelerToken}` },
        body: { reason: "Change of plans" }
      });
      record("Bookings", "PATCH /api/v1/bookings/:id/cancel (Traveler Cancel)", cancelBk.status === 200 && cancelBk.data?.data?.booking?.status === "CANCELLED", `Status: ${cancelBk.status}`);
    }
  }

  // 7. Seller Endpoints (/api/v1/seller)
  console.log("\n--- 7. Seller Endpoints (/api/v1/seller) ---");
  let sellerCreatedTripId;
  {
    // Seller Dashboard
    const dash = await request("GET", "/api/v1/seller/dashboard", {
      headers: { Authorization: `Bearer ${sellerToken}` }
    });
    record("Seller", "GET /api/v1/seller/dashboard", dash.status === 200 && dash.data?.data?.statistics !== undefined, `Trips: ${dash.data?.data?.statistics?.trips}`);

    // Seller Profile
    const sProfile = await request("GET", "/api/v1/seller/profile", {
      headers: { Authorization: `Bearer ${sellerToken}` }
    });
    record("Seller", "GET /api/v1/seller/profile", sProfile.status === 200, `Agency: ${sProfile.data?.data?.profile?.agencyName}`);

    // Update Seller Profile
    const updateProf = await request("PUT", "/api/v1/seller/profile", {
      headers: { Authorization: `Bearer ${sellerToken}` },
      body: {
        agencyName: "Ahmed Global Adventures Elite",
        phone: "+92 300 9999999"
      }
    });
    record("Seller", "PUT /api/v1/seller/profile", updateProf.status === 200 && updateProf.data?.data?.profile?.agencyName === "Ahmed Global Adventures Elite", `Status: ${updateProf.status}`);

    // List Seller Trips
    const sTrips = await request("GET", "/api/v1/seller/trips", {
      headers: { Authorization: `Bearer ${sellerToken}` }
    });
    record("Seller", "GET /api/v1/seller/trips", sTrips.status === 200, `Count: ${sTrips.data?.data?.trips?.length}`);

    // Create Draft Trip
    const newTrip = await request("POST", "/api/v1/seller/trips", {
      headers: { Authorization: `Bearer ${sellerToken}` },
      body: {
        title: "Test Seller Draft Expedition",
        shortDescription: "Short test overview for new expedition.",
        fullDescription: "Detailed description of the test expedition covering multiple scenic destinations.",
        destination: sampleDestinationId,
        country: "France",
        city: "Nice",
        category: "Beach",
        tripType: "Leisure",
        duration: 3,
        numberOfNights: 2,
        price: 499,
        availability: [
          {
            departureDate: "2026-11-20T08:00:00.000Z",
            returnDate: "2026-11-23T18:00:00.000Z",
            totalSeats: 10,
            availableSeats: 10
          }
        ]
      }
    });
    record("Seller", "POST /api/v1/seller/trips (Create Draft)", newTrip.status === 201 && newTrip.data?.data?.trip?.status === "DRAFT", `Status: ${newTrip.status}`);
    sellerCreatedTripId = newTrip.data?.data?.trip?._id;

    // Get Seller Trip
    if (sellerCreatedTripId) {
      const getTrip = await request("GET", `/api/v1/seller/trips/${sellerCreatedTripId}`, {
        headers: { Authorization: `Bearer ${sellerToken}` }
      });
      record("Seller", "GET /api/v1/seller/trips/:id", getTrip.status === 200, `Status: ${getTrip.status}`);

      // Update Seller Trip
      const updateTrip = await request("PUT", `/api/v1/seller/trips/${sellerCreatedTripId}`, {
        headers: { Authorization: `Bearer ${sellerToken}` },
        body: {
          title: "Test Seller Draft Expedition (Updated)",
          price: 520
        }
      });
      record("Seller", "PUT /api/v1/seller/trips/:id", updateTrip.status === 200 && updateTrip.data?.data?.trip?.price === 520, `Status: ${updateTrip.status}`);

      // Submit Trip for Approval (will fail if missing coverImage or details)
      // Provide coverImage to submit
      await request("PUT", `/api/v1/seller/trips/${sellerCreatedTripId}`, {
        headers: { Authorization: `Bearer ${sellerToken}` },
        body: { coverImage: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34" }
      });
      const submitTrip = await request("POST", `/api/v1/seller/trips/${sellerCreatedTripId}/submit`, {
        headers: { Authorization: `Bearer ${sellerToken}` }
      });
      record("Seller", "POST /api/v1/seller/trips/:id/submit", submitTrip.status === 200 && submitTrip.data?.data?.trip?.status === "PENDING_APPROVAL", `Status: ${submitTrip.status}`);

      // Delete Seller Trip
      const delTrip = await request("DELETE", `/api/v1/seller/trips/${sellerCreatedTripId}`, {
        headers: { Authorization: `Bearer ${sellerToken}` }
      });
      record("Seller", "DELETE /api/v1/seller/trips/:id", delTrip.status === 200, `Status: ${delTrip.status}`);
    }

    // Seller Inquiries
    const sInquiries = await request("GET", "/api/v1/seller/inquiries", {
      headers: { Authorization: `Bearer ${sellerToken}` }
    });
    record("Seller", "GET /api/v1/seller/inquiries", sInquiries.status === 200, `Count: ${sInquiries.data?.data?.inquiries?.length}`);
    const sampleInq = sInquiries.data?.data?.inquiries?.[0];

    if (sampleInq) {
      const getInq = await request("GET", `/api/v1/seller/inquiries/${sampleInq._id}`, {
        headers: { Authorization: `Bearer ${sellerToken}` }
      });
      record("Seller", "GET /api/v1/seller/inquiries/:id", getInq.status === 200, `Status: ${getInq.status}`);

      // Update Inquiry Status & Response
      const respInq = await request("PATCH", `/api/v1/seller/inquiries/${sampleInq._id}/status`, {
        headers: { Authorization: `Bearer ${sellerToken}` },
        body: {
          status: "RESPONDED",
          response: "Yes, customized flight dates are readily available."
        }
      });
      record("Seller", "PATCH /api/v1/seller/inquiries/:id/status", respInq.status === 200, `Status: ${respInq.status}`);
    }

    // Seller Bookings
    const sBookings = await request("GET", "/api/v1/seller/bookings", {
      headers: { Authorization: `Bearer ${sellerToken}` }
    });
    record("Seller", "GET /api/v1/seller/bookings", sBookings.status === 200, `Count: ${sBookings.data?.data?.bookings?.length}`);
    const sampleBk = sBookings.data?.data?.bookings?.find(b => b.status === "PENDING") || sBookings.data?.data?.bookings?.[0];

    if (sampleBk) {
      const getBk = await request("GET", `/api/v1/seller/bookings/${sampleBk._id}`, {
        headers: { Authorization: `Bearer ${sellerToken}` }
      });
      record("Seller", "GET /api/v1/seller/bookings/:id", getBk.status === 200, `Status: ${getBk.status}`);

      // Update Booking Status
      const updateBk = await request("PATCH", `/api/v1/seller/bookings/${sampleBk._id}/status`, {
        headers: { Authorization: `Bearer ${sellerToken}` },
        body: { status: "CONFIRMED" }
      });
      record("Seller", "PATCH /api/v1/seller/bookings/:id/status (CONFIRMED)", updateBk.status === 200, `Status: ${updateBk.status}`);
    }
  }

  // 8. Admin Routes (/api/v1/admin)
  console.log("\n--- 8. Admin Routes (/api/v1/admin) ---");
  {
    // Admin Dashboard
    const aDash = await request("GET", "/api/v1/admin/dashboard", {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    record("Admin", "GET /api/v1/admin/dashboard", aDash.status === 200 && aDash.data?.data?.statistics?.totalUsers > 0, `Users: ${aDash.data?.data?.statistics?.totalUsers}`);

    // List Users
    const aUsers = await request("GET", "/api/v1/admin/users", {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    record("Admin", "GET /api/v1/admin/users", aUsers.status === 200 && aUsers.data?.data?.users?.length > 0, `Count: ${aUsers.data?.data?.users?.length}`);

    // Get Single User
    const userToInspect = aUsers.data?.data?.users?.find(u => u.email === "ali@example.com");
    if (userToInspect) {
      const inspectId = userToInspect.id || userToInspect._id;
      const singleU = await request("GET", `/api/v1/admin/users/${inspectId}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      record("Admin", "GET /api/v1/admin/users/:id", singleU.status === 200 && singleU.data?.data?.user?.email === "ali@example.com", `Status: ${singleU.status}`);
    }

    // List Sellers
    const aSellers = await request("GET", "/api/v1/admin/sellers", {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    record("Admin", "GET /api/v1/admin/sellers", aSellers.status === 200 && aSellers.data?.data?.users?.every(u => u.role === "SELLER"), `Count: ${aSellers.data?.data?.users?.length}`);

    // Find pending seller to test approve & reject
    const pendingSeller = aSellers.data?.data?.users?.find(u => u.status === "PENDING");
    if (pendingSeller) {
      const pendingSellerId = pendingSeller.id || pendingSeller._id;
      // Approve Seller
      const approveS = await request("PATCH", `/api/v1/admin/sellers/${pendingSellerId}/approve`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      record("Admin", "PATCH /api/v1/admin/sellers/:id/approve", approveS.status === 200 && approveS.data?.data?.user?.status === "ACTIVE", `Status: ${approveS.status}`);

      // Reject Seller (with reason)
      const rejectS = await request("PATCH", `/api/v1/admin/sellers/${pendingSellerId}/reject`, {
        headers: { Authorization: `Bearer ${adminToken}` },
        body: { reason: "Missing audited financial statement" }
      });
      record("Admin", "PATCH /api/v1/admin/sellers/:id/reject", rejectS.status === 200 && rejectS.data?.data?.user?.status === "REJECTED", `Status: ${rejectS.status}`);
    }

    // List Admin Trips
    const aTrips = await request("GET", "/api/v1/admin/trips", {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    record("Admin", "GET /api/v1/admin/trips", aTrips.status === 200, `Count: ${aTrips.data?.data?.trips?.length}`);

    // Find pending approval trip
    const pendingTrip = aTrips.data?.data?.trips?.find(t => t.status === "PENDING_APPROVAL");
    if (pendingTrip) {
      // Get Admin Trip
      const singleTrip = await request("GET", `/api/v1/admin/trips/${pendingTrip._id}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      record("Admin", "GET /api/v1/admin/trips/:id", singleTrip.status === 200, `Status: ${singleTrip.status}`);

      // Approve Trip
      const approveT = await request("PATCH", `/api/v1/admin/trips/${pendingTrip._id}/approve`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      record("Admin", "PATCH /api/v1/admin/trips/:id/approve", approveT.status === 200 && approveT.data?.data?.trip?.status === "PUBLISHED", `Status: ${approveT.status}`);

      // Unpublish Trip
      const unpubT = await request("PATCH", `/api/v1/admin/trips/${pendingTrip._id}/unpublish`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      record("Admin", "PATCH /api/v1/admin/trips/:id/unpublish", unpubT.status === 200 && unpubT.data?.data?.trip?.status === "UNPUBLISHED", `Status: ${unpubT.status}`);
    }

    // List Admin Bookings
    const aBookings = await request("GET", "/api/v1/admin/bookings", {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    record("Admin", "GET /api/v1/admin/bookings", aBookings.status === 200, `Count: ${aBookings.data?.data?.bookings?.length}`);
    const sampleAdminBk = aBookings.data?.data?.bookings?.[0];

    if (sampleAdminBk) {
      const getBk = await request("GET", `/api/v1/admin/bookings/${sampleAdminBk._id}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      record("Admin", "GET /api/v1/admin/bookings/:id", getBk.status === 200, `Status: ${getBk.status}`);
    }
  }

  // 9. Role-Based Access Control (RBAC) & Global Error Handling
  console.log("\n--- 9. Role-Based Security & Global Error Handling ---");
  {
    // Traveler accessing Admin Route (403 Forbidden)
    const travelerOnAdmin = await request("GET", "/api/v1/admin/dashboard", {
      headers: { Authorization: `Bearer ${travelerToken}` }
    });
    record("Security", "Traveler accessing Admin Dashboard -> 403", travelerOnAdmin.status === 403, `Status: ${travelerOnAdmin.status}`);

    // Traveler accessing Seller Dashboard (403 Forbidden)
    const travelerOnSeller = await request("GET", "/api/v1/seller/dashboard", {
      headers: { Authorization: `Bearer ${travelerToken}` }
    });
    record("Security", "Traveler accessing Seller Dashboard -> 403", travelerOnSeller.status === 403, `Status: ${travelerOnSeller.status}`);

    // Non-existent route (404 Not Found)
    const nonExistent = await request("GET", "/non-existent-route-xyz");
    record("ErrorHandling", "Non-existent route -> 404", nonExistent.status === 404 && nonExistent.data?.success === false, `Status: ${nonExistent.status}`);

    // Malformed JSON body (400 Bad Request)
    const malformedJson = await request("POST", "/api/v1/auth/login", {
      headers: { "Content-Type": "application/json" },
      body: "INVALID_JSON{broken"
    });
    record("ErrorHandling", "Malformed JSON syntax -> 400", malformedJson.status === 400 && malformedJson.data?.message === "Invalid JSON in request body", `Status: ${malformedJson.status}`);
  }

  console.log("\n========================================================");
  console.log(`TOTAL TESTS: ${passed + failed}`);
  console.log(`PASSED:      ${passed}`);
  console.log(`FAILED:      ${failed}`);
  console.log("========================================================\n");

  return { passed, failed };
}

runTests().then(({ failed }) => {
  process.exit(failed > 0 ? 1 : 0);
});
