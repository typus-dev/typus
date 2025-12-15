import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { getPascalCaseRouteName } from 'unplugin-vue-router'
import VueRouter from 'unplugin-vue-router/vite'
import { defineConfig } from 'vite'
import Layouts from 'vite-plugin-vue-layouts'
import FullReload from 'vite-plugin-full-reload'
import { FileSystemIconLoader } from 'unplugin-icons/loaders'
import Icons from 'unplugin-icons/vite'
import IconsResolver from 'unplugin-icons/resolver'
import fs from 'fs'
import path from 'path'
import { getPublishedModules } from './src/auto-modules.ts'
import { layoutPartialsPlugin } from './vite-plugins/layout-partials.js'

function hasDirectory(modulePath, dirName) {
  const fullPath = path.resolve(__dirname, `src${modulePath}/${dirName}`)
  return fs.existsSync(fullPath)
}

/**
 * Auto-discover plugins from plugins/ directory
 * Returns array of plugin paths that have the specified subdirectory
 */
function discoverPlugins(subDir) {
  const pluginsDir = path.resolve(__dirname, '../../plugins')

  if (!fs.existsSync(pluginsDir)) {
    console.warn('[vite.config] Plugins directory not found:', pluginsDir)
    return []
  }

  try {
    const plugins = fs.readdirSync(pluginsDir)
      .filter(name => {
        const pluginPath = path.join(pluginsDir, name)
        return fs.statSync(pluginPath).isDirectory()
      })
      .filter(name => {
        const targetPath = path.join(pluginsDir, name, 'frontend', subDir)
        return fs.existsSync(targetPath)
      })

    console.log(`[vite.config] Discovered ${plugins.length} plugins with ${subDir}:`, plugins)
    return plugins
  } catch (error) {
    console.error('[vite.config] Error discovering plugins:', error)
    return []
  }
}

/**
 * Get custom pages configuration if directory exists
 * Returns array with custom pages config or empty array
 */
function getCustomPagesConfig() {
  const customPagesDir = path.resolve(__dirname, '../../custom/frontend/pages')

  if (fs.existsSync(customPagesDir)) {
    console.log('[vite.config] ✓ Custom pages enabled:', customPagesDir)
    return [{ src: '../../custom/frontend/pages', path: '/' }]
  }

  console.log('[vite.config] ℹ Custom pages directory not found, using core pages only')
  return []
}

