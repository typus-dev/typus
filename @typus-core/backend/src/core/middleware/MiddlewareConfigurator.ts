// src/core/middleware/MiddlewareConfigurator.ts
import { Express, Application as ExpressApp } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import bodyParser from 'body-parser';
import { ContextManager } from '@/core/context/ContextManager.js';
import { Logger } from '@/core/logger/Logger.js';
import { ILogger } from '@/core/logger/ILogger.js';

import { LoggerFactory } from '@/core/logger/LoggerFactory.js';

export class MiddlewareConfigurator {
  private logger: ILogger;

  constructor(private app: ExpressApp) {
    this.logger = LoggerFactory.getGlobalLogger();
  }

  public configure(): void {


    // Security middleware with custom CSP for Google authentication
    this.app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://accounts.google.com", "https://*.googleusercontent.com"],
            connectSrc: ["'self'", "https://accounts.google.com", "https://*.googleapis.com"],
            frameSrc: ["'self'", "https://accounts.google.com"],
            imgSrc: ["'self'", "data:", "https://*.googleusercontent.com", "https://*.google.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
          },
        },
      })
    );
    this.app.use(cors());

    // Get max request size from environment variable (default to 10MB)
    const maxRequestSizeMB = process.env.LOG_MAX_BATCH_SIZE_MB || '10';
    const maxRequestSize = `${maxRequestSizeMB}mb`;

    this.logger.info(`[MiddlewareConfigurator] Setting max request size to ${maxRequestSize}`);

    // Body parsing middleware with size limit
    this.app.use(bodyParser.json({ limit: maxRequestSize }));
    this.app.use(bodyParser.urlencoded({ extended: true, limit: maxRequestSize }));

    // Context middleware
    this.app.use(ContextManager.getInstance().middleware());

    // Logging middleware - named method to avoid <anonymous> in logs
    this.app.use(this.logRequest.bind(this));


    this.logger.info('[MiddlewareConfigurator] configured');
  }

  private logRequest(req: any, res: any, next: any) {
    this.logger.info(`${req.method} ${req.path}`, { className: 'MiddlewareConfigurator', methodName: 'logRequest' });
    next();
  }
}
