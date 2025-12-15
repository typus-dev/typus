import { CorsOptions } from 'cors';

const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:9000',
    'http://localhost:8080',
    'http://localhost:8081',
    'http://localhost:8082',
    'http://localhost:8083',
    global.env.ADMIN_APP_URL,
    global.env.BASE_API_URL,
    global.env.BACKEND_URL,
  ].filter((origin): origin is string => Boolean(origin));

const corsOptions: CorsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Always allow requests with no origin (e.g. mobile apps, curl requests)
    if (!origin) {
      return callback(null, true);
    }

    if (process.env.NODE_ENV === 'development') {
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
    } else {
      // Production: Check against a list of allowed origins or your production domain
      const allowedProductionOrigins = [
        global.env.BACKEND_URL || 'your-production-domain.com',
        // Add other production domains as needed
      ];

      if (allowedProductionOrigins.includes(origin)) {
        return callback(null, true);
      }
    }

    console.warn('CORS blocked origin:', origin);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

export default corsOptions;
