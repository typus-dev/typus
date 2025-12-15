import { Request, Response } from 'express';
import { BaseController } from '../../../core/base/BaseController.js';
import { FileSystemService } from '../services/FileSystemService';
import { StorageService, FileUploadContext } from '../services/StorageService';
import { ContextManager } from '../../../core/context/ContextManager.js';
import { inject } from 'tsyringe';
import { Controller } from '../../../core/decorators/component.js';
import multer from 'multer';
import { BadRequestError, UnauthorizedError } from '../../../core/base/BaseError.js';

declare global {
    namespace Express {
        interface User {
            id: number;
            email: string;
            role?: string;
        }
    }
}

@Controller({ path: 'storage' })
export class StorageController extends BaseController {
    private upload: multer.Multer;

    constructor(
        @inject(FileSystemService) private fileSystemService: FileSystemService,
        @inject(StorageService) private storageService: StorageService
    ) {
        super();

        const storage = multer.memoryStorage();
        this.upload = multer({
            storage,
            limits: {
                fileSize: 100 * 1024 * 1024, // 100MB
            },
            fileFilter: (req, file, cb) => {

                const allowedTypes = [
                    /^image\/(jpeg|png|gif|webp|bmp|tiff)$/,
                    /^application\/(pdf|msword|vnd\.openxmlformats-officedocument\.wordprocessingml\.document)$/,
                    /^application\/(vnd\.ms-excel|vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet)$/,
                    /^application\/(vnd\.ms-powerpoint|vnd\.openxmlformats-officedocument\.presentationml\.presentation)$/,
                    /^text\/(plain|csv)$/
                ];

                const isAllowed = allowedTypes.some(type => type.test(file.mimetype));

                if (!isAllowed) {
                    return cb(new BadRequestError('File type not allowed'));
                }
                cb(null, true);
            }
        });
    }

    /**
     * Middleware for file upload
     */
    get uploadMiddleware() {
        return this.upload.single('file');
    }

