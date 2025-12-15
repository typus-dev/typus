import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import type { dsxPageConfig } from '../types'; // Corrected type import
import { logger } from '@/core/logging/logger'; // Import logger

export function usePageRenderer(registry: Record<string, dsxPageConfig>) { // Use corrected type
  logger.debug('[usePageRenderer] Initializing page renderer'); // Log entry
  const route = useRoute();
  const isLoading = ref(false);
  
  const currentConfig = computed(() => {
    const routeName = route.name?.toString() || 'default';
    return registry[routeName] || registry.default;
  });

  return {
    currentConfig,
    isLoading
  };
}
