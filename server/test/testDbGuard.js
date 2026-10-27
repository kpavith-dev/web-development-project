import mongoose from 'mongoose';

export const TEST_DB_NAME_PATTERN = /-(?:test|testing)$/i;

/**
 * Normalizes host representation:
 * - Lowercases host and strips brackets from IPv6 loopback
 * - Maps localhost, 127.0.0.1, and ::1 to 127.0.0.1
 * - Normalizes default port (27017 for standard mongodb)
 *
 * @param {string} host
 * @param {number|null} port
 * @returns {string} normalized host:port string
 */
export function normalizeMongoHost(host, port) {
  let normHost = (host || '').trim().toLowerCase();
  if (normHost.startsWith('[') && normHost.endsWith(']')) {
    normHost = normHost.slice(1, -1);
  }
  if (normHost === 'localhost' || normHost === '127.0.0.1' || normHost === '::1') {
    normHost = '127.0.0.1';
  }
  const normPort = port !== null && port !== undefined ? port : 27017;
  return `${normHost}:${normPort}`;
}

/**
 * Parses a MongoDB URI into structured target information.
 *
 * @param {string} uri
 * @param {object} [options]
 * @param {boolean} [options.isTestUri=false]
 * @param {string} [options.uriName='MONGO_TEST_URI']
 * @returns {{ protocol: string, normalizedHosts: string[], srvHost: string|null, dbName: string, rawPath: string }}
 */
export function parseMongoTarget(uri, { isTestUri = false, uriName = 'MONGO_TEST_URI' } = {}) {
  if (!uri || typeof uri !== 'string' || !uri.trim()) {
    throw new Error(`${uriName} is missing or empty. ${isTestUri ? 'An explicit dedicated test database URI is required.' : 'A valid connection URI is required.'}`);
  }

  const trimmed = uri.trim();

  // Validate percent-encoding across the entire URI string
  try {
    decodeURI(trimmed);
  } catch (err) {
    if (err instanceof URIError) {
      throw new Error(`Invalid ${uriName}: malformed percent-encoding (${err.message}).`);
    }
    throw err;
  }

  const schemeMatch = trimmed.match(/^([a-zA-Z0-9+.-]+):\/\/(.*)$/s);
  if (!schemeMatch) {
    throw new Error(`Invalid ${uriName}: malformed connection string.`);
  }

  const protocol = schemeMatch[1].toLowerCase() + ':';
  if (protocol !== 'mongodb:' && protocol !== 'mongodb+srv:') {
    throw new Error(`Invalid ${uriName} protocol "${protocol}". Must be "mongodb:" or "mongodb+srv:".`);
  }

  const remainder = schemeMatch[2];
  const slashIndex = remainder.indexOf('/');
  const questionIndex = remainder.indexOf('?');
  let splitIndex = -1;
  if (slashIndex !== -1 && questionIndex !== -1) {
    splitIndex = Math.min(slashIndex, questionIndex);
  } else if (slashIndex !== -1) {
    splitIndex = slashIndex;
  } else if (questionIndex !== -1) {
    splitIndex = questionIndex;
  }

  const authority = splitIndex !== -1 ? remainder.slice(0, splitIndex) : remainder;
  const pathAndQuery = splitIndex !== -1 ? remainder.slice(splitIndex) : '';

  const atIndex = authority.lastIndexOf('@');
  const hostSection = atIndex !== -1 ? authority.slice(atIndex + 1) : authority;
  if (!hostSection || !hostSection.trim()) {
    throw new Error(`Invalid ${uriName}: missing host in connection string.`);
  }

  let normalizedHosts = [];
  let srvHost = null;

  if (protocol === 'mongodb+srv:') {
    if (hostSection.includes(',')) {
      throw new Error(`Invalid ${uriName}: mongodb+srv URIs do not support comma-separated multiple hosts.`);
    }
    if (hostSection.includes(':')) {
      throw new Error(`Invalid ${uriName}: mongodb+srv URIs must not include a port number.`);
    }
    srvHost = hostSection.trim().toLowerCase();
    if (!srvHost) {
      throw new Error(`Invalid ${uriName}: missing host in connection string.`);
    }
    normalizedHosts = [srvHost];
  } else {
    const rawHosts = hostSection.split(',');
    for (const raw of rawHosts) {
      const h = raw.trim();
      if (!h) {
        throw new Error(`Invalid ${uriName}: malformed multi-host list with empty host entries.`);
      }

      let hostPart;
      let portStr = null;

      if (h.startsWith('[')) {
        const closeIdx = h.indexOf(']');
        if (closeIdx === -1) {
          throw new Error(`Invalid ${uriName}: malformed IPv6 host syntax.`);
        }
        hostPart = h.slice(1, closeIdx);
        const rem = h.slice(closeIdx + 1);
        if (rem) {
          if (!rem.startsWith(':')) {
            throw new Error(`Invalid ${uriName}: malformed host port separator.`);
          }
          portStr = rem.slice(1);
        }
      } else {
        const parts = h.split(':');
        if (parts.length > 2) {
          throw new Error(`Invalid ${uriName}: malformed host entry "${h}".`);
        }
        hostPart = parts[0];
        if (parts.length === 2) {
          portStr = parts[1];
        }
      }

      if (!hostPart || !hostPart.trim()) {
        throw new Error(`Invalid ${uriName}: empty host name.`);
      }

      let port = 27017;
      if (portStr !== null) {
        if (!/^\d+$/.test(portStr)) {
          throw new Error(`Invalid ${uriName}: invalid port "${portStr}".`);
        }
        port = parseInt(portStr, 10);
        if (port < 1 || port > 65535) {
          throw new Error(`Invalid ${uriName}: port out of range "${portStr}".`);
        }
      }

      normalizedHosts.push(normalizeMongoHost(hostPart, port));
    }
    normalizedHosts = Array.from(new Set(normalizedHosts)).sort();
  }

  let rawPath = '';
  if (pathAndQuery.startsWith('/')) {
    const qIndex = pathAndQuery.indexOf('?');
    rawPath = qIndex !== -1 ? pathAndQuery.slice(0, qIndex) : pathAndQuery;
  }
  const cleanPath = rawPath.replace(/^\/+/, '');
  const rawDbName = cleanPath.split('/')[0] || '';
  let dbName = '';
  try {
    dbName = decodeURIComponent(rawDbName).trim();
  } catch (err) {
    if (err instanceof URIError) {
      throw new Error(`Invalid ${uriName}: malformed percent-encoding (${err.message}).`);
    }
    throw err;
  }

  return {
    protocol,
    normalizedHosts,
    srvHost,
    dbName,
    rawPath
  };
}

