import "dotenv/config";
import bcrypt from "bcryptjs";
import connectDB from "../configs/db.js";
import User from "../models/User.js";
import Destination from "../models/Destination.js";
import Trip from "../models/Trip.js";

const destinationList = [
  {
    name: "Paris",
    country: "France",
    city: "Paris",
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
    city: "Dubai",
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
    city: "Malé",
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
    city: "Tokyo",
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
    city: "Santorini",
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
    city: "Bali",
    region: "Asia",
    description: "Lush rice terraces, sacred water temples, tropical surfing beaches and holistic wellness retreats.",
    imageUrl: "https://images.unsplash.com/photo-1537996194471-e657df975ab4",
    averageDailyCost: 90,
    bestSeason: "Summer",
    tags: ["Beach", "Nature", "Wellness", "Adventure"]
  },
  {
    name: "New York",
    country: "USA",
    city: "New York",
    region: "North America",
    description: "Museums, Broadway shows, Central Park and iconic sky-high architecture in the city that never sleeps.",
    imageUrl: "https://images.unsplash.com/photo-1485871981521-5b1fd3805eee",
    averageDailyCost: 250,
    bestSeason: "Autumn",
    tags: ["City", "Cultural", "Shopping"]
  },
  {
    name: "Istanbul",
    country: "Turkey",
    city: "Istanbul",
    region: "Europe",
    description: "Historic mosques, colorful Grand Bazaar, Bosphorus straits and legendary culinary delights.",
    imageUrl: "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200",
    averageDailyCost: 110,
    bestSeason: "Spring",
    tags: ["Cultural", "Historical", "Food"]
  },
  {
    name: "London",
    country: "United Kingdom",
    city: "London",
    region: "Europe",
    description: "Royal palaces, world-class free museums, West End theatre and historic pubs on the Thames.",
    imageUrl: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad",
    averageDailyCost: 190,
    bestSeason: "Summer",
    tags: ["City", "Historical", "Cultural"]
  },
  {
    name: "Queenstown",
    country: "New Zealand",
    city: "Queenstown",
    region: "Oceania",
    description: "Alpine scenery, dramatic fjords, adrenaline adventures and world-class Pinot Noir vineyards.",
    imageUrl: "https://images.unsplash.com/photo-1469521669194-babb45599def",
    averageDailyCost: 170,
    bestSeason: "Year-round",
    tags: ["Nature", "Adventure", "Scenery"]
  }
];

