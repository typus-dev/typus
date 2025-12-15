import { useApi } from '@/shared/composables/useApi';
import { logger } from '@/core/logging/logger';

export const RoutesMethods = {
  getRoutes: async () => {
    logger.debug('[RoutesMethods] Fetching routes');
    const { data, error } = await useApi('/dynamic-routes').get({ includeInactive: true });
    
    if (error) {
      logger.error('[RoutesMethods] Error fetching routes:', error);
      return [];
    }

    const processedRoutes = data ? data.map((route: any) => ({
      ...route,
      parentPath: route.parentId ? getRoutePathById(data, route.parentId) || '-' : '-',
      layout: route.meta?.layout || '-',
      isActive: route.isActive
    })) : [];

    logger.debug('[RoutesMethods] Routes fetched successfully:', processedRoutes.length);
    return processedRoutes;
  },

  async getRouteById(id: string) {
    logger.debug('[RoutesMethods] Fetching route by ID:', id);
    const { data, error } = await useApi(`/dynamic-routes/${id}`).get();
    
    if (error) {
      logger.error('[RoutesMethods] Error fetching route:', error);
      throw new Error(error);
    }

    logger.debug('[RoutesMethods] Route fetched successfully:', data);
    return data;
  },

  async createRoute(routeData: any) {
    logger.debug('[RoutesMethods] Creating route:', routeData);
    const { data, error } = await useApi('/dynamic-routes').post(routeData);
    
    if (error) {
      logger.error('[RoutesMethods] Error creating route:', error);
      throw new Error(error);
    }

    logger.debug('[RoutesMethods] Route created successfully:', data);
    return data;
  },

  async updateRoute(id: string, routeData: any) {
    logger.debug('[RoutesMethods] Updating route:', { id, routeData });
    const { data, error } = await useApi(`/dynamic-routes/${id}`).put(routeData);
    
    if (error) {
      logger.error('[RoutesMethods] Error updating route:', error);
      throw new Error(error);
    }

    logger.debug('[RoutesMethods] Route updated successfully:', data);
    return data;
  },

  async deleteRoute(id: string) {
    logger.debug('[RoutesMethods] Deleting route:', id);
    const { error } = await useApi(`/dynamic-routes/${id}`).del();
    
    if (error) {
      logger.error('[RoutesMethods] Error deleting route:', error);
      throw new Error(error);
    }

    logger.debug('[RoutesMethods] Route deleted successfully');
    return true;
  },

  async toggleRouteStatus(id: string, isActive: boolean) {
    logger.debug('[RoutesMethods] Toggling route status:', { id, isActive });
    const { data, error } = await useApi(`/dynamic-routes/${id}/status`).patch({ isActive });
    
    if (error) {
      logger.error('[RoutesMethods] Error toggling route status:', error);
      throw new Error(error);
    }

    logger.debug('[RoutesMethods] Route status toggled successfully:', data);
    return data;
  }
};

// Helper function to find route path by ID
function getRoutePathById(routeList: any[], id: string): string | undefined {
  const route = routeList.find(r => r.id === id);
  return route?.path;
}