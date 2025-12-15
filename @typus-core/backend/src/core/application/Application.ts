import '../../config/env.config.js'; // Ensure env.config.ts is loaded first
import 'reflect-metadata';
import express, { Application as ExpressApp } from 'express';
import { createServer, Server } from 'http';
import { container } from 'tsyringe';
import { Logger } from '../logger/Logger.js';
import { MiddlewareConfigurator } from '../middleware/MiddlewareConfigurator.js';
import { requestLogger } from '../middleware/RequestLoggerMiddleware.js';
import { requestId } from '../middleware/RequestIdMiddleware.js';
import { Router } from '../routing/Router.js';
import { ModuleLoader } from '../../module-loader.js';
import { RateLimitMiddleware } from '../security/middlewares/RateLimitMiddleware.js';
import { getDatabaseTables } from '../../utils/getTables.js';
import { ErrorHandlerMiddleware } from '../middleware/ErrorHandlerMiddleware.js';
import { initLogCleanup } from '../logger/cleanup/index.js';
import { DslService } from '../../dsl/services/DslService.js'; // Import DslService
import { DynamicRouterService } from '../../dynamic-router/services/DynamicRouterService.js'; // Import DynamicRouterService
import { WebSocketService } from '../websocket/WebSocketService.js'; // Import WebSocketService
import { RedisService } from '../redis/RedisService.js'; // Import RedisService
import { RedisServiceStub } from '../redis/RedisServiceStub.js'; // Import RedisServiceStub
import prisma from '../database/prisma.js'; // Import Prisma client
import { LoggerFactory } from '../logger/LoggerFactory.js'; // Import LoggerFactory
import { TaskScheduler } from '../queue/workers/TaskScheduler.js'; // Import TaskScheduler
import { TaskWorker } from '../queue/workers/TaskWorker.js'; // Import TaskWorker
import { loadRuntimeConfig } from '../../config/runtime.config.js'; // Import Runtime Config Loader
import { ConfigService } from '../../modules/system/services/ConfigService.js'; // Import ConfigService
import { bootSml, isSmlReady } from '../../sml/index.js'; // Import SML boot


global.logger = LoggerFactory.getGlobalLogger();

export class Application {
  private app: ExpressApp;
  private server: Server;
  private port: number;
  private startTime = Date.now(); // Start time for stats
  private stats = { // Application startup statistics
    modulesLoaded: 0,
    warnings: 0,
    errors: 0
  };

  // Register core services as singletons
  private registerSingletons(): void {
    container.registerSingleton(DslService);
    container.registerSingleton(DynamicRouterService);

    // WebSocket: Always enabled (works with or without Redis)
    container.registerSingleton(WebSocketService);
    global.logger.info('[Application] Registered WebSocket service (supports graceful degradation without Redis)');

    // Redis: Only enabled if REDIS_ENABLED=true
    if (process.env.REDIS_ENABLED === 'true') {
      container.registerSingleton(RedisService);
      global.logger.info('[Application] Registered Redis service (FULL profile - Pub/Sub enabled)');
    } else {
      container.registerSingleton(RedisService, RedisServiceStub as any);
      global.logger.info('[Application] Registered Redis stub (STARTER profile - no Pub/Sub)');
    }

    global.logger.info('[Application] Registered core services as singletons.');
  }

  constructor() {
    // Set the centralized Prisma instance globally for compatibility
    global.prisma = prisma;
    
    this.registerSingletons(); // Register singletons first

    this.app = express(); 
    this.app.set('trust proxy', 1);

    this.port = parseInt(global.env.SERVER_PORT, 10);

    this.initialize(); 
  }


  private async initialize(): Promise<void> {
    try {
      await this.connectDatabase();

      // Reconfigure logger with database settings after DB is connected
      try {
        await LoggerFactory.reconfigureFromDatabase(prisma);
      } catch (error) {
        global.logger.warn('[Application] Could not reconfigure logger from database, using env defaults', { error });
      }

      // Load runtime configuration from database
      try {
        const configService = container.resolve(ConfigService);
        await loadRuntimeConfig(configService);
        global.logger.info('[Application] Runtime configuration loaded from database');
      } catch (error) {
        global.logger.warn('[Application] Could not load runtime config from database, using env defaults', { error });
      }

      await this.configureMiddleware();

      await this.loadModules();

      await this.bootSmlRegistry();

      await this.configureRoutes(); 

      await this.configureErrorHandling(); 

      await this.startServer();
      await this.loadPluginWorkers(); // Load and register plugin worker handlers FIRST
      await this.startBackgroundWorkers(); // Start TaskScheduler and TaskWorker for STARTER profile
      await this.printStartupStats(); // Print startup statistics

    } catch (error) {
      this.handleStartupError(error);
    }
  }