    /**
     * Upload file with metadata using StorageService (GUID-based)
     */
    async uploadFileWithMetadata(req: Request, res: Response) {
        this.logger.debug('[StorageController] Processing file upload with metadata request', { userId: req.user?.id });

        try {
            if (!req.file) {
                throw new BadRequestError('No file uploaded');
            }

            // Recover user from request property if multer overwrote it
            if (!req.user || !req.user?.id) {
                const savedUser = (req as any)._taskWorkerUser;
                if (savedUser) {
                    req.user = savedUser;
                    this.logger.debug('[StorageController] Recovered task_worker from req property', { userId: req.user?.id });
                }
            }

            // Prepare effective user object
            let effectiveUser = req.user;

        // Allow userId from formData for TaskWorker OR for public uploads (no auth)
        if (req.body.userId) {
            const formUserId = parseInt(req.body.userId, 10);
            if (!isNaN(formUserId) && formUserId > 0) {
                // If user is TaskWorker OR no auth (public upload), use formData userId
                if ((req.user as any)?.isTaskWorker || !req.user) {
                    effectiveUser = {
                        ...req.user,
                        id: formUserId,
                        isTaskWorker: (req.user as any)?.isTaskWorker || false
                    };
                    this.logger.debug('[StorageController] Using userId from form data', {
                        originalUserId: req.user?.id,
                        formUserId: formUserId,
                        isTaskWorker: (req.user as any)?.isTaskWorker || false,
                        isPublicUpload: !req.user
                    });
                }
            }
        }
            // Debug final auth check
            this.logger.debug('[StorageController] Final auth check', {
                hasUser: !!effectiveUser,
                hasUserId: !!effectiveUser?.id,
                userId: effectiveUser?.id,
                userType: typeof effectiveUser?.id,
                userObjectKeys: effectiveUser ? Object.keys(effectiveUser) : null,
                isTaskWorker: (effectiveUser as any)?.isTaskWorker || false
            });

        if (!effectiveUser || !effectiveUser.id) {
            throw new UnauthorizedError('Authentication required: effectiveUser undefined');
        }

            // Extract context from request body
            const context: FileUploadContext = {
                moduleContext: req.body.moduleContext,
                contextId: req.body.contextId,
                visibility: req.body.visibility || 'PRIVATE',
                tags: req.body.tags ? JSON.parse(req.body.tags) : undefined,
                description: req.body.description,
                expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : undefined
            };

            // Check if this is a favicon upload (special handling)
            const isFavicon = req.body.isFavicon === 'true' ||
                             (context.moduleContext === 'system-config' && context.contextId === 'favicon');

            if (isFavicon) {
                // Generate favicon variants (main + apple-touch-icon)
                const faviconVariants = await this.storageService.saveFaviconWithVariants(
                    req.file as any,
                    effectiveUser,
                    context
                );

                this.logger.info('[StorageController] Favicon uploaded with variants successfully', {
                    mainFileId: faviconVariants.main.id,
                    appleFileId: faviconVariants.apple.id,
                    effectiveUserId: effectiveUser.id
                });

                return {
                    success: true,
                    file: faviconVariants.main,
                    variants: {
                        main: `/storage/${faviconVariants.main.id}`,
                        apple: `/storage/${faviconVariants.apple.id}`
                    }
                };
            }

            // Regular file upload
            const storageFile = await this.storageService.saveFileWithMetadata(
                req.file as any,
                effectiveUser,
                context
            );

            this.logger.info('[StorageController] File uploaded with metadata successfully', {
                fileId: storageFile.id,
                effectiveUserId: effectiveUser.id
            });

            return {
                success: true,
                file: storageFile
            };
        } catch (error) {
            this.logger.error('[StorageController] File upload with metadata failed', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Get file by GUID
     */
    async getStorageFile(req: Request, res: Response) {
        this.logger.debug('[StorageController] Processing storage file request');

        try {
            const { fileId } = req.params;

            const { fileRecord, buffer, mimeType } = await this.storageService.getFileById(fileId);
            
            res.setHeader('Content-Type', mimeType);
            res.setHeader('Content-Disposition', `inline; filename="${fileRecord.originalName}"`);
            res.setHeader('Cache-Control', 'private, max-age=3600');

            res.send(buffer);

            this.logger.info('[StorageController] Storage file served successfully', {
                fileId,
                userId: req.user?.id
            });

            return undefined;
        } catch (error) {
            this.logger.error('[StorageController] Storage file request failed', {
                error: error.message,
                stack: error.stack,
                fileId: req.params.fileId
            });

            if (error instanceof UnauthorizedError) {
                res.status(403).json({ error: 'Access denied' });
                return undefined;
            }

            res.status(404).json({ error: 'File not found' });
            return undefined;
        }
    }

    /**
     * Get file by GUID with filename in URL (SEO-friendly)
     */
    async getStorageFileWithFilename(req: Request, res: Response) {
        this.logger.debug('[StorageController] Processing storage file request with filename');

        try {
            const { fileId } = req.params;
            // filename is ignored, just for SEO purposes

            const { fileRecord, buffer, mimeType } = await this.storageService.getFileById(fileId);

            if (fileRecord.visibility !== 'PUBLIC') {
                if (!req.user || !req.user?.id) {
                    throw new UnauthorizedError('Authentication required');
                }
            }

            res.setHeader('Content-Type', mimeType);
            res.setHeader('Content-Disposition', `inline; filename="${fileRecord.originalName}"`);
            res.setHeader('Cache-Control', 'private, max-age=3600');

            res.send(buffer);

            this.logger.info('[StorageController] Storage file with filename served successfully', {
                fileId,
                userId: req.user?.id
            });

            return undefined;
        } catch (error) {
            this.logger.error('[StorageController] Storage file with filename request failed', {
                error: error.message,
                stack: error.stack,
                fileId: req.params.fileId
            });

            if (error instanceof UnauthorizedError) {
                res.status(403).json({ error: 'Access denied' });
                return undefined;
            }

            res.status(404).json({ error: 'File not found' });
            return undefined;
        }
    }

    /**
     * Get user's storage files with filters
     */
    async getUserStorageFiles(req: Request, res: Response) {
        this.logger.debug('[StorageController] Processing get user storage files request', {
            queryParams: req.query,
            user: req.user?.id
        });

        try {
            if (!req.user || !req.user?.id) {
                throw new UnauthorizedError('Authentication required');
            }

            const filters = {
                moduleContext: req.query.moduleContext as string,
                contextId: req.query.contextId as string,
                visibility: req.query.visibility as string,
                mimeType: req.query.mimeType as string
            };

            // Remove undefined values
            Object.keys(filters).forEach(key =>
                filters[key] === undefined && delete filters[key]
            );

            // Pagination parameters
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 20;
            const pagination = { page, limit };

            this.logger.debug('[StorageController] Pagination params', {
                page,
                limit,
                rawPage: req.query.page,
                rawLimit: req.query.limit
            });

            const files = await this.storageService.getUserFiles(req.user?.id, filters, pagination);

            this.logger.info('[StorageController] User storage files retrieved successfully', {
                userId: req.user?.id,
                count: files.length,
                page,
                limit
            });

            return {
                success: true,
                files,
                pagination: {
                    page,
                    limit,
                    total: files.length
                }
            };
        } catch (error) {
            this.logger.error('[StorageController] Get user storage files failed', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Update storage file metadata
     */
    async updateStorageFileMetadata(req: Request, res: Response) {
        this.logger.debug('[StorageController] Processing update storage file metadata request');

        try {
            if (!req.user || !req.user?.id) {
                throw new UnauthorizedError('Authentication required');
            }

            const { fileId } = req.params;
            const updates = this.getValidatedData(req);

            const updatedFile = await this.storageService.updateFileMetadata(fileId, updates);

            this.logger.info('[StorageController] Storage file metadata updated successfully', {
                fileId,
                userId: req.user?.id
            });

            return {
                success: true,
                file: updatedFile
            };
        } catch (error) {
            this.logger.error('[StorageController] Update storage file metadata failed', {
                error: error.message,
                stack: error.stack,
                fileId: req.params.fileId
            });
            throw error;
        }
    }

    /**
     * Delete storage file by GUID
     */
    async deleteStorageFile(req: Request, res: Response) {
        this.logger.debug('[StorageController] Processing delete storage file request');

        try {
            if (!req.user || !req.user?.id) {
                throw new UnauthorizedError('Authentication required');
            }

            const { fileId } = req.params;

            const result = await this.storageService.deleteFileById(fileId);

            this.logger.info('[StorageController] Storage file deleted successfully', {
                fileId,
                userId: req.user?.id
            });

            return {
                success: true,
                message: 'File deleted successfully'
            };
        } catch (error) {
            this.logger.error('[StorageController] Delete storage file failed', {
                error: error.message,
                stack: error.stack,
                fileId: req.params.fileId
            });
            throw error;
        }
    }

    /**
     * Generate public URL for file
     */
    async generateFilePublicUrl(req: Request, res: Response) {
        this.logger.debug('[StorageController] Processing generate public URL request');

        try {
            if (!req.user || !req.user?.id) {
                throw new UnauthorizedError('Authentication required');
            }

            const { fileId } = req.params;

            const publicUrl = await this.storageService.generatePublicUrl(fileId);

            this.logger.info('[StorageController] Public URL generated successfully', {
                fileId,
                userId: req.user?.id
            });

            return {
                success: true,
                publicUrl
            };
        } catch (error) {
            this.logger.error('[StorageController] Generate public URL failed', {
                error: error.message,
                stack: error.stack,
                fileId: req.params.fileId
            });
            throw error;
        }
    }

    /**
     * Get files by contextId (for session isolation)
     */
    async getFilesByContext(req: Request, res: Response) {
        this.logger.debug('[StorageController] Processing get files by context request', {
            contextId: req.params.contextId
        });

        try {
            const { contextId } = req.params;

            if (!contextId) {
                throw new BadRequestError('contextId is required');
            }

            // Query files by contextId
            const files = await global.prisma.storageFile.findMany({
                where: {
                    contextId,
                    visibility: 'PUBLIC' // Only allow PUBLIC files for anonymous access
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });

            this.logger.info('[StorageController] Files retrieved by context', {
                contextId,
                count: files.length
            });

            return {
                success: true,
                files,
                count: files.length
            };
        } catch (error) {
            this.logger.error('[StorageController] Get files by context failed', {
                error: error.message,
                stack: error.stack,
                contextId: req.params.contextId
            });
            throw error;
        }
    }
}
