// logger.js
import winston from 'winston';
import './server/config.js';

/**
 * Factory function to create a new logger.
 *
 * @param {Object} options - Optional overrides.
 * @param {string} [options.level] - The logging level.
 * @param {string} [options.logFile] - The filename for file logging.
 * @param {Array} [options.transports] - An array of Winston transports.
 * @returns {winston.Logger} A configured Winston logger.
 */
export function createLogger(options = {}) {
  const logLevel = options.level || process.env.LOG_LEVEL || 'info';
  const logFile = options.logFile || process.env.LOG_FILE || 'server.log';
  const transports = options.transports || [
    new winston.transports.Console(),
    new winston.transports.File({ filename: logFile })
  ];

  return winston.createLogger({
    level: logLevel,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.printf(({ timestamp, level, message }) => {
        return `${timestamp} [${level.toUpperCase()}]: ${message}`;
      })
    ),
    transports
  });
}

// Export a default logger instance.
export const logger = createLogger();
