<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { DSL, initDslClient } from '../index';
import dsxPageRenderer from '@/dsx/components/dsxPageRenderer.vue';
import dxCard from '@/components/ui/dxCard.vue';
;

// Mock data for fallback
const mockNewsData = {
  politics: `Senators debated for hours before passing the latest cybersecurity legislation aimed at national infrastructure protection. The bill, which received bipartisan support after months of negotiations, establishes new standards for critical infrastructure and allocates $2.5 billion for state and local government security upgrades.`,
  
  sports: `The city erupted in celebration as the local team clinched the championship title in a dramatic final match that went into triple overtime. Fans flooded the streets after the nail-biting conclusion, where rookie sensation Alex Martinez scored the winning point with just 2.7 seconds remaining on the clock.`,
  
  technology: `A startup unveiled its quantum computing prototype claiming 1000 qubits, potentially revolutionizing the cryptography industry and threatening current encryption standards. Quantum Dynamics, a company founded by former MIT researchers, demonstrated their breakthrough technology at the International Computing Conference yesterday.`
};

// Fetch news data with DSL client, fallback to mock data
const fetchNewsData = async (category: string) => {
  try {

    
    // Try to fetch news from DSL API
    const news = await DSL.News.findMany({ category });
    
    logger.debug(`[NewsExample] ${category} news fetched successfully from API`, { news });
    
    return news;
  } catch (error) {
    logger.warn(`[NewsExample] Failed to fetch ${category} news from API, falling back to mock data`, { error });
    
    // Fall back to mock data
    return mockNewsData[category as keyof typeof mockNewsData] || 'No news available';
  }
};

// Page configuration
const pageConfig = ref({
  title: 'News Example',
  layout: 'default',
  blocks: [
    {
      id: 'politics-news',
      colSpan: 4,
      components: [
        {
          type: dxCard,
          props: {
            title: 'Politics',
            variant: 'elevated',
            fullHeight: true
          },
          dataSource: async () => await fetchNewsData('politics')
        }
      ]
    },
    {
      id: 'sports-news',
      colSpan: 4,
      components: [
        {
          type: dxCard,
          props: {
            title: 'Sports',
            variant: 'elevated',
            fullHeight: true
          },
          dataSource: async () => await fetchNewsData('sports')
        }
      ]
    },
    {
      id: 'technology-news',
      colSpan: 4,
      components: [
        {
          type: dxCard,
          props: {
            title: 'Technology',
            variant: 'elevated',
            fullHeight: true
          },
          dataSource: async () => await fetchNewsData('technology')
        }
      ]
    }
  ]
});

// Initialize DSL client on component mount
onMounted(async () => {

});
</script>

<template>
  <dsxPageRenderer :config="pageConfig" />
</template>
