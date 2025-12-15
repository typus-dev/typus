import { container, injectable, inject } from 'tsyringe';
import 'reflect-metadata';

// Re-export inject for convenience
export { inject };

/**
 * Base component decorator factory
 * Creates decorators for different component types
 */
function Component(type: string, options: any = {}) {
  return function(target: any) {
    // Register with tsyringe
    injectable()(target);

    // ⚠️ CRITICAL FIX: Register singleton using CLASS as token, not string name
    // This ensures container.resolve(ClassName) returns the same instance
    // Previous bug: Used string name, causing new instances on class-based resolution
    container.registerSingleton(target);

    // Add metadata
    Reflect.defineMetadata('component:type', type, target);

    // Add additional metadata based on type
    if (options.path) {
      Reflect.defineMetadata(`${type}:path`, options.path, target);
    }

    return target;
  };
}

/**
 * Service decorator
 * Marks a class as a service component
 */
export function Service(options: { name?: string } = {}) {
  return Component('service', options);
}

/**
 * Controller decorator
 * Marks a class as a controller component
 */
export function Controller(options: { path?: string, name?: string } = {}) {
  return Component('controller', options);
}

/**
 * Repository decorator
 * Marks a class as a repository component
 */
export function Repository(options: { name?: string } = {}) {
  return Component('repository', options);
}

/**
 * Module decorator
 * Marks a class as a module
 */
export function Module(options: { path?: string, name?: string } = {}) {
  return function(target: any) {
    // Add metadata
    Reflect.defineMetadata('module:path', options.path || '', target);
    Reflect.defineMetadata('module:name', options.name || target.name, target);
    
    // Don't register in container as modules are created explicitly
    return target;
  };
}
