<!--
  SYNC: Uses shared partials from _header.html and _footer.html

  This Vue layout imports shared HTML partials and processes them
  using a lightweight Handlebars-compatible processor.

  Partials are resolved with priority: custom → plugins → core
-->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useAppConfig } from '@/shared/composables/useAppConfig';
import { logger } from '@/core/logging/logger';
import { useTheme } from '@/core/theme/composables/useTheme';

// Import shared partials (resolved by layoutPartialsPlugin: custom → plugins → core)
import headerHtml from '@layouts/public/_header.html?raw';
import footerHtml from '@layouts/public/_footer.html?raw';
import manifestData from '../../../../../typus-manifest.json';

const route = useRoute();
const appConfig = useAppConfig();
const { availableThemes, currentTheme, setTheme } = useTheme();
const siteName = computed(() => appConfig.name || 'Typus');

// Navigation links are defined in _header.html (single source of truth: Features, Stack, Pricing)

const isCached = computed(() => {
  return window.__IS_CACHED_PAGE__ && route.path === window.__CACHED_ROUTE__?.path
})

const cachedContent = ref('')
const currentYear = new Date().getFullYear()
const buildVersion = manifestData.version || manifestData.app_version || 'dev'

/**
 * Simple Handlebars-compatible template processor
 * Handles: {{var}}, {{#each arr}}...{{/each}}, {{#if cond}}...{{/if}}, {{this.prop}}
 */
function processTemplate(template: string, context: Record<string, any>): string {
  let result = template;

  // Process {{#each array}}...{{/each}} blocks
  result = result.replace(/\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (_, arrayName, content) => {
    const arr = context[arrayName];
    if (!Array.isArray(arr)) return '';
    return arr.map(item => {
      let itemContent = content;
      // Replace {{this.property}} with item property
      itemContent = itemContent.replace(/\{\{this\.(\w+)\}\}/g, (__, prop) => {
        return item[prop] ?? '';
      });
      // Replace {{#if this.property}}...{{/if}}
      itemContent = itemContent.replace(/\{\{#if\s+this\.(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (___, prop, ifContent) => {
        return item[prop] ? ifContent : '';
      });
      return itemContent;
    }).join('');
  });

  // Process {{#if variable}}...{{else}}...{{/if}} blocks
  result = result.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{else\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, varName, ifContent, elseContent) => {
    return context[varName] ? ifContent : elseContent;
  });

  // Process {{#if variable}}...{{/if}} blocks (without else)
  result = result.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, varName, content) => {
    return context[varName] ? content : '';
  });

  // Process {{#unless variable}}...{{/unless}} blocks (inverse of #if)
  result = result.replace(/\{\{#unless\s+(\w+)\}\}([\s\S]*?)\{\{\/unless\}\}/g, (_, varName, content) => {
    return context[varName] ? '' : content;
  });

  // Replace simple {{variable}} placeholders
  result = result.replace(/\{\{(\w+)\}\}/g, (_, varName) => {
    return context[varName] ?? '';
  });

  return result;
}

// Create context for template processing
// Note: navItems not passed - header uses fallback or empty nav
// CTA defaults to login page - customize in custom/frontend/layouts/public/
const templateContext = computed(() => ({
  siteName: siteName.value,
  currentYear,
  buildVersion,
  footerLinks: null,
  themesManifest: availableThemes.value.map(t => ({ name: t.name, title: t.title })),
  ctaUrl: '/auth/login',
  ctaLabel: 'Login'
}));

// Processed header and footer HTML
const processedHeader = computed(() => processTemplate(headerHtml, templateContext.value));
const processedFooter = computed(() => processTemplate(footerHtml, templateContext.value));

onMounted(async () => {
  logger.debug('PublicLayout mounted', {
    isCached: isCached.value,
    routePath: route.path,
    cachedRoutePath: window.__CACHED_ROUTE__?.path,
    isCachedPage: window.__IS_CACHED_PAGE__
  }, 'PublicLayout')

  if (isCached.value && window.__ORIGINAL_MAIN_CONTENT__) {
    cachedContent.value = window.__ORIGINAL_MAIN_CONTENT__
  }

  // Setup theme switcher click handlers after mount
  setupThemeSwitcher();
});

/**
 * Setup theme switcher buttons after v-html renders
 */
function setupThemeSwitcher() {
  const container = document.querySelector('[data-theme-switcher]');
  if (!container) return;

  container.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      const themeName = btn.textContent?.toLowerCase().replace(/\s+/g, '-');
      if (themeName) {
        const theme = availableThemes.value.find(t => t.name === themeName || t.title.toLowerCase() === themeName);
        if (theme) setTheme(theme.name);
      }
    });
  });
}
</script>

<template>
  <div class="flex flex-col min-h-screen">
    <!-- Header from shared partial -->
    <div v-html="processedHeader"></div>

    <main class="flex-grow flex flex-col">
      <div class="w-full max-w-7xl mx-auto px-6 py-6 theme-colors-text-primary flex-grow flex flex-col">
        <template v-if="!isCached">
          <slot></slot>
        </template>
        <template v-else>
          <div v-html="cachedContent"></div>
        </template>
      </div>
    </main>

    <!-- Footer from shared partial -->
    <div v-html="processedFooter"></div>
  </div>
</template>
