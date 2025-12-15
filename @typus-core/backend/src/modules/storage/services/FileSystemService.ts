import { Service } from '../../../core/decorators/component.js';
import { BaseService } from '../../../core/base/BaseService.js';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { BadRequestError, UnauthorizedError } from '../../../core/base/BaseError.js';

export interface FileMetadata {
    originalName: string;
    size: number;
    mimeType: string;
    userId: number;
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
export class FileSystemService extends BaseService {
    private baseStorageDir: string;

    constructor() {
        super();
        this.baseStorageDir = process.env.STORAGE_PATH || path.join(process.env.PROJECT_PATH || process.cwd(), 'storage');
        this.initializeDirectories();
    }

    private async initializeDirectories() {
        try {
            await fs.mkdir(this.baseStorageDir, { recursive: true });
            await fs.mkdir(path.join(this.baseStorageDir, 'uploads'), { recursive: true });
            await fs.mkdir(path.join(this.baseStorageDir, 'uploads', 'users'), { recursive: true });
            this.logger.info('[FileSystemService] Storage directories initialized');
        } catch (error) {
            this.logger.error('[FileSystemService] Failed to initialize directories', { error });
            throw error;
        }
    }

    private async ensureUserDirectories(userId: number) {
        try {
            const now = new Date();
            const year = now.getFullYear().toString();
            const month = (now.getMonth() + 1).toString().padStart(2, '0');

            const userDir = path.join(this.baseStorageDir, 'uploads', 'users', userId.toString());
            await fs.mkdir(userDir, { recursive: true });

            const yearDir = path.join(userDir, year);
            await fs.mkdir(yearDir, { recursive: true });

            const monthDir = path.join(yearDir, month);
            await fs.mkdir(monthDir, { recursive: true });

            return {
                dirPath: monthDir,
                year,
                month
            };
        } catch (error) {
            this.logger.error('[FileSystemService] Failed to create user directories', {
                userId,
                error
            });
            throw error;
        }
    }

    private generateFileName(extension: string): string {
        const timestamp = Date.now();
        const uuid = uuidv4();
        return `${timestamp}_${uuid}${extension}`;
    }

    async saveFile(file: UploadedFile, metadata: FileMetadata): Promise<string> {
        try {
            if (metadata.userId === undefined || metadata.userId === null) {
                throw new UnauthorizedError('User ID is required for file upload');
            }

            const fileExt = path.extname(file.originalname);
            const fileName = this.generateFileName(fileExt);

            const { dirPath, year, month } = await this.ensureUserDirectories(metadata.userId);
            const filePath = path.join(dirPath, fileName);

            await fs.writeFile(filePath, file.buffer);

            const relativePath = `users/${metadata.userId}/${year}/${month}/${fileName}`;

            this.logger.info('[FileSystemService] File saved successfully', {
                path: filePath,
                userId: metadata.userId,
                fileName
            });

            return relativePath;
        } catch (error) {
            this.logger.error('[FileSystemService] Failed to save file', { error });
            throw new BadRequestError('Failed to save file');
        }
    }

    async getFile(filePath: string): Promise<{ buffer: Buffer; mimeType: string }> {
        try {
            // Build full path: storage/uploads/...
            const fullPath = path.join(this.baseStorageDir, 'uploads', filePath);

            this.logger.info('[FileSystemService] File read attempt', { filePath, fullPath });

            await fs.access(fullPath);
            const buffer = await fs.readFile(fullPath);

            const ext = path.extname(fullPath).toLowerCase();
            const mimeTypes: Record<string, string> = {
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.gif': 'image/gif',
                '.webp': 'image/webp',
                '.bmp': 'image/bmp',
                '.tiff': 'image/tiff',
                '.pdf': 'application/pdf',
                '.doc': 'application/msword',
                '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                '.xls': 'application/vnd.ms-excel',
                '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                '.ppt': 'application/vnd.ms-powerpoint',
                '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                '.txt': 'text/plain',
                '.csv': 'text/csv',
            };

            return {
                buffer,
                mimeType: mimeTypes[ext] || 'application/octet-stream',
            };
        } catch (error) {
            this.logger.error('[FileSystemService] Failed to get file', { error, filePath });
            throw new BadRequestError('File not found or access denied');
        }
    }


    async deleteFile(filePath: string): Promise<boolean> {
        try {
           

            // Build full path: storage/uploads/users/1/2025/09/file.jpg
            const fullPath = path.join(
                this.baseStorageDir,
                'uploads',
                filePath
            );

            await fs.access(fullPath);
            await fs.unlink(fullPath);

            this.logger.info('[FileSystemService] File deleted successfully', {
                filePath
            });
            return true;
        } catch (error) {
            this.logger.error('[FileSystemService] Failed to delete file', {
                error,
                filePath
            });
            return false;
        }
    }
}
