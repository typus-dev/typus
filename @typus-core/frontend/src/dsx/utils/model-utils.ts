/**
 * Creates a default object based on model definition
 * @param model The model definition
 * @returns Default object with values based on field types and defaults
 */
export function createDefaultObjectFromModel(model: any): Record<string, any> {
  logger.debug('[createDefaultObjectFromModel]', model);
  if (!model || !Array.isArray(model.fields)) {
    return {};
  }
  
  const defaultObject: Record<string, any> = {};
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
  
  model.fields.forEach(field => {
    if (!field.name || field.name === 'id') return;
    
    // Special defaults for CMS
    if (field.name === 'title') {
      defaultObject[field.name] = `New Content ${timestamp}`;
      return;
    }
    if (field.name === 'sitePath') {
      defaultObject[field.name] = `/content/${Date.now()}`;
      return;
    }
    if (field.name === 'slug') {
      defaultObject[field.name] = `new-content-${Date.now()}`;
      return;
    }
    
    // Use explicit default if available
    if (field.default !== undefined) {
      defaultObject[field.name] = field.default;
      return;
    }
    
    // Type-based defaults
    switch (field.type?.toLowerCase()) {
      case 'string':
        defaultObject[field.name] = '';
        break;
      case 'number':
      case 'int':
      case 'float':
      case 'decimal':
        defaultObject[field.name] = field.required ? 0 : null;
        break;
      case 'boolean':
        defaultObject[field.name] = false;
        break;
      case 'json':
      case 'object':
        defaultObject[field.name] = field.required ? {} : null;
        break;
      case 'array':
        defaultObject[field.name] = [];
        break;
      case 'datetime':
      case 'date':
      case 'time':
        defaultObject[field.name] = null;
        break;
    }
  });
  
  return defaultObject;
}