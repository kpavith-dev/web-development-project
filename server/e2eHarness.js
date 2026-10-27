import dotenv from 'dotenv';
import mongoose from 'mongoose';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createApp } from './app.js';
import { initializeSocket } from './socket.js';
import {
  parseMongoTarget,
  assertSafeTestUri,
  assertSafeTestConnection,
  isTestDatabaseName,
  normalizeMongoHost
} from './test/testDbGuard.js';

export const REQUIRED_E2E_DB_NAME = 'smart-campus-parking-test';
export const REQUIRED_E2E_PORT = 27018;
export const FORBIDDEN_DEV_PORT = 27017;
export const REQUIRED_E2E_HOST = '127.0.0.1';

/**
 * Sanitizes an error message or log string by stripping embedded credentials.
 *
 * @param {string} message
 * @returns {string}
 */
export function sanitizeMessage(message) {
  if (!message || typeof message !== 'string') return '';
  return message.replace(/([a-zA-Z0-9+.-]+:\/\/)[^@/\s]+@/g, '$1***:***@');
}

/**
 * Validates environment configuration and URI target strictly for the E2E test harness.
 * Fails closed if any condition is not satisfied.
 *
 * @param {object} [options]
 * @param {string} [options.nodeEnv]
 * @param {string} [options.testUri]
 * @param {string} [options.appUri]
 * @returns {{ uri: string, dbName: string, hosts: string[], port: number }}
 */
export function validateE2EEnvironment(options = {}) {
  const nodeEnv = 'nodeEnv' in options ? options.nodeEnv : process.env.NODE_ENV;
  const testUri = 'testUri' in options ? options.testUri : process.env.MONGO_TEST_URI;
  const appUri = 'appUri' in options ? options.appUri : process.env.MONGO_URI;
  // 1. Refuse to start unless NODE_ENV === 'test'
  if (!nodeEnv || typeof nodeEnv !== 'string' || nodeEnv.trim() !== 'test') {
    throw new Error(
      `Refusing to start E2E test harness: NODE_ENV must be set to "test" (received: "${nodeEnv || ''}").`
    );
  }

  // 2. Require MONGO_TEST_URI; never silently fall back to MONGO_URI
  if (!testUri || typeof testUri !== 'string' || !testUri.trim()) {
    throw new Error(
      'Refusing to start E2E test harness: MONGO_TEST_URI is missing or empty. Silent fallback to MONGO_URI is strictly prohibited.'
    );
  }

  const trimmedUri = testUri.trim();

  // 3. Parse target strictly
  const parsed = parseMongoTarget(trimmedUri, { isTestUri: true, uriName: 'MONGO_TEST_URI' });

  // Protocol must be mongodb: (not mongodb+srv:, as E2E must connect locally to isolated loopback)
  if (parsed.protocol !== 'mongodb:') {
    throw new Error(
      `Refusing to start E2E test harness: Protocol must be "mongodb:" (received "${parsed.protocol}"). Remote SRV connections are not permitted for isolated local E2E tests.`
    );
  }

  // 4. Validate database name: must be strictly 'smart-campus-parking-test'
  if (!parsed.dbName) {
    throw new Error(
      `Refusing to start E2E test harness: MONGO_TEST_URI does not specify a database name. Expected "${REQUIRED_E2E_DB_NAME}".`
    );
  }

  if (!isTestDatabaseName(parsed.dbName)) {
    throw new Error(
      `Refusing to start E2E test harness: Unsafe database name "${parsed.dbName}". Database name must end in "-test" or "-testing" and be "${REQUIRED_E2E_DB_NAME}".`
    );
  }

  if (parsed.dbName !== REQUIRED_E2E_DB_NAME) {
    throw new Error(
      `Refusing to start E2E test harness: Database name "${parsed.dbName}" is not allowed. The dedicated E2E test harness must connect only to "${REQUIRED_E2E_DB_NAME}".`
    );
  }

  // 5. Validate hosts and ports: port 27017 is strictly rejected
  if (!parsed.normalizedHosts || parsed.normalizedHosts.length === 0) {
    throw new Error('Refusing to start E2E test harness: No valid host found in MONGO_TEST_URI.');
  }

  for (const hostStr of parsed.normalizedHosts) {
    const [h, pStr] = hostStr.split(':');
    const port = pStr ? parseInt(pStr, 10) : 27017;

    if (port === FORBIDDEN_DEV_PORT) {
      throw new Error(
        `Refusing to start E2E test harness: Port 27017 is rejected. The E2E test harness must never connect to development database port 27017. Isolated port ${REQUIRED_E2E_PORT} is required.`
      );
    }

    if (port !== REQUIRED_E2E_PORT) {
      throw new Error(
        `Refusing to start E2E test harness: Port ${port} is not allowed. The E2E test harness must connect strictly through port ${REQUIRED_E2E_PORT}.`
      );
    }

    if (h !== REQUIRED_E2E_HOST) {
      throw new Error(
        `Refusing to start E2E test harness: Host "${h}" is not allowed. The E2E test harness must connect strictly to 127.0.0.1 (loopback).`
      );
    }
  }

  // 6. Leverage assertSafeTestUri to verify safety and prevent collision against MONGO_URI
  const prevMongoUri = process.env.MONGO_URI;
  try {
    if (appUri !== undefined) {
      process.env.MONGO_URI = appUri;
    }
    assertSafeTestUri(trimmedUri, { dbName: REQUIRED_E2E_DB_NAME });
  } finally {
    if (prevMongoUri !== undefined) {
      process.env.MONGO_URI = prevMongoUri;
    } else {
      delete process.env.MONGO_URI;
    }
  }

  return {
    uri: trimmedUri,
    dbName: parsed.dbName,
    hosts: parsed.normalizedHosts,
    port: REQUIRED_E2E_PORT
  };
}

