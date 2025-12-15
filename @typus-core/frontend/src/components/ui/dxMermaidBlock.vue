<template>
  <div ref="mermaidContainerRef" class="dx-mermaid-block">
    <!-- Mermaid SVG will be rendered here -->
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted } from 'vue';
import mermaid from 'mermaid';
import { logger } from '@/core/logging/logger';

// Define component props
const props = defineProps<{
  graphDefinition: string;
}>();

const mermaidContainerRef = ref<HTMLElement | null>(null);
let mermaidIdCounter = 0;
const activeTheme = ref(document.documentElement.getAttribute('data-theme') || '');
let themeObserver: MutationObserver | null = null;

const createProbeElement = (className: string) => {
  if (typeof document === 'undefined') return null;
  const tempElement = document.createElement('div');
  tempElement.className = className;
  tempElement.style.position = 'absolute';
  tempElement.style.pointerEvents = 'none';
  tempElement.style.opacity = '0';
  document.body.appendChild(tempElement);
  return tempElement;
};

const readStyleValue = (
  className: string,
  properties: Array<'backgroundColor' | 'color' | 'borderColor' | 'fontFamily' | 'fontSize'>
) => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return '';
  }
  const element = createProbeElement(className);
  if (!element) return '';
  const computedStyle = window.getComputedStyle(element);
  for (const property of properties) {
    const value = computedStyle[property] as string;
    if (value && value !== 'rgba(0, 0, 0, 0)' && value !== 'transparent') {
      document.body.removeChild(element);
      return value;
    }
  }
  document.body.removeChild(element);
  return '';
};

/**
 * Converts a semantic class to an actual color value
 */
const getSemanticColor = (className: string, preference: Array<'backgroundColor' | 'color' | 'borderColor'>) => {
  return readStyleValue(className, preference);
};

/**
 * Set up mermaid with current theme colors
 */
const setupMermaidWithTheme = () => {
  try {
    const semanticTokens = {
      primaryColorClass: 'theme-colors-background-accent',
      primaryTextColorClass: 'theme-colors-text-contrast',
      primaryBorderColorClass: 'theme-colors-border-focus',
      lineColorClass: 'theme-colors-border-primary',
      textColorClass: 'theme-colors-text-primary',
      backgroundClass: 'theme-colors-background-primary',
      mainBkgClass: 'theme-colors-background-secondary',
      secondaryBackgroundClass: 'theme-colors-background-tertiary',
      tertiaryBackgroundClass: 'theme-colors-background-hover',
      fontFamilyClass: 'theme-typography-fontFamily-base',
      fontSizeClass: 'theme-typography-size-base'
    };
    
    // Convert Tailwind classes to actual colors
    const colorConversions = {
      primaryColorConverted: getSemanticColor(semanticTokens.primaryColorClass, ['backgroundColor', 'color']),
      primaryTextColorConverted: getSemanticColor(semanticTokens.primaryTextColorClass, ['color', 'backgroundColor']),
      primaryBorderColorConverted: getSemanticColor(semanticTokens.primaryBorderColorClass, ['borderColor', 'color']),
      lineColorConverted: getSemanticColor(semanticTokens.lineColorClass, ['borderColor', 'color']),
      textColorConverted: getSemanticColor(semanticTokens.textColorClass, ['color']),
      backgroundConverted: getSemanticColor(semanticTokens.backgroundClass, ['backgroundColor']),
      mainBkgConverted: getSemanticColor(semanticTokens.mainBkgClass, ['backgroundColor']),
      secondaryBackgroundConverted: getSemanticColor(semanticTokens.secondaryBackgroundClass, ['backgroundColor']),
      tertiaryBackgroundConverted: getSemanticColor(semanticTokens.tertiaryBackgroundClass, ['backgroundColor'])
    };

    logger.debug('[dxMermaidBlock] Color conversions:', colorConversions);

    const fontFamily = readStyleValue(semanticTokens.fontFamilyClass, ['fontFamily']) || 'inherit';
    let mermaidFontSize = readStyleValue(semanticTokens.fontSizeClass, ['fontSize']) || '16px';
    if (mermaidFontSize.endsWith('rem') || mermaidFontSize.endsWith('em')) {
      const numValue = parseFloat(mermaidFontSize);
      if (!Number.isNaN(numValue)) {
        mermaidFontSize = `${numValue * 16}px`;
      }
    }

    const themeVariables = {
      primaryColor: colorConversions.primaryColorConverted,
      primaryTextColor: colorConversions.primaryTextColorConverted,
      primaryBorderColor: colorConversions.primaryBorderColorConverted,
      lineColor: colorConversions.lineColorConverted,
      textColor: colorConversions.textColorConverted,
      background: colorConversions.backgroundConverted,
      mainBkg: colorConversions.mainBkgConverted,
      fontFamily,
      fontSize: mermaidFontSize,
      // Additional theme variables for better control
      secondBkg: colorConversions.secondaryBackgroundConverted,
      tertiaryColor: colorConversions.tertiaryBackgroundConverted,
      labelBackground: colorConversions.mainBkgConverted,
      labelTextColor: colorConversions.textColorConverted,
      // For flowchart specific styling
      nodeBkg: colorConversions.mainBkgConverted,
      nodeTextColor: colorConversions.textColorConverted,
      // For sequence diagrams
      actorBkg: colorConversions.mainBkgConverted,
      actorBorder: colorConversions.lineColorConverted,
      actorTextColor: colorConversions.textColorConverted,
      // For class diagrams
      classBackground: colorConversions.mainBkgConverted,
      classBorder: colorConversions.lineColorConverted,
      
      // IMPORTANT: These variables control edge and arrow colors
      linkColor: colorConversions.lineColorConverted, // For general diagram links
      edgeLabelBackground: colorConversions.backgroundConverted,
      clusterBkg: colorConversions.secondaryBackgroundConverted,
      clusterBorder: colorConversions.lineColorConverted,
      defaultLinkColor: colorConversions.lineColorConverted,
      
      // For arrows specifically
      arrowheadColor: colorConversions.lineColorConverted,
      
      // For flowchart edge labels
      edgeLabelBkgStyle: colorConversions.backgroundConverted,
      
      // Git graph colors (if used)
      gitBranchLabel0: colorConversions.primaryColorConverted,
      gitBranchLabel1: colorConversions.primaryColorConverted,
      gitBranchLabel2: colorConversions.primaryColorConverted,
      gitBranchLabel3: colorConversions.primaryColorConverted,
      gitBranchLabel4: colorConversions.primaryColorConverted,
      gitBranchLabel5: colorConversions.primaryColorConverted,
      gitBranchLabel6: colorConversions.primaryColorConverted,
      gitBranchLabel7: colorConversions.primaryColorConverted,
      gitBranchLabel8: colorConversions.primaryColorConverted,
      gitBranchLabel9: colorConversions.primaryColorConverted,
      
      // Ensure all colors are from your theme
      git0: colorConversions.primaryColorConverted,
      git1: colorConversions.primaryColorConverted,
      git2: colorConversions.primaryColorConverted,
      git3: colorConversions.primaryColorConverted,
      git4: colorConversions.primaryColorConverted,
      git5: colorConversions.primaryColorConverted,
      git6: colorConversions.primaryColorConverted,
      git7: colorConversions.primaryColorConverted,
    };

    logger.debug('[dxMermaidBlock] Mermaid initialized with theme variables:', themeVariables);

    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'loose',
      theme: 'base',
      themeVariables: themeVariables
    });

  } catch (initError) {
    logger.error('[dxMermaidBlock] Error initializing Mermaid:', { errorDetail: initError });
  }
};

