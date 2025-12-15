// src/core/logging/logger.ts
import { ref } from 'vue';
import { loggingConfig } from './config';
import type { LogLevel, LogEntry, Logger, LogMode } from './types';
import { useApi } from '@/shared/composables/useApi';
import { getGlobalLoggingStore } from '@/core/store/loggingStore';

const levelOrder = loggingConfig.levels;

const logBuffer = ref<LogEntry[]>([]);
let batchTimeout: number | null = null;
let isFlushing = false;

const { post: sendLogsToApi } = useApi(loggingConfig.apiEndpoint);

// Get current log level (from store if loaded, otherwise from config.ts)
function getCurrentLogLevel(): LogLevel {
  const store = getGlobalLoggingStore();
  // isLoaded is only true if config was successfully loaded from database
  if (store?.isLoaded?.value && store.logLevel.value !== null) {
    return store.logLevel.value;
  }
  // Fallback to config.ts (which has defaults: 'error' + 'none')
  return loggingConfig.logLevel;
}

// Get current log mode (from store if loaded, otherwise from config.ts)
function getCurrentLogMode(): LogMode {
  const store = getGlobalLoggingStore();
  // isLoaded is only true if config was successfully loaded from database
  if (store?.isLoaded?.value && store.logMode.value !== null) {
    return store.logMode.value;
  }
  // Fallback to config.ts (which has defaults: 'error' + 'none')
  return loggingConfig.logMode;
}

// Get current API logging enabled (from store if loaded, otherwise from config.ts)
function getApiLoggingEnabled(): boolean {
  const store = getGlobalLoggingStore();
  // isLoaded is only true if config was successfully loaded from database
  if (store?.isLoaded?.value && store.apiLoggingEnabled.value !== null) {
    return store.apiLoggingEnabled.value;
  }
  // Fallback to config.ts
  return loggingConfig.apiLoggingEnabled;
}

// Get current batch size (from store if loaded, otherwise from config.ts)
function getBatchSize(): number {
  const store = getGlobalLoggingStore();
  // isLoaded is only true if config was successfully loaded from database
  if (store?.isLoaded?.value && store.batchSize?.value !== null && store.batchSize?.value !== undefined) {
    return store.batchSize.value;
  }
  // Fallback to config.ts
  return loggingConfig.batchOptions.maxSize;
}

// Get current flush interval (from store if loaded, otherwise from config.ts)
function getFlushInterval(): number {
  const store = getGlobalLoggingStore();
  // isLoaded is only true if config was successfully loaded from database
  if (store?.isLoaded?.value && store.flushInterval?.value !== null && store.flushInterval?.value !== undefined) {
    return store.flushInterval.value;
  }
  // Fallback to config.ts
  return loggingConfig.batchOptions.maxWaitTime;
}

function shouldLog(level: LogLevel): boolean {
  const logMode = getCurrentLogMode();
  if (logMode === 'none') return false;

  const currentLogLevel = getCurrentLogLevel();
  const currentLevelIndex = levelOrder.indexOf(currentLogLevel);
  const levelIndex = levelOrder.indexOf(level);

  return levelIndex >= currentLevelIndex;
}

function formatMetadata(metadata?: any): Record<string, any> | undefined {
  if (metadata === undefined || metadata === null) return undefined;
  
  if (typeof metadata === 'object' && 
      !Array.isArray(metadata) && 
      metadata.constructor === Object) {
    if (Object.keys(metadata).length === 0) return undefined;
    try {
      JSON.stringify(metadata);
      return metadata;
    } catch (e) {
      console.warn('[Logger] Could not stringify metadata due to circular reference or other issue:', e);
      return { error: 'Could not serialize metadata' };
    }
  }
  
  try {
    JSON.stringify(metadata);
    return { value: metadata };
  } catch (e) {
    console.warn('[Logger] Could not stringify metadata:', e);
    return { 
      value: String(metadata),
      error: 'Original value could not be serialized'
    };
  }
}

function formatMessage(messageOrData: any): string {
  if (typeof messageOrData === 'string') return messageOrData;
  
  if (typeof messageOrData === 'object' && messageOrData !== null) {
    try {
      return JSON.stringify(messageOrData);
    } catch (e) {
      return '[Object - could not stringify]';
    }
  }
  
  return String(messageOrData);
}

function logToConsole(level: LogLevel, message: string, metadata?: Record<string, any>, context?: string): void {
  const timestamp = loggingConfig.consoleTimestamp ? `[${new Date().toISOString()}]` : '';
  const prefix = loggingConfig.consolePrefix || '';
  const contextStr = context ? `[${context}]` : '';
  const formattedMessage = `${timestamp}${prefix}${contextStr} ${message}`;

  const args: any[] = [formattedMessage];
  if (metadata && Object.keys(metadata).length > 0) {
    args.push(metadata);
  }

  switch (level) {
    case 'debug':
      console.log('[DEBUG]', ...args);
      break;
    case 'info':
      console.info(...args);
      break;
    case 'warn':
      console.warn(...args);
      break;
    case 'error':
      console.error(...args);
      break;
    default:
      console.log(...args);
  }
}

