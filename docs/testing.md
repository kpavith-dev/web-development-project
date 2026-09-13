# Testing Guide

## Test stack

Backend integration tests use Vitest and Supertest. They run against an explicitly configured MongoDB test database, never the development or production database.

## Configuration

Set these values before running backend tests:

```sh
NODE_ENV=test
JWT_SECRET=a-test-only-secret-with-at-least-thirty-two-characters
MONGO_TEST_URI=mongodb://127.0.0.1:27017/smart-campus-parking-test
```

The test suite refuses to run database tests unless `MONGO_TEST_URI` has a database name containing `test` or `testing`. The database is cleared between tests. Use a MongoDB replica set for transaction-dependent reservation concurrency and security check-in/out tests; standalone MongoDB rejects transactions by design.

## Commands

```sh
cd server
npm test
npm run test:run
npm run test:coverage

cd ../client
npm run build
```

Current integration coverage includes authentication/JWT rejection, direct role authorization, vehicle verification field injection and review, area/slot validation, and signed-QR input rejection. The client production build is the frontend smoke check; route guards remain server-authorized by the API tests.

## External services

No SMTP credentials are required for the current suite. Password-reset delivery tests should mock `services/email.js`; do not send mail to real accounts. Never point `MONGO_TEST_URI` at Atlas production or a shared development database.
