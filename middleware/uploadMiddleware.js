import fs from "fs";
import path from "path";
import multer from "multer";
import AppError from "../utils/AppError.js";

const uploadDirectory = path.join(process.cwd(), "uploads");
fs.mkdirSync(uploadDirectory, { recursive: true });

const storage = multer.memoryStorage();

const imageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const documentTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

const fileFilter = (req, file, cb) => {
  const allowed = file.fieldname === "documents" ? documentTypes : imageTypes;
  if (!allowed.has(file.mimetype)) {
    return cb(new AppError("Only supported image files and PDF documents are allowed", 400));
  }
  cb(null, true);
};

const limits = {
  fileSize: (Number(process.env.MAX_FILE_SIZE_MB) || 5) * 1024 * 1024,
};

export const tripUpload = multer({ storage, fileFilter, limits }).fields([
  { name: "coverImage", maxCount: 1 },
  { name: "galleryImages", maxCount: 10 },
]);

export const singleImageUpload = multer({ storage, fileFilter, limits }).single("image");

export const sellerDocumentUpload = multer({ storage, fileFilter, limits }).array("documents", 5);