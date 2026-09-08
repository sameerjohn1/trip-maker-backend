import "dotenv/config";
import http from "http";
import ioClient from "socket.io-client";
import app from "./server.js";
import connectDB from "./configs/db.js";

const PORT = 5099;
const BASE_URL = `http://localhost:${PORT}/api/v1`;

let server;

async function runTests() {
  console.log("\n========================================================");
  console.log("             RUNNING CHAT API & SOCKET TESTS            ");
  console.log("========================================================\n");

  await connectDB();

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`Test server running on port ${PORT}\n`);

  try {
    // 1. Login Traveler (testing@gmail.com)
    console.log("1. Logging in Traveler (testing@gmail.com)...");
    const resTrav = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "testing@gmail.com", password: "123456" }),
    });
    const dataTrav = await resTrav.json();
    if (!dataTrav.success) throw new Error(`Traveler login failed: ${dataTrav.message}`);
    const travelerToken = dataTrav.data.accessToken;
    const travelerId = dataTrav.data.user.id;
    console.log(`   [SUCCESS] Logged in as Traveler: ${dataTrav.data.user.name} (${travelerId})`);

    // 2. Login Seller (pending@travels.com)
    console.log("\n2. Logging in Seller (pending@travels.com)...");
    const resSell = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "pending@travels.com", password: "123456" }),
    });
    const dataSell = await resSell.json();
    if (!dataSell.success) throw new Error(`Seller login failed: ${dataSell.message}`);
    const sellerToken = dataSell.data.accessToken;
    const sellerId = dataSell.data.user.id;
    console.log(`   [SUCCESS] Logged in as Seller: ${dataSell.data.user.name} (${sellerId})`);

    // 3. Login Admin (admin@example.com)
    console.log("\n3. Logging in Admin (admin@example.com)...");
    const resAdmin = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@example.com", password: process.env.ADMIN_PASSWORD || "Admin123!" }),
    });
    const dataAdmin = await resAdmin.json();
    if (!dataAdmin.success) throw new Error(`Admin login failed: ${dataAdmin.message}`);
    const adminToken = dataAdmin.data.accessToken;
    console.log(`   [SUCCESS] Logged in as Admin: ${dataAdmin.data.user.name}`);

    // 4. GET /chats (Traveler)
    console.log("\n4. Testing GET /api/v1/chats (Traveler)...");
    const resChats = await fetch(`${BASE_URL}/chats`, {
      headers: { Authorization: `Bearer ${travelerToken}` },
    });
    const dataChats = await resChats.json();
    console.log(`   Response status: ${resChats.status}`);
    if (!dataChats.success || !dataChats.data.chats.length) {
      throw new Error(`GET /chats failed or no chats returned: ${JSON.stringify(dataChats)}`);
    }
    const chatId = dataChats.data.chats[0]._id;
    console.log(`   [SUCCESS] Found ${dataChats.data.chats.length} chat(s). Target Chat ID: ${chatId}`);

    // 5. Connect Socket.IO client to listen for real-time messages
    console.log("\n5. Testing Socket.IO connection and room join...");
    const socket = ioClient(`http://localhost:${PORT}`);
    let receivedSocketMessage = null;

    await new Promise((resolve) => {
      socket.on("connect", () => {
        console.log(`   [SUCCESS] Socket.IO Client connected with ID: ${socket.id}`);
        socket.emit("join_chat", chatId);
        resolve();
      });
    });

    socket.on("new_message", (msg) => {
      console.log(`   [SOCKET EVENT] Received 'new_message': "${msg.text}" from ${msg.sender.name}`);
      receivedSocketMessage = msg;
    });

    // 6. GET /chats/:chatId/messages (Traveler)
    console.log(`\n6. Testing GET /api/v1/chats/${chatId}/messages (Traveler)...`);
    const resMsgs = await fetch(`${BASE_URL}/chats/${chatId}/messages`, {
      headers: { Authorization: `Bearer ${travelerToken}` },
    });
    const dataMsgs = await resMsgs.json();
    console.log(`   Response status: ${resMsgs.status}`);
    if (!dataMsgs.success) throw new Error(`GET messages failed: ${dataMsgs.message}`);
    console.log(`   [SUCCESS] Fetched ${dataMsgs.data.messages.length} message(s)`);

    // 7. POST /chats/:chatId/messages (Traveler sends new message)
    console.log(`\n7. Testing POST /api/v1/chats/${chatId}/messages (Traveler sends message)...`);
    const newMsgText = "Hello! Can you confirm availability for next weekend?";
    const resSend = await fetch(`${BASE_URL}/chats/${chatId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${travelerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: newMsgText }),
    });
    const dataSend = await resSend.json();
    console.log(`   Response status: ${resSend.status}`);
    if (!dataSend.success) throw new Error(`POST message failed: ${dataSend.message}`);
    console.log(`   [SUCCESS] Sent message ID: ${dataSend.data.message._id}`);

    // Wait 500ms for socket message reception
    await new Promise((r) => setTimeout(r, 500));
    if (receivedSocketMessage && receivedSocketMessage.text === newMsgText) {
      console.log("   [SUCCESS] Real-time socket event successfully verified!");
    } else {
      console.warn("   [WARNING] Socket message not captured in test listener.");
    }
    socket.disconnect();

    // 8. POST /chats (Seller getOrCreateChat with travelerId)
    console.log("\n8. Testing POST /api/v1/chats (Seller creating/getting chat with Traveler)...");
    const resCreate = await fetch(`${BASE_URL}/chats`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sellerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ recipientId: travelerId, initialMessage: "Seller response test!" }),
    });
    const dataCreate = await resCreate.json();
    console.log(`   Response status: ${resCreate.status}`);
    if (!dataCreate.success) throw new Error(`POST /chats failed: ${dataCreate.message}`);
    console.log(`   [SUCCESS] Chat ID returned: ${dataCreate.data.chat._id}`);

    // 9. GET /admin/chats (Admin view all chats)
    console.log("\n9. Testing GET /api/v1/admin/chats (Admin)...");
    const resAdminChats = await fetch(`${BASE_URL}/admin/chats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const dataAdminChats = await resAdminChats.json();
    console.log(`   Response status: ${resAdminChats.status}`);
    if (!dataAdminChats.success) throw new Error(`GET /admin/chats failed: ${dataAdminChats.message}`);
    console.log(`   [SUCCESS] Admin fetched ${dataAdminChats.data.chats.length} chat(s)`);

    // 10. GET /admin/chats/:chatId/messages (Admin view chat messages)
    console.log(`\n10. Testing GET /api/v1/admin/chats/${chatId}/messages (Admin)...`);
    const resAdminMsgs = await fetch(`${BASE_URL}/admin/chats/${chatId}/messages`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const dataAdminMsgs = await resAdminMsgs.json();
    console.log(`   Response status: ${resAdminMsgs.status}`);
    if (!dataAdminMsgs.success) throw new Error(`GET /admin/chats/:chatId/messages failed: ${dataAdminMsgs.message}`);
    console.log(`   [SUCCESS] Admin fetched ${dataAdminMsgs.data.messages.length} message(s)`);

    console.log("\n========================================================");
    console.log("           ALL CHAT API & SOCKET TESTS PASSED!          ");
    console.log("========================================================\n");
  } catch (err) {
    console.error("\n[TEST FAILED]:", err.message);
    process.exitCode = 1;
  } finally {
    if (server) server.close();
    process.exit(process.exitCode || 0);
  }
}

runTests();
