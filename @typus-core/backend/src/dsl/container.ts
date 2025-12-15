import { container } from 'tsyringe';

/**
 * Register DSL dependencies in the container
 */
export function registerDslDependencies(): void {

    logger.debug('[DSL] Registering dependencies in the container');
    // Register PrismaClient
    if (!container.isRegistered('PrismaClient')) {
        // Use existing global prisma instance if available
        const prismaInstance = global.prisma ;
        
        container.register('PrismaClient', {
            useValue: prismaInstance
        });
    }
}
