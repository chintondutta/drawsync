import rateLimit from "express-rate-limit";

export const generalRateLimiter = rateLimit({
  windowMs: 60 * 5000,
  max: 5,
  message: {
    message: "Too many attempts. Please try again after a minute.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: {
    message: "Too many attempts. Please try again after a minute.",
  },
});
