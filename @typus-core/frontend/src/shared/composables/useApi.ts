// src/shared/composables/useApi.ts
/**
 * API utilities for making HTTP requests
 * 
 * Changes made on 2025-04-27:
 * - Modified fetchBlobWithAuth to use the configured axios instance with interceptors
 * - Updated token refresh logic to use the same instance for consistency
 * - Added better error logging for blob requests
 * - Added retry limit for token refresh to prevent 429 errors
 * - Improved error handling for token refresh failures
 * - Added immediate redirect to login page on token refresh failure
 * 
 * FIXED: Improved data extraction logic to properly handle nested responses
 * without incorrectly extracting model data fields
 * 
 * This ensures that 401 errors are properly handled for all requests,
 * including blob/file requests, and users are redirected to login when tokens expire.
 */
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/core/store/authStore';
import router from '@/core/router'; // Import router for redirect

// Maximum number of token refresh attempts
const MAX_TOKEN_REFRESH_ATTEMPTS = 3;
// Track refresh attempts across the application
let tokenRefreshAttempts = 0;

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

instance.interceptors.request.use((config) => {
 const authStore = useAuthStore();
 
 // Check if route requires authentication
 const route = router.currentRoute.value;
 const requiresAuth = route.meta?.requiresAuth !== false && route.meta?.layout !== 'public';
 
 if (authStore.isAuthenticated.value && requiresAuth) {
   if (!config.headers) {
     config.headers = {} as any;
   }
   config.headers['Authorization'] = `Bearer ${authStore.accessToken.value}`;
 }
 
 logger.debug('[useApi] ➡️ Outgoing request:', { url: config.url, method: config.method, requiresAuth });
 return config;
});

instance.interceptors.response.use(
 (response) => {
   logger.debug('[useApi] ⬅️ Incoming response:', { url: response.config.url, status: response.status });
   // Reset token refresh attempts counter on successful response
   if (tokenRefreshAttempts > 0) {
     logger.debug('[useApi] 🔄 Resetting token refresh attempts counter');
     tokenRefreshAttempts = 0;
   }
   return response;
 },
 async (error) => {
   const originalRequest = error.config;

   // Handle 401 errors (Unauthorized)
   if (error.response?.status === 401 && !originalRequest._retry) {
     // Check if current route requires authentication
     const route = router.currentRoute.value;
     const requiresAuth = route.meta?.requiresAuth !== false && route.meta?.layout !== 'public';
     
     if (!requiresAuth) {
       // For public routes, don't attempt token refresh
       return Promise.reject({
         response: error.response,
         message: error.message,
         config: error.config
       });
     }
     
     // Check if we've exceeded the maximum number of refresh attempts
     if (tokenRefreshAttempts >= MAX_TOKEN_REFRESH_ATTEMPTS) {
       logger.error(`[useApi] 🔒 Maximum token refresh attempts (${MAX_TOKEN_REFRESH_ATTEMPTS}) reached`);
       const authStore = useAuthStore();
       authStore.clear();
       
       // Check if we're already on the login page to avoid redirect loops
       if (!window.location.pathname.includes('/auth/login')) {
         logger.debug('[useApi] 🔒 Redirecting to login page due to max refresh attempts');
         router.push('/auth/login');
       }
       
       return Promise.reject({
         response: error.response,
         message: 'Authentication session expired. Please log in again.',
         config: error.config
       });
     }
     
     // Increment the refresh attempts counter
     tokenRefreshAttempts++;
     logger.debug(`[useApi] 🔄 Token refresh attempt ${tokenRefreshAttempts}/${MAX_TOKEN_REFRESH_ATTEMPTS}`);
     
     originalRequest._retry = true;
     try {
       const authStore = useAuthStore();

       logger.debug('[useApi] 🔄 Attempting to refresh token');
       const response = await instance.post(`auth/refresh-token`, {
         refreshToken: authStore.refreshToken.value
       });
       
       logger.debug('[useApi] 🔄 Token refresh successful');
       authStore.setAuthData(response.data);
       instance.defaults.headers.common['Authorization'] = `Bearer ${response.data.accessToken}`;
       error.config.headers['Authorization'] = `Bearer ${response.data.accessToken}`;

       logger.debug('[useApi] 🔁 Token refreshed and retrying request:', originalRequest.url);
       return instance(error.config);
     } catch (error: unknown) {
       const refreshError = error as any;
       logger.error('[useApi] 🔒 Token refresh failed:', refreshError);
       
       // Clear authentication data
       const authStore = useAuthStore();
       authStore.clear();
       
       // Reset the refresh attempts counter
       tokenRefreshAttempts = 0;
       
       // Check if we're already on the login page to avoid redirect loops
       if (!window.location.pathname.includes('/auth/login')) {
         logger.debug('[useApi] 🔒 Redirecting to login page after failed token refresh');
         router.push('/auth/login');
       } else {
         logger.debug('[useApi] 🔒 Already on login page, not redirecting');
       }
       
       logger.error('[useApi] 🔒 Refresh token failed, user logged out');
       return Promise.reject({
         response: refreshError.response,
         message: 'Your session has expired. Please log in again.',
         config: originalRequest
       });
     }
   }
   
   return Promise.reject({
     response: error.response,
     message: error.message,
     config: error.config
   });
 }
);

