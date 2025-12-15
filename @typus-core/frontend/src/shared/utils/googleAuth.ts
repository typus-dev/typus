// src/shared/utils/googleAuth.ts

// Define types for Google API with FedCM support
declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          prompt: (callback?: (notification: any) => void) => void;
          renderButton: (element: HTMLElement, options: any) => void;
          // FedCM related methods
          revoke: (email: string, callback: () => void) => void;
          disableAutoSelect: () => void;
          storeCredential: (credential: any, callback: () => void) => void;
          cancel: () => void;
          // OAuth2 methods
          authorize: (config: any) => Promise<any>;
          callback?: (response: any) => void;
        },
        oauth2: {
          initTokenClient: (config: any) => {
            requestAccessToken: (overrideConfig?: any) => Promise<any>;
          };
          hasGrantedAllScopes: (token: any, ...scopes: string[]) => boolean;
        }
      }
    };
    // Optional CSP nonce property
    __NONCE__?: string;
    // Google Client ID from database config (set in main.ts)
    __GOOGLE_CLIENT_ID__?: string;
  }
}

/**
 * Initialize Google OAuth API
 * Loads Google Identity Services
 */
export function initGoogleAuth(): Promise<void> {
  logger.debug('🔍 GOOGLE AUTH UTIL: initGoogleAuth called')
  return new Promise((resolve, reject) => {
    // Check if Google API script is already loaded
    if (document.getElementById('google-api')) {
      logger.debug('🔍 GOOGLE AUTH UTIL: Google API script already loaded, resolving immediately')
      resolve();
      return;
    }

    logger.debug('🔍 GOOGLE AUTH UTIL: Creating Google API script element')
    // Load Google API script with FedCM support
    const script = document.createElement('script');
    script.id = 'google-api';
    // Use the latest version of the Google Identity Services library
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    
    // Add nonce attribute if CSP is used and nonce is available
    const nonce = (window as any).__NONCE__;
    if (nonce) {
      script.nonce = nonce;
    }
    
    script.onload = () => {
      logger.debug('🔍 GOOGLE AUTH UTIL: Google API script loaded successfully')
      resolve();
    };
    
    script.onerror = (error) => {
      logger.error('🔍 GOOGLE AUTH UTIL: Error loading Google API script:', error)
      reject(error);
    };
    
    logger.debug('🔍 GOOGLE AUTH UTIL: Appending Google API script to document head')
    document.head.appendChild(script);
    logger.debug('🔍 GOOGLE AUTH UTIL: Google API script appended to document head')
  });
}

/**
 * Get Google OAuth token
 * Supports FedCM and fallback
 */
