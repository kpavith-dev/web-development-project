# Testing Guide

## Test stack

Backend integration tests use Vitest and Supertest. They run against an explicitly configured MongoDB test database, never the development or production database.

## Configuration

Create `server/.env.test` from the safe template `server/.env.test.example`:

```sh
# Copy safe test template
cp server/.env.test.example server/.env.test
```

Configure these values in `server/.env.test` before running backend or E2E tests:

```sh
NODE_ENV=test
PORT=5000
JWT_SECRET=a-test-only-secret-with-at-least-thirty-two-characters
MONGO_TEST_URI=mongodb://campus_test_admin:campus_test_password@127.0.0.1:27018/smart-campus-parking-test?authSource=admin&directConnection=true
CLIENT_URL=http://localhost:5173
```

The test suite enforces a strict database guard (`server/test/testDbGuard.js`) that refuses to run unless:
1. `MONGO_TEST_URI` is explicitly configured.
2. The database name ends with `-test` or `-testing`.
3. `MONGO_TEST_URI` does not match or collide with `MONGO_URI`.
4. The live driver connection is verified to match the safe test database name.

### Starting the Isolated Test Database (Docker)

To isolate test data from development and production environments, use the dedicated test Compose configuration:

```sh
# Start the dedicated test MongoDB replica set
docker compose -f docker-compose.test.yml up -d
```

The test container (`campus-parking-test-db`) runs on `127.0.0.1:27018` (avoiding port 27017 used by development instances), uses dedicated named volumes (`mongodb_test_data` for database files and `mongodb_test_config` for cluster internal keyfile storage), and automatically initializes the single-node replica set (`rs0`) required for multi-document transaction tests.

### Verifying Test Database Health and Replica Set Status

```sh
# 1. Check container health status (wait until status is "(healthy)")
docker compose -f docker-compose.test.yml ps

# 2. Inspect container logs
docker compose -f docker-compose.test.yml logs mongodb-test

# 3. Verify authenticated access and that rs0 elected a PRIMARY
docker compose -f docker-compose.test.yml exec -T mongodb-test mongosh --port 27018 -u campus_test_admin -p campus_test_password --authenticationDatabase admin --quiet --eval "rs.status().members[0].stateStr"
```

### Running Tests in PowerShell

PowerShell does not automatically inherit environment variables from `.env` or support inline `VAR=value` POSIX syntax. Set the environment variable before invoking npm:

```powershell
$env:MONGO_TEST_URI = "mongodb://campus_test_admin:campus_test_password@127.0.0.1:27018/smart-campus-parking-test?authSource=admin&directConnection=true"
cd server
npm test
```

### Running Tests in Bash / POSIX Shells

```sh
MONGO_TEST_URI="mongodb://campus_test_admin:campus_test_password@127.0.0.1:27018/smart-campus-parking-test?authSource=admin&directConnection=true" npm test --prefix server
```

### Stopping and Cleaning Up the Test Database

```sh
# Stop the test container while preserving test data and volumes:
docker compose -f docker-compose.test.yml down

# Or stop without removing the container:
docker compose -f docker-compose.test.yml stop
```

> **WARNING:** Deleting volumes destroys test data.
> Running `docker compose -f docker-compose.test.yml down -v` permanently deletes the dedicated test volumes (`mongodb_test_data` and `mongodb_test_config`), wiping all test database collections, users, and the generated replica set keyfile. Use this only when a complete, clean reset of test state is required.


## Commands

```sh
# 1. Backend unit and integration tests
cd server
npm test
npm run test:run
npm run test:coverage

# 2. Frontend production build
cd ../client
npm run build

# 3. Isolated browser Playwright E2E suite
# Starts backend via e2eHarness strictly against 127.0.0.1:27018 smart-campus-parking-test
cd ../client
npm run test:e2e
```

Current integration coverage includes authentication/JWT rejection, direct role authorization, vehicle verification field injection and review, area/slot validation, and signed-QR input rejection. Colombo date-helper unit tests run without MongoDB. Feedback, notification, report, reservation lifecycle, security action, concurrency, and password-reset integration cases require `MONGO_TEST_URI`; transaction cases also require a replica set. Skipped tests are not passed tests.

## External services

No SMTP credentials are required for the current suite. Password-reset delivery tests should mock `services/email.js`; do not send mail to real accounts. Never point `MONGO_TEST_URI` at Atlas production or a shared development database.
