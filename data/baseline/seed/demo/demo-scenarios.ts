/**
 * Demo Scenarios Seed
 *
 * Seeds AI Agent demo tour scenarios into knowledge base.
 * Scenarios are written in natural language - the AI agent interprets
 * them using available operations (Tools Contract pattern).
 */

import { PrismaClient } from '../../../prisma/generated/client/index.js';

interface DemoScenario {
  key: string;
  title: string;
  content: string;
  metadata: {
    estimatedDuration: string;
    tags: string[];
    language: string;
  };
}

const demoScenarios: DemoScenario[] = [
  {
    key: 'getting-started',
    title: 'Getting Started with Typus',
    content: `
This is a demo tour of the main features of the Typus system.

START:
Begin at the main page (/dashboard).
Greet the user and briefly explain what the system is:
- Typus - a modular platform for building web applications
- Built on plugins that can be enabled and disabled
- Uses DSL (Domain Specific Language) for data model definitions

PROJECT MANAGEMENT:
Navigate to the projects page (/project-management/projects).
Show the project management system:
- Projects with tasks and deadlines
- Kanban boards for visualization
- Assignee management

USERS:
Open user management (/user-management/users/list).
Explain the authorization system:
- Roles and access rights
- Login history
- User sessions

WORKFLOW:
Navigate to the workflow page (/workflow/list).
Show the automation:
- Visual process editor
- Blocks for different actions
- AI integration

CMS:
Open the content system (/cms/dashboard).
Demonstrate content management:
- Creating and editing content
- Categories and tags
- Media files

AI AGENT:
Navigate to the AI agent page (/ai-agent).
Talk about AI integration:
- Operations are registered by plugins
- Agent can perform actions
- Natural language interface

THEMES:
Finally, demonstrate the system flexibility:
- Switch to dark theme (dark-theme)
- Then to light (default-light)
- Show that the appearance is fully customizable

COMPLETION:
Congratulate the user on completing the demo.
Offer to answer questions or explore the system independently.
`.trim(),
    metadata: {
      estimatedDuration: '5-7 min',
      tags: ['onboarding', 'overview', 'beginner'],
      language: 'en'
    }
  },
  {
    key: 'theme-showcase',
    title: 'Theme Demonstration',
    content: `
A brief demo of theming capabilities.

Start from the current page - no need to navigate anywhere.

Explain that Typus supports full appearance customization:
- Color schemes
- Typography
- Border radius, shadows, effects

Demonstrate different themes:
1. Switch to "ocean-theme" - ocean color palette
2. Wait a couple of seconds, let the user appreciate it
3. Switch to "dark-theme" - dark theme
4. Wait again
5. Switch to "default-light" - light standard theme

After each switch, briefly describe the theme features.

At the end, ask which theme the user liked best and offer to keep it.
`.trim(),
    metadata: {
      estimatedDuration: '2-3 min',
      tags: ['themes', 'customization', 'quick'],
      language: 'en'
    }
  },
  {
    key: 'developer-overview',
    title: 'Developer Overview',
    content: `
Technical demo for developers.

INTRODUCTION:
Start from the main page (/dashboard).
Explain the architecture at a high level:
- Monorepo structure with @typus-core and plugins
- Backend on Node.js + Express + Prisma
- Frontend on Vue 3 + TypeScript + Vite

DSL SYSTEM:
Navigate to the users page (/user-management/users/list).
Talk about DSL:
- Models are described declaratively
- Auto-generation of API, types, UI
- Relations between models

WORKFLOW:
Open the workflow editor (/workflow/list).
Show the automation system:
- Each workflow is a set of blocks
- Blocks are connected to each other
- AI can generate workflows

AI AGENT:
Navigate to the AI agent page (/ai-agent).
Talk about the current integration:
- Operations are registered by plugins
- Agent gets a list of available operations
- Can perform actions through natural language

COMPLETION:
Ask if there are any questions about the architecture.
Offer to explore the code or documentation further.
`.trim(),
    metadata: {
      estimatedDuration: '5-10 min',
      tags: ['developer', 'technical', 'architecture'],
      language: 'en'
    }
  }
];

export async function seedDemoScenarios(prisma: PrismaClient) {
  console.log('  📖 Seeding demo scenarios...');

  for (const scenario of demoScenarios) {
    // Check if scenario already exists
    const existing = await prisma.knowledgeDocument.findFirst({
      where: { category: 'demo', key: scenario.key },
      select: { id: true }
    });

    if (existing) {
      // Update existing
      await prisma.knowledgeDocument.update({
        where: { id: existing.id },
        data: {
          title: scenario.title,
          content: scenario.content,
          metadata: scenario.metadata,
          tags: scenario.metadata.tags,
          source: 'seed',
          isActive: true
        }
      });
      console.log(`    ✅ Updated: ${scenario.title}`);
    } else {
      // Create new
      await prisma.knowledgeDocument.create({
        data: {
          category: 'demo',
          key: scenario.key,
          title: scenario.title,
          content: scenario.content,
          metadata: scenario.metadata,
          tags: scenario.metadata.tags,
          source: 'seed',
          isActive: true
        }
      });
      console.log(`    ✅ Created: ${scenario.title}`);
    }
  }

  console.log(`  ✅ ${demoScenarios.length} demo scenarios seeded`);
}