export function getGoogleOAuthToken(): Promise<string> {
  logger.debug('🔍 GOOGLE AUTH UTIL: getGoogleOAuthToken called')
  return new Promise((resolve, reject) => {
    // Check if Google API is loaded
    if (!window.google) {
      logger.error('🔍 GOOGLE AUTH UTIL: Google API not loaded in window object');
      logger.error('🔍 GOOGLE AUTH UTIL: window.google =', window.google);
      reject(new Error('Google API not loaded'));
      return;
    }

    try {
      logger.debug('🔍 GOOGLE AUTH UTIL: Getting Google Client ID from config');
      // Try to get from window (database config), fallback to env, then error
      const clientId = window.__GOOGLE_CLIENT_ID__ || import.meta.env.VITE_GOOGLE_CLIENT_ID;
      logger.debug('🔍 GOOGLE AUTH UTIL: Client ID source:', window.__GOOGLE_CLIENT_ID__ ? 'database' : 'env');
      logger.debug('🔍 GOOGLE AUTH UTIL: Client ID obtained:', clientId ? 'Yes (value hidden for security)' : 'No');

      if (!clientId) {
        logger.error('🔍 GOOGLE AUTH UTIL: Google Client ID not configured');
        logger.error('🔍 GOOGLE AUTH UTIL: Check database config (integrations.google_client_id) or .env (VITE_GOOGLE_CLIENT_ID)');
        reject(new Error('Google Client ID not configured'));
        return;
      }

      logger.debug('🔍 GOOGLE AUTH UTIL: Initializing Google Sign-In with Client ID');
      
      // Check if accounts.id is available
      if (!window.google.accounts || !window.google.accounts.id) {
        logger.error('🔍 GOOGLE AUTH UTIL: Google accounts.id API not available');
        logger.error('🔍 GOOGLE AUTH UTIL: window.google.accounts =', window.google.accounts);
        reject(new Error('Google accounts.id API not available'));
        return;
      }
      
      // Skip OAuth2 approach and use ID token directly
      // The backend expects a JWT ID token, not an access token
      logger.debug('🔍 GOOGLE AUTH UTIL: Using ID token approach directly (backend requires JWT format)');
      
      // Track if we've received a response to avoid duplicate fallbacks
      let responseReceived = false;
      
      // ID token approach
      function useIdTokenApproach() {
        logger.debug('🔍 GOOGLE AUTH UTIL: Using ID token approach');
        
        // Initialize Google Sign-In with FedCM-compatible options
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response: any) => {
            logger.debug('🔍 GOOGLE AUTH UTIL: Google Sign-In callback received response:', response ? 'Response object received' : 'No response');
            
            // Set flag to prevent fallback from triggering
            responseReceived = true;
            
            if (response && response.credential) {
              logger.debug('🔍 GOOGLE AUTH UTIL: Google Sign-In successful, received credential');
              resolve(response.credential);
            } else {
              logger.error('🔍 GOOGLE AUTH UTIL: Failed to get Google credential, response:', response);
              reject(new Error('Failed to get Google credential'));
            }
          },
          // FedCM compatible options
          auto_select: false, // Don't auto select account
          cancel_on_tap_outside: true,
          use_fedcm_for_prompt: true // Explicitly enable FedCM
        });
        
        logger.debug('🔍 GOOGLE AUTH UTIL: Google Sign-In initialized, calling prompt method');
        
        // Show the Google Sign-In prompt with FedCM support
        window.google.accounts.id.prompt((notification: any) => {
          logger.debug('🔍 GOOGLE AUTH UTIL: Google Sign-In prompt notification received');
          
          // Log notification details for debugging
          if (notification) {
            logger.debug('🔍 GOOGLE AUTH UTIL: Notification object received');
            
            // Check if FedCM is disabled
            if (notification.toString && notification.toString().includes('FedCM was disabled')) {
              logger.error('🔍 GOOGLE AUTH UTIL: FedCM is disabled in browser settings');
              if (!responseReceived) {
                handleFedCMDisabled();
              }
              return;
            }
            
            // Check notification state using safe property access
            try {
              const methods = Object.getOwnPropertyNames(notification)
                .filter(prop => typeof notification[prop] === 'function');
              
              logger.debug('🔍 GOOGLE AUTH UTIL: Notification methods available:', methods);
              
              if (methods.includes('isNotDisplayed') && notification.isNotDisplayed()) {
                const reason = methods.includes('getNotDisplayedReason') ? 
                  notification.getNotDisplayedReason() : 'unknown';
                logger.error('🔍 GOOGLE AUTH UTIL: Google Sign-In prompt not displayed, reason:', reason);
                if (!responseReceived) {
                  handlePromptFailure(reason);
                }
              } else if (methods.includes('isSkippedMoment') && notification.isSkippedMoment()) {
                const reason = methods.includes('getSkippedReason') ? 
                  notification.getSkippedReason() : 'unknown';
                logger.error('🔍 GOOGLE AUTH UTIL: Google Sign-In prompt skipped, reason:', reason);
                if (!responseReceived) {
                  handlePromptFailure(reason);
                }
              } else if (methods.includes('isDismissedMoment') && notification.isDismissedMoment()) {
                const reason = methods.includes('getDismissedReason') ? 
                  notification.getDismissedReason() : 'unknown';
                logger.error('🔍 GOOGLE AUTH UTIL: Google Sign-In prompt dismissed, reason:', reason);
                if (!responseReceived) {
                  handlePromptFailure(reason);
                }
              } else {
                logger.debug('🔍 GOOGLE AUTH UTIL: Google Sign-In prompt displayed successfully');
              }
            } catch (notificationError) {
              logger.error('🔍 GOOGLE AUTH UTIL: Error processing notification:', notificationError);
            }
          }
        });
        
        logger.debug('🔍 GOOGLE AUTH UTIL: Google Sign-In prompt method called');
      }
      
      // Handle FedCM disabled case - use popup approach
      function handleFedCMDisabled() {
        // Only proceed if we haven't already received a response
        if (responseReceived) {
          logger.debug('🔍 GOOGLE AUTH UTIL: Response already received, not using fallback');
          return;
        }
        
        logger.debug('🔍 GOOGLE AUTH UTIL: Attempting popup authentication method');
        
        try {
          // Add the necessary parameters
          const params = new URLSearchParams({
            client_id: clientId,
            response_type: 'id_token',
            redirect_uri: `${window.location.origin}/auth/google/callback`,
            scope: 'email profile openid',
            nonce: Math.random().toString(36).substring(2, 15),
            prompt: 'select_account'
          });
          
          // Open popup window
          const popup = window.open(
            `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
            'google-auth',
            'width=500,height=600,scrollbars=yes,resizable=yes,location=yes'
          );
          
          if (!popup) {
            throw new Error('Popup blocked by browser');
          }
          
          // Listen for messages from the callback page
          const messageHandler = (event: MessageEvent) => {
            // Verify origin
            if (event.origin !== window.location.origin) return;
            
            // Check if the message contains a token
            if (event.data && typeof event.data === 'string' && event.data.startsWith('id_token:')) {
              // Remove the event listener
              window.removeEventListener('message', messageHandler);
              
              // Close the popup
              popup.close();
              
              // Extract the token
              const token = event.data.substring(9); // Remove 'id_token:' prefix
              
              if (token) {
                logger.debug('🔍 GOOGLE AUTH UTIL: Received token from popup');
                responseReceived = true;
                resolve(token);
              } else {
                logger.error('🔍 GOOGLE AUTH UTIL: No token received from popup');
                reject(new Error('No token received'));
              }
            }
          };
          
          // Add the message listener
          window.addEventListener('message', messageHandler);
          
          // Check if popup is closed manually
          const checkClosed = setInterval(() => {
            try {
              if (popup.closed) {
                clearInterval(checkClosed);
                window.removeEventListener('message', messageHandler);
                if (!responseReceived) {
                  logger.debug('🔍 GOOGLE AUTH UTIL: Popup closed by user');
                  reject(new Error('Authentication cancelled by user'));
                }
              }
            } catch (e) {
              // Cross-Origin-Opener-Policy blocks access
              logger.debug('🔍 GOOGLE AUTH UTIL: Cross-Origin-Opener-Policy blocked popup.closed access');
              clearInterval(checkClosed); // Stop checking if access is blocked
              window.removeEventListener('message', messageHandler); // Clean up listener
              if (!responseReceived) {
                // If no response received and access is blocked, assume user closed or issue
                logger.debug('🔍 GOOGLE AUTH UTIL: Authentication cancelled or failed due to COOP');
                reject(new Error('Authentication cancelled or failed due to COOP'));
              }
            }
          }, 1000);
          
          // Set a timeout to clean up if no response is received
          setTimeout(() => {
            if (!responseReceived) {
              clearInterval(checkClosed);
              window.removeEventListener('message', messageHandler);
              popup.close();
              logger.error('🔍 GOOGLE AUTH UTIL: Popup authentication timed out');
              reject(new Error('Authentication timed out'));
            }
          }, 300000); // 5 minute timeout
          
        } catch (error: any) {
          logger.error('🔍 GOOGLE AUTH UTIL: Error during popup authentication:', error);
          reject(error);
        }
      }
      
      // Handle prompt failures
      function handlePromptFailure(reason: string) {
        if (responseReceived) {
          logger.debug('🔍 GOOGLE AUTH UTIL: Response already received, not handling prompt failure');
          return;
        }
        
        if (reason === 'browser_not_supported' || 
            reason === 'invalid_client' || 
            reason.includes('FedCM')) {
          handleFedCMDisabled();
        } else {
          reject(new Error(`Google Sign-In prompt failed: ${reason}`));
        }
      }
      
      // Check if FedCM is supported before trying ID token approach
      if (!isFedCMSupported()) {
        logger.debug('🔍 GOOGLE AUTH UTIL: FedCM not supported in this browser, using fallback');
        handleFedCMDisabled();
      } else {
        // Start with ID token approach
        useIdTokenApproach();
        
        // Set a timeout to use fallback if FedCM doesn't respond
        setTimeout(() => {
          if (!responseReceived) {
            logger.debug('🔍 GOOGLE AUTH UTIL: FedCM timeout, using fallback');
            handleFedCMDisabled();
          } else {
            logger.debug('🔍 GOOGLE AUTH UTIL: Response already received, not using fallback');
          }
        }, 7000); // 7 second timeout - increased from 3 seconds
      }
      
    } catch (error: any) {
      logger.error('🔍 GOOGLE AUTH UTIL: Error during Google Sign-In initialization:', error);
      logger.error('🔍 GOOGLE AUTH UTIL: Error details:', { 
        message: error.message, 
        stack: error.stack,
        name: error.name
      });
      reject(error);
    }
  });
}

/**
 * Check if FedCM is supported
 */
export function isFedCMSupported(): boolean {
  // Check if running in a browser environment
  if (typeof window === 'undefined') return false;
  
  // Check for FedCM support indicators
  const userAgent = navigator.userAgent.toLowerCase();
  
  // Chrome 89+ or Edge 89+ (Chromium-based)
  const isChromiumBased = /chrome|edg/.test(userAgent) && 
    !/edge/.test(userAgent) && // Exclude old Edge
    parseInt((userAgent.match(/(?:chrome|crios|crmo)\/(\d+)/) || [])[1] || '0', 10) >= 89;
  
  // Safari 16.4+
  const isSafari = /safari/.test(userAgent) && 
    !/chrome|chromium|crios|crmo/.test(userAgent) &&
    parseInt((userAgent.match(/version\/(\d+)/) || [])[1] || '0', 10) >= 16;
  
  return isChromiumBased || isSafari;
}
