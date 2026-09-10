# Smart Campus Parking Management System

A React, Express, and MongoDB application for campus parking reservations, real-time availability, security verification, and administration.

## Features

- JWT authentication with role-based server authorization for students, lecturers, staff, security officers, and administrators
- Vehicle registration, vehicle-type-aware slot availability, and verified/active vehicle checks
- Reservation creation, time-overlap prevention, operating-hours validation, QR passes, cancellation, and lifecycle handling
- Security check-in/check-out using a reservation reference or signed QR pass, with security logs
- Parking area and slot administration, maintenance states, deletion safeguards, notifications, Socket.IO updates, and live reports
- Admin user management with search, filters, pagination, role changes, activation controls, and user detail history

## Prerequisites

- Node.js 18 or newer
- MongoDB 6+ locally, MongoDB Atlas, or Docker Compose

## Setup

1. Create `server/.env` from `server/.env.example`.
2. Set `MONGO_URI` and a long, unique `JWT_SECRET` (32+ characters for production).
3. Install dependencies:

   ```powershell
   cd server; npm install
   cd ../client; npm install
   ```

4. Seed demo data (this clears the user, area, and slot collections):

   ```powershell
   cd server
   node seed.js
   ```

5. Run the backend and frontend in separate terminals:

   ```powershell
   cd server; npm run dev
   cd client; npm run dev
   ```

Open `http://localhost:5173`. The API health check is `http://localhost:5000/api/health`.

On Windows systems that block `npm.ps1`, use `npm.cmd` in place of `npm`.

## Demo accounts

After seeding:

- `admin@campus.com` / `Admin123!`
- `security@campus.com` / `Admin123!`

Register student or staff accounts from the UI. Lecturer and privileged accounts are provisioned by an administrator.

## Roles

- **Student, Lecturer, Staff:** profile, vehicles, reservations, QR pass
- **Security:** verification, check-in, check-out, today’s reservations
- **Admin:** all parking administration, reports, security view, and user management

## Reservation lifecycle

`pending → checked-in → checked-out`

Reservations may also become `cancelled` or `no-show` after the arrival grace period. The server validates date, time, area opening hours, active/maintenance state, slot and user overlap, and optional vehicle compatibility.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `PORT` | No | API port; defaults to `5000` |
| `MONGO_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Secret used for access tokens and signed QR passes |
| `CLIENT_URL` | No | Allowed frontend origin; defaults to `http://localhost:5173` |
| `NODE_ENV` | No | Runtime environment |

## Validation

Run a frontend production build:

```powershell
cd client; npm run build
```

The project currently has no automated integration-test runner. Database-backed flows require a reachable MongoDB instance; when it is unavailable the API reports a `503` for database routes while the health endpoint remains available.
