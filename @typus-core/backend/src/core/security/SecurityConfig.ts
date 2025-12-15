// src/core/security/SecurityConfig.ts
export class SecurityConfig {
    // Get JWT configuration
    static getJwtConfig(): JwtConfig {
        return {
            secret: global.env.JWT_SECRET,
            expiry: global.env.JWT_EXPIRE || '1h',
            refreshExpiry: global.env.REFRESH_TOKEN_EXPIRE || '7d'
        };
    }
    
    // Get password policy
    static getPasswordPolicy(): PasswordPolicy {
        return {
            minLength: 8,
            requireUppercase: true,
            requireLowercase: true,
            requireNumbers: true,
            requireSpecialChars: true,
            maxAge: 90 // days
        };
    }
    
    // Get rate limit configuration
    static getRateLimits(): RateLimitConfig {
        return {
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 1000, // requests per window
            skipSuccessfulRequests: false,
            skipFailedRequests: false
        };
    }
    
    // Get CORS configuration
    static getCorsConfig(): CorsConfig {
        return {
            origin: this.getAllowedOrigins(),
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
        };
    }
    
    // Get allowed origins for CORS
    private static getAllowedOrigins(): string[] {
        const origins = [
            global.env.FRONTEND_URL,
            global.env.ADMIN_APP_URL,
            'http://localhost:3000',
            'http://localhost:5173'
        ];
        return origins.filter(Boolean);
    }
}

interface JwtConfig {
    secret: string;
    expiry: string;
    refreshExpiry: string;
}

interface PasswordPolicy {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    maxAge: number;
}

interface RateLimitConfig {
    windowMs: number;
    max: number;
    skipSuccessfulRequests: boolean;
    skipFailedRequests: boolean;
}

interface CorsConfig {
    origin: string[];
    credentials: boolean;
    methods: string[];
    allowedHeaders: string[];
}
