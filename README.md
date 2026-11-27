# CodRyx Store

CodRyx Store is a React/Vite dashboard with an Express API and MySQL-backed foundation.

## Stack

- Frontend: React, Vite, Framer Motion, Lucide
- Backend: Node.js, Express
- Database: MySQL
- Authentication: bcrypt password hashing and opaque server-side sessions stored as token hashes in MySQL

## Local development

Requirements: Node.js 20+ and MySQL 8+.

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a MySQL database.
3. Copy `.env.example` to `.env` in the repository root and configure the database connection.
4. Apply `database/schema.sql` to the database.
5. Run the frontend:
   ```bash
   npm run dev
   ```
6. In another terminal, run the API:
   ```bash
   npm run dev:server
   ```

## Production

- Build the frontend: `npm run build`
- Start the combined API and static frontend server: `npm start`
- Configure Railway to build from the repository root and start with `npm start`.
- Add the MySQL connection variables in Railway's Variables tab.
- Apply `database/schema.sql` to the Railway MySQL database before enabling registration.

## Initial API endpoints

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

New registrations are always assigned the `CUSTOMER` role. Elevated roles must not be granted through public registration.

## Current implementation scope

The backend foundation and database schema are in place. The existing dashboard still contains preview data and is not yet wired to these APIs. Product catalog management, real orders, Paymob checkout/webhook verification, refunds, bot provisioning, and admin workflows are future implementation steps.

## Paymob safety

Card details must remain on Paymob-hosted checkout. The backend must verify signed provider notifications and match order ID, amount, currency, and merchant before marking an order paid or provisioning a service. Never commit real credentials or place them in frontend code.
