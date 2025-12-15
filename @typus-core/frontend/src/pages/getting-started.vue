<route lang="json">
{
  "name": "getting-started",
  "path": "/getting-started",
  "meta": {
    "layout": "private",
    "title": "Getting Started",
    "subject": "dashboard",
    "requiresAuth": true
  }
}
</route>

<script setup lang="ts">
import { useTheme } from '@/core/theme/composables/useTheme'
import dxCard from '@/components/ui/dxCard.vue'

const { availableThemes } = useTheme()
</script>

<template>
  <div class="dashboard">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold mb-2">Welcome to Typus Framework!</h1>
      <p class="theme-colors-text-secondary">Complete these 10 essential steps to get your site ready</p>
    </div>

    <!-- Quick Actions Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">

      <!-- 1. Change Site Name -->
      <dxCard background="secondary" bordered class="transition-shadow hover:shadow-sm">
        <div class="flex items-start justify-between mb-3">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl">
              1
            </div>
            <div>
              <h3 class="font-semibold text-lg">Change Site Name</h3>
              <p class="text-sm theme-colors-text-secondary">Customize your site title and branding</p>
            </div>
          </div>
        </div>
        <div class="ml-13">
          <div class="text-sm mb-2">
            <span class="font-medium">Where:</span>
            <router-link to="/system/settings" class="link link-primary ml-1">
              System → Settings → Site
            </router-link>
          </div>
          <p class="text-sm theme-colors-text-secondary">
            Change <code class="px-1 py-0.5 theme-colors-background-tertiary rounded text-xs">site.name</code> and <code class="px-1 py-0.5 theme-colors-background-tertiary rounded text-xs">site.title</code> to your project name
          </p>
        </div>
      </dxCard>

      <!-- 2. Create First Page -->
      <dxCard background="secondary" bordered class="transition-shadow hover:shadow-sm">
        <div class="flex items-start justify-between mb-3">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center text-success text-xl">
              2
            </div>
            <div>
              <h3 class="font-semibold text-lg">Create Your First Page</h3>
              <p class="text-sm theme-colors-text-secondary">Start building your content</p>
            </div>
          </div>
        </div>
        <div class="ml-13">
          <div class="text-sm mb-2">
            <span class="font-medium">Where:</span>
            <router-link to="/cms/editor/create" class="link link-primary ml-1">
              Content → Create Content
            </router-link>
          </div>
          <p class="text-sm theme-colors-text-secondary">
            Create your homepage, about page, or any content page using the visual editor
          </p>
        </div>
      </dxCard>

      <!-- 3. Upload Media -->
      <dxCard background="secondary" bordered class="transition-shadow hover:shadow-sm">
        <div class="flex items-start justify-between mb-3">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full theme-colors-background-accent flex items-center justify-center theme-colors-text-accent text-xl">
              3
            </div>
            <div>
              <h3 class="font-semibold text-lg">Upload Logo & Images</h3>
              <p class="text-sm theme-colors-text-secondary">Add your visual assets</p>
            </div>
          </div>
        </div>
        <div class="ml-13">
          <div class="text-sm mb-2">
            <span class="font-medium">Where:</span>
            <router-link to="/file-manager" class="link link-primary ml-1">
              File Manager
            </router-link>
          </div>
          <p class="text-sm theme-colors-text-secondary">
            Upload your logo, favicon, and images for use in pages and layouts
          </p>
        </div>
      </dxCard>

      <!-- 4. Customize Theme -->
      <dxCard background="secondary" bordered class="transition-shadow hover:shadow-sm">
        <div class="flex items-start justify-between mb-3">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full theme-colors-background-accent flex items-center justify-center theme-colors-text-accent text-xl">
              4
            </div>
            <div>
              <h3 class="font-semibold text-lg">Change Theme</h3>
              <p class="text-sm theme-colors-text-secondary">Match your brand colors</p>
            </div>
          </div>
        </div>
        <div class="ml-13">
          <div class="text-sm mb-2">
            <span class="font-medium">Where:</span>
            <router-link to="/system/settings" class="link link-primary ml-1">
              System → Settings → UI
            </router-link>
          </div>
          <p class="text-sm theme-colors-text-secondary">
            Change <code class="text-xs theme-colors-background-tertiary px-1 rounded">ui.theme</code> value.
            Available:
            <code
              v-for="theme in availableThemes"
              :key="theme.name"
              class="text-xs theme-colors-background-tertiary px-1 rounded mx-1"
            >
              {{ theme.name }}
            </code>
          </p>
        </div>
      </dxCard>

      <!-- 5. Manage Users -->
      <dxCard background="secondary" bordered class="transition-shadow hover:shadow-sm">
        <div class="flex items-start justify-between mb-3">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full theme-colors-background-warning flex items-center justify-center theme-colors-text-warning text-xl">
              5
            </div>
            <div>
              <h3 class="font-semibold text-lg">Add Team Members</h3>
              <p class="text-sm theme-colors-text-secondary">Invite collaborators</p>
            </div>
          </div>
        </div>
        <div class="ml-13">
          <div class="text-sm mb-2">
            <span class="font-medium">Where:</span>
            <router-link to="/user-management/users/list" class="link link-primary ml-1">
              User Management → User List
            </router-link>
          </div>
          <p class="text-sm theme-colors-text-secondary">
            Create new users and assign roles (admin, editor, viewer)
          </p>
        </div>
      </dxCard>

      <!-- 6. Configure Roles -->
      <dxCard background="secondary" bordered class="transition-shadow hover:shadow-sm">
        <div class="flex items-start justify-between mb-3">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full theme-colors-background-info flex items-center justify-center theme-colors-text-info text-xl">
              6
            </div>
            <div>
              <h3 class="font-semibold text-lg">Setup Permissions</h3>
              <p class="text-sm theme-colors-text-secondary">Control who can do what</p>
            </div>
          </div>
        </div>
        <div class="ml-13">
          <div class="text-sm mb-2">
            <span class="font-medium">Where:</span>
            <router-link to="/user-management/roles/list" class="link link-primary ml-1">
              User Management → Role List
            </router-link>
          </div>
          <p class="text-sm theme-colors-text-secondary">
            Create custom roles with specific permissions for different user types
          </p>
        </div>
      </dxCard>

      <!-- 7. Check Backups -->
      <dxCard background="secondary" bordered class="transition-shadow hover:shadow-sm">
        <div class="flex items-start justify-between mb-3">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full theme-colors-background-success flex items-center justify-center theme-colors-text-success text-xl">
              7
            </div>
            <div>
              <h3 class="font-semibold text-lg">Verify Backups</h3>
              <p class="text-sm theme-colors-text-secondary">Your data is safe</p>
            </div>
          </div>
        </div>
        <div class="ml-13">
          <div class="text-sm mb-2">
            <span class="font-medium">Where:</span>
            <router-link to="/dispatcher/tasks" class="link link-primary ml-1">
              Dispatcher → Tasks
            </router-link>
          </div>
          <p class="text-sm theme-colors-text-secondary">
            Database backups run every 12 hours. Files stored in <code class="text-xs theme-colors-background-tertiary px-1 rounded">/storage/backups/</code>.
            Configure frequency in task settings.
          </p>
        </div>
      </dxCard>

      <!-- 8. Customize Navigation -->
      <dxCard background="secondary" bordered class="transition-shadow hover:shadow-sm">
        <div class="flex items-start justify-between mb-3">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full theme-colors-background-info flex items-center justify-center theme-colors-text-info text-xl">
              8
            </div>
            <div>
              <h3 class="font-semibold text-lg">Edit Menu</h3>
              <p class="text-sm theme-colors-text-secondary">Customize site navigation</p>
            </div>
          </div>
        </div>
        <div class="ml-13">
          <div class="text-sm mb-2">
            <span class="font-medium">Where:</span>
            <code class="text-xs theme-colors-background-tertiary px-2 py-1 rounded ml-1">@typus-core/frontend/src/layouts/</code>
          </div>
          <p class="text-sm theme-colors-text-secondary">
            Edit <code class="text-xs theme-colors-background-tertiary px-1 rounded">PublicLayout.vue</code> or <code class="text-xs theme-colors-background-tertiary px-1 rounded">PrivateLayout.vue</code>
            to change menu items and structure
          </p>
        </div>
      </dxCard>

      <!-- 9. Create Custom Layout -->
      <dxCard background="secondary" bordered class="transition-shadow hover:shadow-sm">
        <div class="flex items-start justify-between mb-3">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full theme-colors-background-warning flex items-center justify-center theme-colors-text-warning text-xl">
              9
            </div>
            <div>
              <h3 class="font-semibold text-lg">Design Custom Layout</h3>
              <p class="text-sm theme-colors-text-secondary">Advanced customization</p>
            </div>
          </div>
        </div>
        <div class="ml-13">
          <div class="text-sm mb-2">
            <span class="font-medium">Where:</span>
            <code class="text-xs theme-colors-background-tertiary px-2 py-1 rounded ml-1">@typus-core/frontend/src/layouts/</code>
          </div>
          <p class="text-sm theme-colors-text-secondary">
            Copy existing layout and modify. Reference:
            <code class="text-xs theme-colors-background-tertiary px-1 rounded">LAYOUT_GUIDELINE.md</code>
          </p>
        </div>
      </dxCard>

      <!-- 10. Build Custom Module -->
      <dxCard background="secondary" bordered class="transition-shadow hover:shadow-sm">
        <div class="flex items-start justify-between mb-3">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-error/10 flex items-center justify-center text-error text-xl">
              10
            </div>
            <div>
              <h3 class="font-semibold text-lg">Extend Functionality</h3>
              <p class="text-sm theme-colors-text-secondary">Add custom features</p>
            </div>
          </div>
        </div>
        <div class="ml-13">
          <div class="text-sm mb-2">
            <span class="font-medium">Where:</span>
            <code class="text-xs theme-colors-background-tertiary px-2 py-1 rounded ml-1">custom/backend/src/modules/</code>
          </div>
          <p class="text-sm theme-colors-text-secondary">
            Create custom modules in <code class="text-xs theme-colors-background-tertiary px-1 rounded">/custom/</code> directory.
            See <code class="text-xs theme-colors-background-tertiary px-1 rounded">MODULE_GUIDELINES.md</code> for architecture.
          </p>
        </div>
      </dxCard>

    </div>

    <!-- Documentation Links -->
    <dxCard background="secondary" bordered>
      <h2 class="text-xl font-semibold mb-4">📚 Documentation & Resources</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <h4 class="font-medium mb-2">Quick Start Guides</h4>
          <ul class="space-y-1 text-sm">
            <li><a href="/onboarding/step-001_developer-quick-start-guide.md" class="link link-primary">Developer Quick Start</a></li>
            <li><a href="/how-to/2025-10-20_custom-directory-architecture.md" class="link link-primary">Custom Module Architecture</a></li>
            <li><a href="/how-to/2025-10-21_prisma-schema-and-migrations.md" class="link link-primary">Database & Migrations</a></li>
          </ul>
        </div>
        <div>
          <h4 class="font-medium mb-2">System Architecture</h4>
          <ul class="space-y-1 text-sm">
            <li><code class="text-xs theme-colors-background-primary px-2 py-1 rounded">@typus-core/backend/src/modules/MODULE_GUIDELINES.md</code></li>
            <li><code class="text-xs theme-colors-background-primary px-2 py-1 rounded">@typus-core/frontend/src/layouts/LAYOUT_GUIDELINE.md</code></li>
            <li><code class="text-xs theme-colors-background-primary px-2 py-1 rounded">@typus-core/frontend/src/themes/THEME_GUIDELINE.md</code></li>
          </ul>
        </div>
        <div>
          <h4 class="font-medium mb-2">Support</h4>
          <ul class="space-y-1 text-sm">
            <li><router-link to="/system/logs" class="link link-primary">System Logs</router-link></li>
            <li><router-link to="/dispatcher/tasks" class="link link-primary">Background Tasks</router-link></li>
          </ul>
        </div>
      </div>
    </dxCard>

    <!-- Quick Stats (Optional) -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
      <dxCard background="secondary" bordered class="text-center" noPadding>
        <div class="p-4">
          <div class="text-3xl font-bold text-primary">✓</div>
          <div class="text-sm theme-colors-text-secondary mt-1">Installation Complete</div>
        </div>
      </dxCard>
      <dxCard background="secondary" bordered class="text-center" noPadding>
        <div class="p-4">
          <div class="text-3xl font-bold theme-colors-text-success">12h</div>
          <div class="text-sm theme-colors-text-secondary mt-1">Auto Backup Interval</div>
        </div>
      </dxCard>
      <dxCard background="secondary" bordered class="text-center" noPadding>
        <div class="p-4">
          <div class="text-3xl font-bold theme-colors-text-accent">50+</div>
          <div class="text-sm theme-colors-text-secondary mt-1">Built-in Components</div>
        </div>
      </dxCard>
      <dxCard background="secondary" bordered class="text-center" noPadding>
        <div class="p-4">
          <div class="text-3xl font-bold theme-colors-text-warning">∞</div>
          <div class="text-sm theme-colors-text-secondary mt-1">Extensibility</div>
        </div>
      </dxCard>
    </div>

  </div>
</template>

<style scoped>
.ml-13 {
  margin-left: 3.25rem;
}
code {
  font-family: 'Courier New', monospace;
}
</style>
