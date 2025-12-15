import { BaseService } from '@/core/base/BaseService.js';
import { NotFoundError, BadRequestError } from '@/core/base/BaseError.js';
import { Service } from '@/core/decorators/component.js';

/**
 * Role service with decorator
 */
@Service()
export class RoleService extends BaseService {
  /**
   * Get all roles
   */
  async getAllRoles() {
    return await this.prisma.authRole.findMany({
      where: { deleted: false }
    });
  }

  /**
   * Get role by ID
   */
  async getRoleById(id) {
    const role = await this.prisma.authRole.findUnique({
      where: { id: parseInt(id), deleted: false }
    });

    if (!role) {
      throw new NotFoundError(`Role with ID ${id} not found`);
    }

    return role;
  }

  /**
   * Create a new role
   */
  async createRole(data) {
    const existingRole = await this.prisma.authRole.findFirst({
      where: { name: data.name, deleted: false }
    });

    if (existingRole) {
      throw new BadRequestError(`Role with name ${data.name} already exists`);
    }

    return await this.prisma.authRole.create({
      data: {
        name: data.name,
        description: data.description,
        abilityRules: data.abilityRules ?? null,
        deleted: false
      }
    });
  }

  /**
   * Update role
   */
  async updateRole(id, data) {
    const roleExists = await this.prisma.authRole.findUnique({
      where: { id: parseInt(id), deleted: false }
    });

    if (!roleExists) {
      throw new NotFoundError(`Role with ID ${id} not found`);
    }

    if (data.name && data.name !== roleExists.name) {
      const existingRole = await this.prisma.authRole.findFirst({
        where: {
          name: data.name,
          deleted: false,
          id: { not: parseInt(id) }
        }
      });

      if (existingRole) {
        throw new BadRequestError(`Role with name ${data.name} already exists`);
      }
    }

    return await this.prisma.authRole.update({
      where: { id: parseInt(id) },
      data: {
        name: data.name,
        description: data.description,
        abilityRules: data.abilityRules !== undefined ? data.abilityRules : undefined
      }
    });
  }

  /**
   * Delete role (soft delete)
   */
  async deleteRole(id) {
    const roleExists = await this.prisma.authRole.findUnique({
      where: { id: parseInt(id), deleted: false }
    });

    if (!roleExists) {
      throw new NotFoundError(`Role with ID ${id} not found`);
    }

    await this.prisma.authRole.update({
      where: { id: parseInt(id) },
      data: { deleted: true }
    });

    return true;
  }
}