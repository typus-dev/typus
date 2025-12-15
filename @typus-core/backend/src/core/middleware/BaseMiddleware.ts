import { Request, Response, NextFunction } from 'express';

export abstract class BaseMiddleware {
  constructor() {
    // BaseMiddleware constructor logic here
  }
  
  abstract use(req: Request, res: Response, next: NextFunction): void;
}