import type { RequestHandler } from 'express';
import { verifyAuthToken } from '../lib/jwt.js';
import { HttpError } from '../lib/errors.js';

type Role = 'admin' | 'teacher' | 'student';

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        email: string;
        role: Role;
      };
    }
  }
}

export const requireAuth: RequestHandler = (req, _res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    next(new HttpError(401, 'Missing authorization token'));
    return;
  }

  const token = authHeader.slice('Bearer '.length).trim();

  try {
    const payload = verifyAuthToken(token);
    req.auth = {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
    };
    next();
  } catch {
    next(new HttpError(401, 'Invalid or expired token'));
  }
};

export const requireRole = (...roles: Role[]): RequestHandler => {
  return (req, _res, next) => {
    if (!req.auth) {
      next(new HttpError(401, 'Unauthorized'));
      return;
    }

    if (!roles.includes(req.auth.role)) {
      next(new HttpError(403, 'Forbidden'));
      return;
    }

    next();
  };
};
