import Destination from "../models/Destination.js";
import AppError from "../utils/AppError.js";
import catchAsync from "../utils/catchAsync.js";
import { sendSuccess } from "../utils/response.js";

const destinationRegions = [
  "Asia",
  "Europe",
  "North America",
  "South America",
  "Africa",
  "Oceania",
  "Middle East",
];

export const getDestinations = catchAsync(async (req, res) => {
  const filter = {};
  if (req.query.region) filter.region = req.query.region;
  if (req.query.search)
    filter.$or = [
      { name: new RegExp(req.query.search, "i") },
      { country: new RegExp(req.query.search, "i") },
      { city: new RegExp(req.query.search, "i") },
    ];
  const destinations = await Destination.find(filter).sort({ name: 1 });
  sendSuccess(res, 200, "Destinations fetched successfully", { destinations });
});

export const createDestination = catchAsync(async (req, res) => {
  const {
    name,
    country,
    city,
    region,
    description,
    imageUrl,
    averageDailyCost,
    bestSeason,
    tags,
  } = req.body;
  if (!name || !String(name).trim()) {
    throw new AppError("name is required", 400);
  }

  const destinationName = String(name).trim();
  const destinationCountry = String(country || "Custom").trim();
  const destination = await Destination.findOneAndUpdate(
    {
      name: new RegExp(
        `^${destinationName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        "i",
      ),
      country: destinationCountry,
    },
    {
      $setOnInsert: {
        name: destinationName,
        country: destinationCountry,
        city: city || destinationName,
        region: destinationRegions.includes(region) ? region : "Asia",
        description: description || `Custom destination: ${destinationName}`,
        imageUrl: imageUrl || "",
        averageDailyCost: averageDailyCost || 0,
        bestSeason: bestSeason || "Year-round",
        tags: tags || [],
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  sendSuccess(res, 200, "Destination created or reused successfully", {
    destination,
  });
});
