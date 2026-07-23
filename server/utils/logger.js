import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logsDir = path.join(__dirname, '../logs');

// Ensure logs directory exists
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logFile = path.join(logsDir, 'server.log');
const errorLogFile = path.join(logsDir, 'error.log');

// Logger utility
export const logger = {
  info: (message, data = {}) => {
    const timestamp = new Date().toISOString();
    const logEntry = JSON.stringify({ timestamp, level: 'INFO', message, ...data });
    console.log(logEntry);
    fs.appendFileSync(logFile, logEntry + '\n');
  },
  error: (message, error = {}, data = {}) => {
    const timestamp = new Date().toISOString();
    const logEntry = JSON.stringify({
      timestamp,
      level: 'ERROR',
      message,
      error: error.message || error,
      ...data
    });
    console.error(logEntry);
    fs.appendFileSync(errorLogFile, logEntry + '\n');
  },
  warn: (message, data = {}) => {
    const timestamp = new Date().toISOString();
    const logEntry = JSON.stringify({ timestamp, level: 'WARN', message, ...data });
    console.warn(logEntry);
    fs.appendFileSync(logFile, logEntry + '\n');
  },
  debug: (message, data = {}) => {
    if (process.env.NODE_ENV === 'development') {
      const timestamp = new Date().toISOString();
      const logEntry = JSON.stringify({ timestamp, level: 'DEBUG', message, ...data });
      console.log(logEntry);
      fs.appendFileSync(logFile, logEntry + '\n');
    }
  }
};

// Request logging middleware
export const requestLogger = (req, res, next) => {
  const start = Date.now();
  const originalSend = res.send;

  res.send = function(data) {
    const duration = Date.now() - start;
    logger.info('API Request', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userId: req.user?.id || 'anonymous'
    });

    return originalSend.call(this, data);
  };

  next();
};

export default logger;
