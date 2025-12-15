// src/shared/composables/useTokenRefresh.ts
import { useAuthStore } from '@/core/store/authStore';
import axios from 'axios';

export function useTokenRefresh() {
  const authStore = useAuthStore();
  
  const refreshTokenIfNeeded = async (): Promise<boolean> => {
    logger.debug('🔍 TOKEN-REFRESH: refreshTokenIfNeeded called');
    logger.debug('🔍 TOKEN-REFRESH: Access token exists:', !!authStore.accessToken.value);
    logger.debug('🔍 TOKEN-REFRESH: Refresh token exists:', !!authStore.refreshToken.value);
    
    const needsRefresh = shouldRefreshToken();
    logger.debug('🔍 TOKEN-REFRESH: Needs refresh:', needsRefresh);
    
    if (!needsRefresh) {
      return !!authStore.accessToken.value;
    }
    
    try {
      logger.debug('🔍 TOKEN-REFRESH: Attempting to refresh token');

      const response = await axios.post('/api/auth/refresh-token', {
        refreshToken: authStore.refreshToken.value
      });
      
      logger.debug('🔍 TOKEN-REFRESH: Token refresh successful');
      
      authStore.setAuthData({
        accessToken: response.data.accessToken,
        refreshToken: response.data.refreshToken,
        user: authStore.user.value
      });
      
      return true;
    } catch (error) {
      logger.error('🔍 TOKEN-REFRESH: Token refresh failed, clearing auth store', error);
      authStore.clear();
      return false;
    }
  };

  const shouldRefreshToken = (): boolean => {
    if (!authStore.accessToken.value || !authStore.refreshToken.value) {
      logger.debug('🔍 TOKEN-REFRESH: No access or refresh token, no refresh needed');
      return false;
    }
    
    try {
      const token = JSON.parse(atob(authStore.accessToken.value.split('.')[1]));
      const expiresIn = token.exp * 1000 - Date.now();
      const expiresInMinutes = expiresIn / (60 * 1000);
      
      logger.debug(`🔍 TOKEN-REFRESH: Token expires in ${expiresInMinutes.toFixed(2)} minutes`);
      logger.debug('🔍 TOKEN-REFRESH: Token payload:', token);
      
      const threshold = 5 * 60 * 1000; // 5 minutes in milliseconds
      return expiresIn < threshold;
    } catch (e) {
      logger.error('🔍 TOKEN-REFRESH: Error parsing token:', e);
      return true;
    }
  };

  return { refreshTokenIfNeeded, shouldRefreshToken };
}