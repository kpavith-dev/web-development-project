# API Documentation

## Authentication
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
- POST /api/auth/forgot-password
- POST /api/auth/reset-password

## Users
- GET /api/users/profile
- PUT /api/users/profile

## Parking Areas
- GET /api/areas
- POST /api/areas
- PUT /api/areas/:id
- DELETE /api/areas/:id

## Parking Slots
- GET /api/slots
- GET /api/slots/:id
- POST /api/slots
- PUT /api/slots/:id
- DELETE /api/slots/:id

## Reservations
- POST /api/reservations
- GET /api/reservations
- PUT /api/reservations/:id
- DELETE /api/reservations/:id

## Security
- POST /api/security/check-in
- POST /api/security/check-out

## Dashboard
- GET /api/dashboard
