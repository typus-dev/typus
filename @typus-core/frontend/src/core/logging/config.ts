// src/core/logging/config.ts
import type { LogLevel, LogMode } from './types';

/**
 * Logging configuration
 */
export const loggingConfig = {
  /**
   * Available log levels, ordered by severity (least to most severe).
   */
  levels: ['debug', 'info', 'warn', 'error'] as LogLevel[],

  /**
   * The minimum level of logs to process.
   * Logs below this level will be ignored.
   * Default: 'error' (minimal logging)
   * Will be overridden by loggingStore when loaded from database.
   */
  logLevel: 'error' as LogLevel,

  /**
   * Where to send the logs.
   * 'console': Output to browser console.
   * 'api': Send logs to the backend API.
   * 'both': Send to both console and API.
   * 'none': Disable logging output.
   * Default: 'none' (no logs)
   * Will be overridden by loggingStore when loaded from database.
   */
  logMode: 'none' as LogMode,

  /**
   * API endpoint for sending logs when logMode is 'api' or 'both'.
   */
  apiEndpoint: '/api/logs',

  /**
   * Whether logging to API is enabled.
   * Will be overridden by loggingStore when loaded from database.
   */
  apiLoggingEnabled: false,

  /**
   * Settings for batching logs when sending to API.
   */
  batchOptions: {
    /** Maximum number of log entries to send in one batch. */
    maxSize: 50,
    /** Maximum time (in ms) to wait before sending a batch, even if not full. */
    maxWaitTime: 5000, // 5 seconds
    /** Maximum size of log batch in bytes */
    maxBatchSizeBytes: 10 * 1024 * 1024, // 10MB
  },

  /**
   * Add timestamp to console logs.
   */
  consoleTimestamp: true,

  /**
   * Prefix for console logs.
   */
  consolePrefix: '[App]',
};

// Adjust logMode if API logging is enabled but no endpoint is set
if ((loggingConfig.logMode === 'api' || loggingConfig.logMode === 'both') && !loggingConfig.apiLoggingEnabled) {
  console.warn("API logging configured but VITE_LOG_API_ENDPOINT is not set. Falling back to console logging.");
  loggingConfig.logMode = 'console';
}

// Note: Logger config will be overridden by loggingStore when it loads from database
