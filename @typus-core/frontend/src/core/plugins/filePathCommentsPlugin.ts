import { App, Plugin, DirectiveBinding, ObjectDirective } from 'vue'


// Configuration interface
interface FilePathCommentsOptions {
  enabled: boolean;
}

// Default configuration
const defaultOptions: FilePathCommentsOptions = {
  enabled: true
}

// Create a directive that adds file path comments
const filePathDirective: ObjectDirective = {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    if (binding.value) {
      // Create a comment node
      const comment = document.createComment(` file: ${binding.value} `)
      
      // Insert the comment before the element
      if (el.parentNode) {
        el.parentNode.insertBefore(comment, el)
      }
    }
  }
}

const filePathCommentsPlugin: Plugin = {
  install(app: App, options: FilePathCommentsOptions = defaultOptions) {
    // Skip if disabled
    if (!options.enabled) {
      logger.debug('[filePathCommentsPlugin] Plugin disabled')
      return
    }

    logger.debug('[filePathCommentsPlugin] Installing file path comments plugin')

    // Register the directive
    app.directive('file-path', filePathDirective)

    // Add a mixin to automatically add the directive to all components
    app.mixin({
      beforeCreate() {
        const options = this.$options
        
        if (options.__file) {
          // Get relative path for cleaner output
          const filePath = options.__file.split('/src/')[1] || options.__file
          
          // Add the directive to the component
          if (!options.directives) {
            options.directives = {}
          }
          
          options.directives['file-path'] = filePath
        }
      }
    })
  }
}

export default filePathCommentsPlugin