  /**
   * Start background workers for STARTER profile
   * TaskScheduler and TaskWorker run embedded in backend when queue.driver=database
   */
  private async startBackgroundWorkers(): Promise<void> {
    const queueDriver = global.runtimeConfig.queueDriver;

    if (queueDriver === 'database') {
      global.logger.info('[Application] Starting background workers for STARTER profile...');

      try {
        // Start TaskScheduler (reads dispatcher.tasks and creates queue_tasks)
        const taskScheduler = container.resolve(TaskScheduler);
        taskScheduler.start();

        // Start TaskWorker (processes queue_tasks)
        const taskWorker = container.resolve(TaskWorker);
        taskWorker.start();

        global.logger.info('[Application] ✅ Background workers started (STARTER profile)');
      } catch (error) {
        global.logger.error('[Application] Failed to start background workers:', error);
        this.stats.errors++;
      }
    } else {
      global.logger.info('[Application] Background workers skipped (FULL profile - using Dispatcher container)');
    }
  }

  /**
   * Load plugin worker handlers
   * Scans plugin worker directories and registers TaskHandlers in TaskHandlerRegistry
   */
  private async loadPluginWorkers(): Promise<void> {
    global.logger.info('[Application] Loading plugin worker handlers...');

    try {
      await ModuleLoader.loadPluginWorkers(this.stats);
      global.logger.info('[Application] ✅ Plugin worker handlers loaded');
    } catch (error) {
      global.logger.error('[Application] Failed to load plugin worker handlers:', error);
      this.stats.errors++;

      // Don't throw - allow application to start even if plugin workers fail
      global.logger.warn('[Application] Application will continue without plugin workers');
    }
  }

  private async printStartupStats(): Promise<void> { // Log startup statistics
    const totalTime = Date.now() - this.startTime;
    const memUsage = process.memoryUsage();

    // Get SML stats
    let smlStats = { operations: 0, events: 0, ready: false };
    try {
      const { SML } = await import('../../sml/index.js');
      smlStats = {
        operations: SML.size,
        events: SML.eventCount,
        ready: isSmlReady()
      };
    } catch {
      // SML not available
    }

    // Prepare statistics data for table display
    const statsData = [
      { Metric: '⏱️  Startup Time', Value: `${totalTime}ms` },
      { Metric: '📦  Modules Loaded', Value: this.stats.modulesLoaded.toString() },
      { Metric: '🔌  SML Operations', Value: smlStats.operations.toString() },
      { Metric: '📡  SML Events', Value: smlStats.events.toString() },
      { Metric: '⚠️  Warnings', Value: this.stats.warnings.toString() },
      { Metric: '❌  Errors', Value: this.stats.errors.toString() },
      { Metric: '🧠  Memory Used', Value: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB` },
      { Metric: '📊  Heap Total', Value: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB` }
    ];

    global.logger.info('='.repeat(50));
    global.logger.info('🚀 APPLICATION STARTUP STATISTICS');
    global.logger.info('='.repeat(50));
    
    // Use table method for statistics
    global.logger.table('Application Statistics', statsData, ['Metric', 'Value']);
    
    global.logger.info('='.repeat(50));
  }

  private configureErrorHandling(): void {
    global.logger.info('[Application] Configuring error handling');
    this.app.use(new ErrorHandlerMiddleware().handle());
  }