/**
 * Safely extract data from API response
 * Handles different response formats without accidentally extracting model data fields
 */
function extractResponseData(response: any): any {
  if (!response || !response.data) {
    return response;
  }

  // Log the response structure for debugging
  logger.debug('[useApi] 🔍 Response structure analysis:', {
    hasData: 'data' in response,
    dataType: typeof response.data,
    hasNestedData: response.data && typeof response.data === 'object' && 'data' in response.data,
    nestedDataType: response.data && typeof response.data === 'object' && response.data.data ? typeof response.data.data : 'none',
    dataKeys: response.data && typeof response.data === 'object' ? Object.keys(response.data) : []
  });

  // Case 1: response.data is the actual data (simple response)
  // Example: { data: { id: 1, name: "test" } }
  if (response.data && typeof response.data === 'object') {
    
    // Case 2: response.data.data exists and looks like wrapped data
    // This happens when backend wraps response in { data: actualData }
    if (response.data.data !== undefined) {
      
      // Check if response.data.data looks like a model/entity (has id or other identifying fields)
      const nestedData = response.data.data;
      
      if (isModelEntity(nestedData)) {
        logger.debug('[useApi] ✅ Detected model entity in response.data.data, using it');
        return nestedData;
      }
      
      // Check if response.data looks like a wrapper with only a data field
      const responseDataKeys = Object.keys(response.data);
      if (responseDataKeys.length === 1 && responseDataKeys[0] === 'data') {
        logger.debug('[useApi] ✅ Detected wrapper object with only data field, unwrapping');
        return nestedData;
      }
      
      // If response.data has other fields besides data, it might be the actual entity
      logger.debug('[useApi] ✅ response.data has multiple fields, treating it as the entity');
      return response.data;
    }
    
    // Case 3: response.data is the actual entity/data
    logger.debug('[useApi] ✅ Using response.data as the entity');
    return response.data;
  }

  // Fallback: return as-is
  logger.debug('[useApi] ✅ Using response as-is (fallback)');
  return response.data || response;
}

/**
 * Check if an object looks like a model entity (has typical model fields)
 */
function isModelEntity(obj: any): boolean {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  // Common model fields that indicate this is an entity
  const modelIndicators = [
    'id', 
    'createdAt', 
    'updatedAt', 
    'name', 
    'title', 
    'email',
    'status',
    'type'
  ];

  const objKeys = Object.keys(obj);
  
  // If object has id, it's very likely a model
  if ('id' in obj) {
    return true;
  }

  // If object has at least 2 model-like fields, consider it a model
  const modelFieldCount = modelIndicators.filter(field => field in obj).length;
  
  // Also check if object has reasonable number of fields for a model (not just a single data field)
  const hasMultipleFields = objKeys.length > 1;
  
  return modelFieldCount >= 2 && hasMultipleFields;
}

