import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/AppError.js";
import { sendSuccess } from "../utils/response.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";

export const uploadSingleImage = catchAsync(async (req, res) => {
  if (!req.file) {
    throw new AppError("No image file provided", 400);
  }

  if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const result = await uploadToCloudinary(req.file.buffer, "trip-marketplace/images", filename);
    return sendSuccess(res, 200, "Image uploaded successfully to Cloudinary", {
      url: result.secure_url,
      publicId: result.public_id,
    });
  }

  // Fallback if Cloudinary environment variables are not yet configured:
  throw new AppError("Cloudinary environment variables (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) are missing.", 500);
});
