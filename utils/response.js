export const sendSuccess = (res, statusCode, message, data = null, pagination) =>
  res.status(statusCode).json({
    success: true,
    message,
    ...(data !== null ? { data } : {}),
    ...(pagination ? { pagination } : {}),
  });

export const sendError = (res, statusCode, message, errors = []) =>
  res.status(statusCode).json({
    success: false,
    message,
    ...(errors?.length ? { errors } : {}),
  });