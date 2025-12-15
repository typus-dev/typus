import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { Logger } from '@/core/logger/Logger.js';
import { configurePrismaLogging } from '@/core/database/prisma.js';

// In Docker, environment variables are already loaded from .env via docker compose
// We don't need to load the .env file again, just use the environment variables
const logger = global.logger || new Logger();

// Create masked version of environment variables for logging
const maskedEnv: Record<string, string> = {};
Object.keys(process.env).forEach(key => {
  const isSensitive = key.includes('SECRET') || key.includes('PASSWORD') || key.includes('KEY');
  maskedEnv[key] = isSensitive ? '********' : process.env[key] || '';
});

logger.debug('Environment variables:', maskedEnv);

interface EnvConfig {
  NODE_ENV: 'development' | 'test' | 'production';
  PORT: number;
  SERVER_PORT: number;
  HOST: string;
  DB_HOST: string;
  DB_PORT: number;
  DB_NAME: string;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_PROVIDER: string;
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRE: string | number;
  REFRESH_TOKEN_EXPIRE: string | number;
  APP_SECRET: string;
  INTERNAL_API_TOKEN: string;
  SMTP_PROVIDER: string;
  EMAIL_FROM: string;
  SMTP_API_KEY: string;
  SMTP_HOST: string;
  SMTP_PORT: number;
  SMTP_SECURE: boolean;
  SMTP_USER: string;
  SMTP_PASSWORD: string;
  MAILGUN_HOST: string;
  MAILGUN_PORT: number;
  MAILGUN_USER: string;
  MAILGUN_PASSWORD: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_CALLBACK_URL: string;
  BACKEND_URL: string;
  FRONTEND_URL: string;
  API_PATH: string;
  REDIS_URL: string;
  REDIS_SYSTEM_QUEUE: string;
  REDIS_NOTIFICATION_QUEUE: string;
  REDIS_EMAIL_QUEUE: string;
  REDIS_TELEGRAM_QUEUE: string;
  REDIS_REPORTS_QUEUE: string;
  REDIS_BACKUP_QUEUE: string;
  // Logging settings
  LOG_LEVEL: string;
  LOG_MODE: string;
  LOG_MAX_SIZE: string;
  LOG_MAX_DAYS: string;
  LOG_PRISMA_QUERIES: string;
  // Log cleanup settings
  LOG_MAX_RECORDS: number;
  LOG_CLEANUP_INTERVAL_MINUTES: number;
  LOG_CLEANUP_ON_START: boolean;
  // HTML Cache settings
  HTML_CACHE_ENABLED: boolean;
  HTML_CACHE_TTL: number;
  HTML_CACHE_MAX_SIZE_MB: number;
  HTML_CACHE_GENERATOR_URL: string;
  HTML_CACHE_API_SECRET: string;
  // Messaging - Telegram
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_ADMIN_CHAT_ID: string;
  // AI - Google Gemini
  AI_GEMINI_API_KEY: string;
  AI_GEMINI_API_URL: string;
  // AI - Together
  TOGETHER_API_KEY: string;
  TOGETHER_MODEL: string;
}

const getEnv = (key: string, fallback?: any): any => {
  const value = process.env[key];

  if (value === undefined) {
    if (fallback !== undefined) {
      console.warn(`Environment variable ${key} is not defined, using fallback value`);
      return fallback;
    }
    throw new Error(`Environment variable ${key} is not defined`);
  }
  return value;
};

const serverPort = parseInt(getEnv('SERVER_PORT'), 10);

logger.debug('=== Environment Configuration ===');
logger.debug(`Node Environment: ${process.env.NODE_ENV || 'not set'}`);
logger.debug(`Process Working Directory: ${process.cwd()}`);
logger.debug('===============================');

// Configure Prisma logging based on environment settings
logger.debug('Database Configuration:');
logger.debug('  DB_PROVIDER: ' + getEnv('DB_PROVIDER'));
logger.debug('  DATABASE_URL: ' + (getEnv('DATABASE_URL') ? '[CONFIGURED]' : '[NOT SET]'));

configurePrismaLogging(process.env.LOG_PRISMA_QUERIES === 'true');