  private async connectDatabase(): Promise<void> {
    const maxRetries = 10;
    const retryDelay = 2000; // 2 seconds
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        global.logger.info(`🔌 Database connection attempt ${attempt}/${maxRetries}`);
        
        // Simple retry without complex reset logic
        if (attempt > 1) {
          global.logger.info('🔄 Retrying database connection...');
        }
        
        await global.prisma.$connect();
        global.logger.info('✅ Successfully connected to the database');

        // Test the connection with a simple query
        try {
          const tables = await getDatabaseTables();
          
          // Use table method for database tables display
          const tableData = tables.map(tableName => ({ 
            'Table Name': tableName,
            'Status': '✅ Available'
          }));
          
          global.logger.table('Database Tables', tableData, ['Table Name', 'Status']);
        } catch (tableError) {
          global.logger.warn('⚠️ Connected to database but failed to list tables', { error: tableError });
        }

        return; // Success, exit the retry loop
      } catch (error) {
        global.logger.warn(`❌ Database connection attempt ${attempt}/${maxRetries} failed:`, { 
          error: error.message,
          stack: error.stack 
        });
        
        if (attempt === maxRetries) {
          global.logger.error('💀 Failed to connect to database after all retries', { error });
          throw error;
        }
        
        // Wait before retrying
        global.logger.info(`⏳ Waiting ${retryDelay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  private configureMiddleware(): void {
    global.logger.info('[Application] Configuring middleware...');

    // Correlate and log requests
    this.app.use(requestId);
    this.app.use(requestLogger);

    const middlewareConfigurator = new MiddlewareConfigurator(this.app);
    middlewareConfigurator.configure();

    
    const rateLimitMiddleware = container.resolve(RateLimitMiddleware);
    this.app.use(rateLimitMiddleware.use.bind(rateLimitMiddleware));

    global.logger.info('[Application] Middleware configured.');
  }

  private configureRoutes(): void {
    global.logger.info('[Application] Configuring routes...');

    const router = new Router(this.app);
    router.configure(); // Delegating route configuration to Router


    global.logger.info('[Application] Routes configured.');
  }

  /**
   * Boot SML (System Management Layer) registry.
   * Must be called after loadModules() so DSL registry is ready.
   */
  private async bootSmlRegistry(): Promise<void> {
    global.logger.info('[Application] Booting SML registry...');

    try {
      await bootSml();

      if (isSmlReady()) {
        global.logger.info('[Application] ✅ SML registry booted and locked');
      } else {
        global.logger.warn('[Application] ⚠️ SML registry boot completed but not ready');
        this.stats.warnings++;
      }
    } catch (error) {
      global.logger.error('[Application] ❌ SML registry boot failed:', error);
      this.stats.errors++;
      // Don't throw - allow application to start even if SML fails
      global.logger.warn('[Application] Application will continue without SML');
    }
  }

  private async loadModules(): Promise<void> {
    global.logger.info('[Application] Loading modules...');

    // First load core modules (like DSL)
    global.logger.info('[Application] Loading core modules...');
    await ModuleLoader.loadCoreModules(this.app, this.stats); // Pass stats
    global.logger.info('[Application] Core modules loaded.');

    // Initialize log cleanup service
    // This will use environment variables for configuration
    initLogCleanup();

    // Then load regular modules
    await ModuleLoader.loadModules(this.app, this.stats); // Pass stats

    // Finally load plugin modules
    global.logger.info('[Application] Loading plugin modules...');
    await ModuleLoader.loadPluginModules(this.app, this.stats); // Pass stats
    global.logger.info('[Application] Plugin modules loaded.');

    global.logger.info('[Application] All modules loaded.');
  }


private async startServer(): Promise<void> {
  this.server = createServer(this.app);

  // Initialize WebSocket (works with or without Redis)
  global.logger.info('[Application] Resolving WebSocket service...');
  const wsService = container.resolve(WebSocketService);
  global.logger.info('[Application] Initializing WebSocket service...');
  wsService.init(this.server);

  await new Promise<void>((resolve) => {
    this.server.listen(this.port, () => {
      const redisPubSub = process.env.REDIS_ENABLED === 'true' ? 'with Redis Pub/Sub' : 'without Redis Pub/Sub';
      global.logger.info(`✅ Server started with WebSocket (${redisPubSub}) on port ${this.port}`);
      global.logger.info(`🔌 WebSocket server available at: ws://localhost:${this.port}/ws`);
      resolve();
    });
  });
}


  private handleStartupError(error: any): void { // Handle application startup errors
    this.stats.errors++; // Increment error count
    global.logger.error('Application startup failed!', { error });
    process.exit(1); // Exit the process if startup fails
  }
}


export async function bootstrap() {
  new Application();
}
