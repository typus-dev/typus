# Vue Plugins

This directory contains Vue plugins that extend the functionality of the application.

## Available Plugins

### File Path Comments Plugin

The File Path Comments plugin automatically adds HTML comments with file paths to component templates. This makes it easier to identify which file a component comes from when inspecting the DOM.

#### How It Works

The plugin uses a Vue directive and mixin to automatically add file path comments to all components. When a component is rendered, a comment with the file path is inserted before the component's root element.

For example, if you have a component in `src/components/MyComponent.vue`, the rendered HTML will include:

```html
<!-- file: components/MyComponent.vue -->
<div class="my-component">
  <!-- Component content -->
</div>
```

#### Configuration

The plugin can be enabled or disabled globally through the application configuration in `src/config/app.ts`:

```typescript
export const defaultConfig: AppConfig = {
  // ...other config
  development: {
    filePathComments: true // Set to false to disable file path comments
  }
}
```

#### Benefits

1. **Easier Debugging**: Quickly identify which file a component comes from when inspecting the DOM
2. **Better Development Experience**: No need to manually add file path comments to templates
3. **Configurable**: Can be enabled or disabled globally for the entire project

#### Implementation Details

The plugin uses a combination of:

1. A Vue directive that adds file path comments to elements
2. A global mixin that automatically applies the directive to all components
3. Configuration options to enable/disable the feature

The plugin only affects the development build and has no impact on production performance.
