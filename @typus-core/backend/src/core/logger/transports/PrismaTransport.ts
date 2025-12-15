// src/core/logger/transports/PrismaTransport.ts
// Correct version without winston-transport

import winston from 'winston';
import { ContextManager } from '../../context/ContextManager.js';
import prisma from '../../database/prisma.js';

// Use centralized Prisma client
function getPrismaClient() {
  try {
    // Return the centralized prisma instance
    return prisma;
  } catch (error) {
    console.warn('[PrismaTransport] Failed to get Prisma client:', error.message);
    return null;
  }
}

// Flag to prevent duplication
let isProcessingLog = false;

// WeakMap to store DB log data without adding to info object
const dbLogStorage = new WeakMap<object, any>();

/**
 * Creates Winston format for database logging
 * Transforms log data for database storage
 */
export const createDatabaseFormat = () => {
  // Check if console mode is enabled
  const logModes = process.env.LOG_MODE ? process.env.LOG_MODE.split(',').map(mode => mode.trim()) : ['console'];
  const isConsoleEnabled = logModes.includes('console');

  return winston.format((info: any) => {
    // Skip processing if database format is not needed
    if (info.skipDatabase) {
      return info;
    }

    // Extract tag from message if present
    const tagMatch = typeof info.message === 'string' ? info.message.match(/\[(.*?)\]/) : null;
    const tag = tagMatch ? tagMatch[1] : 'System';

    // Extract module and component from tag
    const [module = 'core', component = 'system'] = tag.split('.');

    // Get context metadata automatically
    const contextManager = ContextManager.getInstance();
    const contextMetadata = contextManager.getLoggingMetadata();

    // Prepare explicit metadata (from logger calls)
    let explicitData: Record<string, any> = {};
    if (info.metadata && typeof info.metadata === 'object') {
      explicitData = { ...info.metadata };
    } else if (typeof info.meta === 'object' && info.meta !== null) {
      explicitData = { ...info.meta };
    }

    // Also check if metadata is spread directly on info object (winston behavior)
    const topLevelKeys = ['userId', 'contextId', 'ipAddress', 'requestPath', 'requestMethod', 'userAgent'];
    topLevelKeys.forEach(key => {
      if (info[key] !== undefined && !explicitData[key]) {
        explicitData[key] = info[key];
      }
    });

    if (info.headers) explicitData.headers = info.headers;
    if (info.body) explicitData.body = info.body;

    // Extract context data from info object (added by enrichMetadata)
    const contextData: Record<string, any> = {};
    if (info.contextId) contextData.contextId = info.contextId;
    if (info.userId) contextData.userId = info.userId;
    if (info.ipAddress) contextData.ipAddress = info.ipAddress;
    if (info.requestPath) contextData.requestPath = info.requestPath;
    if (info.requestMethod) contextData.requestMethod = info.requestMethod;
    if (info.userAgent) contextData.userAgent = info.userAgent;

    // Fallback to contextManager if no context data in info
    if (Object.keys(contextData).length === 0) {
      if (contextMetadata.contextId) contextData.contextId = contextMetadata.contextId;
      if (contextMetadata.userId) contextData.userId = contextMetadata.userId;
      if (contextMetadata.ipAddress) contextData.ipAddress = contextMetadata.ipAddress;
      if (contextMetadata.requestPath) contextData.requestPath = contextMetadata.requestPath;
      if (contextMetadata.requestMethod) contextData.requestMethod = contextMetadata.requestMethod;
      if (contextMetadata.userAgent) contextData.userAgent = contextMetadata.userAgent;
    }

    // Also add contextMetadata to explicitData if not present (for userId etc)
    if (contextMetadata.userId && !explicitData.userId) {
      explicitData.userId = contextMetadata.userId;
    }
    if (contextMetadata.ipAddress && !explicitData.ipAddress) {
      explicitData.ipAddress = contextMetadata.ipAddress;
    }
    if (contextMetadata.requestPath && !explicitData.requestPath) {
      explicitData.requestPath = contextMetadata.requestPath;
    }
    if (contextMetadata.requestMethod && !explicitData.requestMethod) {
      explicitData.requestMethod = contextMetadata.requestMethod;
    }

    // Build comprehensive metadata object
    const fullMetadata: Record<string, any> = {};
    
    // Add context data if present
    if (Object.keys(contextData).length > 0) {
      fullMetadata.contextData = contextData;
    }
    
    // Add explicit data if present
    if (Object.keys(explicitData).length > 0) {
      fullMetadata.explicitData = explicitData;
    }

    // Extract values for indexed columns (for fast searching)
    // Check both contextData and explicitData for these values, with contextMetadata as final fallback
    const contextId = contextData.contextId || explicitData.contextId || contextMetadata.contextId || null;
    const userId = contextData.userId || explicitData.userId || contextMetadata.userId || null;
    const ipAddress = contextData.ipAddress || explicitData.ipAddress || contextMetadata.ipAddress || null;
    const requestPath = contextData.requestPath || explicitData.requestPath || contextMetadata.requestPath || null;
    const requestMethod = contextData.requestMethod || explicitData.requestMethod || contextMetadata.requestMethod || null;

    // Create log object for DB but DO NOT add it to info directly
    const dbLog: any = {
      timestamp: info.timestamp || new Date(),
      level: info.level,
      source: 'backend',
      module: module,
      component: component,
      message: info.message,
      metadata: fullMetadata,
      // Indexed columns for fast searching
      context_id: contextId,
      user_id: userId ? String(userId) : null,
      ip_address: ipAddress,
      request_path: requestPath,
      request_method: requestMethod,
    };

    
    // Process error information if present
    if (info.error || (explicitData && typeof explicitData === 'object' && 'error' in explicitData)) {
      const error = info.error || explicitData.error;
      let errorData: Record<string, any> = {};
      
      if (typeof error === 'string') {
        errorData = {
          error_type: 'Error',
          error_message: error,
        };
      } else if (error instanceof Error) {
        errorData = {
          error_type: error.name || 'Error',
          error_message: error.message,
          stack_trace: error.stack,
        };
      } else if (typeof error === 'object' && error !== null) {
        errorData = {
          error_type: error.name || 'Error',
          error_message: error.message || JSON.stringify(error),
          stack_trace: error.stack,
          additional_data: error,
        };
      }
      
      dbLog.error = errorData;
    }

    // Save DB log data to WeakMap using info object as key
    // This prevents them from appearing in console output
    dbLogStorage.set(info, dbLog);

    // Process DB log immediately, but only if not already processed
    if (!info.processed) {
      info.processed = true;
      // Get log data from WeakMap
      const logData = dbLogStorage.get(info);
      if (logData) {
        processDatabaseLog(logData);
      }
    }

    return info;
  })();
};

