
import { ILogger } from './src/core/logger/ILogger.js'; // Correct Logger interface import
import { Context } from './src/core/context/Context.js'; // Correct Context import
import { PrismaClient } from '@prisma/client';

declare global {
  // Global variables
  var prisma: PrismaClient;
  var logger: ILogger;
  var context: Context;
  
  // Define global object properties for NodeJS
  namespace NodeJS {
    interface Global {
      prisma: PrismaClient;
      logger: ILogger;
      context: Context;
    }
    
    interface GlobalThis {
      prisma: PrismaClient;
      logger: Logger;
      context: Context;
    }
  }
}
