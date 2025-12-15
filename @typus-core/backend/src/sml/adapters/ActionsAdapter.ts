/**
 * Actions Adapter for SML
 *
 * Registers public business operations under actions.*
 * These are the operations AI should call instead of raw data.models.*
 *
 * Structure:
 *   actions.crm.contact.create
 *   actions.crm.contact.find
 *   actions.waitlist.signup
 *   actions.newsletter.subscribe
 *   etc.
 */

import { SML } from '@typus-core/shared/sml';
import { Logger } from '../../core/logger/Logger.js';

const logger = new Logger();
const OWNER = 'core:actions';

/**
 * Register all public action operations in SML.
 */
export async function registerActionOperations(): Promise<void> {
  logger.debug('[SML:ActionsAdapter] Registering action operations');

  let registeredCount = 0;

  // ==========================================================================
  // CRM Actions
  // ==========================================================================

  // actions.crm.contact.create
  SML.register('actions.crm.contact.create', {
    handler: async (params, ctx) => {
      const prisma = global.prisma;
      if (!prisma) throw new Error('Database not available');

      // Validate required fields
      if (!params.email) {
        throw new Error('Email is required');
      }

      const contact = await prisma.crmContact.create({
        data: {
          email: params.email,
          name: params.name,
          phone: params.phone,
          company: params.company,
          source: params.source || 'api',
          metadata: params.metadata || {},
          createdBy: ctx?.user?.id
        }
      });

      return { id: contact.id, email: contact.email, name: contact.name };
    },
    schema: {
      description: 'Create a new CRM contact',
      params: {
        email: { type: 'string', required: true, description: 'Contact email address' },
        name: { type: 'string', description: 'Contact full name' },
        phone: { type: 'string', description: 'Phone number' },
        company: { type: 'string', description: 'Company name' },
        source: { type: 'string', description: 'Lead source (e.g., website, referral)' },
        metadata: { type: 'object', description: 'Additional custom fields' }
      },
      returns: {
        type: 'Contact',
        fields: {
          id: { type: 'number', primary: true },
          email: { type: 'string', required: true },
          name: { type: 'string' }
        }
      }
    }
  }, { owner: OWNER, visibility: 'public' });
  registeredCount++;

  // actions.crm.contact.find
  SML.register('actions.crm.contact.find', {
    handler: async (params, ctx) => {
      const prisma = global.prisma;
      if (!prisma) throw new Error('Database not available');

      const where: any = {};
      if (params.email) where.email = params.email;
      if (params.id) where.id = params.id;

      const contact = await prisma.crmContact.findFirst({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          company: true,
          source: true,
          createdAt: true
        }
      });

      return contact;
    },
    schema: {
      description: 'Find a CRM contact by email or ID',
      params: {
        email: { type: 'string', description: 'Contact email' },
        id: { type: 'number', description: 'Contact ID' }
      },
      returns: { type: 'Contact' }
    }
  }, { owner: OWNER, visibility: 'public' });
  registeredCount++;

  // actions.crm.contact.list
  SML.register('actions.crm.contact.list', {
    handler: async (params, ctx) => {
      const prisma = global.prisma;
      if (!prisma) throw new Error('Database not available');

      const limit = Math.min(params.limit || 20, 100);
      const offset = params.offset || 0;

      const contacts = await prisma.crmContact.findMany({
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          company: true,
          source: true,
          createdAt: true
        }
      });

      const total = await prisma.crmContact.count();

      return { items: contacts, total, limit, offset };
    },
    schema: {
      description: 'List CRM contacts with pagination',
      params: {
        limit: { type: 'number', description: 'Max items to return (default 20, max 100)' },
        offset: { type: 'number', description: 'Number of items to skip' }
      },
      returns: {
        type: 'ContactList',
        fields: {
          items: { type: 'Contact[]' },
          total: { type: 'number' },
          limit: { type: 'number' },
          offset: { type: 'number' }
        }
      }
    }
  }, { owner: OWNER, visibility: 'public' });
  registeredCount++;

  // ==========================================================================
  // Waitlist Actions
  // ==========================================================================

  // actions.waitlist.signup
  SML.register('actions.waitlist.signup', {
    handler: async (params, ctx) => {
      const prisma = global.prisma;
      if (!prisma) throw new Error('Database not available');

      if (!params.email) {
        throw new Error('Email is required');
      }

      // Check if already signed up
      const existing = await prisma.waitlistSignup.findFirst({
        where: { email: params.email }
      });

      if (existing) {
        return {
          success: false,
          message: 'Email already registered',
          position: existing.position
        };
      }

      // Get next position
      const lastSignup = await prisma.waitlistSignup.findFirst({
        orderBy: { position: 'desc' }
      });
      const position = (lastSignup?.position || 0) + 1;

      // Generate referral code
      const referralCode = `ref-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

      const signup = await prisma.waitlistSignup.create({
        data: {
          email: params.email,
          name: params.name,
          position,
          referralCode,
          status: 'pending',
          newsletterConsent: params.newsletterConsent ?? false,
          metadata: params.metadata || {}
        }
      });

      return {
        success: true,
        position: signup.position,
        referralCode: signup.referralCode,
        message: `You are #${signup.position} on the waitlist!`
      };
    },
    schema: {
      description: 'Sign up for the waitlist',
      params: {
        email: { type: 'string', required: true, description: 'Email address' },
        name: { type: 'string', description: 'Full name' },
        newsletterConsent: { type: 'boolean', description: 'Consent to receive newsletter' },
        metadata: { type: 'object', description: 'Additional data' }
      },
      returns: {
        type: 'WaitlistResult',
        fields: {
          success: { type: 'boolean', required: true },
          position: { type: 'number' },
          referralCode: { type: 'string' },
          message: { type: 'string' }
        }
      }
    }
  }, { owner: OWNER, visibility: 'public' });
  registeredCount++;

  // actions.waitlist.check
  SML.register('actions.waitlist.check', {
    handler: async (params, ctx) => {
      const prisma = global.prisma;
      if (!prisma) throw new Error('Database not available');

      const signup = await prisma.waitlistSignup.findFirst({
        where: { email: params.email }
      });

      if (!signup) {
        return { found: false };
      }

      return {
        found: true,
        position: signup.position,
        status: signup.status,
        referralCode: signup.referralCode,
        referralCount: signup.referralCount
      };
    },
    schema: {
      description: 'Check waitlist position by email',
      params: {
        email: { type: 'string', required: true, description: 'Email to check' }
      },
      returns: {
        type: 'WaitlistStatus',
        fields: {
          found: { type: 'boolean', required: true },
          position: { type: 'number' },
          status: { type: 'string' },
          referralCode: { type: 'string' },
          referralCount: { type: 'number' }
        }
      }
    }
  }, { owner: OWNER, visibility: 'public' });
  registeredCount++;

  // ==========================================================================
  // Newsletter Actions
  // ==========================================================================

  // actions.newsletter.subscribe
  SML.register('actions.newsletter.subscribe', {
    handler: async (params, ctx) => {
      const prisma = global.prisma;
      if (!prisma) throw new Error('Database not available');

      if (!params.email) {
        throw new Error('Email is required');
      }

      // Check existing
      const existing = await prisma.newsletterSubscription.findFirst({
        where: { email: params.email }
      });

      if (existing) {
        if (existing.status === 'active') {
          return { success: true, message: 'Already subscribed', alreadySubscribed: true };
        }
        // Reactivate
        await prisma.newsletterSubscription.update({
          where: { id: existing.id },
          data: { status: 'active', updatedAt: new Date() }
        });
        return { success: true, message: 'Subscription reactivated', reactivated: true };
      }

      await prisma.newsletterSubscription.create({
        data: {
          email: params.email,
          name: params.name,
          status: 'active',
          source: params.source || 'api'
        }
      });

      return { success: true, message: 'Successfully subscribed' };
    },
    schema: {
      description: 'Subscribe to the newsletter',
      params: {
        email: { type: 'string', required: true, description: 'Email address' },
        name: { type: 'string', description: 'Subscriber name' },
        source: { type: 'string', description: 'Subscription source' }
      },
      returns: {
        type: 'SubscribeResult',
        fields: {
          success: { type: 'boolean', required: true },
          message: { type: 'string' },
          alreadySubscribed: { type: 'boolean' },
          reactivated: { type: 'boolean' }
        }
      }
    }
  }, { owner: OWNER, visibility: 'public' });
  registeredCount++;

  // actions.newsletter.unsubscribe
  SML.register('actions.newsletter.unsubscribe', {
    handler: async (params, ctx) => {
      const prisma = global.prisma;
      if (!prisma) throw new Error('Database not available');

      const subscription = await prisma.newsletterSubscription.findFirst({
        where: { email: params.email }
      });

      if (!subscription) {
        return { success: false, message: 'Email not found' };
      }

      await prisma.newsletterSubscription.update({
        where: { id: subscription.id },
        data: { status: 'unsubscribed', updatedAt: new Date() }
      });

      return { success: true, message: 'Successfully unsubscribed' };
    },
    schema: {
      description: 'Unsubscribe from the newsletter',
      params: {
        email: { type: 'string', required: true, description: 'Email to unsubscribe' }
      },
      returns: {
        type: 'UnsubscribeResult',
        fields: {
          success: { type: 'boolean', required: true },
          message: { type: 'string' }
        }
      }
    }
  }, { owner: OWNER, visibility: 'public' });
  registeredCount++;

  // ==========================================================================
  // Compass Actions (Strategic Planning)
  // ==========================================================================

  // actions.compass.item.create
  SML.register('actions.compass.item.create', {
    handler: async (params, ctx) => {
      const prisma = global.prisma;
      if (!prisma) throw new Error('Database not available');

      if (!params.title) {
        throw new Error('Title is required');
      }

      // Get max position for ordering
      const maxPos = await prisma.compassItem.aggregate({
        where: { parentId: params.parentId || null },
        _max: { position: true }
      });

      const item = await prisma.compassItem.create({
        data: {
          userId: ctx?.user?.id || params.userId,
          type: params.type || 'goal',
          title: params.title,
          description: params.description,
          parentId: params.parentId,
          level: params.level || 0,
          status: params.status || 'active',
          priority: params.priority || 'medium',
          deadline: params.deadline ? new Date(params.deadline) : null,
          position: (maxPos._max.position || 0) + 1,
          progress: 0,
          isCritical: params.isCritical || false
        }
      });

      return {
        id: item.id,
        title: item.title,
        type: item.type,
        status: item.status,
        position: item.position
      };
    },
    schema: {
      description: 'Create a compass item (goal, objective, key result, task)',
      params: {
        title: { type: 'string', required: true, description: 'Item title' },
        type: { type: 'string', description: 'Type: mission, vision, goal, objective, key-result, task' },
        description: { type: 'string', description: 'Detailed description' },
        parentId: { type: 'number', description: 'Parent item ID for hierarchy' },
        level: { type: 'number', description: 'Hierarchy level (0=root)' },
        status: { type: 'string', description: 'Status: active, completed, paused, cancelled' },
        priority: { type: 'string', description: 'Priority: low, medium, high, critical' },
        deadline: { type: 'string', description: 'Deadline (ISO date)' },
        isCritical: { type: 'boolean', description: 'Mark as critical path item' }
      },
      returns: {
        type: 'CompassItem',
        fields: {
          id: { type: 'number', primary: true },
          title: { type: 'string', required: true },
          type: { type: 'string' },
          status: { type: 'string' },
          position: { type: 'number' }
        }
      }
    }
  }, { owner: OWNER, visibility: 'public' });
  registeredCount++;

  // actions.compass.item.list
  SML.register('actions.compass.item.list', {
    handler: async (params, ctx) => {
      const prisma = global.prisma;
      if (!prisma) throw new Error('Database not available');

      const where: any = {};
      if (params.parentId !== undefined) where.parentId = params.parentId;
      if (params.type) where.type = params.type;
      if (params.status) where.status = params.status;
      if (ctx?.user?.id) where.userId = ctx.user.id;

      const items = await prisma.compassItem.findMany({
        where,
        orderBy: [{ level: 'asc' }, { position: 'asc' }],
        take: Math.min(params.limit || 50, 100),
        skip: params.offset || 0,
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
          level: true,
          parentId: true,
          position: true,
          progress: true,
          priority: true,
          deadline: true,
          isCritical: true
        }
      });

      const total = await prisma.compassItem.count({ where });

      return { items, total };
    },
    schema: {
      description: 'List compass items with filtering',
      params: {
        parentId: { type: 'number', description: 'Filter by parent (null for root items)' },
        type: { type: 'string', description: 'Filter by type' },
        status: { type: 'string', description: 'Filter by status' },
        limit: { type: 'number', description: 'Max items (default 50, max 100)' },
        offset: { type: 'number', description: 'Skip items' }
      },
      returns: {
        type: 'CompassItemList',
        fields: {
          items: { type: 'CompassItem[]' },
          total: { type: 'number' }
        }
      }
    }
  }, { owner: OWNER, visibility: 'public' });
  registeredCount++;

  // actions.compass.item.update
  SML.register('actions.compass.item.update', {
    handler: async (params, ctx) => {
      const prisma = global.prisma;
      if (!prisma) throw new Error('Database not available');

      if (!params.id) {
        throw new Error('Item ID is required');
      }

      const data: any = {};
      if (params.title !== undefined) data.title = params.title;
      if (params.description !== undefined) data.description = params.description;
      if (params.status !== undefined) data.status = params.status;
      if (params.priority !== undefined) data.priority = params.priority;
      if (params.progress !== undefined) data.progress = params.progress;
      if (params.deadline !== undefined) data.deadline = params.deadline ? new Date(params.deadline) : null;
      if (params.isCritical !== undefined) data.isCritical = params.isCritical;

      // Handle status changes
      if (params.status === 'completed' && !data.completedAt) {
        data.completedAt = new Date();
        data.progress = 100;
      }

      const item = await prisma.compassItem.update({
        where: { id: params.id },
        data
      });

      return { id: item.id, title: item.title, status: item.status, progress: item.progress };
    },
    schema: {
      description: 'Update a compass item',
      params: {
        id: { type: 'number', required: true, description: 'Item ID' },
        title: { type: 'string', description: 'New title' },
        description: { type: 'string', description: 'New description' },
        status: { type: 'string', description: 'New status' },
        priority: { type: 'string', description: 'New priority' },
        progress: { type: 'number', description: 'Progress 0-100' },
        deadline: { type: 'string', description: 'New deadline (ISO date)' },
        isCritical: { type: 'boolean', description: 'Critical path flag' }
      },
      returns: {
        type: 'CompassItem',
        fields: {
          id: { type: 'number', primary: true },
          title: { type: 'string' },
          status: { type: 'string' },
          progress: { type: 'number' }
        }
      }
    }
  }, { owner: OWNER, visibility: 'public' });
  registeredCount++;

  // actions.compass.tree
  SML.register('actions.compass.tree', {
    handler: async (params, ctx) => {
      const prisma = global.prisma;
      if (!prisma) throw new Error('Database not available');

      const where: any = {};
      if (ctx?.user?.id) where.userId = ctx.user.id;

      const items = await prisma.compassItem.findMany({
        where,
        orderBy: [{ level: 'asc' }, { position: 'asc' }],
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
          level: true,
          parentId: true,
          position: true,
          progress: true,
          priority: true,
          isCritical: true
        }
      });

      // Build tree structure
      const buildTree = (parentId: number | null): any[] => {
        return items
          .filter(i => i.parentId === parentId)
          .map(item => ({
            ...item,
            children: buildTree(item.id)
          }));
      };

      return { tree: buildTree(null), totalItems: items.length };
    },
    schema: {
      description: 'Get compass items as hierarchical tree',
      returns: {
        type: 'CompassTree',
        fields: {
          tree: { type: 'CompassItem[]', description: 'Nested tree structure' },
          totalItems: { type: 'number' }
        }
      }
    }
  }, { owner: OWNER, visibility: 'public' });
  registeredCount++;

  // ==========================================================================
  // Project Actions
  // ==========================================================================

  // actions.project.create
  SML.register('actions.project.create', {
    handler: async (params, ctx) => {
      const prisma = global.prisma;
      if (!prisma) throw new Error('Database not available');

      if (!params.name) {
        throw new Error('Project name is required');
      }

      // Generate slug from name
      const slug = params.slug || params.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      const project = await prisma.project.create({
        data: {
          name: params.name,
          slug,
          description: params.description,
          status: params.status || 'active',
          priority: params.priority || 'medium',
          startDate: params.startDate ? new Date(params.startDate) : null,
          deadline: params.deadline ? new Date(params.deadline) : null,
          color: params.color,
          ownerId: ctx?.user?.id || params.ownerId,
          createdBy: ctx?.user?.id
        }
      });

      return {
        id: project.id,
        name: project.name,
        slug: project.slug,
        status: project.status
      };
    },
    schema: {
      description: 'Create a new project',
      params: {
        name: { type: 'string', required: true, description: 'Project name' },
        slug: { type: 'string', description: 'URL slug (auto-generated if not provided)' },
        description: { type: 'string', description: 'Project description' },
        status: { type: 'string', description: 'Status: active, completed, paused, archived' },
        priority: { type: 'string', description: 'Priority: low, medium, high' },
        startDate: { type: 'string', description: 'Start date (ISO)' },
        deadline: { type: 'string', description: 'Deadline (ISO)' },
        color: { type: 'string', description: 'Color hex code' }
      },
      returns: {
        type: 'Project',
        fields: {
          id: { type: 'number', primary: true },
          name: { type: 'string', required: true },
          slug: { type: 'string' },
          status: { type: 'string' }
        }
      }
    }
  }, { owner: OWNER, visibility: 'public' });
  registeredCount++;

  // actions.project.list
  SML.register('actions.project.list', {
    handler: async (params, ctx) => {
      const prisma = global.prisma;
      if (!prisma) throw new Error('Database not available');

      const where: any = {};
      if (params.status) where.status = params.status;
      if (ctx?.user?.id) where.ownerId = ctx.user.id;

      const projects = await prisma.project.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Math.min(params.limit || 20, 100),
        skip: params.offset || 0,
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          priority: true,
          deadline: true,
          color: true,
          createdAt: true
        }
      });

      const total = await prisma.project.count({ where });

      return { items: projects, total };
    },
    schema: {
      description: 'List projects',
      params: {
        status: { type: 'string', description: 'Filter by status' },
        limit: { type: 'number', description: 'Max items (default 20)' },
        offset: { type: 'number', description: 'Skip items' }
      },
      returns: {
        type: 'ProjectList',
        fields: {
          items: { type: 'Project[]' },
          total: { type: 'number' }
        }
      }
    }
  }, { owner: OWNER, visibility: 'public' });
  registeredCount++;

  // actions.project.task.create
  SML.register('actions.project.task.create', {
    handler: async (params, ctx) => {
      const prisma = global.prisma;
      if (!prisma) throw new Error('Database not available');

      if (!params.projectId || !params.title) {
        throw new Error('Project ID and title are required');
      }

      // Get max position
      const maxPos = await prisma.projectTask.aggregate({
        where: { projectId: params.projectId, parentTaskId: params.parentTaskId || null },
        _max: { position: true }
      });

      const task = await prisma.projectTask.create({
        data: {
          projectId: params.projectId,
          parentTaskId: params.parentTaskId,
          title: params.title,
          description: params.description,
          status: params.status || 'todo',
          priority: params.priority || 'medium',
          assigneeId: params.assigneeId,
          deadline: params.deadline ? new Date(params.deadline) : null,
          estimatedHours: params.estimatedHours,
          position: (maxPos._max.position || 0) + 1,
          createdBy: ctx?.user?.id
        }
      });

      return {
        id: task.id,
        title: task.title,
        status: task.status,
        position: task.position
      };
    },
    schema: {
      description: 'Create a task in a project',
      params: {
        projectId: { type: 'number', required: true, description: 'Project ID' },
        title: { type: 'string', required: true, description: 'Task title' },
        description: { type: 'string', description: 'Task description' },
        parentTaskId: { type: 'number', description: 'Parent task ID for subtasks' },
        status: { type: 'string', description: 'Status: todo, in-progress, review, done' },
        priority: { type: 'string', description: 'Priority: low, medium, high' },
        assigneeId: { type: 'number', description: 'Assigned user ID' },
        deadline: { type: 'string', description: 'Deadline (ISO)' },
        estimatedHours: { type: 'number', description: 'Estimated hours' }
      },
      returns: {
        type: 'ProjectTask',
        fields: {
          id: { type: 'number', primary: true },
          title: { type: 'string', required: true },
          status: { type: 'string' },
          position: { type: 'number' }
        }
      }
    }
  }, { owner: OWNER, visibility: 'public' });
  registeredCount++;

  // actions.project.task.list
  SML.register('actions.project.task.list', {
    handler: async (params, ctx) => {
      const prisma = global.prisma;
      if (!prisma) throw new Error('Database not available');

      if (!params.projectId) {
        throw new Error('Project ID is required');
      }

      const where: any = { projectId: params.projectId };
      if (params.status) where.status = params.status;
      if (params.assigneeId) where.assigneeId = params.assigneeId;

      const tasks = await prisma.projectTask.findMany({
        where,
        orderBy: [{ position: 'asc' }],
        take: Math.min(params.limit || 50, 200),
        skip: params.offset || 0,
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          parentTaskId: true,
          position: true,
          assigneeId: true,
          deadline: true,
          estimatedHours: true,
          actualHours: true
        }
      });

      const total = await prisma.projectTask.count({ where });

      return { items: tasks, total };
    },
    schema: {
      description: 'List tasks in a project',
      params: {
        projectId: { type: 'number', required: true, description: 'Project ID' },
        status: { type: 'string', description: 'Filter by status' },
        assigneeId: { type: 'number', description: 'Filter by assignee' },
        limit: { type: 'number', description: 'Max items (default 50)' },
        offset: { type: 'number', description: 'Skip items' }
      },
      returns: {
        type: 'TaskList',
        fields: {
          items: { type: 'ProjectTask[]' },
          total: { type: 'number' }
        }
      }
    }
  }, { owner: OWNER, visibility: 'public' });
  registeredCount++;

  // actions.project.task.update
  SML.register('actions.project.task.update', {
    handler: async (params, ctx) => {
      const prisma = global.prisma;
      if (!prisma) throw new Error('Database not available');

      if (!params.id) {
        throw new Error('Task ID is required');
      }

      const data: any = { updatedBy: ctx?.user?.id };
      if (params.title !== undefined) data.title = params.title;
      if (params.description !== undefined) data.description = params.description;
      if (params.status !== undefined) data.status = params.status;
      if (params.priority !== undefined) data.priority = params.priority;
      if (params.assigneeId !== undefined) data.assigneeId = params.assigneeId;
      if (params.deadline !== undefined) data.deadline = params.deadline ? new Date(params.deadline) : null;
      if (params.actualHours !== undefined) data.actualHours = params.actualHours;

      if (params.status === 'done') {
        data.completedAt = new Date();
      }

      const task = await prisma.projectTask.update({
        where: { id: params.id },
        data
      });

      return { id: task.id, title: task.title, status: task.status };
    },
    schema: {
      description: 'Update a project task',
      params: {
        id: { type: 'number', required: true, description: 'Task ID' },
        title: { type: 'string', description: 'New title' },
        description: { type: 'string', description: 'New description' },
        status: { type: 'string', description: 'New status' },
        priority: { type: 'string', description: 'New priority' },
        assigneeId: { type: 'number', description: 'New assignee' },
        deadline: { type: 'string', description: 'New deadline (ISO)' },
        actualHours: { type: 'number', description: 'Actual hours spent' }
      },
      returns: {
        type: 'ProjectTask',
        fields: {
          id: { type: 'number', primary: true },
          title: { type: 'string' },
          status: { type: 'string' }
        }
      }
    }
  }, { owner: OWNER, visibility: 'public' });
  registeredCount++;

  // ==========================================================================
  // Social Media Actions
  // ==========================================================================

  // actions.social.post.create
  SML.register('actions.social.post.create', {
    handler: async (params, ctx) => {
      const prisma = global.prisma;
      if (!prisma) throw new Error('Database not available');

      if (!params.accountId || !params.content) {
        throw new Error('Account ID and content are required');
      }

      // Get account to determine platform
      const account = await prisma.socialAccount.findUnique({
        where: { id: params.accountId }
      });

      if (!account) {
        throw new Error('Social account not found');
      }

      const post = await prisma.socialPost.create({
        data: {
          platformId: account.platformId,
          accountId: params.accountId,
          userId: ctx?.user?.id || params.userId,
          content: params.content,
          hashtags: params.hashtags || [],
          status: params.scheduledAt ? 'scheduled' : 'draft',
          scheduledAt: params.scheduledAt ? new Date(params.scheduledAt) : null,
          metadata: params.metadata || {},
          createdBy: ctx?.user?.id
        }
      });

      return {
        id: post.id,
        content: post.content.substring(0, 100),
        status: post.status,
        scheduledAt: post.scheduledAt
      };
    },
    schema: {
      description: 'Create a social media post',
      params: {
        accountId: { type: 'number', required: true, description: 'Social account ID' },
        content: { type: 'string', required: true, description: 'Post content' },
        hashtags: { type: 'array', description: 'Hashtags array' },
        scheduledAt: { type: 'string', description: 'Schedule time (ISO), omit for draft' },
        metadata: { type: 'object', description: 'Platform-specific metadata' }
      },
      returns: {
        type: 'SocialPost',
        fields: {
          id: { type: 'number', primary: true },
          content: { type: 'string' },
          status: { type: 'string' },
          scheduledAt: { type: 'Date' }
        }
      }
    }
  }, { owner: OWNER, visibility: 'public' });
  registeredCount++;

  // actions.social.post.list
  SML.register('actions.social.post.list', {
    handler: async (params, ctx) => {
      const prisma = global.prisma;
      if (!prisma) throw new Error('Database not available');

      const where: any = {};
      if (params.accountId) where.accountId = params.accountId;
      if (params.status) where.status = params.status;
      if (ctx?.user?.id) where.userId = ctx.user.id;

      const posts = await prisma.socialPost.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Math.min(params.limit || 20, 100),
        skip: params.offset || 0,
        select: {
          id: true,
          platformId: true,
          accountId: true,
          content: true,
          status: true,
          scheduledAt: true,
          publishedAt: true,
          createdAt: true
        }
      });

      const total = await prisma.socialPost.count({ where });

      return { items: posts, total };
    },
    schema: {
      description: 'List social media posts',
      params: {
        accountId: { type: 'number', description: 'Filter by account' },
        status: { type: 'string', description: 'Filter by status: draft, scheduled, published, failed' },
        limit: { type: 'number', description: 'Max items (default 20)' },
        offset: { type: 'number', description: 'Skip items' }
      },
      returns: {
        type: 'PostList',
        fields: {
          items: { type: 'SocialPost[]' },
          total: { type: 'number' }
        }
      }
    }
  }, { owner: OWNER, visibility: 'public' });
  registeredCount++;

  // actions.social.account.list
  SML.register('actions.social.account.list', {
    handler: async (params, ctx) => {
      const prisma = global.prisma;
      if (!prisma) throw new Error('Database not available');

      const where: any = {};
      if (ctx?.user?.id) where.userId = ctx.user.id;
      if (params.platformId) where.platformId = params.platformId;

      const accounts = await prisma.socialAccount.findMany({
        where,
        select: {
          id: true,
          platformId: true,
          accountName: true,
          accountHandle: true,
          status: true,
          lastSyncAt: true
        }
      });

      return { items: accounts, total: accounts.length };
    },
    schema: {
      description: 'List connected social media accounts',
      params: {
        platformId: { type: 'string', description: 'Filter by platform: twitter, instagram, linkedin, etc.' }
      },
      returns: {
        type: 'AccountList',
        fields: {
          items: { type: 'SocialAccount[]' },
          total: { type: 'number' }
        }
      }
    }
  }, { owner: OWNER, visibility: 'public' });
  registeredCount++;

  // ==========================================================================
  // System Actions (public info)
  // ==========================================================================

  // actions.system.health
  SML.register('actions.system.health', {
    handler: async (params, ctx) => {
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      };
    },
    schema: {
      description: 'Check system health status',
      returns: {
        type: 'HealthStatus',
        fields: {
          status: { type: 'string', required: true },
          timestamp: { type: 'string' },
          uptime: { type: 'number' }
        }
      }
    }
  }, { owner: OWNER, visibility: 'public' });
  registeredCount++;

  logger.info(`[SML:ActionsAdapter] Registered ${registeredCount} action operations`);
}
