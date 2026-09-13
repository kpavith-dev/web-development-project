# Deployment Guide

## Architecture

The supplied Compose configuration is a combined deployment: Express serves the built React application, API, uploads, and Socket.IO on one public port. MongoDB is only reachable on the internal Docker network.

```text
Browser --> HTTPS/reverse proxy --> Express + React (app:5000) --> MongoDB (mongodb:27017)
   |                                      |
   +-------------- Socket.IO -------------+
```

A reverse proxy is optional but recommended for public HTTPS. It must proxy `/socket.io/` with WebSocket upgrade headers as well as normal HTTP requests.

## Prerequisites

- Docker Engine with Docker Compose v2 for the bundled deployment.
- A public HTTPS reverse proxy or load balancer for internet-facing production.
- Long, random MongoDB and JWT secrets.

## Environment variables

Copy `.env.example` to `.env`; do not commit it. Replace every placeholder.

| Variable | Purpose |
| --- | --- |
| `NODE_ENV` | Set to `production` by Compose. |
| `PORT` | Express port; Compose uses `5000`. |
| `MONGO_URI` | Backend MongoDB URI. Compose builds this from the Mongo root credentials. |
| `MONGO_ROOT_USERNAME`, `MONGO_ROOT_PASSWORD` | Credentials used only by the Compose MongoDB service. |
| `JWT_SECRET` | Required signing secret; use 32+ random characters. |
| `CLIENT_URL` | Required production browser origin, for example `https://parking.example.edu`; no trailing slash. It is the CORS and password-reset origin. |
| `VITE_API_URL` | Compiled frontend API URL. Use `/api` for this combined deployment. Use the public API origin plus `/api` when frontend and API are split. |
| `VITE_SOCKET_URL` | Compiled Socket.IO origin. Leave empty for same-origin Compose hosting; use the public API origin for split hosting. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Optional password-reset email delivery settings. |
| `TZ` | Compose and the image use `Asia/Colombo` for container jobs and logs. |

Vite variables are build-time values. Rebuild the image after changing either `VITE_API_URL` or `VITE_SOCKET_URL`.

## Local development

1. Copy `server/.env.example` to `server/.env` and set `MONGO_URI` and `JWT_SECRET`.
2. Run `npm install` in `server` and `client`.
3. Start `npm run dev` in each directory.

The Vite proxy forwards `/api` to the local backend. Socket.IO defaults to `http://localhost:5000` only in development.

## Docker production startup

1. Copy `.env.example` to `.env`, set strong secrets, and set `CLIENT_URL` to the public browser URL.
2. Build and start the stack:

   ```sh
   docker compose up --build -d
   ```

3. Browse the configured public origin (or `http://localhost:5000` before adding a reverse proxy).
4. Check `http://localhost:5000/api/health`.

Compose waits for MongoDB's authenticated `mongosh` ping healthcheck before it starts the app. The `app_uploads` named volume preserves existing `/uploads` files across app container replacement. MongoDB is intentionally not published to the host.

## Production build and split hosting

The frontend build is produced by:

```sh
cd client && npm run build
```

It creates `client/dist`. For Vercel, Netlify, or another static frontend host, build with `VITE_API_URL=https://api.example.edu/api` and `VITE_SOCKET_URL=https://api.example.edu`. Deploy the backend separately with `CLIENT_URL=https://frontend.example.edu`, the same `MONGO_URI`, and a strong `JWT_SECRET`. Configure the frontend host to return `index.html` for React Router routes; the combined Express container already does this.

## CORS and Socket.IO

`CLIENT_URL` is the only browser origin accepted in production by both Express CORS and Socket.IO CORS. Do not use `*` with authenticated APIs. For combined same-origin hosting, set it to the public application origin. A reverse proxy must forward WebSocket upgrades for `/socket.io/`.

## Health check and troubleshooting

- `GET /api/health` returns service status without connection details or secrets.
- Check startup logs with `docker compose logs -f app mongodb`.
- If the app does not start, confirm the required `.env` values exist and MongoDB becomes healthy.
- If API calls or sockets fail in a split deployment, verify the built `VITE_API_URL`/`VITE_SOCKET_URL` and backend `CLIENT_URL` match the actual HTTPS origins exactly.
- If uploaded vehicle images do not load, verify requests use the API origin's `/uploads/...` path and that the `app_uploads` volume is present.

## Production security basics

Use HTTPS, keep `.env` outside source control, use a strong unique JWT secret, restrict MongoDB network access, and set `CLIENT_URL` to the exact public frontend origin. Do not expose MongoDB's port unless an administrator has a separate, restricted access path.
