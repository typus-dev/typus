// src/core/logger/utils/LoggerUtils.ts
import winston from 'winston';

// Color constants
export const COLOR_POOL = [
  '\x1b[36m', // Cyan
  '\x1b[32m', // Green
  '\x1b[33m', // Yellow
  '\x1b[35m', // Magenta
  '\x1b[34m', // Blue
];

export const RESET_COLOR = '\x1b[0m';
export const PATH_COLOR = '\x1b[34m'; // Blue
export const ERROR_COLOR = '\x1b[31m'; // Red
export const META_COLOR = '\x1b[35m'; // Magenta
export const MESSAGE_COLOR = '\x1b[33m'; // Yellow
export const STACK_COLOR = '\x1b[36m'; // Cyan

// Icons
export const ERROR_ICON = '❌'; // Red X for errors only
export const INFO_ICON = 'ℹ️'; // Info icon
export const WARN_ICON = '⚠️'; // Warning icon

// Tag management
class TagColorManager {
  private static tagColors = new Map<string, string>();
  private static lastColorIndex = 0;

  static extractTag(message: string): string | null {
    if (typeof message !== 'string') return null;
    const match = message.match(/\[(.*?)\]/);
    return match ? match[0] : null;
  }

  static getColorForTag(tag: string): string {
    if (!this.tagColors.has(tag)) {
      const color = COLOR_POOL[this.lastColorIndex % COLOR_POOL.length];
      this.lastColorIndex++;
      this.tagColors.set(tag, color);
    }
    return this.tagColors.get(tag)!;
  }
}

export { TagColorManager };

// Security utilities
export function maskSecrets(obj: any): any {
  const secretKeys = ['password', 'token', 'apiKey', 'secret', 'authorization', 'accessToken', 'refreshToken'];

  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  const clone = Array.isArray(obj) ? [...obj] : { ...obj };

  for (const key in clone) {
    if (Object.prototype.hasOwnProperty.call(clone, key)) {
      if (secretKeys.includes(key.toLowerCase())) {
        clone[key] = '***MASKED***';
      } else if (typeof clone[key] === 'object' && clone[key] !== null) {
        clone[key] = maskSecrets(clone[key]);
      }
    }
  }
  return clone;
}

export function maskSecretsInText(text: string): string {
  if (typeof text !== 'string') return text;
  const secretPatterns = [
    /(password\s*=\s*)[^\s&]+/gi,
    /(token\s*=\s*)[^\s&]+/gi,
    /(apiKey\s*=\s*)[^\s&]+/gi,
    /(authorization\s*:\s*)[^\s&]+/gi
  ];

  secretPatterns.forEach(pattern => {
    text = text.replace(pattern, '$1***MASKED***');
  });
  return text;
}

// String utilities
export function truncateLongStrings(obj: any, maxWords: number = 20, seen: WeakSet<object> = new WeakSet()): any {
  const truncateString = (str: string): string => {
    if (typeof str !== 'string') return str;
    const words = str.split(/\s+/);
    if (words.length <= maxWords) return str;
    const truncated = words.slice(0, maxWords).join(' ');
    return `${truncated}... [TRUNCATED: ${words.length - maxWords} more words]`;
  };

  if (typeof obj === 'string') {
    return truncateString(obj);
  }
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }
  
  // Check for circular references
  if (seen.has(obj)) {
    return '[Circular]';
  }
  seen.add(obj);
  
  if (Array.isArray(obj)) {
    return obj.map(item => truncateLongStrings(item, maxWords, seen));
  }
  
  const clone: Record<string, any> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      if (typeof value === 'string') {
        clone[key] = truncateString(value);
      } else if (typeof value === 'object' && value !== null) {
        clone[key] = truncateLongStrings(value, maxWords, seen);
      } else {
        clone[key] = value;
      }
    }
  }
  return clone;
}