/**
 * Processes and saves log to DB
 */
async function processDatabaseLog(databaseLog: any) {
  // Prevent duplicate processing
  if (isProcessingLog) {
    return;
  }
  isProcessingLog = true;

  try {
    const prismaClient = getPrismaClient();
    if (!prismaClient) {
      // Silently skip database logging if Prisma is not available
      return;
    }

    const { error, ...logData } = databaseLog;

    // Create log entry in DB
    const log = await prismaClient.systemLog.create({
      data: {
        timestamp: new Date(logData.timestamp),
        level: logData.level,
        source: logData.source,
        component: logData.component,
        module: logData.module,
        message: logData.message,
        metadata: logData.metadata || {},
        contextId: logData.context_id, // Corrected field name
        userId: logData.user_id ? String(logData.user_id) : null,// Assuming this should be contextId as well based on schema
        ipAddress: logData.ip_address, // Corrected field name
        requestPath: logData.request_path, // Corrected field name
        requestMethod: logData.request_method, // Corrected field name
        executionTime: logData.execution_time, // Corrected field name
      },
    });

    // Create error entry if error data exists
    if (error) {
      await prismaClient.systemError.create({ // Corrected model name
        data: {
          logId: log.id, // Corrected field name
          errorType: error.error_type || 'Error', // Corrected field name
          errorMessage: error.error_message || 'Unknown error', // Corrected field name
          stackTrace: error.stack_trace, // Corrected field name
          additionalData: error.additional_data || {}, // Corrected field name
        },
      });
    }
  } catch (err) {
    // CRITICAL: Log to stderr as fallback when database logging fails
    // This prevents silent failures and ensures errors are captured
    try {
      const errorMessage = err instanceof Error ? err.message : String(err);
      const fallbackLog = JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: 'Failed to write log to database',
        error: errorMessage,
        originalLog: {
          level: logData.level,
          message: logData.message,
          service: logData.service
        }
      });

      // Write to stderr (will be captured by Docker/systemd/process managers)
      process.stderr.write(`[PrismaTransport Error] ${fallbackLog}\n`);
    } catch (fallbackErr) {
      // If even stderr fails, at least try console as last resort
      console.error('[PrismaTransport] Critical failure:', err);
    }
  } finally {
    // Reset processing flag
    isProcessingLog = false;
  }
}

/**
 * Factory function to create database transport for Winston
 * Used instead of custom transport to avoid TypeScript issues
 */
export const createDatabaseTransport = () => {
  // Create custom format that writes logs to DB
  const databaseFormat = winston.format((info: any) => {
    // Get log data from WeakMap
    const logData = dbLogStorage.get(info);
    if (!logData || info.skipDatabase || info.processed) {
      return info;
    }

    // Mark as processed to prevent duplication
    info.processed = true;

    // Process DB log
    processDatabaseLog(logData);

    return info;
  });

  // Return dummy transport with database format
  return new winston.transports.Console({
    format: databaseFormat(),
    silent: true, // Do not output to console
  });
};

export default createDatabaseFormat;