/**
 * Verifies that the connected Mongoose instance satisfies all E2E isolation constraints.
 * Fails closed if the database name, host, port, or connection options do not match requirements.
 *
 * @param {import('mongoose').Connection} connection
 * @param {object} [expectedTarget]
 * @returns {string} The verified database name
 */
export function assertSafeE2EConnection(connection, expectedTarget = {}) {
  // 1. Existing database guard check (verifies readyState === 1 and test db naming pattern)
  const driverDbName = assertSafeTestConnection(connection);

  // 2. Strict database name check
  const expectedDb = expectedTarget.dbName || REQUIRED_E2E_DB_NAME;
  if (driverDbName !== expectedDb) {
    throw new Error(
      `Post-connection verification failed: Connected to database "${driverDbName}", but expected "${expectedDb}".`
    );
  }

  // 3. Strict host and port verification
  const connectedHost = connection.host;
  const connectedPort = connection.port;

  if (connectedPort === FORBIDDEN_DEV_PORT) {
    throw new Error(
      'Post-connection verification failed: Connected to port 27017. Refusing to operate on default/development MongoDB port.'
    );
  }

  if (connectedPort !== undefined && connectedPort !== null && connectedPort !== REQUIRED_E2E_PORT) {
    throw new Error(
      `Post-connection verification failed: Connected to port ${connectedPort}. Expected port ${REQUIRED_E2E_PORT}.`
    );
  }

  if (connectedHost) {
    const normalized = normalizeMongoHost(connectedHost, connectedPort || REQUIRED_E2E_PORT);
    if (normalized !== `${REQUIRED_E2E_HOST}:${REQUIRED_E2E_PORT}`) {
      throw new Error(
        `Post-connection verification failed: Connected to unsafe host/port "${connectedHost}:${connectedPort}". Expected "${REQUIRED_E2E_HOST}:${REQUIRED_E2E_PORT}".`
      );
    }
  }

  // 4. Verify client options if available
  if (connection.client?.options) {
    const clientOpts = connection.client.options;
    if (clientOpts.hosts) {
      for (const h of clientOpts.hosts) {
        const hostPortStr = typeof h === 'string' ? h : `${h.host}:${h.port}`;
        if (hostPortStr.includes(`:${FORBIDDEN_DEV_PORT}`)) {
          throw new Error(
            `Post-connection verification failed: Client connection options include port 27017 (${hostPortStr}).`
          );
        }
      }
    }
  }

  return driverDbName;
}