/**
 * Renders the Mermaid diagram.
 */
const renderDiagram = async () => {
  if (mermaidContainerRef.value && props.graphDefinition && props.graphDefinition.trim()) {
    const uniqueId = `mermaid-diag-${Date.now()}-${mermaidIdCounter++}`;
    try {
      // Clear the container before rendering a new diagram
      mermaidContainerRef.value.innerHTML = '';
      
      // mermaid.render() returns an object with the SVG code
      const { svg, bindFunctions } = await mermaid.render(uniqueId, props.graphDefinition.trim());
      mermaidContainerRef.value.innerHTML = svg;
      if (bindFunctions) {
        bindFunctions(mermaidContainerRef.value);
      }
      logger.debug(`[dxMermaidBlock] Rendered Mermaid diagram ${uniqueId}`);
    } catch (error) {
      logger.error(`[dxMermaidBlock] Error rendering Mermaid diagram ${uniqueId}:`, { errorDetail: error, definition: props.graphDefinition });
      if (mermaidContainerRef.value) {
        mermaidContainerRef.value.textContent = 'Error rendering diagram.';
      }
    }
  } else if (mermaidContainerRef.value) {
    mermaidContainerRef.value.innerHTML = '';
  }
};

onMounted(() => {
  setupMermaidWithTheme();
  renderDiagram();
  if (typeof MutationObserver !== 'undefined') {
    themeObserver = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
          activeTheme.value = document.documentElement.getAttribute('data-theme') || '';
        }
      });
    });
    themeObserver.observe(document.documentElement, { attributes: true });
  }
});

onUnmounted(() => {
  themeObserver?.disconnect();
});

// Re-render the diagram if the graphDefinition prop changes
watch(() => props.graphDefinition, () => {
  renderDiagram();
});

// Watch for theme changes and re-initialize Mermaid with the new theme colors
watch(activeTheme, () => {
  setupMermaidWithTheme();
  renderDiagram();
});
</script>

<style scoped>
.dx-mermaid-block {
  width: 100%;
  display: flex;
  justify-content: center;
  margin: 1em 0;
}

.dx-mermaid-block :deep(svg) {
  max-width: 100%;
  height: auto;
}
</style>
