import { Service } from '../../../core/decorators/component.js';
import { BaseService } from '../../../core/base/BaseService.js';
import { v4 as uuidv4 } from 'uuid';
import { BadRequestError, UnauthorizedError, NotFoundError } from '../../../core/base/BaseError.js';
import { inject } from 'tsyringe';
import { DslService } from '../../../dsl/services/DslService.js';
import { FileSystemService } from './FileSystemService.js';
import { AbilityFactory, Action } from '../../../core/security/abilities/AbilityFactory.js';
import { subject } from '@casl/ability';
import { Ability } from '@casl/ability';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

export interface FileUploadContext {
    moduleContext?: string;
    contextId?: string;
    visibility?: string;
    tags?: string[];
    description?: string;
    expiresAt?: Date;
}

export interface UploadedFile {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    buffer: Buffer;
    size: number;
}

@Service()
export class StorageService extends BaseService {
    private dslService: DslService;
    private fileSystemService: FileSystemService;
    private abilityFactory: AbilityFactory;

    constructor(
        @inject(DslService) dslService: DslService,
        @inject(FileSystemService) fileSystemService: FileSystemService,
        @inject(AbilityFactory) abilityFactory: AbilityFactory
    ) {
        super();
        this.dslService = dslService;
        this.fileSystemService = fileSystemService;
        this.abilityFactory = abilityFactory;
    }

    private handleDslResult(result: any): any {
        if ('error' in result) {
            throw new BadRequestError(result.error.message);
        }
        return result.data;
    }

    private extractFirstRecord(data: any): any {
        const fileRecord = Array.isArray(data) ? data[0] : data;
        if (!fileRecord) {
            throw new NotFoundError('File not found');
        }
        return fileRecord;
    }

    private async getUserDataById(userId: number, currentUser: any): Promise<any> {
        // Get user data - pass currentUser for permission check
        const result = await this.dslService.executeOperation(
            'AuthUser',
            'read',
            undefined,
            { id: userId },
            undefined,
            undefined,
            currentUser  // Pass full user object with roles for permission check
        );
        const data = this.handleDslResult(result);
        const user = this.extractFirstRecord(data);

        this.logger.debug('[StorageService] getUserDataById - raw user data', {
            userId,
            role: user.role
        });

        // Get ability rules from role by name (like in AuthenticationService)
        let abilityRules = [];
        if (user.role) {
            const roleResult = await this.dslService.executeOperation(
                'AuthRole',
                'read',
                undefined,
                { name: user.role },
                undefined,
                undefined,
                currentUser  // Pass full user object with roles for permission check
            );
            const roleData = this.handleDslResult(roleResult);
            const role = this.extractFirstRecord(roleData);

            this.logger.debug('[StorageService] getUserDataById - role data', {
                roleName: role.name,
                hasAbilityRules: !!role.abilityRules,
                abilityRulesType: typeof role.abilityRules,
                abilityRulesRaw: role.abilityRules
            });

            if (role.abilityRules) {
                abilityRules = typeof role.abilityRules === 'string'
                    ? JSON.parse(role.abilityRules)
                    : role.abilityRules;
            }
        }

        this.logger.info('[StorageService] getUserDataById - final result', {
            userId,
            hasAbilityRules: abilityRules.length > 0,
            abilityRules
        });

        return {
            ...user,
            abilityRules,
            roles: user.role ? [user.role] : []  // Convert string role to array for CASL
        };
    }

    async saveFileWithMetadata(
        file: UploadedFile,
        user: any,
        context?: FileUploadContext
    ): Promise<any> {
        try {
            // Get full user data with abilityRules from database
            // Skip for PUBLIC uploads (anonymous users)
            let userData = null;
            if (context?.visibility !== 'PUBLIC') {
                userData = await this.getUserDataById(user.id, user);
            } else {
                // For PUBLIC uploads, create minimal user context
                userData = {
                    id: user.id,
                    role: user.roles?.[0] || 'user',
                    abilityRules: user.abilityRules || [],
                    roles: user.roles || ['user']
                };
            }

            // Save physical file using FileSystemService
            const relativePath = await this.fileSystemService.saveFile(file, {
                originalName: file.originalname,
                size: file.size,
                mimeType: file.mimetype,
                userId: user.id
            });

            const fileId = uuidv4();

            // Create record in DSL StorageFile with full user context
            const result = await this.dslService.executeOperation(
                'StorageFile',
                'create',
                {
                    id: fileId,
                    originalName: file.originalname,
                    fileName: relativePath.split('/').pop(),
                    mimeType: file.mimetype,
                    size: file.size,
                    storageProvider: 'LOCAL',
                    storagePath: relativePath,
                    visibility: context?.visibility || 'PRIVATE',
                    userId: user.id,
                    moduleContext: context?.moduleContext,
                    contextId: context?.contextId,
                    tags: context?.tags,
                    description: context?.description,
                    status: 'ACTIVE',
                    expiresAt: context?.expiresAt
                },
                undefined,
                undefined,
                undefined,
                userData
            );

            const data = this.handleDslResult(result);

            this.logger.info('[StorageService] File saved with metadata', {
                fileId,
                userId: user.id,
                moduleContext: context?.moduleContext
            });

            return data;
        } catch (error) {
            this.logger.error('[StorageService] Failed to save file with metadata', {
                error,
                errorMessage: error instanceof Error ? error.message : String(error),
                errorStack: error instanceof Error ? error.stack : undefined,
                file: file.originalname,
                userId: user?.id
            });
            throw error; // Re-throw original error instead of hiding it
        }
    }

