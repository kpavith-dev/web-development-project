import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import mongoose from 'mongoose';
import {
  parseTestDatabaseName,
  isTestDatabaseName,
  assertSafeTestUri,
  assertSafeTestConnection,
  connectTestDatabase,
  parseMongoTarget,
  areMongoTargetsEquivalent,
  normalizeMongoHost,
  TEST_DB_NAME_PATTERN
} from './testDbGuard.js';

describe('Integration test database safety guard', () => {
  const originalMongoUri = process.env.MONGO_URI;

  beforeEach(() => {
    delete process.env.MONGO_URI;
  });

  afterEach(() => {
    if (originalMongoUri !== undefined) {
      process.env.MONGO_URI = originalMongoUri;
    } else {
      delete process.env.MONGO_URI;
    }
    vi.restoreAllMocks();
  });

  describe('parseTestDatabaseName', () => {
    test('extracts database name from standard MongoDB URI', () => {
      expect(parseTestDatabaseName('mongodb://127.0.0.1:27017/smart-campus-parking-test')).toBe('smart-campus-parking-test');
    });

    test('extracts database name from MongoDB URI with credentials, port, and query params', () => {
      expect(
        parseTestDatabaseName('mongodb://user:pass@127.0.0.1:27017/smart-campus-parking-testing?replicaSet=rs0&authSource=admin')
      ).toBe('smart-campus-parking-testing');
    });

    test('extracts database name from mongodb+srv URI', () => {
      expect(
        parseTestDatabaseName('mongodb+srv://admin:secret@cluster0.abc.mongodb.net/smart-campus-parking-test?retryWrites=true')
      ).toBe('smart-campus-parking-test');
    });

    test('extracts database name from multi-host seed list URI', () => {
      expect(
        parseTestDatabaseName('mongodb://host1:27017,host2:27017/cluster-test?replicaSet=rs0')
      ).toBe('cluster-test');
    });

    test('decodes URI-encoded database names', () => {
      expect(parseTestDatabaseName('mongodb://localhost:27017/campus%2Dparking-test')).toBe('campus-parking-test');
    });

    test('rejects missing, null, undefined, or empty URI', () => {
      expect(() => parseTestDatabaseName()).toThrow(/missing or empty/i);
      expect(() => parseTestDatabaseName(null)).toThrow(/missing or empty/i);
      expect(() => parseTestDatabaseName('')).toThrow(/missing or empty/i);
      expect(() => parseTestDatabaseName('   ')).toThrow(/missing or empty/i);
    });

    test('rejects malformed URI strings', () => {
      expect(() => parseTestDatabaseName('not-a-valid-uri')).toThrow(/malformed connection string/i);
      expect(() => parseTestDatabaseName('://missing-scheme')).toThrow(/malformed connection string/i);
    });

    test('rejects non-mongodb protocols', () => {
      expect(() => parseTestDatabaseName('http://localhost:27017/smart-campus-parking-test')).toThrow(/Invalid MONGO_TEST_URI protocol/i);
      expect(() => parseTestDatabaseName('postgres://localhost:5432/smart-campus-parking-test')).toThrow(/Invalid MONGO_TEST_URI protocol/i);
    });

    test('rejects URI with missing database name in path', () => {
      expect(() => parseTestDatabaseName('mongodb://localhost:27017')).toThrow(/does not specify a database name in the path/i);
      expect(() => parseTestDatabaseName('mongodb://localhost:27017/')).toThrow(/does not specify a database name in the path/i);
      expect(() => parseTestDatabaseName('mongodb://localhost:27017/?replicaSet=rs0')).toThrow(/does not specify a database name in the path/i);
    });

    // Regression: Invalid percent-encoding
    test('rejects URI with invalid percent-encoding as clear validation error', () => {
      expect(() => parseTestDatabaseName('mongodb://localhost:27017/smart%ZZ-test')).toThrow(
        /malformed percent-encoding/i
      );
      expect(() => parseTestDatabaseName('mongodb://user%ZZ:pass@localhost:27017/smart-test')).toThrow(
        /malformed percent-encoding/i
      );
    });

    // Regression: Invalid multi-host SRV syntax
    test('rejects comma-separated multiple hosts in mongodb+srv URIs', () => {
      expect(() =>
        parseTestDatabaseName('mongodb+srv://host1.mongodb.net,host2.mongodb.net/smart-campus-parking-test')
      ).toThrow(/mongodb\+srv URIs do not support comma-separated multiple hosts/i);
    });

    test('rejects port number in mongodb+srv URIs', () => {
      expect(() =>
        parseTestDatabaseName('mongodb+srv://host1.mongodb.net:27017/smart-campus-parking-test')
      ).toThrow(/mongodb\+srv URIs must not include a port number/i);
    });

    // Preserves valid standard multi-host MongoDB URI support
    test('validates standard MongoDB multi-host URI with distinct ports', () => {
      expect(
        parseTestDatabaseName('mongodb://host1:27017,host2:27018,host3:27019/cluster-test?replicaSet=rs0')
      ).toBe('cluster-test');
    });

    test('rejects standard MongoDB multi-host URI with empty host entry', () => {
      expect(() =>
        parseTestDatabaseName('mongodb://host1:27017,,host2:27018/cluster-test')
      ).toThrow(/empty host/i);
    });

    test('rejects standard MongoDB URI with invalid port', () => {
      expect(() =>
        parseTestDatabaseName('mongodb://host1:notaport/cluster-test')
      ).toThrow(/invalid port/i);
      expect(() =>
        parseTestDatabaseName('mongodb://host1:70000/cluster-test')
      ).toThrow(/port out of range/i);
    });
  });

  describe('isTestDatabaseName', () => {
    test('accepts database names ending in -test or -testing', () => {
      expect(isTestDatabaseName('smart-campus-parking-test')).toBe(true);
      expect(isTestDatabaseName('smart-campus-parking-testing')).toBe(true);
      expect(isTestDatabaseName('app-test')).toBe(true);
      expect(isTestDatabaseName('campus-testing')).toBe(true);
      expect(isTestDatabaseName('PARKING-TEST')).toBe(true);
      expect(isTestDatabaseName('PARKING-TESTING')).toBe(true);
    });

    test('rejects database names that do not end with -test or -testing', () => {
      expect(isTestDatabaseName('smart-campus-parking')).toBe(false);
      expect(isTestDatabaseName('production')).toBe(false);
      expect(isTestDatabaseName('test')).toBe(false);
      expect(isTestDatabaseName('testing')).toBe(false);
      expect(isTestDatabaseName('test-db')).toBe(false);
      expect(isTestDatabaseName('testing-database')).toBe(false);
      expect(isTestDatabaseName('smart-campus-parking-test-prod')).toBe(false);
      expect(isTestDatabaseName('smart-campus-parking-testing-backup')).toBe(false);
      expect(isTestDatabaseName('')).toBe(false);
      expect(isTestDatabaseName(null)).toBe(false);
    });
  });

  describe('assertSafeTestUri', () => {
    test('accepts valid test database URI and returns extracted name', () => {
      const db = assertSafeTestUri('mongodb://127.0.0.1:27017/smart-campus-parking-test');
      expect(db).toBe('smart-campus-parking-test');
    });

    test('rejects URI pointing to a non-test database', () => {
      expect(() => assertSafeTestUri('mongodb://127.0.0.1:27017/smart-campus-parking')).toThrow(
        /Unsafe test database name "smart-campus-parking"/i
      );
      expect(() => assertSafeTestUri('mongodb://127.0.0.1:27017/production')).toThrow(
        /Unsafe test database name "production"/i
      );
    });

    test('rejects URI when substring "test" is in username, password, host, or query parameter', () => {
      // "test" in username
      expect(() => assertSafeTestUri('mongodb://testuser:pass@127.0.0.1:27017/production')).toThrow(
        /Unsafe test database name "production"/i
      );
      // "test" in password
      expect(() => assertSafeTestUri('mongodb://admin:testpass@127.0.0.1:27017/production')).toThrow(
        /Unsafe test database name "production"/i
      );
      // "test" in host
      expect(() => assertSafeTestUri('mongodb://test-cluster.mongodb.net:27017/production')).toThrow(
        /Unsafe test database name "production"/i
      );
      // "test" in query parameters
      expect(() => assertSafeTestUri('mongodb://127.0.0.1:27017/production?authSource=test&replicaSet=test')).toThrow(
        /Unsafe test database name "production"/i
      );
    });

    test('rejects when MONGO_TEST_URI matches MONGO_URI', () => {
      process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/smart-campus-parking-test';
      expect(() => assertSafeTestUri('mongodb://127.0.0.1:27017/smart-campus-parking-test')).toThrow(
        /MONGO_TEST_URI must not match MONGO_URI/i
      );
    });

    test('rejects missing or empty URI', () => {
      expect(() => assertSafeTestUri()).toThrow(/missing or empty/i);
      expect(() => assertSafeTestUri('')).toThrow(/missing or empty/i);
    });

    // Regression: localhost versus 127.0.0.1
    test('rejects collision between localhost and 127.0.0.1 targets', () => {
      process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/smart-campus-parking-test';
      expect(() => assertSafeTestUri('mongodb://localhost:27017/smart-campus-parking-test')).toThrow(
        /MONGO_TEST_URI must not match MONGO_URI/i
      );

      process.env.MONGO_URI = 'mongodb://localhost:27017/smart-campus-parking-test';
      expect(() => assertSafeTestUri('mongodb://127.0.0.1:27017/smart-campus-parking-test')).toThrow(
        /MONGO_TEST_URI must not match MONGO_URI/i
      );
    });

    // Regression: Explicit versus omitted default port
    test('rejects collision between explicit :27017 and omitted default port', () => {
      process.env.MONGO_URI = 'mongodb://localhost/smart-campus-parking-test';
      expect(() => assertSafeTestUri('mongodb://127.0.0.1:27017/smart-campus-parking-test')).toThrow(
        /MONGO_TEST_URI must not match MONGO_URI/i
      );

      process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/smart-campus-parking-test';
      expect(() => assertSafeTestUri('mongodb://localhost/smart-campus-parking-test')).toThrow(
        /MONGO_TEST_URI must not match MONGO_URI/i
      );
    });

    // Regression: Different query parameters for otherwise equivalent connection targets
    test('rejects collision when query parameters differ but connection target is identical', () => {
      process.env.MONGO_URI = 'mongodb://localhost:27017/smart-campus-parking-test?authSource=admin&replicaSet=rs0';
      expect(() =>
        assertSafeTestUri('mongodb://127.0.0.1:27017/smart-campus-parking-test?retryWrites=true&w=majority')
      ).toThrow(/MONGO_TEST_URI must not match MONGO_URI/i);
    });

    // Unsafe MONGO_URI configuration rejected rather than proceeding
    test('rejects test execution when MONGO_URI is malformed and equivalence cannot be determined safely', () => {
      process.env.MONGO_URI = 'not-a-valid-mongodb-uri';
      expect(() => assertSafeTestUri('mongodb://127.0.0.1:27017/smart-campus-parking-test')).toThrow(
        /Cannot safely determine equivalence with MONGO_URI/i
      );
    });

    // Conservative SRV URI handling
    test('does not claim two different SRV hostnames are equivalent', () => {
      process.env.MONGO_URI = 'mongodb+srv://cluster-prod.abc.mongodb.net/smart-campus-parking-test';
      expect(
        assertSafeTestUri('mongodb+srv://cluster-test.abc.mongodb.net/smart-campus-parking-test')
      ).toBe('smart-campus-parking-test');
    });

    test('rejects collision for identical SRV hostnames with equivalent target databases', () => {
      process.env.MONGO_URI = 'mongodb+srv://cluster.abc.mongodb.net/smart-campus-parking-test?authSource=admin';
      expect(() =>
        assertSafeTestUri('mongodb+srv://cluster.abc.mongodb.net/smart-campus-parking-test?retryWrites=true')
      ).toThrow(/MONGO_TEST_URI must not match MONGO_URI/i);
    });

    // Regression: options.dbName validation in assertSafeTestUri
    test('rejects unsafe options.dbName override in assertSafeTestUri', () => {
      expect(() =>
        assertSafeTestUri('mongodb://127.0.0.1:27017/smart-campus-parking-test', { dbName: 'production' })
      ).toThrow(/Unsafe test database name override "production"/i);

      expect(() =>
        assertSafeTestUri('mongodb://127.0.0.1:27017/smart-campus-parking-test', { dbName: 'smart-campus-parking' })
      ).toThrow(/Unsafe test database name override "smart-campus-parking"/i);
    });

    test('detects collision when options.dbName override matches MONGO_URI database target', () => {
      process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/custom-target-test';
      expect(() =>
        assertSafeTestUri('mongodb://localhost:27017/placeholder-test', { dbName: 'custom-target-test' })
      ).toThrow(/MONGO_TEST_URI must not match MONGO_URI/i);
    });
  });

  describe('assertSafeTestConnection', () => {
    test('throws if connection is not active', () => {
      expect(() => assertSafeTestConnection({ readyState: 0 })).toThrow(/MongoDB connection is not active/i);
      expect(() => assertSafeTestConnection({ readyState: 2 })).toThrow(/MongoDB connection is not active/i);
    });

    test('throws if connection has no database name', () => {
      expect(() => assertSafeTestConnection({ readyState: 1, name: '' })).toThrow(
        /Unable to determine connected MongoDB database name/i
      );
    });

    test('throws if connected database name does not end in -test or -testing', () => {
      expect(() =>
        assertSafeTestConnection({ readyState: 1, name: 'smart-campus-parking', db: { databaseName: 'smart-campus-parking' } })
      ).toThrow(/Unsafe connected database name "smart-campus-parking"/i);
      expect(() =>
        assertSafeTestConnection({ readyState: 1, name: 'production', db: { databaseName: 'production' } })
      ).toThrow(/Unsafe connected database name "production"/i);
      expect(() =>
        assertSafeTestConnection({ readyState: 1, name: 'test', db: { databaseName: 'test' } })
      ).toThrow(/Unsafe connected database name "test"/i);
    });

    test('succeeds and returns database name when connection is safe', () => {
      expect(
        assertSafeTestConnection({
          readyState: 1,
          name: 'smart-campus-parking-test',
          db: { databaseName: 'smart-campus-parking-test' }
        })
      ).toBe('smart-campus-parking-test');
      expect(
        assertSafeTestConnection({
          readyState: 1,
          name: 'smart-campus-parking-testing',
          db: { databaseName: 'smart-campus-parking-testing' }
        })
      ).toBe('smart-campus-parking-testing');
      expect(
        assertSafeTestConnection({
          readyState: 1,
          db: { databaseName: 'smart-campus-parking-test' }
        })
      ).toBe('smart-campus-parking-test');
    });

    // Regression: Safe connection.name with unsafe connection.db.databaseName
    test('rejects safe connection.name when driver connection.db.databaseName is unsafe', () => {
      expect(() =>
        assertSafeTestConnection({
          readyState: 1,
          name: 'smart-campus-parking-test',
          db: { databaseName: 'smart-campus-parking' }
        })
      ).toThrow(/Unsafe connected database name "smart-campus-parking"/i);

      expect(() =>
        assertSafeTestConnection({
          readyState: 1,
          name: 'smart-campus-parking-test',
          db: { databaseName: 'production' }
        })
      ).toThrow(/Unsafe connected database name "production"/i);
    });

    // Regression: Missing or inconsistent live connection database-name information
    test('rejects connection when connection.db.databaseName is missing even if connection.name is safe', () => {
      expect(() =>
        assertSafeTestConnection({
          readyState: 1,
          name: 'smart-campus-parking-test'
        })
      ).toThrow(/connection\.db\.databaseName is missing or unavailable/i);

      expect(() =>
        assertSafeTestConnection({
          readyState: 1,
          name: 'smart-campus-parking-test',
          db: {}
        })
      ).toThrow(/connection\.db\.databaseName is missing or unavailable/i);
    });

    test('rejects connection when connection.name and connection.db.databaseName are inconsistent', () => {
      expect(() =>
        assertSafeTestConnection({
          readyState: 1,
          name: 'suite-a-test',
          db: { databaseName: 'suite-b-test' }
        })
      ).toThrow(/Inconsistent connected database names/i);
    });
  });

  describe('connectTestDatabase', () => {
    test('rejects unsafe URI before calling mongoose.connect', async () => {
      const connectSpy = vi.spyOn(mongoose, 'connect');
      await expect(
        connectTestDatabase('mongodb://127.0.0.1:27017/production')
      ).rejects.toThrow(/Unsafe test database name "production"/i);

      expect(connectSpy).not.toHaveBeenCalled();
    });

    // Regression: options.dbName set to an unsafe name in connectTestDatabase
    test('rejects unsafe options.dbName before calling mongoose.connect', async () => {
      const connectSpy = vi.spyOn(mongoose, 'connect');
      await expect(
        connectTestDatabase('mongodb://127.0.0.1:27017/smart-campus-parking-test', { dbName: 'production' })
      ).rejects.toThrow(/Unsafe test database name override "production"/i);

      expect(connectSpy).not.toHaveBeenCalled();
    });

    test('disconnects and throws if connected database name fails post-connection verification', async () => {
      vi.spyOn(mongoose, 'connect').mockResolvedValue(mongoose);
      const disconnectSpy = vi.spyOn(mongoose, 'disconnect').mockResolvedValue();

      // Mock mongoose.connection with unsafe name
      const originalConnection = mongoose.connection;
      Object.defineProperty(mongoose, 'connection', {
        value: { readyState: 1, name: 'production', db: { databaseName: 'production' } },
        configurable: true
      });

      try {
        await expect(
          connectTestDatabase('mongodb://127.0.0.1:27017/smart-campus-parking-test')
        ).rejects.toThrow(/Unsafe connected database name "production"/i);

        expect(disconnectSpy).toHaveBeenCalled();
      } finally {
        Object.defineProperty(mongoose, 'connection', {
          value: originalConnection,
          configurable: true
        });
      }
    });

    test('disconnects and throws if driver database name does not match expected options.dbName override', async () => {
      vi.spyOn(mongoose, 'connect').mockResolvedValue(mongoose);
      const disconnectSpy = vi.spyOn(mongoose, 'disconnect').mockResolvedValue();

      const originalConnection = mongoose.connection;
      Object.defineProperty(mongoose, 'connection', {
        value: { readyState: 1, name: 'suite-a-test', db: { databaseName: 'suite-a-test' } },
        configurable: true
      });

      try {
        await expect(
          connectTestDatabase('mongodb://127.0.0.1:27017/suite-a-test', { dbName: 'suite-b-test' })
        ).rejects.toThrow(/does not match expected database "suite-b-test"/i);

        expect(disconnectSpy).toHaveBeenCalled();
      } finally {
        Object.defineProperty(mongoose, 'connection', {
          value: originalConnection,
          configurable: true
        });
      }
    });

    test('connects successfully when URI and connection are valid', async () => {
      vi.spyOn(mongoose, 'connect').mockResolvedValue(mongoose);
      const originalConnection = mongoose.connection;
      Object.defineProperty(mongoose, 'connection', {
        value: {
          readyState: 1,
          name: 'smart-campus-parking-test',
          db: { databaseName: 'smart-campus-parking-test' }
        },
        configurable: true
      });

      try {
        const conn = await connectTestDatabase('mongodb://127.0.0.1:27017/smart-campus-parking-test');
        expect(conn.name).toBe('smart-campus-parking-test');
      } finally {
        Object.defineProperty(mongoose, 'connection', {
          value: originalConnection,
          configurable: true
        });
      }
    });
  });
});