// Caller utilities
export function getCallerInfo(): string {
  const stack = new Error().stack;
  if (!stack) return 'unknown caller';

  const lines = stack.split('\n').slice(2); // skip Error + current function
  const isLoggerFrame = (s: string) => (
    s.includes('/core/logger/') ||
    s.includes('Logger.') ||
    s.includes('LoggerUtils') ||
    s.includes('LoggerConfig') ||
    s.includes('/core/base/BaseService') ||
    s.includes('Proxy.<anonymous>') ||
    s.includes('/node_modules/winston') ||
    s.includes('node:internal')
  );

  // Prefer the first frame under /src/ that's not from logger
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (isLoggerFrame(trimmed)) continue;
    if (trimmed.includes('/src/')) return trimmed;
  }

  // Fallback: first non-logger frame
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (isLoggerFrame(trimmed)) continue;
    return trimmed;
  }

  return lines[0]?.trim() || 'unknown caller';
}

// Size parsing utilities
export function parseSize(sizeStr: string): number {
  const match = sizeStr.match(/^(\d+)(.*)?$/);
  if (!match) return 20971520; // 20MB default
  
  const size = parseInt(match[1]);
  const unit = match[2]?.toLowerCase() || 'b';
  
  switch (unit) {
    case 'kb': return size * 1024;
    case 'mb': case 'm': return size * 1024 * 1024;
    case 'gb': case 'g': return size * 1024 * 1024 * 1024;
    default: return size;
  }
}

export function parseDays(daysStr: string): number {
  const match = daysStr.match(/^(\d+)d?$/);
  return match ? parseInt(match[1]) : 14;
}

// Safe JSON stringify with circular reference handling
export function safeStringify(obj: any, space: number = 2): string {
  const seen = new WeakSet();
  return JSON.stringify(obj, (key, value) => {
    if (key === '_events' || key === 'socket' || key === 'req' || 
        key === '_httpMessage' || key === 'client' || key === 'parser' ||
        key === '_readableState' || key === '_writableState' || 
        key === 'incoming' || key === 'outgoing' || key === 'server') {
      return '[Circular]';
    }
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
    }
    return value;
  }, space);
}

// Winston format utilities
export function createColorizeTagsFormat() {
  return winston.format((info) => {
    if (typeof info.message === 'string') {
      const tag = TagColorManager.extractTag(info.message);
      if (tag) {
        const color = TagColorManager.getColorForTag(tag);
        info.message = info.message.replace(tag, `${color}${tag}${RESET_COLOR}`);
      }
    }
    return info;
  });
}

// Table formatting utilities for Winston integration
export function formatTableForWinston(title: string, data: any[], columns?: string[]): string {
  if (!data || data.length === 0) {
    return `${title}\n  No data to display`;
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

  // Create beautiful table format with borders
  const headers = columns || Object.keys(processedData[0] || {});
  const maxWidths = headers.reduce((acc, header) => {
    acc[header] = Math.max(
      header.length,
      ...processedData.map(row => String(row[header] || '').length)
    );
    return acc;
  }, {} as Record<string, number>);

  let tableString = `${title}\n`;
  
  // Top border
  const topBorder = '┌─' + headers.map(h => '─'.repeat(maxWidths[h])).join('─┬─') + '─┐';
  tableString += `  ${topBorder}\n`;
  
  // Header row
  const headerRow = '│ ' + headers.map(h => h.padEnd(maxWidths[h])).join(' │ ') + ' │';
  tableString += `  ${headerRow}\n`;
  
  // Header separator
  const headerSep = '├─' + headers.map(h => '─'.repeat(maxWidths[h])).join('─┼─') + '─┤';
  tableString += `  ${headerSep}\n`;
  
  // Data rows
  processedData.forEach((row, index) => {
    const dataRow = '│ ' + headers.map(h => String(row[h] || '').padEnd(maxWidths[h])).join(' │ ') + ' │';
    tableString += `  ${dataRow}\n`;
  });
  
  // Bottom border
  const bottomBorder = '└─' + headers.map(h => '─'.repeat(maxWidths[h])).join('─┴─') + '─┘';
  tableString += `  ${bottomBorder}`;

  return tableString;
}