    async getUserFiles(
        userId: number,
        filters?: {
            moduleContext?: string;
            contextId?: string;
            visibility?: string;
            mimeType?: string;
        },
        pagination?: { page: number, limit: number }
    ): Promise<any[]> {
        try {
            const whereClause: any = {
                userId: userId
            };

            if (filters?.moduleContext) {
                whereClause.moduleContext = filters.moduleContext;
            }

            if (filters?.contextId) {
                whereClause.contextId = filters.contextId;
            }

            if (filters?.visibility) {
                whereClause.visibility = filters.visibility;
            }

            if (filters?.mimeType) {
                whereClause.mimeType = { contains: filters.mimeType };
            }

            const result = await this.dslService.executeOperation(
                'StorageFile',
                'read',
                undefined,
                whereClause,
                ['user'],
                pagination,
                { id: userId },
                undefined, // relationParams
                undefined, // module
                { createdAt: 'desc' } // orderBy
            );

            const data = this.handleDslResult(result);

            // Ensure data is always an array
            if (!Array.isArray(data)) {
                this.logger.warn('[StorageService] DSL returned non-array data, converting to array', {
                    dataType: typeof data,
                    data
                });
                return data ? [data] : [];
            }

            return data || [];
        } catch (error) {
            this.logger.error('[StorageService] Failed to get user files', { error, userId });
            throw new BadRequestError('Failed to get user files');
        }
    }

    async getFileById(fileId: string): Promise<{
        fileRecord: any;
        buffer: Buffer;
        mimeType: string;
    }> {
        try {
            const user = this.getCurrentUser();

            this.logger.info('[StorageService.getFileById] DEBUG - User context', {
                fileId,
                hasUser: !!user,
                user: user,
                userId: user?.id,
                userRoles: user?.roles,
                userEmail: user?.email,
                hasAbilityRules: !!user?.abilityRules,
                abilityRulesCount: user?.abilityRules?.length,
                isUndefined: user === undefined,
                isNull: user === null
            });

            // Get file record
            const result = await this.dslService.executeOperation(
                'StorageFile',
                'read',
                undefined,
                { id: fileId },
                undefined,
                undefined,
                user
            );
            const fileRecord = this.extractFirstRecord(this.handleDslResult(result));

            // Check access permissions
            const abilityRules = user.abilityRules || [];
            const ability = new Ability(abilityRules);

            const fileSubject = { ...fileRecord, userId: fileRecord.userId };
            const canRead = ability.can('read', subject('StorageFile', fileSubject));
            const isOwner = fileRecord.userId === user.id;
            const isPublic = fileRecord.visibility === 'PUBLIC';

            if (!canRead && !isOwner && !isPublic) {
                throw new UnauthorizedError('You do not have permission to access this file');
            }

            const { buffer, mimeType } = await this.getFileContentByProvider(fileRecord);
            return { fileRecord, buffer, mimeType };
        } catch (error) {
            this.logger.error('[StorageService] Failed to get file by ID', { error, fileId });
            throw error;
        }
    }
    private async getFileContentByProvider(fileRecord: any): Promise<{
        buffer: Buffer;
        mimeType: string;
    }> {
        try {
            const user = this.getCurrentUser();
            const userId = user.id

            this.logger.debug('[StorageService] Getting file content by provider', {
                fileId: fileRecord?.id,
                storagePath: fileRecord?.storagePath,
                storageProvider: fileRecord?.storageProvider,

            });

            const storagePath = fileRecord.storagePath;

            if (!storagePath) {
                this.logger.error('[StorageService] Storage path is missing or empty', {
                    fileRecord
                });
                throw new BadRequestError('Storage path is missing');
            }

            if (this.isCloudUrl(storagePath)) {
                throw new BadRequestError('Cloud storage not yet implemented');
            } else {
                this.logger.debug('[StorageService] Using FileSystemService for local storage', {
                    storagePath,
                    userId
                });
                return await this.fileSystemService.getFile(storagePath);
            }
        } catch (error) {
            this.logger.error('[StorageService] Failed to get file content by provider', {
                error,
                fileId: fileRecord?.id,
                storageProvider: fileRecord?.storageProvider,
                storagePath: fileRecord?.storagePath
            });
            throw error;
        }
    }

