export function getComponentName(component: any): string {
  return component?.name ||
         component?.__name ||
         component?.displayName ||
         component?.__vccOpts?.name ||
         component?.__file?.match(/([^/]+)\.vue$/)?.[1] ||
         'Unknown';
}