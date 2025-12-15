<route lang="json">{
  "name": "cms-view",
  "path": "/cms/view/:id",
  "meta": {
    "layout": "private",
    "subject": "cms"
  }
}</route>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import dsxPageRendererWithContext from '@/dsx/components/dsxPageRendererWithContext.vue';
import dxButton from '@/components/ui/dxButton.vue';
import dxBadge from '@/components/ui/dxBadge.vue';
import ContentDisplay from '../components/ContentDisplay.vue';
import { FormMode } from '@dsl-shared/constants';
import { logger } from '@/core/logging/logger';
import { CmsItemModel } from '@root-shared/dsl/models/cms/cms-item.model';
  


const route = useRoute();
const router = useRouter();

// Get content ID from route params
let contentIdParamValue: string | string[] | undefined = undefined;
if (route.params && Object.prototype.hasOwnProperty.call(route.params, 'id')) {
  const idFromParams = (route.params as Record<string, string | string[]>).id;
  contentIdParamValue = idFromParams;
}
const contentIdString = Array.isArray(contentIdParamValue) ? contentIdParamValue[0] : contentIdParamValue;

// Page configuration
const pageConfig = {
  title: 'Content Details',
  layout: 'private',
  type: 'grid' as const,
  columns: 12,
  gap: 16,
  contextConfig: {
    model: CmsItemModel,
    mode: FormMode.VIEW,
    recordId: contentIdString
  },
  blocks: [
    // Content display
    {
      colSpan: 12,
      components: [
        {
          type: ContentDisplay,
          props: { id: contentIdString }
        }
      ]
    },
    // Action buttons
    {
      colSpan: 12,
      components: [
        {
          type: dxButton,
          props: { 
            variant: 'outline', 
            label: 'Back'
          },
          events: {
            click: () => {
              logger.debug('[CmsViewPage] Back button clicked');
              router.back();
            }
          }
        },
        {
          type: dxButton,
          props: { 
            variant: 'primary', 
            label: 'Edit'
          },
          events: {
            click: () => {
              logger.debug('[CmsViewPage] Edit button clicked');
              router.push(`/cms/edit/${contentIdString}`);
            }
          }
        }
      ]
    }
  ]
};
</script>

<template>
  <div class="cms-view-page">
    <dsxPageRendererWithContext :config="pageConfig" />
  </div>
</template>

<style scoped>
.cms-view-page {
  max-width: 1200px;
  margin: 0 auto;
}
</style>
