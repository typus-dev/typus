// plugins/themePlugin.ts
import type { App } from 'vue'

export default {
  install(app: App) {

    const tagClassMap: Record<string, string[]> = {
      div: ['theme-colors-background-secondary', 'theme-colors-text-primary'],
      p: ['theme-colors-text-primary', 'theme-typography-size-base', 'theme-typography-lineHeight'],
      h1: ['theme-colors-text-primary', 'theme-typography-size-xl', 'theme-typography-weight-bold'],
      h2: ['theme-colors-text-primary', 'theme-typography-size-lg', 'theme-typography-weight-semibold']
    }

    app.directive('theme', {
      mounted(el: HTMLElement) {
        logger.debug('mounted theme plugin')
        const tag = el.tagName.toLowerCase()
        const classes = tagClassMap[tag]
        if (classes?.length) {
          el.classList.add(...classes)
        }
      }
    })

    logger.debug('[themePlugin] plugin installed')

  }
}
