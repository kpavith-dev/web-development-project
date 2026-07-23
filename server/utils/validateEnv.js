import { logger } from './logger.js';

const requiredEnvVars = [
  'PORT',
  'MONGO_URI',
  'JWT_SECRET',
  'NODE_ENV'
];

export const validateEnvironment = () => {
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    logger.error('Missing required environment variables', new Error('Environment validation failed'), {
      missingVars
    });
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  // Validate JWT_SECRET length
  if (process.env.JWT_SECRET.length < 32) {
    logger.warn('JWT_SECRET is shorter than 32 characters. Recommended for production: 32+ characters');
  }

  // Validate MONGO_URI format
  if (!process.env.MONGO_URI.includes('mongodb')) {
    logger.error('Invalid MONGO_URI format', new Error('Invalid MongoDB URI'));
    throw new Error('MONGO_URI must be a valid MongoDB connection string');
  }

  // Validate NODE_ENV
  const validNodeEnvs = ['development', 'production', 'test'];
  if (!validNodeEnvs.includes(process.env.NODE_ENV)) {
    logger.warn(`NODE_ENV should be one of: ${validNodeEnvs.join(', ')}`);
  }

  logger.info('Environment variables validated successfully');
};

export default validateEnvironment;
