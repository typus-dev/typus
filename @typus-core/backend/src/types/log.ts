/**
 * Log level type
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Log source type
 */
export type LogSource = 'frontend' | 'backend';

/**
 * Log entry interface
 */
export interface LogEntry {
  id?: bigint;
  timestamp: Date;
  level: LogLevel;
  source: LogSource;
  component: string;
  module: string;
  message: string;
  metadata?: Record<string, any>;
  context_id?: string;
  user_id?: string;
  ip_address?: string;
  request_path?: string;
  request_method?: string;
  execution_time?: number;
  created_at?: Date;
}

/**
 * Error entry interface
 */
export interface ErrorEntry {
  id?: bigint;
  log_id: bigint;
  error_type: string;
  error_message: string;
  stack_trace?: string;
  additional_data?: Record<string, any>;
}

/**
 * Frontend log request interface
 */
export interface FrontendLogRequest {
  level: LogLevel;
  message: string;
  timestamp: string | Date;
  source: 'frontend';
  component: string;
  module: string;
  metadata?: Record<string, any>;
  context_id?: string;
  user_id?: string;
}

/**
 * Batch log request interface
 */
export interface BatchLogRequest {
  logs: FrontendLogRequest[];
}
