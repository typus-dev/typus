import { Request, Response, NextFunction } from 'express';
import { BaseMiddleware } from '@/core/middleware/BaseMiddleware.js';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { env } from '@/config/env.config.js';

export class RateLimitMiddleware extends BaseMiddleware {
  private defaultLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // limit each IP to 100 requests per windowMs
    message: 'Too many requests, please try again later.',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    validate: {
      trustProxy: false,
    },
    // WHY req.ip and not x-forwarded-for: the old key took the LEFT-MOST hop of that header, i.e. whatever
    // the client wrote. Rotating a fake X-Forwarded-For reset the bucket on every request, so the limiter
    // limited nobody. Express runs with `trust proxy = 1`, so req.ip is the address traefik actually saw.
    keyGenerator: (req) => req.ip || req.socket.remoteAddress || '127.0.0.1'
  });

  private logLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 1000, // higher limit for log endpoints
    message: 'Too many log requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    validate: {
      trustProxy: false,
    },
    // WHY req.ip and not x-forwarded-for: the old key took the LEFT-MOST hop of that header, i.e. whatever
    // the client wrote. Rotating a fake X-Forwarded-For reset the bucket on every request, so the limiter
    // limited nobody. Express runs with `trust proxy = 1`, so req.ip is the address traefik actually saw.
    keyGenerator: (req) => req.ip || req.socket.remoteAddress || '127.0.0.1'
  });

  // WHY: a valid JWT used to skip rate limiting entirely, which meant the only thing standing between
  // one account and an unbounded loop over the paid pipeline was nothing at all. Signing in is not a
  // reason to trust someone without limit; it is a reason to count them by identity instead of by IP.
  // Generous on purpose: the waiting screen polls every 4s, so a single open tab is ~250 requests per
  // 15 minutes. This bounds runaway clients without touching normal use. Money-burning routes get a
  // far stricter limiter of their own, declared by the module that owns them.
  private userLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1500,
    message: 'Too many requests, please slow down.',
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false },
    keyGenerator: (req) => `user:${(req as any).rateLimitUserId ?? 'unknown'}`,
  });

  // WHY a separate, much tighter bucket: the default IP limiter allows 500 requests per 15 minutes,
  // which is generous for browsing and absurd for creating accounts. Every route below either mints
  // an account or makes the install send an email, so 500/15min means one unauthenticated script can
  // create 500 accounts, or send 500 letters from your domain, in a quarter of an hour from a single
  // address. On an install that grants anything to a new account -- credit, a trial, a free quota --
  // that is also a direct bill; on every install it is your sending reputation and a junk user table.
  // 5 per 15 minutes per IP is far above any human signing up and far below anything worth scripting.
  private accountLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many attempts from this address. Try again in a few minutes.' },
    keyGenerator: (req) => req.ip || req.socket.remoteAddress || '127.0.0.1',
    handler: (req, res, _next, options) => {
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      const info = (req as any).rateLimit;

      // Every hit goes to the console: cheap, and bounded by log rotation.
      global.logger?.warn?.('[RateLimit] account route blocked', {
        path: req.path, ip, used: info?.used, max: options.max
      });

      // Only the FIRST block per window is persisted. The handler runs on every blocked request, so a
      // row per call would let someone who is rate-limited on the API write to our disk without limit.
      // `used === max + 1` is true exactly once per window per IP.
      if (info?.used === (options.max as number) + 1) {
        const email = typeof req.body?.email === 'string' ? req.body.email.slice(0, 200) : null;
        global.prisma?.authHistory?.create({
          data: {
            login: email,
            email,
            result: 'rate_limited',
            token: '',                 // NOT NULL in the schema; there is no session to record here
            userName: req.path,        // which door was being knocked on
            deviceData: { ip, userAgent: String(req.headers['user-agent'] || '').slice(0, 300) },
            attemptTime: new Date(),
            updatedAt: new Date(),
          }
        }).catch((e: any) => global.logger?.warn?.('[RateLimit] could not record block', { error: e?.message }));
      }

      res.status(options.statusCode).json(options.message);
    }
  });

  // Account-minting and mail-sending routes. Matched on suffix because the module mounts under /api/auth.
  // NOTE google/login is here on purpose: it creates an account of its own, so it is a front door and
  // not just a sign-in.
  private static readonly ACCOUNT_PATHS = [
    '/auth/signup',
    '/auth/google/login',
    '/auth/password/reset-request',
    '/auth/verify/send',
  ];

  use(req: Request, res: Response, next: NextFunction): void {
    // Account creation / mail sending is checked FIRST and always by IP: these routes are reached
    // without a token, and presenting one must not buy a laxer bucket on a route that mints accounts.
    if (RateLimitMiddleware.ACCOUNT_PATHS.some(p => req.path.endsWith(p))) {
      return this.accountLimiter(req, res, next);
    }

    // A valid JWT no longer means "no limit": it means we can key the limit on the user instead of on
    // an IP that a client can rewrite at will.
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, env.JWT_SECRET) as any;
        (req as any).rateLimitUserId = decoded?.id ?? decoded?.sub ?? 'unknown';
        return this.userLimiter(req, res, next);
      } catch {
        // fall through to the IP limiter for invalid/expired tokens
      }
    }

    // Use separate limiter for log endpoints
    if (req.path === '/api/logs' || req.path.startsWith('/logs')) {
      this.logLimiter(req, res, next);
    } else {
      this.defaultLimiter(req, res, next);
    }
  }
}
