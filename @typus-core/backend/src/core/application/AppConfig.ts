// src/core/application/AppConfig.ts
import { SecurityConfig } from '../security/SecurityConfig.js';
import { LoggerConfig } from '../logger/LoggerConfig.js';
import * as winston from 'winston';

export class AppConfig {
    // Get application configuration
    static getConfig(): ApplicationConfig {
        return {
            server: {
                port: global.env.SERVER_PORT,
                host: global.env.HOST,
                apiPath: global.env.API_PATH
            },
            database: {
                url: global.env.DATABASE_URL,
                provider: global.env.DB_PROVIDER
            },
            security: SecurityConfig.getJwtConfig(),
            cors: SecurityConfig.getCorsConfig(),
            rateLimit: SecurityConfig.getRateLimits(),
            logging: {
                level: LoggerConfig.getConfiguration().level,
                transports: LoggerConfig.createTransports(LoggerConfig.getConfiguration()).standardTransports
            },
            email: {
                provider: global.env.SMTP_PROVIDER,
                from: global.env.EMAIL_FROM
            },
            queues: {
                enabled: true,
                pollInterval: 5000
            }
        };
    }
    
    // Validate required environment variables
    static validate(): void {
        const required = [
            'JWT_SECRET',
            'DATABASE_URL',
            'DB_PROVIDER',
            'FRONTEND_URL'
        ];

        for (const key of required) {
            if (!global.env[key]) {
                throw new Error(`Required environment variable ${key} is missing`);
            }
        }

        global.logger.info('[AppConfig] Configuration validated successfully');
    }
}

interface ApplicationConfig {
    server: {
        port: number;
        host: string;
        apiPath: string;
    };
    database: {
        url: string;
        provider: string;
    };
    security: {
        secret: string;
        expiry: string;
        refreshExpiry: string;
    };
    cors: {
        origin: string[];
        credentials: boolean;
        methods: string[];
        allowedHeaders: string[];
    };
    rateLimit: {
        windowMs: number;
        max: number;
        skipSuccessfulRequests: boolean;
        skipFailedRequests: boolean;
    };
    logging: {
        level: string;
        transports: winston.transport[];
    };
    email: {
        provider: string;
        from: string;
    };
    queues: {
        enabled: boolean;
        pollInterval: number;
    };
}
