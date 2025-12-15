
type LogLevel = 'query' | 'info' | 'warn' | 'error';
export type DbEnv = 'development' | 'test' | 'production';

export type DbConfig = {
  [K in DbEnv]: { log: LogLevel[] };
};

const env = (global.env.NODE_ENV || 'development') as DbEnv;

// Configuration for different environments
export const config: DbConfig = {
  development: {
    log: ['query', 'info', 'warn', 'error'],
  },
  test: {
    log: ['warn', 'error'],
  },
  production: {
    log: ['error'],
  },
};