const run = async () => {
  console.log("Connecting to database...");
  await connectDB();

  // 1. Promote muhammedaliashfaq@gmail.com to ADMIN, ACTIVE, password 123456
  console.log("Configuring Admin: muhammedaliashfaq@gmail.com...");
  const hashedPassword123456 = await bcrypt.hash("123456", 12);
  const adminUser = await User.findOneAndUpdate(
    { email: "muhammedaliashfaq@gmail.com" },
    {
      $set: {
        name: "Muhammad Ali Ashfaq",
        email: "muhammedaliashfaq@gmail.com",
        password: hashedPassword123456,
        role: "ADMIN",
        status: "ACTIVE",
        emailVerified: true,
        tokenVersion: 0,
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  console.log(` Admin set successfully: ${adminUser.email} (Role: ${adminUser.role}, Status: ${adminUser.status})`);

  // 2. Clean up temporary test users created during automated testing
  console.log("Cleaning up automated test accounts...");
  const deleteTestUsersResult = await User.deleteMany({
    email: { $regex: /^test_(traveler|seller)_/ }
  });
  console.log(` Removed ${deleteTestUsersResult.deletedCount} temporary test users.`);

  // 3. Reactivate core demonstration accounts
  console.log("Reactivating core seller & traveler accounts for integration testing...");
  const sellerUser = await User.findOneAndUpdate(
    { email: "ahmed@travels.com" },
    {
      $set: {
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
        }
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  console.log(` Seller ready: ${sellerUser.email} (Status: ${sellerUser.status})`);

  const travelerUser = await User.findOneAndUpdate(
    { email: "ali@example.com" },
    {
      $set: {
        name: "Ali Khan",
        email: "ali@example.com",
        password: hashedPassword123456,
        role: "TRAVELER",
        status: "ACTIVE",
        emailVerified: true,
        tokenVersion: 0,
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  console.log(` Traveler ready: ${travelerUser.email} (Status: ${travelerUser.status})`);

  // 4. Seed all Destinations with _id, name, country, city
  console.log("Seeding Destinations...");
  const destinationMap = {};
  for (const dest of destinationList) {
    const doc = await Destination.findOneAndUpdate(
      { name: dest.name, country: dest.country },
      { $set: dest },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    destinationMap[dest.name] = doc;
  }
  const totalDestinations = await Destination.countDocuments();
  console.log(` Destinations ready: ${totalDestinations} total in database.`);

  // 5. Clean up broken/archived trips and ensure rich published trips exist
  console.log("Ensuring published trips exist for testing GET /trips & GET /trips/:id...");
  await Trip.deleteMany({ status: "ARCHIVED", isDeleted: true });

  const activeTripCount = await Trip.countDocuments({ status: "PUBLISHED", isDeleted: false });
  if (activeTripCount === 0) {
    console.log("Creating active published trips tied to seeded destinations...");
    const sampleTrips = [
      {
        seller: sellerUser._id,
        title: "Magical Paris & Louvre Art Immersion",
        shortDescription: "Experience the romance of Paris with VIP Louvre access, Seine cruise and Eiffel Tower dinner.",
        fullDescription: "Join our master tour guide on a 5-day journey through the City of Lights. From historic Montmartre and Notre Dame to private after-hours Louvre access and gourmet French dining, every detail is handled with care.",
        destination: destinationMap["Paris"]._id,
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
      },
      {
        seller: sellerUser._id,
        title: "Dubai Desert Safari & Ultra Luxury Experience",
        shortDescription: "Discover modern marvels, Burj Khalifa heights, luxury yachts, and thrilling desert dune bashing.",
        fullDescription: "A 4-day premium package covering Dubai's most famous highlights: private desert safari with BBQ under the stars, Burj Khalifa 148th floor sky lounge, luxury yacht marina cruise, and Old Dubai souk tour.",
        destination: destinationMap["Dubai"]._id,
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
            title: "Arrival & Marina Luxury Yacht Cruise",
            description: "VIP airport pickup, check-in to 5-star hotel, and private sunset yacht cruise.",
            location: "Dubai Marina",
            activities: ["Airport VIP transfer", "Marina Yacht Cruise"],
            accommodation: "Address Marina (5-Star)",
            meals: ["Evening Canapes"]
          }
        ],
        coverImage: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c",
        galleryImages: [
          "https://images.unsplash.com/photo-1518684079-3c830dcef090"
        ],
        status: "PUBLISHED",
        isDeleted: false
      },
      {
        seller: sellerUser._id,
        title: "Maldives All-Inclusive Overwater Villa Retreat",
        shortDescription: "Unwind in true luxury in an overwater villa surrounded by turquoise waters, coral reefs and dolphins.",
        fullDescription: "An all-inclusive 6-day island sanctuary getaway. Features sunset dolphin cruises, daily snorkeling excursions over vibrant reefs, spa wellness treatments, and private candlelit beach dinners.",
        destination: destinationMap["Maldives"]._id,
        country: "Maldives",
        city: "Malé",
        category: "Relaxation",
        tripType: "Beach",
        duration: 6,
        numberOfNights: 5,
        price: 2400,
        discountPrice: 2100,
        currency: "USD",
        depositAmount: 500,
        minimumGroupSize: 1,
        availability: [
          {
            departureDate: new Date("2026-11-10T10:00:00Z"),
            returnDate: new Date("2026-11-16T15:00:00Z"),
            totalSeats: 12,
            availableSeats: 10
          }
        ],
        highlights: ["Overwater Villa", "Sunset Dolphin Cruise", "Coral Reef Snorkeling", "Private Beachside Dinner"],
        includedServices: ["5-Star Overwater Villa", "All Meals & Beverages", "Speedboat Airport Transfers", "Spa Treatment"],
        excludedServices: ["International Flights"],
        requirements: "Valid passport, 30-day visa on arrival provided free.",
        cancellationPolicy: "Free cancellation up to 30 days before arrival.",
        itinerary: [
          {
            dayNumber: 1,
            title: "Seaplane Transfer & Villa Welcome",
            description: "Speedboat/seaplane transfer to the private atoll resort, check-in to overwater villa.",
            location: "North Malé Atoll",
            activities: ["Seaplane transfer", "Villa check-in", "Sunset cocktail"],
            accommodation: "Anantara Overwater Villa (5-Star)",
            meals: ["Welcome Dinner"]
          }
        ],
        coverImage: "https://images.unsplash.com/photo-1514282401047-d79a71a590e8",
        galleryImages: [
          "https://images.unsplash.com/photo-1573843981267-be1999ff37cd"
        ],
        status: "PUBLISHED",
        isDeleted: false
      }
    ];

    for (const tripData of sampleTrips) {
      await Trip.create(tripData);
    }
    console.log(` Created ${sampleTrips.length} active published trips.`);
  }

  console.log("\n--- DATABASE SETUP & SEEDING COMPLETED SUCCESSFULLY! ---");
};

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Database operation failed:", err);
    process.exit(1);
  });
