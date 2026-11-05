# Pennywise Expense Tracker

A responsive personal finance dashboard built with Next.js, TypeScript, Prisma, and SQLite.

## Run locally

1. Install Node.js 20.9 or newer.
2. Copy `.env.example` to `.env` and set `JWT_SECRET` to a random secret of at least 32 characters.
3. Install dependencies and initialize the local database:

   ```sh
   npm install
   npm run db:push
   ```

4. Start the app with `npm run dev`, then open http://localhost:3000.

## Features

- Email/password sign-up and sign-in with bcrypt-hashed passwords and an HTTP-only, signed JWT session cookie.
- User-scoped transaction create, list, update, and delete APIs.
- Income/expense totals, daily income/expense trends for the last 30 days, category breakdown, date/category/type filters, text search, and CSV export.
- Per-account display currency selection from 160+ ISO currency codes. Changing the display currency does not perform exchange-rate conversion.
- Prisma schema supports SQLite for local use and can be adapted to a hosted relational database.

Set `DATABASE_URL` in `.env` to configure the database connection.