export const env: EnvConfig = {
  NODE_ENV: getEnv('NODE_ENV') as EnvConfig['NODE_ENV'],
  PORT: serverPort,
  SERVER_PORT: serverPort,
  HOST: getEnv('HOST'),
  DB_HOST: getEnv('DB_HOST'),
  DB_PORT: parseInt(getEnv('DB_PORT'), 10),
  DB_NAME: getEnv('DB_NAME'),
  DB_USER: getEnv('DB_USER'),
  DB_PASSWORD: getEnv('DB_PASSWORD'),
  DB_PROVIDER: getEnv('DB_PROVIDER'),
  DATABASE_URL: getEnv('DATABASE_URL'),
  JWT_SECRET: getEnv('JWT_SECRET'),
  JWT_EXPIRE: getEnv('JWT_EXPIRE'),
  REFRESH_TOKEN_EXPIRE: getEnv('REFRESH_TOKEN_EXPIRE'),
  APP_SECRET: getEnv('APP_SECRET'),
  INTERNAL_API_TOKEN: getEnv('INTERNAL_API_TOKEN'),
  // SMTP settings - loaded from .env or database via ConfigService
  SMTP_PROVIDER: getEnv('SMTP_PROVIDER', ''),
  EMAIL_FROM: getEnv('EMAIL_FROM', ''),
  SMTP_API_KEY: getEnv('SMTP_API_KEY', ''),
  SMTP_HOST: getEnv('SMTP_HOST', ''),
  SMTP_PORT: parseInt(getEnv('SMTP_PORT', '0'), 10),
  SMTP_SECURE: getEnv('SMTP_SECURE', 'false') === 'true',
  SMTP_USER: getEnv('SMTP_USER', ''),
  SMTP_PASSWORD: getEnv('SMTP_PASSWORD', ''),
  MAILGUN_HOST: getEnv('MAILGUN_HOST', ''),
  MAILGUN_PORT: parseInt(getEnv('MAILGUN_PORT', '0'), 10),
  MAILGUN_USER: getEnv('MAILGUN_USER', ''),
  MAILGUN_PASSWORD: getEnv('MAILGUN_PASSWORD', ''),
  // Google OAuth - migrated to database (integrations.google_client_id, integrations.google_client_secret)
  GOOGLE_CLIENT_ID: getEnv('GOOGLE_CLIENT_ID', ''),
  GOOGLE_CLIENT_SECRET: getEnv('GOOGLE_CLIENT_SECRET', ''),
  GOOGLE_CALLBACK_URL: getEnv('GOOGLE_CALLBACK_URL', ''),
  BACKEND_URL: getEnv('BACKEND_URL'),
  FRONTEND_URL: getEnv('FRONTEND_URL'),
  API_PATH: getEnv('API_PATH'),
  REDIS_URL: getEnv('REDIS_URL', ''),
  REDIS_SYSTEM_QUEUE: getEnv('REDIS_SYSTEM_QUEUE', ''),
  REDIS_NOTIFICATION_QUEUE: getEnv('REDIS_NOTIFICATION_QUEUE', ''),
  REDIS_EMAIL_QUEUE: getEnv('REDIS_EMAIL_QUEUE', ''),
  REDIS_TELEGRAM_QUEUE: getEnv('REDIS_TELEGRAM_QUEUE', ''),
  REDIS_REPORTS_QUEUE: getEnv('REDIS_REPORTS_QUEUE', ''),
  REDIS_BACKUP_QUEUE: getEnv('REDIS_BACKUP_QUEUE', ''),
  // Logging settings
  LOG_LEVEL: getEnv('LOG_LEVEL', 'info'),
  LOG_MODE: getEnv('LOG_MODE', 'console'),
  LOG_MAX_SIZE: getEnv('LOG_MAX_SIZE', '20m'),
  LOG_MAX_DAYS: getEnv('LOG_MAX_DAYS', '14d'),
  LOG_PRISMA_QUERIES: getEnv('LOG_PRISMA_QUERIES', 'false'),
  // Log cleanup settings
  LOG_MAX_RECORDS: parseInt(getEnv('LOG_MAX_RECORDS', '10000'), 10),
  LOG_CLEANUP_INTERVAL_MINUTES: parseInt(getEnv('LOG_CLEANUP_INTERVAL_MINUTES', '60'), 10),
  LOG_CLEANUP_ON_START: getEnv('LOG_CLEANUP_ON_START', 'true') === 'true',
  // HTML Cache settings - loaded from .env or database
  HTML_CACHE_ENABLED: getEnv('HTML_CACHE_ENABLED', 'false') === 'true',
  HTML_CACHE_TTL: parseInt(getEnv('HTML_CACHE_TTL', '0'), 10),
  HTML_CACHE_MAX_SIZE_MB: parseInt(getEnv('HTML_CACHE_MAX_SIZE_MB', '0'), 10),
  HTML_CACHE_GENERATOR_URL: getEnv('HTML_CACHE_GENERATOR_URL', ''),
  HTML_CACHE_API_SECRET: getEnv('HTML_CACHE_API_SECRET', ''),
  // Messaging - Telegram (fallback to empty, will be loaded from database via ConfigService)
  TELEGRAM_BOT_TOKEN: getEnv('TELEGRAM_BOT_TOKEN', ''),
  TELEGRAM_ADMIN_CHAT_ID: getEnv('TELEGRAM_ADMIN_CHAT_ID', ''),
  // AI - Google Gemini (loaded from .env or database via ConfigService)
  AI_GEMINI_API_KEY: getEnv('AI_GEMINI_API_KEY', ''),
  AI_GEMINI_API_URL: getEnv('AI_GEMINI_API_URL', ''),
  // AI - Together (loaded from .env or database via ConfigService)
  TOGETHER_API_KEY: getEnv('TOGETHER_API_KEY', ''),
  TOGETHER_MODEL: getEnv('TOGETHER_MODEL', ''),
};

declare global {
  namespace NodeJS {
    interface Global {
      env: typeof env;
    }
  }
}

global.env = env;

export default env;
