# Smart Campus

A full-stack university management platform with a React + TypeScript frontend and an Express + Prisma backend.

## Tech Stack

- Frontend: React, TypeScript, Vite
- Backend: Express, TypeScript, Prisma Client, JWT auth, Zod validation
- Database: PostgreSQL (Supabase / Render managed)

## Local Development

Install dependencies:

```bash
npm run install:all
```

Generate Prisma Client:

```bash
npm run prisma:generate
```

Run frontend and backend together:

```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:4000/api/v1`
- Health check: `http://localhost:4000/health`

For LAN/device testing, bind the Vite dev server to all interfaces:

```bash
npm run dev:host
```

## Build

```bash
npm run build
```

This builds:

- Frontend: `frontend/dist`
- Backend: `backend/dist`

## Single-Host Server Run

After `npm run build`, run the backend as the only server and let it serve the built frontend:

```bash
npm run start:server
```

Default URL:

- App and API on one host: `http://localhost:4000`
- API base from the browser: `/api/v1`

## Deploy to Render

This project includes a `render.yaml` for one-click deployment:

1. Push the repo to GitHub.
2. Go to [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**.
3. Select the repo — Render reads `render.yaml` and provisions the web service + PostgreSQL DB automatically.
4. The build command installs deps and builds both frontend and backend.
5. The start command runs Prisma migrations then launches the server.

### Manual Deploy

Set these environment variables on your host:

```env
NODE_ENV=production
PORT=4000
HOST=0.0.0.0
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"
JWT_SECRET="replace-with-a-long-random-secret-at-least-32-chars"
CORS_ORIGIN="*"
SERVE_FRONTEND=true
FRONTEND_DIST_PATH="../frontend/dist"
TRUST_PROXY=true
```

Build and start:

```bash
npm run install:all
npm run build
npm run deploy:migrate   # runs prisma migrate deploy
npm run start:server
```

If the frontend is hosted separately (e.g. Vercel), set before building the frontend:

```env
VITE_API_BASE_URL="https://api.your-domain.com/api/v1"
```

## Demo Logins

Seeded credentials:

- Admin: `admin@university.edu` / `admin123`
- Teacher: `rajesh.k@university.edu` / `teacher123`
- Student: `rahul@university.edu` / `student123`

The login page shows role demo buttons when `VITE_SHOW_DEMO_LOGINS=true` is set before building the frontend.

## Useful Scripts

- `npm run dev` — start Vite and backend API locally
- `npm run dev:host` — start local dev servers with frontend bound to `0.0.0.0`
- `npm run build` — build frontend and backend
- `npm run start` — run backend API from `backend/dist`
- `npm run start:server` — run backend and serve `frontend/dist`
- `npm run deploy:migrate` — run Prisma migrations against production DB
- `npm run seed:backend` — reset and reseed local SQLite data