/**
 * Checks whether two parsed MongoDB connection targets are equivalent (collision risk).
 *
 * @param {object} target1
 * @param {object} target2
 * @returns {boolean}
 */
export function areMongoTargetsEquivalent(target1, target2) {
  if (!target1 || !target2) {
    return false;
  }

  // If database names differ, they target different databases
  if (!target1.dbName || !target2.dbName || target1.dbName !== target2.dbName) {
    return false;
  }

  // Handle SRV targets: compare hostnames conservatively
  if (target1.protocol === 'mongodb+srv:' && target2.protocol === 'mongodb+srv:') {
    return Boolean(target1.srvHost && target2.srvHost && target1.srvHost === target2.srvHost);
  }

  // Handle standard MongoDB targets: check if they share any normalized host:port
  if (target1.protocol === 'mongodb:' && target2.protocol === 'mongodb:') {
    if (!target1.normalizedHosts?.length || !target2.normalizedHosts?.length) {
      return false;
    }
    return target1.normalizedHosts.some((h) => target2.normalizedHosts.includes(h));
  }

  // Different protocols are not considered equivalent targets
  return false;
}

/**
 * Parses a MongoDB connection URI and extracts the database name strictly from the URI pathname.
 *
 * @param {string} uri - The MongoDB URI to parse
 * @returns {string} The database name extracted from the path
 */
export function parseTestDatabaseName(uri) {
  const target = parseMongoTarget(uri, { isTestUri: true, uriName: 'MONGO_TEST_URI' });
  if (!target.dbName) {
    throw new Error('MONGO_TEST_URI does not specify a database name in the path.');
  }
  return target.dbName;
}

/**
 * Checks whether a database name satisfies the explicit test-only naming convention
 * (must end in -test or -testing).
 *
 * @param {string} dbName
 * @returns {boolean}
 */
export function isTestDatabaseName(dbName) {
  return typeof dbName === 'string' && TEST_DB_NAME_PATTERN.test(dbName.trim());
}

/**
 * Validates that MONGO_TEST_URI is present, well-formed, does not fall back to or match MONGO_URI,
 * and targets a database explicitly ending with -test or -testing.
 *
 * @param {string} uri
 * @param {object} [options={}]
 * @returns {string} The validated database name
 */
