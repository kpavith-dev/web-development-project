// Vite exposes the dev server through localhost and active private-network adapters.
// Keep this permissive rule strictly out of production.
const localOriginPattern = /^http:\/\/(localhost|127\.0\.0\.1|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}):\d+$/;

export const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (origin === process.env.CLIENT_URL) return true;
  return process.env.NODE_ENV !== 'production' && localOriginPattern.test(origin);
};

export const corsOrigin = (origin, callback) => {
  if (isAllowedOrigin(origin)) return callback(null, true);
  return callback(new Error('Origin is not allowed by CORS'));
};
