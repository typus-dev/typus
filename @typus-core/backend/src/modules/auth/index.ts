// Export module
export { AuthModule } from './AuthModule';

// Export controllers
export { AuthController } from './controllers/AuthController';

// Export services
export { AuthService } from './services/AuthService';

// Import for default export
import { AuthModule as Module } from './AuthModule';

// Default export for module loader
export default { AuthModule: Module };
