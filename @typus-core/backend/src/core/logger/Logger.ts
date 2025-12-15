// src/core/logger/Logger.ts
import winston from 'winston';
import path from 'path';
import fs from 'fs';
import { LoggerConfig } from './LoggerConfig.js';
import { createDatabaseFormat } from './transports/PrismaTransport.js';
import { ILogger } from './ILogger.js';
import { ContextManager } from '../context/ContextManager.js';
import {
  maskSecrets,
  maskSecretsInText,
  truncateLongStrings,
  getCallerInfo,
  formatTableForWinston,
  safeStringify,
} from './utils/LoggerUtils.js';

export class Logger implements ILogger {
  private logger: winston.Logger;
  private readonly colorizer = winston.format.colorize();

  /**
   * Enrich metadata with context information
   */
  private enrichMetadata(meta?: any): any {
    const contextManager = ContextManager.getInstance();
    const contextMetadata = contextManager.getLoggingMetadata();
    
    // If no explicit metadata provided, use context metadata
    if (!meta) {
      return contextMetadata;
    }
    
    // If metadata is provided, merge with context (explicit metadata takes precedence)
    if (typeof meta === 'object' && meta !== null) {
      return { ...contextMetadata, ...meta };
    }
    
    // If meta is not an object, return it as is with context metadata
    return { ...contextMetadata, metadata: meta };
  }