/**
 * Starts the dedicated E2E backend server without background lifecycle workers.
 * Fails closed if any environment, URI, or connection safety check fails.
 *
 * @param {object} [options]
 * @returns {Promise<{ server: import('http').Server, httpServer: import('http').Server, app: import('express').Express, connection: import('mongoose').Connection, port: number, host: string, close: () => Promise<void> }>}
 */
export async function startE2EServer(options = {}) {
  // Step A: Validate environment and URI before connecting
  const envValidation = validateE2EEnvironment({
    ...('nodeEnv' in options ? { nodeEnv: options.nodeEnv } : {}),
    ...('testUri' in options ? { testUri: options.testUri } : {}),
    ...('appUri' in options ? { appUri: options.appUri } : {})
  });

  // Ensure JWT_SECRET is set for authentication routes during test
  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = 'test-e2e-jwt-secret-minimum-32-chars-length!!';
  }

  const mongooseInstance = options.mongoose || mongoose;
  mongooseInstance.set('strictQuery', false);

  let connection;

  // Step B: Connect to isolated test database
  try {
    await mongooseInstance.connect(envValidation.uri, {
      serverSelectionTimeoutMS: options.serverSelectionTimeoutMS ?? 5000,
      ...options.connectOptions
    });
    connection = mongooseInstance.connection;
  } catch (err) {
    try {
      await mongooseInstance.disconnect();
    } catch (_) {}
    throw new Error(`Database connection failed: ${sanitizeMessage(err.message)}`);
  }

  // Step C: Verify actual connected database and connection options
  try {
    assertSafeE2EConnection(connection, envValidation);
  } catch (err) {
    // Fail-closed: disconnect immediately and do NOT open HTTP listener
    try {
      await mongooseInstance.disconnect();
    } catch (_) {}
    throw err;
  }

  // Step D: Create Express App and HTTP Server
  // Note: Background workers (processReservationLifecycle, setInterval) are intentionally NOT started.
  const app = options.app || createApp();
  const httpServer = options.httpServer || http.createServer(app);

  if (options.initializeSocket !== false) {
    const initSocket = options.initializeSocketFn || initializeSocket;
    initSocket(httpServer);
  }

  const port = options.port ?? (parseInt(process.env.PORT, 10) || 5000);
  const host = options.host ?? '127.0.0.1';

  // Step E: Open HTTP listener only after all validations succeed
  let serverInstance;
  try {
    serverInstance = await new Promise((resolve, reject) => {
      httpServer.once('error', reject);
      httpServer.listen(port, host, () => {
        resolve(httpServer);
      });
    });
  } catch (err) {
    try {
      await mongooseInstance.disconnect();
    } catch (_) {}
    throw err;
  }

  // Safe logging: never print credentials or complete URI
  const loggerFn = options.logger || console.log;
  loggerFn(`[E2E Harness] Backend listening safely on http://${host}:${port}`);
  loggerFn(`[E2E Harness] Connected to isolated test DB: ${envValidation.dbName} on 127.0.0.1:${envValidation.port}`);

  return {
    server: serverInstance,
    httpServer,
    app,
    connection,
    port,
    host,
    close: async () => {
      await new Promise((resolve) => serverInstance.close(resolve));
      await mongooseInstance.disconnect();
    }
  };
}

const isMainModule = () => {
  if (!process.argv[1]) return false;
  try {
    return fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
  } catch {
    return false;
  }
};

if (isMainModule()) {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const serverTestEnv = path.join(currentDir, '.env.test');
  const rootTestEnv = path.join(currentDir, '..', '.env.test');

  if (fs.existsSync(serverTestEnv)) {
    dotenv.config({ path: serverTestEnv });
  } else if (fs.existsSync(rootTestEnv)) {
    dotenv.config({ path: rootTestEnv });
  }

  startE2EServer()
    .then(({ server, close }) => {
      const handleShutdown = async (signal) => {
        console.log(`[E2E Harness] Received ${signal}. Shutting down cleanly...`);
        try {
          await close();
        } catch (_) {}
        process.exit(0);
      };
      process.once('SIGINT', () => handleShutdown('SIGINT'));
      process.once('SIGTERM', () => handleShutdown('SIGTERM'));
    })
    .catch((err) => {
      console.error(`[E2E Harness Fatal Error] ${sanitizeMessage(err.message)}`);
      process.exit(1);
    });
}
