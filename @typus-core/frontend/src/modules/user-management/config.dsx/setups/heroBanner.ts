import { ComponentSetup } from '@/dsx/core/ComponentSetup';
import dxImage from '@/components/ui/dxImage.vue';
import type { dsxComponentConfig } from '@/dsx/types';

/**
 * Hero banner component setup
 */
export class HeroBannerSetup extends ComponentSetup {
  /**
   * Main setup method
   */
  setup(): Partial<dsxComponentConfig> {
    return {
      type: dxImage,
      props: {
        src: 'https://images.unsplash.com/photo-1555685812-4b943f1cb0eb?auto=format&fit=crop&w=1600&q=80',
        alt: 'Main Banner',
        fullWidth: true,
        height: '100%'
      }
    };
  }
  
  /**
   * Called when component is mounted
   */
  onMounted() {
    logger.debug('Hero banner mounted');
  }
  
  /**
   * Called before component unmounts
   */
  beforeUnload() {
    logger.debug('Hero banner will unmount');
  }
  
  /**
   * Called before data fetch
   */
  beforeDataFetch(config: dsxComponentConfig) {
    logger.debug('Before fetching hero banner data');
    return config;
  }
  
  /**
   * Called after data fetch
   */
  afterDataFetch(data: any, config: dsxComponentConfig) {
    logger.debug('After fetching hero banner data', data);
    return data;
  }
  
  /**
   * Called before component render
   */
  beforeRender(data: any, config: dsxComponentConfig) {
    logger.debug('Before rendering hero banner');
    
    // Example of modifying props based on data
    const updatedConfig = { ...config };
    if (updatedConfig.props) {
      updatedConfig.props = {
        ...updatedConfig.props,
        alt: data ? `${updatedConfig.props.alt} - ${data}` : updatedConfig.props.alt
      };
    }
    
    return { data, config: updatedConfig };
  }
}

/**
 * Factory function to create hero banner setup
 */
export function heroBanner() {
  return new HeroBannerSetup();
}
