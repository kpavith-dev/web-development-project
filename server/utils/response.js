export const sendSuccess = (res, data, message = 'Success', statusCode = 200, pagination = null) => {
  const payload = { success: true, message, data };
  if (pagination) payload.pagination = pagination;
  return res.status(statusCode).json(payload);
};

export const sendError = (res, message = 'Server error', statusCode = 500, errors = null) => {
  const payload = { success: false, message };
  if (errors) payload.errors = errors;
  return res.status(statusCode).json(payload);
};