export function assertSafeTestUri(uri, options = {}) {
  if (!uri || typeof uri !== 'string' || !uri.trim()) {
    throw new Error('MONGO_TEST_URI is missing or empty. Integration tests require an explicit dedicated test database URI.');
  }

  const testTarget = parseMongoTarget(uri, { isTestUri: true, uriName: 'MONGO_TEST_URI' });

  let effectiveDbName = testTarget.dbName;

  if (options && options.dbName !== undefined) {
    if (typeof options.dbName !== 'string' || !options.dbName.trim()) {
      throw new Error('Invalid dbName option: database name override must be a non-empty string.');
    }
    const overrideName = options.dbName.trim();
    if (!isTestDatabaseName(overrideName)) {
      throw new Error(`Unsafe test database name override "${overrideName}". Integration tests require a dedicated test database name ending in "-test" or "-testing".`);
    }
    effectiveDbName = overrideName;
  }

  if (!effectiveDbName) {
    throw new Error('MONGO_TEST_URI does not specify a database name in the path.');
  }

  if (!isTestDatabaseName(effectiveDbName)) {
    throw new Error(`Unsafe test database name "${effectiveDbName}". Integration tests require a dedicated test database name ending in "-test" or "-testing".`);
  }

  if (process.env.MONGO_URI && process.env.MONGO_URI.trim()) {
    let appTarget;
    try {
      appTarget = parseMongoTarget(process.env.MONGO_URI, { uriName: 'MONGO_URI' });
    } catch (err) {
      throw new Error(`Cannot safely determine equivalence with MONGO_URI: ${err.message}. Refusing to proceed with tests.`);
    }

    const testTargetWithEffectiveDb = { ...testTarget, dbName: effectiveDbName };
    const appTargetWithEffectiveDb = { ...appTarget, dbName: appTarget.dbName || 'test' };

    if (areMongoTargetsEquivalent(testTargetWithEffectiveDb, appTargetWithEffectiveDb)) {
      throw new Error('MONGO_TEST_URI must not match MONGO_URI. Fallback or reuse of application database is prohibited.');
    }
  }

  return effectiveDbName;
}

/**
 * Verifies that the connected Mongoose instance is active and connected to an explicit test database.
 * Requires connection.db.databaseName to exist, and verifies consistency with connection.name if present.
 *
 * @param {import('mongoose').Connection} [connection=mongoose.connection]
 * @returns {string} The verified connected database name
 */
export function assertSafeTestConnection(connection = mongoose.connection) {
  if (!connection || connection.readyState !== 1) {
    throw new Error('MongoDB connection is not active (readyState is not 1). Cannot proceed with test database operations.');
  }

  const driverDbName = connection.db?.databaseName;
  if (!driverDbName || typeof driverDbName !== 'string' || !driverDbName.trim()) {
    if (connection.name && !isTestDatabaseName(connection.name)) {
      throw new Error(`Unsafe connected database name "${connection.name}". Destructive test operations are refused unless database name ends in "-test" or "-testing".`);
    }
    throw new Error('Unable to determine connected MongoDB database name: connection.db.databaseName is missing or unavailable.');
  }

  if (!isTestDatabaseName(driverDbName)) {
    throw new Error(`Unsafe connected database name "${driverDbName}". Destructive test operations are refused unless database name ends in "-test" or "-testing".`);
  }

  if (connection.name) {
    if (!isTestDatabaseName(connection.name)) {
      throw new Error(`Unsafe connected database name "${connection.name}". Destructive test operations are refused unless database name ends in "-test" or "-testing".`);
    }
    if (connection.name !== driverDbName) {
      throw new Error(`Inconsistent connected database names: connection.name "${connection.name}" does not match connection.db.databaseName "${driverDbName}".`);
    }
  }

  return driverDbName;
}

/**
 * Safely connects to the test database after executing pre-connection checks,
 * and verifies the active connection after connecting. If post-connection
 * validation fails, it disconnects immediately and throws before any test operation.
 *
 * @param {string} uri
 * @param {object} [options={}]
 * @returns {Promise<import('mongoose').Connection>}
 */
export async function connectTestDatabase(uri, options = {}) {
  // Pre-connection check: inspects options.dbName, rejects missing, malformed, non-test URI, unsafe override, or collision with MONGO_URI
  const expectedDbName = assertSafeTestUri(uri, options);

  // Connect to MongoDB
  await mongoose.connect(uri, options);

  // Post-connection check: verify actual connected database name from the driver
  try {
    const verifiedDbName = assertSafeTestConnection(mongoose.connection);
    if (expectedDbName && verifiedDbName !== expectedDbName) {
      throw new Error(`Connected database "${verifiedDbName}" does not match expected database "${expectedDbName}".`);
    }
  } catch (error) {
    await mongoose.disconnect();
    throw error;
  }

  return mongoose.connection;
}