function bufferLogForApi(entry: LogEntry): void {
  // Skip if app is still loading to prevent circular dependencies
  if (document.readyState !== 'complete') {
    return;
  }
  
  // Skip if user is not authenticated to prevent logout loops
  try {
    const authStore = require('@/core/store/authStore').useAuthStore();
    if (!authStore.isAuthenticated.value) {
      return;
    }
  } catch (e) {
    return;
  }

  if (entry.metadata) {
    const metadataSize = JSON.stringify(entry.metadata).length;
    if (metadataSize > loggingConfig.batchOptions.maxBatchSizeBytes / 10) {
      entry.metadata = { 
        warning: "Metadata truncated due to size constraints",
        truncated: true,
        originalSize: metadataSize
      };
      console.warn(`[Logger] Log metadata truncated due to size constraints (${metadataSize} bytes)`);
    }
  }
  
  logBuffer.value.push(entry);
  
  const currentBatchSize = JSON.stringify(logBuffer.value).length;
  const batchSize = getBatchSize();
  const flushInterval = getFlushInterval();

  if (logBuffer.value.length >= batchSize ||
      currentBatchSize >= loggingConfig.batchOptions.maxBatchSizeBytes) {
    flushLogBuffer();
  } else if (!batchTimeout) {
    batchTimeout = window.setTimeout(() => {
      flushLogBuffer();
    }, flushInterval);
  }
}

async function flushLogBuffer(): Promise<void> {
  if (batchTimeout) {
    clearTimeout(batchTimeout);
    batchTimeout = null;
  }

  if (logBuffer.value.length === 0 || isFlushing) return;

  isFlushing = true;
  let logsToSend = [...logBuffer.value];
  logBuffer.value = [];
  
  const batchSize = JSON.stringify(logsToSend).length;
  if (batchSize > loggingConfig.batchOptions.maxBatchSizeBytes) {
    console.warn(`[Logger] Log batch size (${batchSize} bytes) exceeds maximum (${loggingConfig.batchOptions.maxBatchSizeBytes} bytes). Truncating batch.`);
    
    while (JSON.stringify(logsToSend).length > loggingConfig.batchOptions.maxBatchSizeBytes && logsToSend.length > 0) {
      logsToSend.shift();
    }
    
    logsToSend.push({
      level: 'warn',
      timestamp: new Date().toISOString(),
      message: `Some logs were dropped due to batch size exceeding ${loggingConfig.batchOptions.maxBatchSizeBytes} bytes`,
      metadata: { originalBatchSize: batchSize },
      context: 'Logger'
    });
  }

  try {
    const { error } = await sendLogsToApi({ logs: logsToSend });
    if (error) {
      console.error('[Logger] Failed to send logs to API:', error);
    }
  } catch (e) {
    console.error('[Logger] Exception while sending logs to API:', e);
  } finally {
    isFlushing = false;
    if (logBuffer.value.length > 0 && !batchTimeout) {
      batchTimeout = window.setTimeout(flushLogBuffer, getFlushInterval());
    }
  }
}

function addIconToMessage(level: LogLevel, message: string): string {
  const hasIcon = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(message);
  
  if (hasIcon) return message;
  
  switch (level) {
    case 'warn':
      return `⚠️ ${message}`;
    case 'error':
      return `❌ ${message}`;
    case 'info':
      return `ℹ️ ${message}`;
    default:
      return message;
  }
}

function log(level: LogLevel, messageOrData: any, metadata?: any, context?: string): void {
  if (!shouldLog(level)) return;

  let message: string;
  let finalMetadata: Record<string, any> | undefined;

  if (typeof messageOrData === 'string') {
    message = messageOrData;
    finalMetadata = formatMetadata(metadata);
  } else {
    message = formatMessage(messageOrData);
    if (metadata !== undefined) {
      finalMetadata = formatMetadata(metadata);
    } else {
      finalMetadata = formatMetadata(messageOrData);
    }
  }

  const messageWithIcon = addIconToMessage(level, message);

  const entry: LogEntry = {
    level,
    timestamp: new Date().toISOString(),
    message: messageWithIcon,
    metadata: finalMetadata,
    context,
  };

  const logMode = getCurrentLogMode();
  const apiLoggingEnabled = getApiLoggingEnabled();

  if (logMode === 'console' || logMode === 'both') {
    logToConsole(level, messageWithIcon, finalMetadata, context);
  }

  if ((logMode === 'api' || logMode === 'both') && apiLoggingEnabled) {
    bufferLogForApi(entry);
  }
}

const loggerInstance: Logger = {
  debug(messageOrData, metadata?, context?) {
    log('debug', messageOrData, metadata, context);
  },
  info(messageOrData, metadata?, context?) {
    log('info', messageOrData, metadata, context);
  },
  warn(messageOrData, metadata?, context?) {
    log('warn', messageOrData, metadata, context);
  },
  error(messageOrData, metadata?, context?) {
    if (messageOrData instanceof Error) {
      const errorMetadata = {
        ...formatMetadata(metadata),
        stack: messageOrData.stack,
        errorName: messageOrData.name,
      };
      log('error', messageOrData.message, errorMetadata, context);
    } else {
      log('error', messageOrData, metadata, context);
    }
  },
  table(title: string, data: any[], columns?: string[]) {
    const logMode = getCurrentLogMode();
    if (logMode === 'console' || logMode === 'both') {
      console.log(`\n📊 ${title}`);
      if (Array.isArray(data) && data.length > 0) {
        console.table(data, columns);
      } else {
        console.log('No data to display');
      }
    }
  }
};

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    const logMode = getCurrentLogMode();
    if (logMode === 'api' || logMode === 'both') {
      if (logBuffer.value.length > 0) {
        flushLogBuffer();
      }
    }
  });

  // Make logger globally available
  (window as any).logger = loggerInstance;
}

export const logger = loggerInstance;