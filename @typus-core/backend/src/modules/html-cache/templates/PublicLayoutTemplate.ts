/**
 * Public Layout Template (Hardcoded Test Version)
 *
 * Simplified version of /layouts/public/index.vue
 * For testing static HTML generation
 */

import { getThemeLinksGenerator } from '@/core/html-generator/ThemeLinksGenerator.js';

export interface LayoutProps {
  title: string
  content: string
  siteName?: string
  siteUrl?: string
}

export class PublicLayoutTemplate {
  /**
   * Render public layout HTML
   */
  static render(props: LayoutProps): string {
    const siteName = props.siteName || 'Typus CMS'

    return `
<div class="flex flex-col min-h-screen">
  ${this.renderHeader(siteName)}
  ${this.renderMain(props)}
  ${this.renderFooter(siteName)}
</div>
    `.trim()
  }

  /**
   * Render header
   */
  private static renderHeader(siteName: string): string {
    return `
  <!-- Header -->
  <header class="bg-white shadow-sm border-b">
    <div class="max-w-7xl mx-auto px-6">
      <div class="flex justify-between items-center h-16">
        <!-- Logo -->
        <div class="flex items-center">
          <a href="/" class="text-xl font-bold text-gray-900">
            ${this.escapeHtml(siteName)}
          </a>
        </div>

        <!-- Navigation -->
        <nav class="flex items-center space-x-4">
          <a href="/" class="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-lg font-medium transition-colors">
            Home
          </a>
          <a href="/demo" class="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-lg font-medium transition-colors">
            Demo
          </a>
          <a href="/docs/home" class="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-lg font-medium transition-colors">
            Docs
          </a>
          ${this.renderThemeSwitcher()}
        </nav>
      </div>
    </div>
  </header>
    `.trim()
  }

  /**
   * Render theme switcher buttons (dynamically from themes.json)
   */
  private static renderThemeSwitcher(): string {
    const themeGenerator = getThemeLinksGenerator('/app');
    const themes = themeGenerator.getThemes();

    return themes
      .map(theme => `
          <button
            onclick="document.documentElement.setAttribute('data-theme', '${theme.name}'); localStorage.setItem('app-theme', '${theme.name}')"
            class="px-3 py-1 text-sm text-gray-700 hover:text-gray-900"
          >
            ${this.escapeHtml(theme.title)}
          </button>
      `)
      .join('\n');
  }

  /**
   * Render main content area
   */
  private static renderMain(props: LayoutProps): string {
    return `
  <!-- Main Content -->
  <div class="flex flex-1 justify-center">
    <main class="w-full max-w-7xl mx-auto px-6 py-6 overflow-y-auto">
      <!-- Page Title -->
      <h1 class="text-4xl font-bold text-gray-900 mb-6">
        ${this.escapeHtml(props.title)}
      </h1>

      <!-- Content -->
      <div class="prose prose-lg max-w-none">
        ${props.content}
      </div>
    </main>
  </div>
    `.trim()
  }

  /**
   * Render footer
   */
  private static renderFooter(siteName: string): string {
    return `
  <!-- Footer -->
  <footer class="bg-gray-800 text-white py-8">
    <div class="max-w-7xl mx-auto px-6">
      <div class="text-center">
        <p class="text-gray-300">
          &copy; ${new Date().getFullYear()} ${this.escapeHtml(siteName)}. All rights reserved.
        </p>
      </div>
    </div>
  </footer>
    `.trim()
  }

  /**
   * Escape HTML special characters
   */
  private static escapeHtml(text: string): string {
    if (!text) return ''
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }
}
