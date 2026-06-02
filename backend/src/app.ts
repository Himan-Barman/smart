import cors from 'cors';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from './config/env.js';
import { apiRouter } from './modules/index.js';
import { errorHandler } from './middleware/error-handler.js';
import { HttpError } from './lib/errors.js';
import { apiRateLimiter } from './middleware/rate-limit.js';

export const app = express();

const dirname = path.dirname(fileURLToPath(import.meta.url));
const corsOrigins = env.CORS_ORIGIN.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const resolveFrontendDistPath = (): string => {
  if (env.FRONTEND_DIST_PATH) {
    return path.resolve(process.cwd(), env.FRONTEND_DIST_PATH);
  }

  return path.resolve(dirname, '../../frontend/dist');
};

app.disable('x-powered-by');

if (env.TRUST_PROXY) {
  app.set('trust proxy', 1);
}

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || corsOrigins.includes('*') || corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  }),
);
app.use(
  '/api/v1',
  apiRateLimiter,
);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/v1', apiRouter);

if (env.SERVE_FRONTEND) {
  const frontendDistPath = resolveFrontendDistPath();
  const indexHtmlPath = path.join(frontendDistPath, 'index.html');

  if (existsSync(indexHtmlPath)) {
    app.use(
      express.static(frontendDistPath, {
        index: false,
        maxAge: env.NODE_ENV === 'production' ? '1d' : 0,
      }),
    );

    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/') || req.path === '/health') {
        next();
        return;
      }

      res.sendFile(indexHtmlPath);
    });
  } else {
    console.warn(`SERVE_FRONTEND is enabled but no frontend build was found at ${indexHtmlPath}`);
  }
}

app.use((_req, _res, next) => {
  next(new HttpError(404, 'Route not found'));
});

app.use(errorHandler);