    private isCloudUrl(storagePath: string): boolean {
        if (!storagePath || typeof storagePath !== 'string') {
            return false;
        }
        return storagePath.startsWith('http://') ||
            storagePath.startsWith('https://') ||
            storagePath.startsWith('gs://') ||
            storagePath.startsWith('s3://');
    }
    async updateFileMetadata(
        fileId: string,
        updates: Partial<FileUploadContext>
    ): Promise<any> {
        try {
            const user = this.getCurrentUser();

            // Use ability rules from user context
            const abilityRules = user.abilityRules || [];
            const ability = new Ability(abilityRules);

            // Get file
            const fileResult = await this.dslService.executeOperation(
                'StorageFile',
                'read',
                undefined,
                { id: fileId },
                undefined,
                undefined,
                user
            );

            const fileRecord = this.extractFirstRecord(this.handleDslResult(fileResult));

            // Check permissions
            const fileSubject = {
                ...fileRecord,
                userId: fileRecord.userId
            };

            const canUpdate = ability.can('update', subject('StorageFile', fileSubject));
            const isOwner = fileRecord.userId === user.id;

            if (!canUpdate && !isOwner) {
                throw new UnauthorizedError('You do not have permission to update this file');
            }

            // Update record
            const result = await this.dslService.executeOperation(
                'StorageFile',
                'update',
                {
                    visibility: updates.visibility,
                    moduleContext: updates.moduleContext,
                    contextId: updates.contextId,
                    tags: updates.tags,
                    description: updates.description,
                    expiresAt: updates.expiresAt
                },
                { id: fileId },
                undefined,
                undefined,
                user
            );

            return this.handleDslResult(result);
        } catch (error) {
            this.logger.error('[StorageService] Failed to update file metadata', { error, fileId });
            throw error;
        }
    }

    async deleteFileById(fileId: string): Promise<boolean> {
        try {
            const user = this.getCurrentUser();
            // Use ability rules from user context
            const abilityRules = user.abilityRules || [];
            const ability = new Ability(abilityRules);

            // Get file
            const fileResult = await this.dslService.executeOperation(
                'StorageFile',
                'read',
                undefined,
                { id: fileId },
                undefined,
                undefined,
                user
            );

            const fileRecord = this.extractFirstRecord(this.handleDslResult(fileResult));

            // Check permissions
            const fileSubject = {
                ...fileRecord,
                userId: fileRecord.userId
            };

            const canDelete = ability.can('delete', subject('StorageFile', fileSubject));
            const isOwner = fileRecord.userId === user.id;

            if (!canDelete && !isOwner) {
                throw new UnauthorizedError('You do not have permission to delete this file');
            }

            // Soft delete
            await this.dslService.executeOperation(
                'StorageFile',
                'update',
                {
                    status: 'DELETED',
                    deletedAt: new Date()
                },
                { id: fileId },
                undefined,
                undefined,
                user
            );

            this.logger.info('[StorageService] File deleted successfully', { fileId, userId: user.id });
            return true;
        } catch (error) {
            this.logger.error('[StorageService] Failed to delete file', { error, fileId });
            throw error;
        }
    }

    async generatePublicUrl(fileId: string): Promise<string> {
        try {
            const fileResult = await this.dslService.executeOperation(
                'StorageFile',
                'read',
                undefined,
                { id: fileId },
                undefined,
                undefined,
                { id: 0 } // System user for public URL generation
            );

            const data = this.handleDslResult(fileResult);
            const fileRecord = this.extractFirstRecord(data);

            // For local storage - simple URL through fileId
            return `/api/storage/${fileId}`;
        } catch (error) {
            this.logger.error('[StorageService] Failed to generate public URL', { error, fileId });
            throw error;
        }
    }

