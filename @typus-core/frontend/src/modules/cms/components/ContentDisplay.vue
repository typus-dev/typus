<template>
  <div v-if="loading" class="min-h-[200px]">
    <!-- Render nothing or a minimal placeholder while loading, parent handles transition -->
  </div>
  <div v-else-if="error" class="theme-colors-text-error p-4">Error loading content: {{ error }}</div>
  <div v-else-if="contentItem" class="content-container pt-8 content-width-wide overflow-hidden">
    <!-- Render processed content nodes -->
    <template v-for="(node, index) in processedContentNodes" :key="index">
      <component
        v-if="node.type === 'component' && 'component' in node"
        :is="node.component"
        v-bind="node.props || {}"
      />
      <DxContentRendererCanvas
        v-else-if="node.type === 'html' && 'content' in node"
        :content="node.content"
      />
    </template>
  </div>
  <div v-else>Content not found.</div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { logger } from '@/core/logging/logger';
import dxMermaidBlock from '@/components/ui/dxMermaidBlock.vue';
import DxContentRendererCanvas from '@/components/ui/dxContentRendererCanvas.vue';
import { ICmsItem } from '../types';
import { CmsMethods } from '../methods/cms.methods.dsx';
import { useActiveTheme } from '@/shared/composables/useActiveTheme';

// Define props
const props = defineProps<{
  id?: string| number;
  slug?: string;
  content?: string;
}>();

// Component state
const loading = ref(true);
const error = ref<string | null>(null);
const contentItem = ref<ICmsItem | null>(null);
const route = useRoute();
const activeTheme = useActiveTheme();

// Type for route params
interface RouteParams {
  id?: string | string[];
}

// Content processing
interface ContentNode {
  type: 'html' | 'component';
  content?: string;
  component?: any;
  props?: Record<string, any>;
}

/**
 * Apply theme classes to HTML content
 */
const applyThemeClasses = (html: string): string => {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  // Apply theme classes to elements
  const elementMappings = {
    'h1': 'theme-typography-content-h1',
    'h2': 'theme-typography-content-h2',
    'h3': 'theme-typography-content-h3',
    'h4': 'theme-typography-content-h4',
    'h5': 'theme-typography-content-h5',
    'h6': 'theme-typography-content-h6',
    'p': 'theme-typography-content-p',
    'ul': 'theme-typography-content-ul',
    'ol': 'theme-typography-content-ol',
    'li': 'theme-typography-content-li',
    'blockquote': 'theme-typography-content-blockquote',
    'code': 'theme-typography-content-code',
    'pre': 'theme-typography-content-pre',
    'a': 'theme-typography-content-a'
  };

  Object.entries(elementMappings).forEach(([selector, className]) => {
    tempDiv.querySelectorAll(selector).forEach(el => {
      el.className = className;
    });
  });

  return tempDiv.innerHTML;
};

/**
 * Identifies if a code block contains Mermaid diagram syntax
 */
const isMermaidDiagram = (code: string): boolean => {
  const mermaidStarters = [
    'graph', 'sequenceDiagram', 'classDiagram', 'stateDiagram', 
    'erDiagram', 'journey', 'gantt', 'pie', 'gitGraph', 'flowchart'
  ];
  
  const trimmedCode = code.trim();
  return mermaidStarters.some(starter => trimmedCode.startsWith(starter));
};

// Process content to separate HTML and Mermaid diagrams
const processedContentNodes = computed(() => {
  if (!contentItem.value?.content) return [];
  
  // Apply theme classes to the whole content first
  const themedContent = applyThemeClasses(contentItem.value.content);
  
  // Create parser to properly process HTML content
  const parser = new DOMParser();
  const doc = parser.parseFromString(themedContent, 'text/html');
  
  // Find pre blocks that might contain Mermaid diagrams
  const preBlocks = Array.from(doc.querySelectorAll('pre'));
  const nodes: ContentNode[] = [];
  
  // If no pre blocks, return content as-is
  if (preBlocks.length === 0) {
    return [{ type: 'html', content: themedContent }];
  }
  
  // Process content by examining each node
  let currentNode = doc.body.firstChild;
  let contentBuffer = '';
  
  while (currentNode) {
    if (currentNode.nodeName === 'PRE' && currentNode instanceof Element) {
      // Add accumulated content first
      if (contentBuffer) {
        nodes.push({ type: 'html', content: contentBuffer });
        contentBuffer = '';
      }
      
      // Check if pre block contains Mermaid diagram
      const codeElement = currentNode.querySelector('code');
      const codeContent = codeElement?.textContent || '';
      
      if (codeContent && isMermaidDiagram(codeContent)) {
        // Add as Mermaid component
        nodes.push({
          type: 'component',
          component: dxMermaidBlock,
          props: { 
            graphDefinition: codeContent.trim(),
            theme: activeTheme.value || 'default'
          }
        });
      } else {
        // Regular code block
        nodes.push({ type: 'html', content: currentNode.outerHTML });
      }
    } else if (currentNode instanceof Element) {
      contentBuffer += currentNode.outerHTML;
    } else if (currentNode.nodeType === Node.TEXT_NODE) {
      contentBuffer += currentNode.textContent || '';
    }
    
    currentNode = currentNode.nextSibling;
  }
  
  // Add any remaining content
  if (contentBuffer) {
    nodes.push({ type: 'html', content: contentBuffer });
  }
  
  return nodes;
});

// Load content data
async function loadContentData() {
  try {
    loading.value = true;
    error.value = null;
    
    // If content is provided directly, use it
    if (props.content) {
      contentItem.value = {
        id: 0,
        title: '',
        slug: '',
        type: 'document',
        status: 'published',
        content: props.content,
        sitePath: '',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      return;
    }
    
    // Get ID from props, route.meta or route.params
    let id = props.id;
    
    if (!id && route.meta && route.meta.cmsItemId) {
      id = String(route.meta.cmsItemId);
    }
    
    if (!id) {
      const params = route.params as RouteParams;
      if (params.id) {
        id = Array.isArray(params.id) ? params.id[0] : params.id;
      }
    }
    
    if (id) {
      // Load by ID
      const data = await CmsMethods.getContentItemData({ id: String(id) });
      
      if (!data) {
        error.value = `Content with ID ${id} not found`;
        return;
      }
      
      contentItem.value = data as ICmsItem;
      logger.debug('[ContentDisplay] Content loaded by ID', { contentId: id, data });
    } else if (props.slug) {
      // Load by slug
      error.value = 'Loading by slug not implemented yet';
    } else {
      error.value = 'No content ID or slug provided';
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to load content';
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadContentData();
});

// Watch for route changes to reload content if ID or slug comes from route
watch(
  () => route.fullPath, // Watch the full path to react to any relevant changes
  (newPath, oldPath) => {
    if (newPath !== oldPath) {
      logger.debug('[ContentDisplay] Route changed, reloading content', { newPath, oldPath });
      loadContentData();
    }
  }
);

// Watch for prop changes if ID or slug is passed as prop
watch(
  () => [props.id, props.slug, props.content],
  (newValues, oldValues) => {
    // Check if any of the relevant props have actually changed
    const propsChanged = newValues.some((val, index) => val !== oldValues[index]);
    if (propsChanged) {
      logger.debug('[ContentDisplay] Props changed, reloading content', { newValues, oldValues });
      loadContentData();
    }
  }
);
</script>

<style scoped>
.content-container {
  margin: 0 auto;
}
</style>
