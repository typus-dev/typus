import { CorsOptions } from 'cors';
import { config as dbConfig, type DbConfig, type DbEnv } from './db.config';
import corsOptions from './cors.config';
import { env } from './env.config';

const nodeEnv = (env.NODE_ENV || 'development') as DbEnv;

interface EmailConfig {
  apiKey: string;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from: string;
}

interface AppConfig {
  env: string;
  appSecret: string;
  port: number;
  jwtSecret: string;
  jwtExpire: number;
  corsOptions: CorsOptions;
  dbOptions: DbConfig[DbEnv];
  email: EmailConfig;
  frontendUrl: string;
}

const config: AppConfig = {
  env: env.NODE_ENV || 'development',
  appSecret: env.APP_SECRET,
  port: env.PORT,
  jwtSecret: env.JWT_SECRET,
  jwtExpire: env.JWT_EXPIRE,
  corsOptions,
  dbOptions: dbConfig[nodeEnv],
  email: {
    apiKey: env.SMTP_API_KEY,
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    user: env.SMTP_USER,
    password: env.SMTP_PASSWORD,
    from: env.EMAIL_FROM
  },
  frontendUrl: env.FRONTEND_URL,
};

export default config;