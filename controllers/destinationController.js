import Destination from "../models/Destination.js";
import catchAsync from "../utils/catchAsync.js";
import { sendSuccess } from "../utils/response.js";

export const getDestinations = catchAsync(async (req, res) => {
  const filter = {};
  if (req.query.region) filter.region = req.query.region;
  if (req.query.search) filter.$or = [
    { name: new RegExp(req.query.search, "i") },
    { country: new RegExp(req.query.search, "i") },
    { city: new RegExp(req.query.search, "i") },
  ];
  const destinations = await Destination.find(filter).sort({ name: 1 });
  sendSuccess(res, 200, "Destinations fetched successfully", { destinations });
});

export const createDestination = catchAsync(async (req, res) => {
  const { name, country, city, region, description, imageUrl, averageDailyCost, bestSeason, tags } = req.body;
  if (!name || !country || !region || !description) {
    throw new AppError("name, country, region, and description are required", 400);
  }
  const destination = await Destination.create({
    name,
    country,
    city: city || name,
    region,
    description,
    imageUrl: imageUrl || "",
    averageDailyCost: averageDailyCost || 0,
    bestSeason: bestSeason || "Year-round",
    tags: tags || [],
  });
  sendSuccess(res, 201, "Destination created successfully", { destination });
});