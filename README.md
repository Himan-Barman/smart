# Smart Campus

A full-stack university management platform with a React + TypeScript frontend and an Express + Prisma backend.

## Tech Stack

- Frontend: React, TypeScript, Vite
- Backend: Express, TypeScript, Prisma Client, JWT auth, Zod validation
- Database: SQLite for local/demo data

## Local Development

Install dependencies:

```bash
npm run install:all
```

Reset and seed the local database:

```bash
npm run seed:backend
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

For a deployed server, set backend environment values in `backend/.env` or your host dashboard:

```env
NODE_ENV=production
PORT=4000
HOST=0.0.0.0
DATABASE_URL="file:./dev.db"
JWT_SECRET="replace-with-a-long-random-secret"
CORS_ORIGIN="https://your-domain.com"
SERVE_FRONTEND=true
FRONTEND_DIST_PATH="../frontend/dist"
TRUST_PROXY=true
```

If the frontend is hosted separately, set `VITE_API_BASE_URL` before building the frontend:

```env
VITE_API_BASE_URL="https://api.your-domain.com/api/v1"
```

## Demo Logins

Seeded local credentials:

- Admin: `admin@university.edu` / `admin123`
- Teacher: `rajesh.k@university.edu` / `teacher123`
- Student: `rahul@university.edu` / `student123`

The login page shows role demo buttons in development. For a production demo build, set:

```env
VITE_SHOW_DEMO_LOGINS=true
```

## Useful Scripts

- `npm run dev` - start Vite and backend API locally
- `npm run dev:host` - start local dev servers with frontend bound to `0.0.0.0`
- `npm run build` - build frontend and backend
- `npm run start` - run backend API from `backend/dist`
- `npm run start:server` - run backend and serve `frontend/dist`
- `npm run seed:backend` - reset and reseed local SQLite data
