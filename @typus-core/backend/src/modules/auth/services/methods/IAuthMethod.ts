/**
 * Interface for authentication methods
 * Defines common contract for all authentication methods
 */
export interface AuthRequest {
  email?: string;
  password?: string;
  token?: string;
  tempToken?: string;
  type?: string;
  [key: string]: any;
}

export interface AuthResponse {
  requiresTwoFactor?: boolean;
  requiresEmailVerification?: boolean;
  user?: any;
  accessToken?: string;
  refreshToken?: string;
  tempToken?: string;
  method?: string;
  message?: string;
  [key: string]: any;
}

export interface IAuthMethod {
  /**
   * Check if method can handle the request
   */
  canHandle(request: AuthRequest): boolean;
  
  /**
   * Initiate authentication process
   */
  initiate(request: AuthRequest): Promise<AuthResponse>;
  
  /**
   * Verify authentication
   */
  verify(request: AuthRequest): Promise<AuthResponse>;
  
  /**
   * Setup authentication method for user
   */
  setup(userId: number, options?: any): Promise<AuthResponse>;
  
  /**
   * Enable authentication method for user
   */
  enable?(userId: number, token: string, type?: string): Promise<AuthResponse>;
  
  /**
   * Disable authentication method for user
   */
  disable(userId: number): Promise<AuthResponse>;
}
