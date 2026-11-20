# Codryx Store — Frontend Preview

Frontend-only interactive prototype for the Codryx Discord bot hosting platform.

## Requirements
- Node.js 20 or newer

## Run locally
From the repository root:

```bash
npm install
npm run dev
```

Vite serves the app at `http://localhost:5173` by default.

## Build

```bash
npm run build
npm run preview
```

## Included screens
- Overview dashboard
- My Bots and instance controls (demo state)
- Bot Store
- Live visual Bot Customizer preview
- User Management
- Orders & Plans
- Analytics
- Support Center
- Infrastructure and Database Center
- Activity Logs and Settings
- Super Admin Center, Products Management, and Security Center

## Demo behavior
- Client-side navigation (SPA), without full-page reloads
- Framer Motion page transitions and CSS micro-interactions
- Search, status filters, bot toggles, customizer preview, theme switch, and role preview
- Sample data only; changes reset when the page reloads
- Role selector is a visual demo; production permissions must be enforced by the backend

## Project layout
- `package.json` — root-level scripts and dependencies
- `frontend/` — Vite app source and HTML entry point