export default defineConfig({
  // Use root public directory instead of frontend/public
  publicDir: '../../public',

  plugins: [
    // Resolve layout partials: custom -> plugins -> core
    layoutPartialsPlugin(),

    // Watch for changes in styles and themes
    FullReload([
      '**/*.{js,ts,vue,css,scss,html}',
      'src/core/**/*',
      'src/styles/**/*',
      'src/themes/**/*',
      'src/layouts/**/*.vue',
      'src/layouts/**/components/*.vue',
      'src/pages/**/*',
      '../../custom/frontend/**/*' // Custom pages, layouts, themes hot reload
    ], { delay: 100 }),

    VueRouter({
      extensions: ['.vue'],
      dts: 'src/typed-router.d.ts',
      routesFolder: [
        { src: 'src/pages', path: '/' },
        ...getPublishedModules()
          .filter(([_, config]) => hasDirectory(config.path, 'pages'))
          .map(([name, config]) => ({
            src: `src${config.path}/pages`,
            path: config.routePath || `/${name}/`
          })),
        // Plugin pages - auto-discovered from plugins/ directory
        ...discoverPlugins('pages').map(name => ({
          src: `../../plugins/${name}/frontend/pages`,
          path: '/'
        })),
        // Custom pages - conditionally added if directory exists
        ...getCustomPagesConfig()
      ],
      getRouteName: routeNode => {
        return getPascalCaseRouteName(routeNode)
          .replace(/([a-z\d])([A-Z])/g, '$1-$2')
          .toLowerCase()
      },
      routeBlockLang: 'json',
      importMode: 'sync'
    }),

    vue(),

    Layouts({
      layoutsDirs: './src/layouts/',
      defaultLayout: 'default'
    }),

    AutoImport({
      imports: ['vue', 'vue-router', 'pinia'],
      dts: 'src/auto-imports.d.ts',
      dirs: [
        'src/core/composables',
        'src/core/theme/composables',
        'src/core/logging',
        'src/shared/composables',
        'src/modules/**/composables',
        ...getPublishedModules()
          .filter(([_, config]) => hasDirectory(config.path, 'composables'))
          .map(([_, config]) => `src${config.path}/composables`),
        // Plugin composables - auto-discovered from plugins/ directory
        ...discoverPlugins('composables').map(name => `../../plugins/${name}/frontend/composables`)
      ]
    }),

    Components({
      dts: true,
      deep: true,
      dirs: [
        'src/components',
        'src/components/**',
        'src/core/layouts',
        'src/components/base',
        'src/core/pages',
        'src/pages',
        'src/modules/**/components',
        'src/layouts/default',
        'src/layouts/private',
        'src/layouts/public',
        'src/layouts/**',
        'src/dsx/components',
        'src/dsx/components',
        ...getPublishedModules()
          .filter(([_, config]) => hasDirectory(config.path, 'components'))
          .map(([_, config]) => `src${config.path}/components`),
        // Plugin components - auto-discovered from plugins/ directory
        ...discoverPlugins('components').map(name => `../../plugins/${name}/frontend/components`)
      ],
      include: [/\.vue$/, /\.vue\?vue/, /index\.(js|ts)$/],
      exclude: [
        /[\\/]node_modules[\\/]/,
        /[\\/]\.git[\\/]/,
        // Exclude temporary sandbox editor inside ui/11111111111 to avoid bad alias imports
        /[\\/]src[\\/]components[\\/]ui[\\/]11111111111[\\/]/
      ],
      directoryAsNamespace: false,
      resolvers: [
        IconsResolver({
          prefix: 'Icon'
        }),
        (componentName) => {
          if (componentName.startsWith('dx')) {
            return { name: 'default', from: `@/components/**/${componentName}.vue` }
          }
        }

      ]
    }),

    Icons({
      compiler: 'vue3',
      autoInstall: true,
      customCollections: {
        custom: FileSystemIconLoader('./src/assets/icons')
      },
      scale: 1.2,
      defaultClass: 'inline-block'
    })
  ],

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@core': fileURLToPath(new URL('./src/core', import.meta.url)),
      '@shared': fileURLToPath(new URL('./src/shared', import.meta.url)),
      '@modules': fileURLToPath(new URL('./src/modules', import.meta.url)),
      // NOTE: @layouts alias removed - handled by layoutPartialsPlugin for custom override support
      '@root-shared': fileURLToPath(new URL('../shared', import.meta.url)),
      '@dsl-shared': fileURLToPath(new URL('../shared/dsl', import.meta.url)),
      '@typus-core/shared': fileURLToPath(new URL('../shared', import.meta.url)),
      '@styles': fileURLToPath(new URL('./src/styles', import.meta.url)),
      '@themes': fileURLToPath(new URL('./src/themes', import.meta.url)),
      '@custom': fileURLToPath(new URL('../../custom', import.meta.url)),
      '@plugins': fileURLToPath(new URL('../../plugins', import.meta.url))
    },
    dedupe: ['vue', 'vue-router']
  },

  optimizeDeps: {
    include: [
      'vue',
      'vue-router',
      'pinia',
      'tailwindcss',
      'unplugin-icons/resolver',
      'lodash',
      'chart.js',
      'chart.js/auto'
    ],
    exclude: [],
    force: process.env.NODE_ENV === 'development',
    esbuildOptions: {
      target: 'esnext',
      keepNames: process.env.NODE_ENV === 'development'
    }
  },

  ssr: {
    noExternal: ['vue', 'vue-router', 'pinia']
  },

  build: {
    target: 'esnext',
    minify: 'esbuild',
    cssCodeSplit: true,
    sourcemap: process.env.NODE_ENV === 'development',
    rollupOptions: {
      output: {
        manualChunks: {
          'vue-vendor': ['vue', 'vue-router', 'pinia'],
          utils: ['lodash'],
          icons: ['unplugin-icons/resolver']
        }
      }
    }
  },

  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL,
        changeOrigin: true,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.debug('[vite proxy error]', err)
          })
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.debug('[vite proxy request]', req.method, req.url)
          })
        }
      }
    },
    headers: {
      'Cache-Control': 'no-store'
    },

    // Listen on all interfaces in Docker
    host: '0.0.0.0',
    // Use port 3000 as specified in Traefik labels
    port: 3000,
    // Allow all hosts for Docker internal communication
    allowedHosts: true,
    hmr: {
      path: '/hmr/',
      clientPort: process.env.VITE_HMR_PORT,
      protocol: process.env.VITE_HMR_PROTOCOL,
      host: process.env.VITE_HMR_HOST
    },
    cors: true,
    watch: {
      usePolling: true,
      interval: 1000,
    },
    strictPort: true
  },

  define: {
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_DEVTOOLS__: false
  }
})
