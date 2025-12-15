import { BaseModule } from '../../core/base/BaseModule.js';
import { StorageController } from './controllers/StorageController';
import { FileSystemService } from './services/FileSystemService';
import { StorageService } from './services/StorageService';
import { AbilityFactory } from '../../core/security/abilities/AbilityFactory.js';
import { Module } from '../../core/decorators/component.js';
import { container } from 'tsyringe';

export class StorageModule extends BaseModule<StorageController, FileSystemService> {
    constructor() {
        const basePath = 'storage';
        super(basePath, StorageController, FileSystemService);
        
        // Register StorageService
        container.registerSingleton(StorageService);
    }

    protected initialize(): void {
        this.logger.info(`[${this.moduleName}] module initialized`);
    }

    private abilityMiddleware() {
        return (req: any, res: any, next: Function) => {
            if (req.user) {
                const abilityFactory: AbilityFactory = container.resolve(AbilityFactory);
                req.user.ability = abilityFactory.defineAbilityFor(req.user);
            }
            next();
        };
    }

    protected initializeRoutes(): void {
        this.logger.info(`[${this.moduleName}] routes initializing...`);

        // File upload with metadata (authOptional for public uploads with userId in body)
        this.router.post('/upload', [this.authOptional(), this.controller.uploadMiddleware],
            this.controller.uploadFileWithMetadata.bind(this.controller));

        // Get user files with filters
        this.router.get('/files', [this.auth(), this.abilityMiddleware()],
            this.controller.getUserStorageFiles.bind(this.controller));

        // File metadata management
        this.router.put('/:fileId/metadata', [this.auth(), this.abilityMiddleware()],
            this.controller.updateStorageFileMetadata.bind(this.controller));

        this.router.post('/:fileId/public-url', [this.auth(), this.abilityMiddleware()],
            this.controller.generateFilePublicUrl.bind(this.controller));

        this.router.delete('/:fileId', [this.auth(), this.abilityMiddleware()],
            this.controller.deleteStorageFile.bind(this.controller));

        // Get files by contextId (for session isolation, no auth required for PUBLIC files)
        this.router.get('/by-context/:contextId', [],
            this.controller.getFilesByContext.bind(this.controller));

        // File access routes (order matters - specific before generic)
        //this.router.get('/:fileId/:filename', [],
        //     this.controller.getStorageFileWithFilename.bind(this.controller));

        this.router.get('/:fileId', [this.authOptional(), this.abilityMiddleware()],
            this.controller.getStorageFile.bind(this.controller));

        this.logger.info(`[${this.moduleName}] routes initialized`);
    }
}
