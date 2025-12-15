import { Context } from '@/core/context/Context.js';
import { Prisma } from '@prisma/client'; // Import Prisma namespace

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: Prisma.User; // Use Prisma.User type
      context?: Context;
    }
  }
}

export {};
