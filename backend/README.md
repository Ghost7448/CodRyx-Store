# CodRyx Store Backend

This service hosts the API and serves the Vite frontend build from the repository root `dist/` directory.

## Local setup

1. Install dependencies from the repository root: `npm install`.
2. Copy `backend/.env.example` to `backend/.env` and fill in local MySQL settings.
3. Create the database, then run `backend/database/schema.sql` and `backend/database/production-upgrade.sql` against it.
4. Run `npm run dev:server` for the API or `npm run dev` for the frontend.
5. Set a strong `OWNER_SETUP_SECRET` in the server environment, then make one authenticated bootstrap request to `/api/auth/bootstrap-owner` with `setupSecret`, `email`, `displayName`, and a password of at least 12 characters. Remove `OWNER_SETUP_SECRET` from the environment immediately after the first owner is created.

## API

- `GET /api/health` — service and database health.
- `POST /api/auth/register` — create a customer account.
- `POST /api/auth/login` — sign in.
- `POST /api/auth/logout` — revoke the current session.
- `GET /api/auth/me` — current signed-in user.
- `POST /api/auth/bootstrap-owner` — one-time first-owner initialization. Requires `OWNER_SETUP_SECRET` (32+ characters), and refuses to run after an ADMIN/SUPER_ADMIN exists.
- `GET /api/products`, `POST /api/admin/products` — database-backed catalog.
- `GET /api/bots`, `POST /api/bots` — customer bot records; creation requires an active subscription.
- `GET /api/orders`, `POST /api/orders` — persistent orders with server-calculated price.
- `GET /api/admin/overview` — database-backed owner metrics.

Public registration always creates CUSTOMER accounts. Never assign an elevated role through public registration.

## Deployment

Build the frontend with `npm run build`, then start the service with `npm start`. Configure the Railway service to use the repository root and provide database variables in Railway's variable manager. Apply the SQL schema to the Railway MySQL database before enabling account registration.

The catalog, account authentication, customer bot records, order persistence, and basic admin endpoints are now connected to MySQL. Bot runtime provisioning, full support/analytics/admin workflows, and Paymob Test checkout + signed webhook verification are still pending. Paymob must remain in Test mode until the complete flow is verified.
