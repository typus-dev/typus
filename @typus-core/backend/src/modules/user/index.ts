/**
 * User module index file
 * Exports all components of the module
 */

export { UserModule } from './UserModule';

export { UserController } from './controllers/UserController';

export { UserService } from './services/UserService';

import { UserModule as Module } from './UserModule';

export default { UserModule: Module };
