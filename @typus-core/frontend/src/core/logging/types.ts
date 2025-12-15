// src/core/logging/types.ts

/**
 * Defines the possible log levels.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Defines where logs should be sent.
 */
export type LogMode = 'console' | 'api' | 'both' | 'none';

/**
 * Structure for a single log entry, especially for API transport.
 */
export interface LogEntry {
  level: LogLevel;
  timestamp: string; // ISO string format
  message: string;
  metadata?: Record<string, any>;
  context?: string; // Optional context (e.g., component name, store action)
}

/**
 * Interface for the Logger - flexible parameter types.
 */
export interface Logger {
  debug(message: any, metadata?: any, context?: string): void;
  info(message: any, metadata?: any, context?: string): void;
  warn(message: any, metadata?: any, context?: string): void;
  error(message: any, metadata?: any, context?: string): void;
}