const makeRequest = async (method: string, url: string, data: any = null, config: AxiosRequestConfig = {}) => {
  logger.debug(`➡️ API ${method.toUpperCase()} request:`, { url, data, config });

  try {
    const safeData = data === null || data === undefined ? {} : data;
    logger.debug(`➡️ Sending ${method.toUpperCase()} to ${url}`);

    const response = await instance({
      method,
      url,
      data: safeData,
      ...config,
    });

    logger.debug(`✅ ${method.toUpperCase()} success:`, {url, response});

    // Extract data using the improved logic
    const extractedData = extractResponseData(response);

    // Additional validation: warn if extraction might be wrong
    if (extractedData && typeof extractedData === 'object') {
      const keys = Object.keys(extractedData);
      
      // Warn if we might have extracted a model's data field instead of the model itself
      if (keys.length <= 2 && keys.includes('compress') && keys.includes('databases')) {
        logger.warn('⚠️ [useApi] Possible incorrect extraction - got object with compress/databases only', {
          url,
          method: method.toUpperCase(),
          extractedKeys: keys,
          suggestion: 'This might be a model\'s data field instead of the full model'
        });
      }
    }

    return { data: extractedData, error: null };
  } catch (error: any) {
    logger.error(`${method.toUpperCase()} error:`, {url, error});
    
    // Collect Zod validation errors if present
    const errorDetails = error.response?.data?.error?.errors;

    const errorMessage =
      (errorDetails && Array.isArray(errorDetails) && errorDetails.length
        ? errorDetails.map((e: any) => {
            const field = Array.isArray(e.path) ? e.path.join('.') : e.path || 'unknown';
            return `${field}: ${e.message}`;
          }).join('<br> ')
        : error.response?.data?.error?.message) ||
      error.response?.data?.message ||
      error.message || 'An unknown error occurred';

      return { data: null, error: errorMessage };
  }
};

export function useApi(endpoint: string) {
  const get = (params = {}, config = {}) => makeRequest('get', endpoint, null, { ...config, params });
  const post = (data = {}, config = {}) => makeRequest('post', endpoint, data, config);
  const put = (data = {}, config = {}) => makeRequest('put', endpoint, data, config);
  const patch = (data = {}, config = {}) => makeRequest('patch', endpoint, data, config);
  const del = (config = {}) => makeRequest('delete', endpoint, null, config);

  return { get, post, put, patch, del };
}

export async function fetchBlobWithAuth(
  url: string,
  options: AxiosRequestConfig = {}
): Promise<Blob> {
  try {
    const authStore = useAuthStore();

    const isAbsoluteUrl = /^https?:\/\//.test(url);
    const isApiPath = url.startsWith('/api/');
    const baseURL = (isAbsoluteUrl || isApiPath)
      ? ''
      : (import.meta.env.VITE_API_URL || '/api');

    const config: AxiosRequestConfig = {
      ...options,
      baseURL,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${authStore.accessToken.value}`,
      },
      responseType: 'blob' as const,
    };

    logger.debug('➡️ Fetching blob from:', url);

    const response = await instance.get<Blob>(url, config);

    if (!(response.data instanceof Blob)) {
      throw new Error('Invalid response format: expected Blob');
    }

    logger.debug('⬅️ Blob received successfully:', url);
    return response.data;
  } catch (err: any) {
    logger.error(' fetchBlobWithAuth error:', err);
    
    
    if (err.response) {
      logger.error(' Response status:', err.response.status);
      logger.error(' Response headers:', err.response.headers);
      
      
      if (err.response.data instanceof Blob) {
        err.response.data.text().then((text: string) => {
          try {
            const jsonError = JSON.parse(text);
            logger.error(' Response data (parsed):', jsonError);
          } catch (e) {
            logger.error(' Response data (text):', text);
          }
        }).catch((e: any) => {
          logger.error(' Could not read blob as text:', e);
        });
      }
    }
    
    throw err;
  }
}
