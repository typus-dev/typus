import { PrismaClient } from '../../../../../data/prisma/generated/client/index.js';

// Create a single Prisma instance that will be reused throughout the application
// Only log errors and warnings, not SQL queries to keep console clean
const prisma = new PrismaClient({
  log: ['info', 'warn', 'error']
});

// Export the instance as default
export default prisma;

// Also export for named imports
export { prisma };

// Configure Prisma logging
export const configurePrismaLogging = (enableQueryLogging: boolean = true) => {
  // Store original console.log
  const originalConsoleLog = console.log;

  console.log = (...args: any[]) => {
    // Skip system logs and error logs to prevent infinite loops
    if (typeof args[0] === 'string' && args[0].startsWith('prisma:query')) {
      if (args[0].includes('system.logs') || args[0].includes('system.errors')) {
        return; // Skip database logging table queries
      }
      
      if (!enableQueryLogging) {
        return; // Skip all Prisma queries if logging disabled
      }
    }
    
    // Call original console.log for everything else
    originalConsoleLog(...args);
  };
};

// Cleanup function for graceful shutdown
export async function disconnectPrisma() {
  await prisma.$disconnect();
}
