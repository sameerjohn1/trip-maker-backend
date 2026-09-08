import "dotenv/config";
import bcrypt from "bcryptjs";
import connectDB from "../configs/db.js";
import User from "../models/User.js";
import Destination from "../models/Destination.js";
import Trip from "../models/Trip.js";
import Booking from "../models/Booking.js";
import Inquiry from "../models/Inquiry.js";
import Favorite from "../models/Favorite.js";
import Chat from "../models/Chat.js";
import Message from "../models/Message.js";

const seed = async () => {
  console.log("Connecting to database for seeding...");
  await connectDB();

  // 1. Seed Destinations
  console.log("Seeding Destinations...");
  const destinationData = [
    {
      name: "Paris",
      country: "France",
      region: "Europe",
      description: "Romantic streets, iconic landmarks like the Eiffel Tower, world-class art and exquisite cuisine.",
      imageUrl: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34",
      averageDailyCost: 180,
      bestSeason: "Spring",
      tags: ["Romantic", "Cultural", "Art", "Food"]
    },
    {
      name: "Dubai",
      country: "UAE",
      region: "Middle East",
      description: "Futuristic architecture, luxury shopping, thrilling desert safaris and world-record wonders.",
      imageUrl: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c",
      averageDailyCost: 220,
      bestSeason: "Winter",
      tags: ["Luxury", "Adventure", "City", "Shopping"]
    },
    {
      name: "Maldives",
      country: "Maldives",
      region: "Asia",
      description: "Pristine white-sand beaches, crystal-clear turquoise lagoons and luxurious overwater bungalows.",
      imageUrl: "https://images.unsplash.com/photo-1514282401047-d79a71a590e8",
      averageDailyCost: 350,
      bestSeason: "Winter",
      tags: ["Beach", "Relaxation", "Honeymoon", "Diving"]
    },
    {
      name: "Tokyo",
      country: "Japan",
      region: "Asia",
      description: "Vibrant neon metropolis seamlessly blending futuristic technology with ancient Shinto shrines.",
      imageUrl: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf",
      averageDailyCost: 160,
      bestSeason: "Spring",
      tags: ["City", "Cultural", "Food", "Technology"]
    },
    {
      name: "Santorini",
      country: "Greece",
      region: "Europe",
      description: "Whitewashed cliffside villages, blue-domed churches and panoramic Aegean sunset vistas.",
      imageUrl: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff",
      averageDailyCost: 200,
      bestSeason: "Summer",
      tags: ["Beach", "Romantic", "Scenery"]
    },
    {
      name: "Bali",
      country: "Indonesia",
      region: "Asia",
      description: "Lush rice terraces, sacred water temples, tropical surfing beaches and holistic wellness retreats.",
      imageUrl: "https://images.unsplash.com/photo-1537996194471-e657df975ab4",
      averageDailyCost: 90,
      bestSeason: "Summer",
      tags: ["Beach", "Nature", "Wellness", "Adventure"]
    }
  ];

  const destinationMap = {};
  for (const dest of destinationData) {
    const doc = await Destination.findOneAndUpdate(
      { name: dest.name, country: dest.country },
      { $set: dest },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    destinationMap[dest.name] = doc;
  }
  console.log(`Destinations seeded: ${Object.keys(destinationMap).length}`);

  // 2. Seed Users (Admin, Approved Seller, Pending Seller, Travelers)
  console.log("Seeding Users...");
  const hashedPassword123456 = await bcrypt.hash("123456", 12);
  const hashedAdminPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || "Admin123!", 12);

  const admin = await User.findOneAndUpdate(
    { email: "admin@example.com" },
    {
      name: "Platform Admin",
      email: "admin@example.com",
      password: hashedAdminPassword,
      role: "ADMIN",
      status: "ACTIVE",
      emailVerified: true,
      tokenVersion: 0,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const sellerApproved = await User.findOneAndUpdate(
    { email: "ahmed@travels.com" },
    {
      name: "Ahmed Travels Agency",
      email: "ahmed@travels.com",
      password: hashedPassword123456,
      role: "SELLER",
      status: "ACTIVE",
      emailVerified: true,
      tokenVersion: 0,
      sellerProfile: {
        agencyName: "Ahmed Global Adventures",
        description: "Specialized in luxury, guided tours, and curated overseas expeditions for 10+ years.",
        phone: "+92 300 1234567",
        address: "Suit 402, Travel Tower, Lahore, Pakistan",
        verificationStatus: "APPROVED",
        documents: [
          { url: "/uploads/license.pdf", originalName: "business_license.pdf" },
          { url: "/uploads/id.pdf", originalName: "national_id.pdf" }
        ]
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const sellerPending = await User.findOneAndUpdate(
    { email: "pending@travels.com" },
    {
      name: "Horizon Escapes",
      email: "pending@travels.com",
      password: hashedPassword123456,
      role: "SELLER",
      status: "PENDING",
      emailVerified: true,
      tokenVersion: 0,
      sellerProfile: {
        agencyName: "Horizon Escapes Pvt Ltd",
        description: "New eco-tour agency awaiting verification.",
        phone: "+92 301 7654321",
        address: "Office 12, Blue Area, Islamabad",
        verificationStatus: "PENDING",
        documents: [
          { url: "/uploads/reg.pdf", originalName: "registration.pdf" }
        ]
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const traveler1 = await User.findOneAndUpdate(
    { email: "ali@example.com" },
    {
      name: "Ali Khan",
      email: "ali@example.com",
      password: hashedPassword123456,
      role: "TRAVELER",
      status: "ACTIVE",
      emailVerified: true,
      tokenVersion: 0,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const traveler2 = await User.findOneAndUpdate(
    { email: "sara@example.com" },
    {
      name: "Sara Ahmed",
      email: "sara@example.com",
      password: hashedPassword123456,
      role: "TRAVELER",
      status: "ACTIVE",
      emailVerified: true,
      tokenVersion: 0,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const travelerTesting = await User.findOneAndUpdate(
    { email: "testing@gmail.com" },
    {
      name: "Testing Traveler",
      email: "testing@gmail.com",
      password: hashedPassword123456,
      role: "TRAVELER",
      status: "ACTIVE",
      emailVerified: true,
      tokenVersion: 0,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log("Users seeded successfully: Admin, 2 Sellers, 3 Travelers (including testing@gmail.com).");

  // 3. Clear existing test trips, bookings, inquiries, favorites, chats, messages
  console.log("Resetting trips, bookings, inquiries, favorites, chats, messages...");
  await Trip.deleteMany({ seller: sellerApproved._id });
  await Booking.deleteMany({});
  await Inquiry.deleteMany({});
  await Favorite.deleteMany({});
  await Chat.deleteMany({});
  await Message.deleteMany({});

  // 4. Seed Trips
  console.log("Seeding Trips...");
  const parisDest = destinationMap["Paris"];
  const dubaiDest = destinationMap["Dubai"];
  const maldivesDest = destinationMap["Maldives"];
  const tokyoDest = destinationMap["Tokyo"];
  const santoriniDest = destinationMap["Santorini"];

  const trip1 = await Trip.create({
    seller: sellerApproved._id,
    title: "Magical Paris & Louvre Art Immersion",
    shortDescription: "Experience the romance of Paris with VIP Louvre access, Seine cruise and Eiffel Tower dinner.",
    fullDescription: "Join our master tour guide on a 5-day journey through the City of Lights. From historic Montmartre and Notre Dame to private after-hours Louvre access and gourmet French dining, every detail is handled with care.",
    destination: parisDest._id,
    country: "France",
    city: "Paris",
    category: "Cultural",
    tripType: "Guided Tour",
    duration: 5,
    numberOfNights: 4,
    price: 1200,
    discountPrice: 999,
    currency: "USD",
    depositAmount: 200,
    minimumGroupSize: 2,
    availability: [
      {
        departureDate: new Date("2026-10-15T08:00:00Z"),
        returnDate: new Date("2026-10-20T18:00:00Z"),
        totalSeats: 20,
        availableSeats: 16
      },
      {
        departureDate: new Date("2026-11-05T08:00:00Z"),
        returnDate: new Date("2026-11-10T18:00:00Z"),
        totalSeats: 15,
        availableSeats: 15
      }
    ],
    highlights: ["VIP Louvre Tour", "Seine Sunset Cruise", "Eiffel Tower Dining", "Montmartre Walking Tour"],
    includedServices: ["4-Star Hotel Accommodation", "Daily Breakfast & 2 Dinners", "All Museum Entry Passes", "Local English Speaking Guide"],
    excludedServices: ["International Airfare", "Personal Expenses", "Travel Insurance"],
    requirements: "Valid passport with at least 6 months validity. Schengen visa if required.",
    cancellationPolicy: "Free cancellation up to 14 days before departure. 50% refund within 7-14 days.",
    itinerary: [
      {
        dayNumber: 1,
        title: "Arrival in Paris & Seine Evening Cruise",
        description: "Airport greeting, check-in to boutique hotel, and a panoramic evening boat cruise along the Seine.",
        location: "Paris Center",
        activities: ["Airport transfer", "Hotel Check-in", "Seine Boat Cruise"],
        accommodation: "Hotel Le Marais (4-Star)",
        meals: ["Welcome Dinner"]
      },
      {
        dayNumber: 2,
        title: "Louvre Masterpieces & Historic Tuileries",
        description: "Skip-the-line VIP morning tour of the Louvre followed by afternoon stroll in the Tuileries Garden.",
        location: "Louvre Museum",
        activities: ["Louvre Guided Tour", "Tuileries Walk", "Cafe Tasting"],
        accommodation: "Hotel Le Marais (4-Star)",
        meals: ["Breakfast"]
      }
    ],
    coverImage: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34",
    galleryImages: [
      "https://images.unsplash.com/photo-1511739001486-6bfe10ce785f",
      "https://images.unsplash.com/photo-1499856871958-5b9627545d1a"
    ],
    status: "PUBLISHED",
    isDeleted: false
  });

  const trip2 = await Trip.create({
    seller: sellerApproved._id,
    title: "Dubai Desert Safari & Ultra Luxury Experience",
    shortDescription: "Discover modern marvels, Burj Khalifa heights, luxury yachts, and thrilling desert dune bashing.",
    fullDescription: "A 4-day premium package covering Dubai's most famous highlights: private desert safari with BBQ under the stars, Burj Khalifa 148th floor sky lounge, luxury yacht marina cruise, and Old Dubai souk tour.",
    destination: dubaiDest._id,
    country: "UAE",
    city: "Dubai",
    category: "Luxury",
    tripType: "Adventure",
    duration: 4,
    numberOfNights: 3,
    price: 850,
    discountPrice: 750,
    currency: "USD",
    depositAmount: 150,
    minimumGroupSize: 1,
    availability: [
      {
        departureDate: new Date("2026-10-25T09:00:00Z"),
        returnDate: new Date("2026-10-29T20:00:00Z"),
        totalSeats: 25,
        availableSeats: 23
      }
    ],
    highlights: ["Burj Khalifa Sky Deck", "4x4 Desert Safari & Camel Ride", "Marina Luxury Yacht Cruise"],
    includedServices: ["5-Star Hotel Stay", "Airport Limousine Transfers", "Buffet Breakfasts & Desert BBQ"],
    excludedServices: ["Flights", "Gratuities"],
    requirements: "Valid UAE visa and comfortable desert attire.",
    cancellationPolicy: "Full refund 7 days prior to departure date.",
    itinerary: [
      {
        dayNumber: 1,
        title: "Welcome to Dubai & Marina Lights",
        description: "Check in to luxury marina hotel and evening yacht dinner.",
        location: "Dubai Marina",
        activities: ["Transfer", "Marina Cruise"],
        accommodation: "Address Marina (5-Star)",
        meals: ["Dinner"]
      }
    ],
    coverImage: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c",
    galleryImages: [
      "https://images.unsplash.com/photo-1580674684081-7617fbf3d745"
    ],
    status: "PUBLISHED",
    isDeleted: false
  });

  const trip3 = await Trip.create({
    seller: sellerApproved._id,
    title: "Maldives All-Inclusive Overwater Villa Retreat",
    shortDescription: "Unwind in true tropical bliss with an overwater villa, private pool, snorkeling and sunset dolphins.",
    fullDescription: "Escape to paradise on a 6-day luxury island retreat. Includes roundtrip seaplane transfer, unlimited dining across 4 specialty restaurants, coral reef guided snorkeling, and daily spa credits.",
    destination: maldivesDest._id,
    country: "Maldives",
    city: "Male Atoll",
    category: "Beach",
    tripType: "Honeymoon",
    duration: 6,
    numberOfNights: 5,
    price: 2400,
    discountPrice: 2199,
    currency: "USD",
    depositAmount: 400,
    minimumGroupSize: 2,
    availability: [
      {
        departureDate: new Date("2026-11-12T10:00:00Z"),
        returnDate: new Date("2026-11-18T16:00:00Z"),
        totalSeats: 10,
        availableSeats: 8
      }
    ],
    highlights: ["Overwater Villa with Pool", "Seaplane Transfers", "Sunset Dolphin Cruise", "Daily Spa Treatment"],
    includedServices: ["All-Inclusive Dining & Drinks", "Water Sports Gear", "Personal Island Host"],
    excludedServices: ["International Airfare"],
    requirements: "Valid passport.",
    cancellationPolicy: "Full refund up to 30 days before departure.",
    itinerary: [
      {
        dayNumber: 1,
        title: "Seaplane Flight & Island Check-in",
        description: "Breathtaking seaplane transfer over coral atolls to the private resort island.",
        location: "Private Island Resort",
        activities: ["Seaplane transfer", "Villa Check-in", "Sunset cocktail"],
        accommodation: "Sunset Overwater Villa",
        meals: ["Dinner"]
      }
    ],
    coverImage: "https://images.unsplash.com/photo-1514282401047-d79a71a590e8",
    galleryImages: [],
    status: "PUBLISHED",
    isDeleted: false
  });

  const tripPending = await Trip.create({
    seller: sellerApproved._id,
    title: "Tokyo & Kyoto Cherry Blossom Cultural Journey",
    shortDescription: "A 7-day comprehensive journey exploring temples, bullet trains, and cherry blossom gardens.",
    fullDescription: "From the bustling streets of Shibuya and Akihabara to the quiet zen bamboo groves of Arashiyama and golden Kinkaku-ji temple in Kyoto.",
    destination: tokyoDest._id,
    country: "Japan",
    city: "Tokyo",
    category: "Cultural",
    tripType: "Guided Tour",
    duration: 7,
    numberOfNights: 6,
    price: 1850,
    currency: "USD",
    depositAmount: 300,
    minimumGroupSize: 2,
    availability: [
      {
        departureDate: new Date("2026-12-01T08:00:00Z"),
        returnDate: new Date("2026-12-08T18:00:00Z"),
        totalSeats: 16,
        availableSeats: 16
      }
    ],
    highlights: ["Shinkansen Bullet Train", "Fushimi Inari Gates", "Tokyo Skytree", "Tea Ceremony Experience"],
    includedServices: ["Hotels", "JR Rail Pass", "Breakfasts", "English Guide"],
    excludedServices: ["Flights", "Lunches"],
    requirements: "Passport and tourist visa.",
    cancellationPolicy: "Strict 14-day policy.",
    itinerary: [
      {
        dayNumber: 1,
        title: "Arrive in Tokyo & Shinjuku Night Walk",
        description: "Welcome to Tokyo. Settle in and evening stroll through neon Shinjuku.",
        location: "Tokyo Shinjuku",
        activities: ["Airport Shuttle", "Evening Walk"],
        accommodation: "Keio Plaza Hotel",
        meals: ["Dinner"]
      }
    ],
    coverImage: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf",
    galleryImages: [],
    status: "PENDING_APPROVAL",
    isDeleted: false
  });

  const tripDraft = await Trip.create({
    seller: sellerApproved._id,
    title: "Santorini Sunset Wine & Sailing Expedition",
    shortDescription: "Draft trip for Santorini cliffside wine tasting and catamaran sailing.",
    fullDescription: "Detailed draft itinerary exploring Oia sunsets, volcanic hot springs, and Greek gastronomy.",
    destination: santoriniDest._id,
    country: "Greece",
    city: "Santorini",
    category: "Romantic",
    tripType: "Cruise",
    duration: 4,
    numberOfNights: 3,
    price: 950,
    currency: "USD",
    depositAmount: 100,
    minimumGroupSize: 2,
    availability: [
      {
        departureDate: new Date("2026-12-15T10:00:00Z"),
        returnDate: new Date("2026-12-19T16:00:00Z"),
        totalSeats: 12,
        availableSeats: 12
      }
    ],
    highlights: ["Oia Sunset View", "Private Catamaran Cruise", "Volcanic Vineyard Tasting"],
    includedServices: ["Cave Hotel", "Breakfast"],
    excludedServices: ["Flights"],
    requirements: "Passport.",
    cancellationPolicy: "Moderate policy.",
    itinerary: [],
    coverImage: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff",
    galleryImages: [],
    status: "DRAFT",
    isDeleted: false
  });

  console.log("Trips seeded: 3 Published, 1 Pending Approval, 1 Draft.");

  // 5. Seed Bookings
  console.log("Seeding Bookings...");
  const dateParis = trip1.availability[0];
  const booking1 = await Booking.create({
    traveler: traveler1._id,
    seller: sellerApproved._id,
    trip: trip1._id,
    tripDateId: dateParis._id,
    selectedDepartureDate: dateParis.departureDate,
    selectedReturnDate: dateParis.returnDate,
    travelers: 2,
    totalPrice: 1998, // 999 * 2
    currency: "USD",
    status: "CONFIRMED",
    paymentStatus: "UNPAID",
  });

  const dateDubai = trip2.availability[0];
  const booking2 = await Booking.create({
    traveler: traveler2._id,
    seller: sellerApproved._id,
    trip: trip2._id,
    tripDateId: dateDubai._id,
    selectedDepartureDate: dateDubai.departureDate,
    selectedReturnDate: dateDubai.returnDate,
    travelers: 1,
    totalPrice: 750,
    currency: "USD",
    status: "PENDING",
    paymentStatus: "UNPAID",
  });

  console.log("Bookings seeded: 2 bookings.");

  // 6. Seed Inquiries
  console.log("Seeding Inquiries...");
  const inquiry1 = await Inquiry.create({
    traveler: traveler1._id,
    seller: sellerApproved._id,
    trip: trip1._id,
    name: "Ali Khan",
    email: "ali@example.com",
    phone: "+92 321 9876543",
    message: "Hi, do you offer vegetarian meal options during the Paris trip?",
    response: "Hello Ali! Yes, vegetarian and halal dietary options are fully accommodated on all our meals.",
    status: "RESPONDED",
  });

  const inquiry2 = await Inquiry.create({
    traveler: traveler2._id,
    seller: sellerApproved._id,
    trip: trip3._id,
    name: "Sara Ahmed",
    email: "sara@example.com",
    phone: "+92 333 5554433",
    message: "Is the seaplane transfer included in the Maldives package price?",
    status: "NEW",
  });

  console.log("Inquiries seeded: 2 inquiries.");

  // 7. Seed Favorites
  console.log("Seeding Favorites...");
  await Favorite.create({ traveler: traveler1._id, trip: trip1._id });
  await Favorite.create({ traveler: traveler1._id, trip: trip2._id });
  await Favorite.create({ traveler: traveler2._id, trip: trip3._id });

  console.log("Favorites seeded: 3 favorites.");

  // 8. Seed Chats & Messages (specifically between testing@gmail.com and pending@travels.com)
  console.log("Seeding Sample Chats & Messages...");
  const seedChat = await Chat.create({
    participants: [travelerTesting._id, sellerPending._id],
    trip: trip1._id,
    lastMessageAt: new Date(),
  });

  const msg1 = await Message.create({
    chat: seedChat._id,
    sender: travelerTesting._id,
    text: "Hello! I am interested in booking a tour with Horizon Escapes.",
    isRead: true,
  });

  const msg2 = await Message.create({
    chat: seedChat._id,
    sender: sellerPending._id,
    text: "Hi Testing Traveler! Thank you for reaching out. We offer great custom tour packages.",
    isRead: false,
  });

  seedChat.lastMessage = msg2._id;
  seedChat.lastMessageText = msg2.text;
  seedChat.lastMessageAt = msg2.createdAt;
  await seedChat.save();

  console.log("Chats & Messages seeded: 1 chat, 2 messages.");
  console.log("--- SEEDING COMPLETE SUCCESSFULLY! ---");
};

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seeding failed:", err);
    process.exit(1);
  });