  constructor() {
    const config = LoggerConfig.getConfiguration();
    LoggerConfig.validateConfiguration(config);
    
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir);
    }

    const { standardTransports, databaseTransports } = LoggerConfig.createTransports(config);
    const baseFormats = [winston.format.timestamp()];

    if (databaseTransports.length > 0) {
      this.logger = winston.createLogger({
        level: config.level,
        defaultMeta: { service: 'backend-service' },
        format: winston.format.combine(
          ...baseFormats,
          createDatabaseFormat(),
          winston.format.json()
        ),
        transports: standardTransports,
      });
      databaseTransports.forEach(transport => {
        this.logger.add(transport);
      });
    } else {
      const standardFormat = winston.format.combine(
        ...baseFormats,
        winston.format.json()
      );
      this.logger = winston.createLogger({
        level: config.level,
        defaultMeta: { service: 'backend-service' },
        format: standardFormat,
        transports: standardTransports,
      });
    }
  }

  /**
   * Reconfigure logger with new configuration from database
   * This is called after ConfigService is initialized
   */
  async reconfigure(config: winston.LoggerOptions & { level?: string }): Promise<void> {
    try {
      // Update log level
      if (config.level) {
        this.logger.level = config.level;
      }

      // Clear existing transports
      this.logger.clear();

      // Re-add transports from new config
      if (config.transports) {
        config.transports.forEach(transport => {
          this.logger.add(transport);
        });
      }

      this.logger.info('[Logger] Reconfigured with database settings');
    } catch (error) {
      this.logger.error('[Logger] Failed to reconfigure', { error });
    }
  }

  info(message: string, meta?: any): void {
    this.log('info', message, meta);
  }

  error(message: string, meta?: any): void {
    this.log('error', message, meta);
  }

  warn(message: string, meta?: any): void {
    this.log('warn', message, meta);
  }

  debug(message: string, meta?: any): void {
    this.log('debug', message, meta);
  }

  private log(level: 'info' | 'error' | 'warn' | 'debug', message: string, meta?: any) {
    const relativeCaller = getCallerInfo();
    let enrichedMeta = this.prepareMetadata(level, relativeCaller, meta);

    // Normalize message and infer WHAT if not present
    const cleanedMessage = this.stripLeadingTag(message);
    const inferredWhat = this.inferWhatFromMessage(cleanedMessage, enrichedMeta);
    if (inferredWhat && !enrichedMeta.what) {
      enrichedMeta.what = inferredWhat;
    }

    // Demote noisy "Method called" info logs to debug
    let effectiveLevel = level;
    if (effectiveLevel === 'info' && /\bMethod called\b/i.test(cleanedMessage)) {
      effectiveLevel = 'debug';
    }

    const summary = this.buildSummary(effectiveLevel, cleanedMessage, enrichedMeta);

    const rawPayload = maskSecrets(truncateLongStrings(enrichedMeta));
    const payload = this.filterDuplicateMeta(rawPayload);

    if (effectiveLevel === 'error' && meta instanceof Error) {
      (payload as any).error = {
        message: meta.message,
        stack: meta.stack,
        name: meta.name
      };
    }

    if (payload && typeof payload === 'object' && Object.keys(payload).length === 0) {
      this.logger.log(effectiveLevel, summary);
    } else {
      this.logger.log(effectiveLevel, summary, payload);
    }
  }

  table(title: string, data: any[], columns?: string[]): void {
    this.info(title);
    if (!data || data.length === 0) {
      console.log('  No data to display');
      return;
    }
    
    let processedData = data;
    if (columns && columns.length > 0) {
      processedData = data.map(item => {
        const filteredItem: any = {};
        columns.forEach(col => {
          if (item.hasOwnProperty(col)) {
            filteredItem[col] = item[col];
          }
        });
        return filteredItem;
      });
    }
    
    console.table(processedData);
  }

  private prepareMetadata(level: string, relativeCaller: string, meta?: any) {
    const enrichedMeta = this.enrichMetadata(meta) || {};
    const caller = this.resolveCaller(relativeCaller);
    if (typeof enrichedMeta === 'object' && enrichedMeta !== null) {
      enrichedMeta.where = caller.path;
      enrichedMeta.className = enrichedMeta.className || caller.className;
      enrichedMeta.methodName = enrichedMeta.methodName || caller.methodName;
      if (!('timestamp' in enrichedMeta)) {
        enrichedMeta.timestamp = new Date().toISOString();
      }
      if (enrichedMeta.userAgent) {
        enrichedMeta.userAgent = this.shortenUserAgent(enrichedMeta.userAgent);
      }
    }
    enrichedMeta.service = enrichedMeta.service || 'backend';
    enrichedMeta.level = level.toUpperCase();
    return enrichedMeta;
  }

  private buildSummary(level: string, message: string, meta: any): string {
    const service = meta?.service || 'backend';
    const time = this.formatTime(meta?.timestamp);
    const levelColored = this.colorizeLevel(level);
    const who = this.buildWho(meta);
    const what = this.buildWhat(meta);
    const location = this.buildLocation(meta);
    const cleanMessage = maskSecretsInText(this.stripLeadingTag(message));

    const parts = [
      `[${service}]`,
      time,
      levelColored,
      who,
      what,
      location
    ].filter(part => part && part.length > 0);

    return `${parts.join(' ')} - ${cleanMessage}`.trim();
  }

  private formatTime(timestamp?: string): string {
    const date = timestamp ? new Date(timestamp) : new Date();
    return date.toISOString().slice(11, 23); // HH:mm:ss.SSS
  }

  private buildWho(meta: any): string {
    if (!meta) return '[n/a]';

    // Explicit override
    if (typeof meta.who === 'string' && meta.who.trim().length) {
      return `[${meta.who}]`;
    }

    // Prefer identified user when available
    if (meta.userId !== undefined && meta.userId !== null) {
      const ip = meta.ipAddress || 'n/a';
      return `[${meta.userId}@${ip}]`;
    }

    // Task context
    if (meta.taskId) {
      return `[task#${meta.taskId}]`;
    }

    // Request correlation id (HTTP chain)
    if (meta.requestId) {
      const shortReq = String(meta.requestId).slice(0, 8);
      return `[req#${shortReq}]`;
    }

    // Anonymous HTTP
    if (meta.ipAddress) {
      return `[anon@${meta.ipAddress}]`;
    }

    // System/default
    if (meta.source === 'system') {
      return `[system]`;
    }
    return '[system]';
  }

  private buildWhat(meta: any): string {
    if (!meta) return '';
    if (typeof meta.what === 'string' && meta.what.trim().length) {
      return `[${meta.what}]`;
    }
    if (meta.requestMethod && meta.requestPath) {
      const status = meta.status !== undefined && meta.status !== null ? meta.status : '';
      const duration = meta.durationMs !== undefined && meta.durationMs !== null ? `${meta.durationMs}ms` : '';
      const parts = [`${meta.requestMethod}`, meta.requestPath, status, duration].filter(Boolean);
      // Per spec, omit the "HTTP" prefix in the bracket
      return parts.length ? `[${parts.join(' ')}]` : '';
    }
    if (meta.queueAction) {
      return `[QUEUE:${meta.queueAction}]`;
    }
    if (meta.wsAction) {
      return `[WS:${meta.wsAction}]`;
    }
    if (meta.operation && meta.model) {
      return `[DSL:${meta.operation}]`;
    }
    return '';
  }

  private buildLocation(meta: any): string {
    const where = meta?.where || '';
    const moduleName = this.computeModuleName(where);
    const method = meta?.className && meta?.methodName
      ? `${moduleName ? moduleName + '.' : ''}${meta.className}.${meta.methodName}`
      : meta?.methodName || '';
    const parts = [];
    if (method) {
      parts.push(method);
    }
    if (where) {
      parts.push(`@ ${where}`);
    }
    return parts.join(' ');
  }

  private shortenUserAgent(userAgent: string): string {
    if (!userAgent) return userAgent;
    const browsers = ['Chrome', 'Firefox', 'Safari', 'Edge', 'OPR'];
    for (const browser of browsers) {
      const index = userAgent.indexOf(browser);
      if (index !== -1) {
        const versionMatch = userAgent.substring(index).match(/[^\/\s]+\/([\d.]+)/);
        const version = versionMatch ? versionMatch[1] : '';
        return `${browser}${version ? '/' + version.split('.')[0] : ''}`;
      }
    }
    return userAgent.split(' ')[0];
  }

  private colorizeLevel(level: string): string {
    const upper = level.toUpperCase();
    try {
      return this.colorizer.colorize(level, upper);
    } catch {
      return upper;
    }
  }

  private resolveCaller(relative: string) {
    const result = {
      raw: relative,
      className: '',
      methodName: '',
      path: ''
    };

    if (!relative) {
      return result;
    }

    const cleaned = relative.replace(/^at\s+/, '').trim();
    const match = cleaned.match(/^(.*)\s+\((.*)\)$/);
    let signature = cleaned;
    let location = '';

    if (match) {
      signature = match[1];
      location = match[2];
    } else {
      const parts = cleaned.split(' ');
      if (parts.length > 1) {
        signature = parts[0];
        location = parts[1];
      }
    }

    if (signature.includes('.')) {
      const sigParts = signature.split('.');
      result.methodName = sigParts.pop() || '';
      result.className = sigParts.join('.') || '';
    } else {
      result.methodName = signature;
    }

    if (location) {
      location = location.replace(/[()]/g, '');
      const normalized = location.replace(/\\/g, '/');
      // Extract after /src/
      let afterSrc = normalized;
      const srcIdx = normalized.indexOf('/src/');
      if (srcIdx !== -1) {
        afterSrc = normalized.substring(srcIdx + '/src/'.length);
      } else {
        const relativePath = path.relative(process.cwd(), normalized).replace(/\\/g, '/');
        afterSrc = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
      }
      // Keep only path:line (drop :column)
      const m = afterSrc.match(/^(.*?\.[tj]s):(\d+)(?::\d+)?$/);
      result.path = m ? `${m[1]}:${m[2]}` : afterSrc;
    }

    if (!result.path && signature.includes('/src/')) {
      const idx = signature.indexOf('/src/');
      const after = signature.substring(idx + '/src/'.length);
      const m2 = after.match(/^(.*?\.[tj]s):(\d+)(?::\d+)?$/);
      result.path = m2 ? `${m2[1]}:${m2[2]}` : after;
    }

    // Fallback: if className is missing or Proxy/<anonymous>, derive from filename
    if (!result.className || result.className.toLowerCase() === 'proxy' || result.className === '<anonymous>') {
      const filePart = result.path.split(':')[0] || '';
      const base = filePart.split('/').pop() || '';
      const name = base.replace(/\.[tj]s$/, '');
      if (name) result.className = name;
    }
    if (!result.methodName || result.methodName === '<anonymous>') {
      // leave as-is; can be overridden via meta
    }

    return result;
  }

  private stripLeadingTag(message: string): string {
    if (typeof message !== 'string') return message as any;
    // Remove a leading bracketed tag like "[TaskWorker] "
    let m = message.replace(/^\s*\[[^\]]+\]\s+/, '');
    // Remove common emoji prefixes (e.g., 🔍, 📦, 🎯, ✅, 🚀) at start
    m = m.replace(/^[\u{1F300}-\u{1FAFF}]\s+/u, '');
    // Remove "Method called: " noise
    m = m.replace(/^\s*Method called:\s*/i, '');
    return m;
  }

  private computeModuleName(where: string): string {
    if (!where) return '';
    const p = where.split('/');
    if (p[0] === 'core' && p[1] === 'queue') return 'queue';
    if (p[0] === 'core' && p[1] === 'websocket') return 'websocket';
    if (p[0] === 'core' && (p[1] === 'middleware' || p[1] === 'security')) return 'http';
    return p[0] || '';
  }

  private inferWhatFromMessage(message: string, meta: any): string | undefined {
    if (meta?.what) return undefined;
    const m = message.toLowerCase();
    if (m.includes('broadcast')) return 'WS:broadcast';
    if (m.includes('task queued') || m.includes('will be retried')) return 'QUEUE:schedule';
    if (m.includes('processing task')) return 'QUEUE:process';
    if (m.includes('task completed')) return 'QUEUE:complete';
    if (m.includes('task execution failed') || m.includes('failed after max attempts')) return 'QUEUE:failed';
    if (m.includes('retry')) return 'QUEUE:retry';
    if (m.includes('query executed')) return 'DB:query';
    if (m.includes('insert')) return 'DB:insert';
    if (m.includes('update')) return 'DB:update';
    return undefined;
  }

  private filterDuplicateMeta(meta: any): any {
    if (!meta || typeof meta !== 'object') return meta;
    const {
      where, className, methodName, timestamp, service, level,
      requestMethod, requestPath, status, durationMs, userAgent, ua,
      what, wsAction, queueAction,
      ipAddress, userId,
      ...rest
    } = meta;
    return rest;
  }
}
