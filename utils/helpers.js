import fs from "fs";
import path from "path";

export const parseJsonField = (value, fallback = value) => {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

export const paginationOptions = (req) => ({
  page: Math.max(Number.parseInt(req.query.page, 10) || 1, 1),
  limit: Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 10, 1), 100),
});

export const makePagination = (page, limit, total) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
  hasNext: page < Math.ceil(total / limit),
});

export const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  status: user.status,
  phone: user.phone,
  // Retained as a response alias while the API stores one canonical phone field.
  phoneNumber: user.phone,
  profilePhoto: user.profilePhoto,
  showPhoneInPost: user.showPhoneInPost,
});

export const removeFile = (fileUrl) => {
  if (!fileUrl) return;
  const filePath = path.join(process.cwd(), fileUrl.replace(/^\/+/, ""));
  fs.unlink(filePath, () => {});
};

export const parsePositiveInt = (value) => {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
};
