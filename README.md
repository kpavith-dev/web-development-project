# Smart Campus Parking Slot Reservation System

A production-ready full-stack web application for reserving university parking slots, managing parking areas, and supporting security and admin workflows.

## Features
- Role-based authentication for student, lecturer, staff, security officer, and administrator
- Parking area and slot management
- Reservation creation, editing, cancelation, and history
- QR code-based verification for security checks
- Admin dashboard and reports
- Responsive modern UI with light/dark design

## Tech Stack
- Frontend: React, Vite, Tailwind CSS, React Router, Axios, Chart.js, React Toastify
- Backend: Node.js, Express.js, MongoDB, Mongoose, JWT, bcrypt, QRCode

## Folder Structure
- client/ - React frontend
- server/ - Express backend

## Run Locally
1. Install backend dependencies: `cd server && npm install`
2. Install frontend dependencies: `cd client && npm install`
3. Start MongoDB locally or update MONGO_URI in server/.env
4. Seed data: `cd server && node seed.js`
5. Start backend: `cd server && npm run dev`
6. Start frontend: `cd client && npm run dev`

## API Base URL
- http://localhost:5000/api

## Documentation
- API documentation is implemented through route structure and controller logic.
- ER diagram, use case, and sequence diagrams are described in docs/architecture.md.
