# CodRyx Store Backend

This service hosts the API and serves the Vite frontend build from the repository root `dist/` directory.

## Local setup

1. Install dependencies from the repository root: `npm install`.
2. Copy `backend/.env.example` to `backend/.env` and fill in local MySQL settings.
3. Create the database, then run `backend/database/schema.sql` against it.
4. Run `npm run dev:server` for the API or `npm run dev` for the frontend.

## API

- `GET /api/health` — service and database health.
- `POST /api/auth/register` — create a customer account.
- `POST /api/auth/login` — sign in.
- `POST /api/auth/logout` — revoke the current session.
- `GET /api/auth/me` — current signed-in user.

Registration always assigns the CUSTOMER role. Elevated roles must be assigned by a trusted operator directly in the database until the protected admin workflow is implemented.

## Deployment

Build the frontend with `npm run build`, then start the service with `npm start`. Configure the Railway service to use the repository root and provide database variables in Railway's variable manager. Apply the SQL schema to the Railway MySQL database before enabling account registration.

The current release is a foundation only: product catalog, orders, Paymob callbacks, refunds, bot provisioning, and admin workflows are not yet connected.
