import multer from "multer";
import mongoose from "mongoose";
import { sendError } from "../utils/response.js";

export const notFound = (req, res) =>
  sendError(res, 404, `Route ${req.method} ${req.originalUrl} not found`);

export const errorHandler = (error, req, res, next) => {
  console.error(`${req.method} ${req.originalUrl}:`, error);
  let status = error.statusCode || 500;
  let message = error.message || "Internal server error";
  let errors = error.errors || [];

  if (error.type === "entity.parse.failed") {
    status = 400;
    message = "Invalid JSON in request body";
  } else if (error instanceof multer.MulterError) {
    status = 400;
    message = error.code === "LIMIT_FILE_SIZE" ? "Uploaded file is too large" : error.message;
  } else if (error instanceof mongoose.Error.ValidationError) {
    status = 422;
    message = "Validation failed";
    errors = Object.values(error.errors).map((item) => ({
      field: item.path,
      message: item.message,
    }));
  } else if (error instanceof mongoose.Error.CastError) {
    status = 400;
    message = `Invalid ${error.path}`;
  } else if (error.code === 11000) {
    status = 409;
    message = "A record with these unique values already exists";
    errors = Object.keys(error.keyPattern || {}).map((field) => ({ field, message: `${field} already exists` }));
  }

  sendError(res, status, message, errors);
};