import { Logger } from '@/core/logger/Logger.js';
import { ILogger } from '@/core/logger/ILogger.js'; // Import ILogger
import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient;
  var logger: ILogger; // Use ILogger for global.logger
  var env: any;
}

export {};
