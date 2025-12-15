import fs from 'fs'
import path from 'path'

/**
 * Vite plugin to inject theme CSS links dynamically from auto-themes.json
 * Removes hardcoded theme references from index.html
 */
export function injectThemes() {
  let config

  return {
    name: 'inject-themes',

    configResolved(resolvedConfig) {
      config = resolvedConfig
    },

    transformIndexHtml(html) {
      const themesJsonPath = path.resolve(config.root, 'src/auto-themes.json')

      if (!fs.existsSync(themesJsonPath)) {
        console.warn('[inject-themes] auto-themes.json not found at:', themesJsonPath)
        return html
      }

      const themesData = JSON.parse(fs.readFileSync(themesJsonPath, 'utf-8'))

      // Support both formats:
      // - Array: [{ name, title, ... }, ...]
      // - Object: { themes: [...], default: "..." }
      const themes = Array.isArray(themesData) ? themesData : (themesData.themes || [])

      if (themes.length === 0) {
        console.warn('[inject-themes] No themes found in auto-themes.json')
        return html
      }

      const defaultTheme = Array.isArray(themesData)
        ? themes[0]?.name
        : (themesData.default || themes[0]?.name)

      // Generate theme CSS links
      const themeLinks = themes.map(theme => {
        const themeName = theme.name
        const themeComment = `    <!-- Theme: ${theme.title} (${themeName}) -->`
        const links = [
          `    <link rel="stylesheet" href="/styles/themes/${themeName}/00-tokens.css?v={{VITE_TIMESTAMP}}">`,
          `    <link rel="stylesheet" href="/styles/themes/${themeName}/01-base.css?v={{VITE_TIMESTAMP}}">`,
          `    <link rel="stylesheet" href="/styles/themes/${themeName}/02-typography.css?v={{VITE_TIMESTAMP}}">`,
          `    <link rel="stylesheet" href="/styles/themes/${themeName}/03-content.css?v={{VITE_TIMESTAMP}}">`,
          `    <link rel="stylesheet" href="/styles/themes/${themeName}/04-colors.css?v={{VITE_TIMESTAMP}}">`,
          `    <link rel="stylesheet" href="/styles/themes/${themeName}/05-layout.css?v={{VITE_TIMESTAMP}}">`,
          `    <link rel="stylesheet" href="/styles/themes/${themeName}/06-components.css?v={{VITE_TIMESTAMP}}">`,
          `    <link rel="stylesheet" href="/styles/themes/${themeName}/07-mixins.css?v={{VITE_TIMESTAMP}}">`,
          `    <link rel="stylesheet" href="/styles/themes/${themeName}/07-effects.css?v={{VITE_TIMESTAMP}}">`,
          `    <link rel="stylesheet" href="/styles/themes/${themeName}/99-overrides.css?v={{VITE_TIMESTAMP}}">`
        ]
        return [themeComment, ...links].join('\n')
      }).join('\n\n')

      const timestamp = Date.now()
      const finalThemeLinks = themeLinks.replace(/{{VITE_TIMESTAMP}}/g, timestamp)

      // Replace markers in HTML
      html = html.replace(/data-theme="[^"]*"/, `data-theme="${defaultTheme}"`)
      html = html.replace(
        /<!-- THEME_CSS_START -->[\s\S]*?<!-- THEME_CSS_END -->/,
        `<!-- THEME_CSS_START -->\n${finalThemeLinks}\n    <!-- THEME_CSS_END -->`
      )

      console.log(`[inject-themes] ✓ Injected ${themes.length} themes (default: ${defaultTheme})`)

      return html
    }
  }
}
