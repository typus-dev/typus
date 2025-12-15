import { StorageModule } from './StorageModule';
import { StorageController } from './controllers/StorageController';
import { FileSystemService } from './services/FileSystemService';

export {
    StorageModule,
    StorageController,
    FileSystemService,
    // Legacy exports for backward compatibility
    StorageModule as FileManagerModule,
    StorageController as FileManagerController
};

export default StorageModule;
