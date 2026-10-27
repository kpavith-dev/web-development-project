import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  validateE2EEnvironment,
  assertSafeE2EConnection,
  startE2EServer,
  sanitizeMessage,
  REQUIRED_E2E_DB_NAME,
  REQUIRED_E2E_PORT,
  FORBIDDEN_DEV_PORT
} from '../e2eHarness.js';

describe('Safe Dedicated E2E Test Harness', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  describe('validateE2EEnvironment', () => {
    test('missing MONGO_TEST_URI fails closed', () => {
      expect(() =>
        validateE2EEnvironment({ nodeEnv: 'test', testUri: undefined })
      ).toThrow(/MONGO_TEST_URI is missing or empty/i);

      expect(() =>
        validateE2EEnvironment({ nodeEnv: 'test', testUri: '' })
      ).toThrow(/MONGO_TEST_URI is missing or empty/i);

      expect(() =>
        validateE2EEnvironment({ nodeEnv: 'test', testUri: '   ' })
      ).toThrow(/MONGO_TEST_URI is missing or empty/i);
    });

    test('never silently falls back to MONGO_URI when MONGO_TEST_URI is missing', () => {
      const appUri = 'mongodb://127.0.0.1:27017/smart-campus-parking';
      process.env.MONGO_URI = appUri;
      delete process.env.MONGO_TEST_URI;

      expect(() =>
        validateE2EEnvironment({ nodeEnv: 'test', testUri: undefined, appUri })
      ).toThrow(/Silent fallback to MONGO_URI is strictly prohibited/i);
    });

    test('NODE_ENV other than "test" fails closed', () => {
      const validTestUri = `mongodb://127.0.0.1:${REQUIRED_E2E_PORT}/${REQUIRED_E2E_DB_NAME}`;

      expect(() =>
        validateE2EEnvironment({ nodeEnv: 'development', testUri: validTestUri })
      ).toThrow(/NODE_ENV must be set to "test"/i);

      expect(() =>
        validateE2EEnvironment({ nodeEnv: 'production', testUri: validTestUri })
      ).toThrow(/NODE_ENV must be set to "test"/i);

      expect(() =>
        validateE2EEnvironment({ nodeEnv: '', testUri: validTestUri })
      ).toThrow(/NODE_ENV must be set to "test"/i);

      expect(() =>
        validateE2EEnvironment({ nodeEnv: undefined, testUri: validTestUri })
      ).toThrow(/NODE_ENV must be set to "test"/i);

      expect(() =>
        validateE2EEnvironment({ nodeEnv: 'staging', testUri: validTestUri })
      ).toThrow(/NODE_ENV must be set to "test"/i);
    });

    test('a URI targeting port 27017 is rejected', () => {
      // Explicit 27017 on 127.0.0.1
      expect(() =>
        validateE2EEnvironment({
          nodeEnv: 'test',
          testUri: `mongodb://127.0.0.1:${FORBIDDEN_DEV_PORT}/${REQUIRED_E2E_DB_NAME}`
        })
      ).toThrow(/Port 27017 is rejected/i);

      // Explicit 27017 on localhost
      expect(() =>
        validateE2EEnvironment({
          nodeEnv: 'test',
          testUri: `mongodb://localhost:${FORBIDDEN_DEV_PORT}/${REQUIRED_E2E_DB_NAME}`
        })
      ).toThrow(/Port 27017 is rejected/i);

      // Omitted port (defaults to 27017 in MongoDB connection strings)
      expect(() =>
        validateE2EEnvironment({
          nodeEnv: 'test',
          testUri: `mongodb://127.0.0.1/${REQUIRED_E2E_DB_NAME}`
        })
      ).toThrow(/Port 27017 is rejected/i);

      // URI with credentials targeting 27017
      expect(() =>
        validateE2EEnvironment({
          nodeEnv: 'test',
          testUri: `mongodb://admin:secretPass123@127.0.0.1:${FORBIDDEN_DEV_PORT}/${REQUIRED_E2E_DB_NAME}`
        })
      ).toThrow(/Port 27017 is rejected/i);
    });

    test('a non-test database name is rejected', () => {
      // Production / development database name
      expect(() =>
        validateE2EEnvironment({
          nodeEnv: 'test',
          testUri: `mongodb://127.0.0.1:${REQUIRED_E2E_PORT}/smart-campus-parking`
        })
      ).toThrow(/Unsafe database name "smart-campus-parking"/i);

      // Production keyword
      expect(() =>
        validateE2EEnvironment({
          nodeEnv: 'test',
          testUri: `mongodb://127.0.0.1:${REQUIRED_E2E_PORT}/production`
        })
      ).toThrow(/Unsafe database name "production"/i);

      // Generic 'test' database name (does not end in -test or -testing)
      expect(() =>
        validateE2EEnvironment({
          nodeEnv: 'test',
          testUri: `mongodb://127.0.0.1:${REQUIRED_E2E_PORT}/test`
        })
      ).toThrow(/Unsafe database name "test"/i);

      // Other test database name (must be strictly smart-campus-parking-test)
      expect(() =>
        validateE2EEnvironment({
          nodeEnv: 'test',
          testUri: `mongodb://127.0.0.1:${REQUIRED_E2E_PORT}/another-service-test`
        })
      ).toThrow(/Database name "another-service-test" is not allowed/i);

      // Empty database name in path
      expect(() =>
        validateE2EEnvironment({
          nodeEnv: 'test',
          testUri: `mongodb://127.0.0.1:${REQUIRED_E2E_PORT}/`
        })
      ).toThrow(/does not specify a database name/i);
    });

    test('a valid isolated URI passes validation', () => {
      const validUri = `mongodb://127.0.0.1:${REQUIRED_E2E_PORT}/${REQUIRED_E2E_DB_NAME}`;
      const result = validateE2EEnvironment({ nodeEnv: 'test', testUri: validUri });

      expect(result.uri).toBe(validUri);
      expect(result.dbName).toBe(REQUIRED_E2E_DB_NAME);
      expect(result.hosts).toEqual([`127.0.0.1:${REQUIRED_E2E_PORT}`]);
      expect(result.port).toBe(REQUIRED_E2E_PORT);

      // localhost normalizes to 127.0.0.1
      const localhostUri = `mongodb://localhost:${REQUIRED_E2E_PORT}/${REQUIRED_E2E_DB_NAME}`;
      const resultLocalhost = validateE2EEnvironment({ nodeEnv: 'test', testUri: localhostUri });
      expect(resultLocalhost.hosts).toEqual([`127.0.0.1:${REQUIRED_E2E_PORT}`]);

      // Credentials and query params allowed as long as port and dbName are isolated
      const credsUri = `mongodb://testuser:testpass@127.0.0.1:${REQUIRED_E2E_PORT}/${REQUIRED_E2E_DB_NAME}?replicaSet=rs0&authSource=admin`;
      const resultCreds = validateE2EEnvironment({ nodeEnv: 'test', testUri: credsUri });
      expect(resultCreds.dbName).toBe(REQUIRED_E2E_DB_NAME);
      expect(resultCreds.port).toBe(REQUIRED_E2E_PORT);
    });

    test('rejects remote or non-mongodb protocols and hosts', () => {
      // mongodb+srv rejected for local isolated E2E harness
      expect(() =>
        validateE2EEnvironment({
          nodeEnv: 'test',
          testUri: `mongodb+srv://cluster.abc.mongodb.net/${REQUIRED_E2E_DB_NAME}`
        })
      ).toThrow(/Protocol must be "mongodb:"/i);

      // Non-loopback IP rejected
      expect(() =>
        validateE2EEnvironment({
          nodeEnv: 'test',
          testUri: `mongodb://192.168.1.50:${REQUIRED_E2E_PORT}/${REQUIRED_E2E_DB_NAME}`
        })
      ).toThrow(/Host "192.168.1.50" is not allowed/i);

      // Non-27018 port rejected
      expect(() =>
        validateE2EEnvironment({
          nodeEnv: 'test',
          testUri: `mongodb://127.0.0.1:27019/${REQUIRED_E2E_DB_NAME}`
        })
      ).toThrow(/Port 27019 is not allowed/i);
    });

    test('rejects collision between MONGO_TEST_URI and MONGO_URI', () => {
      const collidingUri = `mongodb://127.0.0.1:${REQUIRED_E2E_PORT}/${REQUIRED_E2E_DB_NAME}`;
      expect(() =>
        validateE2EEnvironment({
          nodeEnv: 'test',
          testUri: collidingUri,
          appUri: collidingUri
        })
      ).toThrow(/MONGO_TEST_URI must not match MONGO_URI/i);
    });
  });

  describe('assertSafeE2EConnection', () => {
    test('throws if connection is not active (readyState is not 1)', () => {
      expect(() => assertSafeE2EConnection({ readyState: 0 })).toThrow(/connection is not active/i);
      expect(() => assertSafeE2EConnection({ readyState: 2 })).toThrow(/connection is not active/i);
    });

    test('throws if connection is connected to wrong database name', () => {
      const mockConn = {
        readyState: 1,
        name: 'smart-campus-parking',
        db: { databaseName: 'smart-campus-parking' },
        port: REQUIRED_E2E_PORT,
        host: '127.0.0.1'
      };
      expect(() => assertSafeE2EConnection(mockConn)).toThrow(/Unsafe connected database name/i);

      const mockOtherTestConn = {
        readyState: 1,
        name: 'other-test',
        db: { databaseName: 'other-test' },
        port: REQUIRED_E2E_PORT,
        host: '127.0.0.1'
      };
      expect(() => assertSafeE2EConnection(mockOtherTestConn)).toThrow(/expected "smart-campus-parking-test"/i);
    });

    test('throws if connected to port 27017', () => {
      const mockDevPortConn = {
        readyState: 1,
        name: REQUIRED_E2E_DB_NAME,
        db: { databaseName: REQUIRED_E2E_DB_NAME },
        port: FORBIDDEN_DEV_PORT,
        host: '127.0.0.1'
      };
      expect(() => assertSafeE2EConnection(mockDevPortConn)).toThrow(/Connected to port 27017/i);
    });

    test('throws if connected to port other than 27018', () => {
      const mockOtherPortConn = {
        readyState: 1,
        name: REQUIRED_E2E_DB_NAME,
        db: { databaseName: REQUIRED_E2E_DB_NAME },
        port: 27019,
        host: '127.0.0.1'
      };
      expect(() => assertSafeE2EConnection(mockOtherPortConn)).toThrow(/Expected port 27018/i);
    });

    test('throws if connected to non-loopback host', () => {
      const mockRemoteConn = {
        readyState: 1,
        name: REQUIRED_E2E_DB_NAME,
        db: { databaseName: REQUIRED_E2E_DB_NAME },
        port: REQUIRED_E2E_PORT,
        host: '10.0.0.5'
      };
      expect(() => assertSafeE2EConnection(mockRemoteConn)).toThrow(/Connected to unsafe host/i);
    });

    test('throws if client options include port 27017', () => {
      const mockClientOptsConn = {
        readyState: 1,
        name: REQUIRED_E2E_DB_NAME,
        db: { databaseName: REQUIRED_E2E_DB_NAME },
        port: REQUIRED_E2E_PORT,
        host: '127.0.0.1',
        client: {
          options: {
            hosts: ['127.0.0.1:27017']
          }
        }
      };
      expect(() => assertSafeE2EConnection(mockClientOptsConn)).toThrow(/Client connection options include port 27017/i);
    });

    test('succeeds when connection is active, isolated, and targeted to smart-campus-parking-test on 27018', () => {
      const mockSafeConn = {
        readyState: 1,
        name: REQUIRED_E2E_DB_NAME,
        db: { databaseName: REQUIRED_E2E_DB_NAME },
        port: REQUIRED_E2E_PORT,
        host: '127.0.0.1',
        client: {
          options: {
            hosts: [`127.0.0.1:${REQUIRED_E2E_PORT}`]
          }
        }
      };
      expect(assertSafeE2EConnection(mockSafeConn)).toBe(REQUIRED_E2E_DB_NAME);
    });
  });

  describe('startE2EServer startup controls and fail-closed behavior', () => {
    test('connection verification failure prevents HTTP listener from starting', async () => {
      const mockDisconnect = vi.fn().mockResolvedValue(true);
      const mockConnect = vi.fn().mockResolvedValue(true);
      const mockListen = vi.fn();

      // Return a connection that fails verification (wrong database name)
      const mockMongoose = {
        set: vi.fn(),
        connect: mockConnect,
        disconnect: mockDisconnect,
        connection: {
          readyState: 1,
          name: 'smart-campus-parking-production',
          db: { databaseName: 'smart-campus-parking-production' },
          port: REQUIRED_E2E_PORT,
          host: '127.0.0.1'
        }
      };

      const mockHttpServer = {
        once: vi.fn(),
        listen: mockListen
      };

      await expect(
        startE2EServer({
          nodeEnv: 'test',
          testUri: `mongodb://127.0.0.1:${REQUIRED_E2E_PORT}/${REQUIRED_E2E_DB_NAME}`,
          mongoose: mockMongoose,
          httpServer: mockHttpServer,
          initializeSocket: false
        })
      ).rejects.toThrow();

      // Verified: disconnect was called to clean up
      expect(mockDisconnect).toHaveBeenCalled();
      // Verified: HTTP listener was NEVER opened!
      expect(mockListen).not.toHaveBeenCalled();
    });

    test('driver connection failure prevents HTTP listener from starting', async () => {
      const mockDisconnect = vi.fn().mockResolvedValue(true);
      const mockConnect = vi.fn().mockRejectedValue(new Error('ECONNREFUSED 127.0.0.1:27018'));
      const mockListen = vi.fn();

      const mockMongoose = {
        set: vi.fn(),
        connect: mockConnect,
        disconnect: mockDisconnect,
        connection: { readyState: 0 }
      };

      const mockHttpServer = {
        once: vi.fn(),
        listen: mockListen
      };

      await expect(
        startE2EServer({
          nodeEnv: 'test',
          testUri: `mongodb://127.0.0.1:${REQUIRED_E2E_PORT}/${REQUIRED_E2E_DB_NAME}`,
          mongoose: mockMongoose,
          httpServer: mockHttpServer,
          initializeSocket: false
        })
      ).rejects.toThrow(/Database connection failed/i);

      expect(mockDisconnect).toHaveBeenCalled();
      expect(mockListen).not.toHaveBeenCalled();
    });

    test('pre-connection validation failure (port 27017) prevents mongoose connect and HTTP listener', async () => {
      const mockConnect = vi.fn();
      const mockListen = vi.fn();

      const mockMongoose = {
        set: vi.fn(),
        connect: mockConnect,
        disconnect: vi.fn()
      };

      const mockHttpServer = {
        once: vi.fn(),
        listen: mockListen
      };

      await expect(
        startE2EServer({
          nodeEnv: 'test',
          testUri: `mongodb://127.0.0.1:${FORBIDDEN_DEV_PORT}/${REQUIRED_E2E_DB_NAME}`,
          mongoose: mockMongoose,
          httpServer: mockHttpServer
        })
      ).rejects.toThrow(/Port 27017 is rejected/i);

      expect(mockConnect).not.toHaveBeenCalled();
      expect(mockListen).not.toHaveBeenCalled();
    });

    test('pre-connection validation failure (missing test URI) prevents connect and HTTP listener', async () => {
      const mockConnect = vi.fn();
      const mockListen = vi.fn();

      await expect(
        startE2EServer({
          nodeEnv: 'test',
          testUri: '',
          mongoose: { set: vi.fn(), connect: mockConnect, disconnect: vi.fn() },
          httpServer: { once: vi.fn(), listen: mockListen }
        })
      ).rejects.toThrow(/MONGO_TEST_URI is missing or empty/i);

      expect(mockConnect).not.toHaveBeenCalled();
      expect(mockListen).not.toHaveBeenCalled();
    });

    test('starts HTTP server successfully when all safety conditions are met', async () => {
      const mockDisconnect = vi.fn().mockResolvedValue(true);
      const mockConnect = vi.fn().mockResolvedValue(true);
      let listenCallback;
      const mockClose = vi.fn((cb) => cb && cb());

      const mockMongoose = {
        set: vi.fn(),
        connect: mockConnect,
        disconnect: mockDisconnect,
        connection: {
          readyState: 1,
          name: REQUIRED_E2E_DB_NAME,
          db: { databaseName: REQUIRED_E2E_DB_NAME },
          port: REQUIRED_E2E_PORT,
          host: '127.0.0.1'
        }
      };

      const mockHttpServer = {
        once: vi.fn(),
        listen: vi.fn((port, host, cb) => {
          listenCallback = cb;
          cb();
        }),
        close: mockClose
      };

      const mockInitSocket = vi.fn();
      const logMessages = [];
      const mockLogger = (msg) => logMessages.push(msg);

      const harness = await startE2EServer({
        nodeEnv: 'test',
        testUri: `mongodb://testuser:secretpass@127.0.0.1:${REQUIRED_E2E_PORT}/${REQUIRED_E2E_DB_NAME}`,
        port: 5099,
        host: '127.0.0.1',
        mongoose: mockMongoose,
        httpServer: mockHttpServer,
        initializeSocketFn: mockInitSocket,
        logger: mockLogger
      });

      expect(mockConnect).toHaveBeenCalled();
      expect(mockHttpServer.listen).toHaveBeenCalledWith(5099, '127.0.0.1', expect.any(Function));
      expect(mockInitSocket).toHaveBeenCalledWith(mockHttpServer);
      expect(harness.port).toBe(5099);

      // Verify safe logging: credentials and complete connection URI are never printed
      const fullLogText = logMessages.join('\n');
      expect(fullLogText).not.toContain('secretpass');
      expect(fullLogText).not.toContain('testuser');
      expect(fullLogText).not.toContain('mongodb://');
      expect(fullLogText).toContain('127.0.0.1:27018');
      expect(fullLogText).toContain(REQUIRED_E2E_DB_NAME);

      // Test clean shutdown
      await harness.close();
      expect(mockClose).toHaveBeenCalled();
      expect(mockDisconnect).toHaveBeenCalled();
    });

    test('suppresses background reservation lifecycle worker and intervals', async () => {
      const setIntervalSpy = vi.spyOn(global, 'setInterval');

      const mockMongoose = {
        set: vi.fn(),
        connect: vi.fn().mockResolvedValue(true),
        disconnect: vi.fn().mockResolvedValue(true),
        connection: {
          readyState: 1,
          name: REQUIRED_E2E_DB_NAME,
          db: { databaseName: REQUIRED_E2E_DB_NAME },
          port: REQUIRED_E2E_PORT,
          host: '127.0.0.1'
        }
      };

      const mockHttpServer = {
        once: vi.fn(),
        listen: vi.fn((port, host, cb) => cb()),
        close: vi.fn((cb) => cb && cb())
      };

      const harness = await startE2EServer({
        nodeEnv: 'test',
        testUri: `mongodb://127.0.0.1:${REQUIRED_E2E_PORT}/${REQUIRED_E2E_DB_NAME}`,
        mongoose: mockMongoose,
        httpServer: mockHttpServer,
        initializeSocket: false,
        logger: vi.fn()
      });

      // Background setInterval must NOT be scheduled by the E2E harness
      expect(setIntervalSpy).not.toHaveBeenCalled();

      await harness.close();
    });
  });

  describe('sanitizeMessage', () => {
    test('redacts credentials in MongoDB URIs embedded within messages', () => {
      const raw = 'Failed to connect: mongodb://admin:mySecretPassword@127.0.0.1:27018/smart-campus-parking-test';
      const sanitized = sanitizeMessage(raw);
      expect(sanitized).not.toContain('mySecretPassword');
      expect(sanitized).not.toContain('admin');
      expect(sanitized).toContain('mongodb://***:***@127.0.0.1:27018/smart-campus-parking-test');
    });

    test('leaves safe strings unaffected', () => {
      const msg = 'Backend listening on http://127.0.0.1:5000';
      expect(sanitizeMessage(msg)).toBe(msg);
      expect(sanitizeMessage(null)).toBe('');
      expect(sanitizeMessage(undefined)).toBe('');
    });
  });
});
