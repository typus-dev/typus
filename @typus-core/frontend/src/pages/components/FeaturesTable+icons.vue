<template>
  <div class="theme-components-card-background/80 theme-components-card-border backdrop-blur-sm theme-layout-spacing-padding theme-components-card-radius theme-colors-text-primary">
   <h2 class="theme-typography-content-h2 theme-colors-text-primary mb-6 ml-6 flex items-center gap-3">

      Core Modules Included in Typus
    </h2>

    <table class="theme-components-table-base text-left text-xl border-collapse">
      <thead >
        <tr class="theme-components-table-header-row theme-colors-text-secondary">
          <th class="theme-components-table-header-cell py-2 pr-4">Module</th>
          <th class="theme-components-table-header-cell py-2 pr-4">Purpose</th>
          <th class="theme-components-table-header-cell py-2 pr-4">Dependencies</th>
        </tr>
      </thead>
      <tbody class="theme-colors-text-primary">
        <tr v-for="module in modules" :key="module.name" class="theme-components-table-body-row">
          <td class="theme-components-table-body-cell py-2 pr-4">
            {{ module.icon }} <strong>{{ module.name }}</strong>
          </td>
          <td class="theme-components-table-body-cell py-2 pr-4">{{ module.purpose }}</td>
          <td class="theme-components-table-body-cell py-2 pr-4">{{ module.dependencies }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">

const modules = [
  {
    icon: '🖥️',
    name: 'Backend Core',
    purpose: 'REST API, routing, middlewares',
    dependencies: 'Express, TypeScript, Zod'
  },
  {
    icon: '🎨',
    name: 'Frontend UI',
    purpose: 'Layouts, theming, base pages',
    dependencies: 'Vue 3, Vite, Tailwind'
  },
  {
    icon: '📚',
    name: 'UI Library',
    purpose: 'dx components (Button, Form, List)',
    dependencies: 'Vue 3, Tailwind'
  },
  {
    icon: '🗄️',
    name: 'Database ORM',
    purpose: 'Models, migrations, CRUD',
    dependencies: 'Prisma, MySQL'
  },
  {
    icon: '🌀',
    name: 'Queue / Tasks',
    purpose: 'Background jobs, cron tasks',
    dependencies: ' Redis, Plug-in, Multi-level tasks'
  },
  {
    icon: '🔐',
    name: '2FA Auth',
    purpose: 'JWT login + TOTP 2FA',
    dependencies: 'Passport, Speakeasy'
  },
  {
    icon: '🛡️',
    name: 'Access Control',
    purpose: 'Roles, permissions, rules',
    dependencies: 'CASL'
  },
  {
    icon: '📦',
    name: 'Content Manager',
    purpose: 'Type-based CMS, page tree',
    dependencies: 'Vue, Markdown, Typed DSL'
  },
  {
    icon: '🔁',
    name: 'Dynamic Routing',
    purpose: 'Data-driven routes',
    dependencies: 'Vue Router, Express Router'
  },
  {
    icon: '🧠',
    name: 'Domain Models',
    purpose: 'DSL for Database/API/UI generation',  
    dependencies: 'Typus © DSL'
  },
  {
    icon: '🧱',
    name: 'Renderer Engine',
    purpose: 'Dynamic interface rendering',
    dependencies: 'Vue, DSX Page Renderer'
  }
]
</script>