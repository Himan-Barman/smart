import rateLimit, { type Options } from 'express-rate-limit';

type JsonRateLimitOptions = Partial<Options> & {
  clientMessage: string;
};

const createJsonRateLimiter = ({ clientMessage, ...options }: JsonRateLimitOptions) =>
  rateLimit({
    ...options,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res, _next, optionsUsed) => {
      res.status(optionsUsed.statusCode).json({ message: clientMessage });
    },
  });

export const apiRateLimiter = createJsonRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 3000,
  skip: (req) => req.originalUrl.startsWith('/api/v1/auth/'),
  clientMessage: 'Too many requests. Please wait a moment and try again.',
});

export const loginRateLimiter = createJsonRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 40,
  skipSuccessfulRequests: true,
  clientMessage: 'Too many login attempts. Please wait a few minutes and try again.',
});

export const refreshRateLimiter = createJsonRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 600,
  skipSuccessfulRequests: true,
  clientMessage: 'Too many session refresh attempts. Please wait a moment and try again.',
});
