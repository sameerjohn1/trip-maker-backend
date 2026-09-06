import "dotenv/config";
import connectDB from "../configs/db.js";
import Destination from "../models/Destination.js";

const destinations = [
  ["Paris", "France", "Paris", "Europe", "Romantic streets, food and iconic landmarks.", "https://images.unsplash.com/photo-1502602898657-3e91760cbb34", ["Romantic", "Cultural"]],
  ["Dubai", "UAE", "Dubai", "Middle East", "Modern architecture, desert adventures and luxury experiences.", "https://images.unsplash.com/photo-1512453979798-5ea266f8880c", ["Luxury", "Adventure"]],
  ["Maldives", "Maldives", "Malé", "Asia", "White sandy beaches and crystal-clear tropical waters.", "https://images.unsplash.com/photo-1514282401047-d79a71a590e8", ["Beach", "Relaxation"]],
  ["Tokyo", "Japan", "Tokyo", "Asia", "Ancient traditions alongside modern technology and culture.", "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf", ["City", "Cultural"]],
  ["Santorini", "Greece", "Santorini", "Europe", "Blue domes, whitewashed villages and unforgettable sunsets.", "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff", ["Beach", "Romantic"]],
  ["Bali", "Indonesia", "Bali", "Asia", "Temples, waterfalls, beaches and peaceful island landscapes.", "https://images.unsplash.com/photo-1537996194471-e657df975ab4", ["Beach", "Nature"]],
  ["New York", "USA", "New York", "North America", "Museums, city energy, Central Park and iconic attractions.", "https://images.unsplash.com/photo-1485871981521-5b1fd3805eee", ["City"]],
  ["Istanbul", "Turkey", "Istanbul", "Europe", "Historic mosques, colorful markets and excellent food.", "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200", ["Cultural", "Historical"]],
  ["London", "United Kingdom", "London", "Europe", "Royal palaces, museums and iconic city landmarks.", "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad", ["City", "Historical"]],
  ["Queenstown", "New Zealand", "Queenstown", "Oceania", "Mountains, lakes and outdoor adventures in dramatic scenery.", "https://images.unsplash.com/photo-1469521669194-babb45599def", ["Nature", "Adventure"]],
];

try {
  await connectDB();
  const operations = destinations.map(([name, country, city, region, description, imageUrl, tags]) => ({
    updateOne: {
      filter: { name, country },
      update: { $set: { name, country, city, region, description, imageUrl, tags, averageDailyCost: 150, bestSeason: "Year-round" } },
      upsert: true,
    },
  }));
  const result = await Destination.bulkWrite(operations);
  console.log(`Destination seed complete: ${result.upsertedCount} inserted, ${result.modifiedCount} updated.`);
} catch (error) {
  console.error("Destination seed failed:", error.message);
  process.exitCode = 1;
} finally {
  process.exit();
}