    /**
     * Save favicon with auto-generated variants (main + apple-touch-icon)
     * Convention: {guid}.png → main, {guid}-apple.png → apple
     */
    async saveFaviconWithVariants(
        file: UploadedFile,
        user: any,
        context?: FileUploadContext
    ): Promise<{ main: any; apple: any }> {
        try {
            this.logger.info('[StorageService] Generating favicon variants', {
                originalName: file.originalname,
                userId: user.id
            });

            // Get full user data with abilityRules from database
            const userData = await this.getUserDataById(user.id, user);

            // Generate main favicon (256x256)
            const mainBuffer = await sharp(file.buffer)
                .resize(256, 256, {
                    fit: 'contain',
                    background: { r: 0, g: 0, b: 0, alpha: 0 }
                })
                .png()
                .toBuffer();

            // Generate apple-touch-icon (180x180)
            const appleBuffer = await sharp(file.buffer)
                .resize(180, 180, {
                    fit: 'contain',
                    background: { r: 0, g: 0, b: 0, alpha: 0 }
                })
                .png()
                .toBuffer();

            // Create modified file objects for both variants
            const mainFile: UploadedFile = {
                ...file,
                buffer: mainBuffer,
                size: mainBuffer.length,
                mimetype: 'image/png',
                originalname: file.originalname.replace(/\.(jpe?g|png|gif|webp)$/i, '.png')
            };

            const appleFile: UploadedFile = {
                ...file,
                buffer: appleBuffer,
                size: appleBuffer.length,
                mimetype: 'image/png',
                originalname: file.originalname.replace(/\.(jpe?g|png|gif|webp)$/i, '-apple.png')
            };

            // Save main favicon
            const mainRelativePath = await this.fileSystemService.saveFile(mainFile, {
                originalName: mainFile.originalname,
                size: mainFile.size,
                mimeType: mainFile.mimetype,
                userId: user.id
            });

            const mainFileId = uuidv4();

            const mainResult = await this.dslService.executeOperation(
                'StorageFile',
                'create',
                {
                    id: mainFileId,
                    originalName: mainFile.originalname,
                    fileName: mainRelativePath.split('/').pop(),
                    mimeType: mainFile.mimetype,
                    size: mainFile.size,
                    storageProvider: 'LOCAL',
                    storagePath: mainRelativePath,
                    visibility: context?.visibility || 'PUBLIC',
                    userId: user.id,
                    moduleContext: context?.moduleContext,
                    contextId: context?.contextId,
                    tags: context?.tags,
                    description: context?.description || 'Site favicon (main)',
                    status: 'ACTIVE',
                    expiresAt: context?.expiresAt
                },
                undefined,
                undefined,
                undefined,
                userData
            );

            // Save apple-touch-icon
            const appleRelativePath = await this.fileSystemService.saveFile(appleFile, {
                originalName: appleFile.originalname,
                size: appleFile.size,
                mimeType: appleFile.mimetype,
                userId: user.id
            });

            const appleFileId = uuidv4();

            const appleResult = await this.dslService.executeOperation(
                'StorageFile',
                'create',
                {
                    id: appleFileId,
                    originalName: appleFile.originalname,
                    fileName: appleRelativePath.split('/').pop(),
                    mimeType: appleFile.mimetype,
                    size: appleFile.size,
                    storageProvider: 'LOCAL',
                    storagePath: appleRelativePath,
                    visibility: context?.visibility || 'PUBLIC',
                    userId: user.id,
                    moduleContext: context?.moduleContext,
                    contextId: context?.contextId,
                    tags: context?.tags,
                    description: context?.description || 'Site favicon (apple)',
                    status: 'ACTIVE',
                    expiresAt: context?.expiresAt
                },
                undefined,
                undefined,
                undefined,
                userData
            );

            const mainData = this.handleDslResult(mainResult);
            const appleData = this.handleDslResult(appleResult);

            this.logger.info('[StorageService] Favicon variants saved successfully', {
                mainFileId,
                appleFileId,
                userId: user.id
            });

            // ADDITIONALLY: Copy to public/favicon/ for static serving
            try {
                const publicFaviconDir = path.join(process.env.PROJECT_PATH || process.cwd(), 'public', 'favicon');
                await fs.mkdir(publicFaviconDir, { recursive: true });

                // Write main favicon as favicon.png
                await fs.writeFile(path.join(publicFaviconDir, 'favicon.png'), mainBuffer);
                this.logger.info('[StorageService] Copied main favicon to public/favicon/favicon.png');

                // Write apple-touch-icon
                await fs.writeFile(path.join(publicFaviconDir, 'apple-touch-icon.png'), appleBuffer);
                this.logger.info('[StorageService] Copied apple favicon to public/favicon/apple-touch-icon.png');
            } catch (publicError) {
                // Don't fail the whole operation if public copy fails
                this.logger.warn('[StorageService] Failed to copy favicon to public directory', {
                    error: publicError instanceof Error ? publicError.message : String(publicError)
                });
            }

            return {
                main: mainData,
                apple: appleData
            };
        } catch (error) {
            this.logger.error('[StorageService] Failed to save favicon with variants', {
                error,
                errorMessage: error instanceof Error ? error.message : String(error),
                errorStack: error instanceof Error ? error.stack : undefined,
                file: file.originalname,
                userId: user?.id
            });
            throw error;
        }
    }
}
