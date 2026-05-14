import type { Request, Response, NextFunction } from 'express';
import { HttpError } from '../lib/errors.js';
import { env } from '../config/env.js';

export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction): void => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ message: err.message });
    return;
  }

  if (env.NODE_ENV !== 'production') {
    console.error(err);
  }

  if (err instanceof Error) {
    const message = env.NODE_ENV === 'production' ? 'Internal server error' : err.message;
    res.status(500).json({ message });
    return;
  }

  res.status(500).json({ message: 'Unexpected server error' });
};
