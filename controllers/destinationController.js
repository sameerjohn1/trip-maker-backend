import Destination from "../models/Destination.js";
import catchAsync from "../utils/catchAsync.js";
import { sendSuccess } from "../utils/response.js";

export const getDestinations = catchAsync(async (req, res) => {
  const filter = {};
  if (req.query.region) filter.region = req.query.region;
  if (req.query.search) filter.$or = [
    { name: new RegExp(req.query.search, "i") },
    { country: new RegExp(req.query.search, "i") },
  ];
  const destinations = await Destination.find(filter).sort({ name: 1 });
  sendSuccess(res, 200, "Destinations fetched successfully", { destinations });
});