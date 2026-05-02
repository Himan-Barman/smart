# Backend Notes

## DB Initialization

The backend ships with:

- `prisma/schema.prisma` (source model)
- `prisma/init.sql` (SQL snapshot generated from schema)
- `prisma/migrations/0001_init/migration.sql` (migration snapshot)

Use this command to reset and reseed the local DB:

```bash
npm run db:reset
```

This is what root `npm run seed:backend` calls.

## Demo Accounts

The seed creates direct login accounts for local role testing:

- Admin: `admin@university.edu` / `admin123`
- Teacher: `rajesh.k@university.edu` / `teacher123`
- Student: `rahul@university.edu` / `student123`

## API Modules

- `auth`
- `users`
- `profile`
- `notices`
- `feedback`
- `skills`
- `internships`
- `rooms`
- `bookings`
- `grievances`
- `attendance`
- `schedule`
- `departments`
- `notifications`
- `calendar`
- `app` (bootstrap aggregate endpoint)
