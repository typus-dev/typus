// composables/global.ts
import { provide, inject } from 'vue'
import { useModals } from '@shared/composables/useModals'
import { useApi } from '@shared/composables/useApi'
import { useToasts } from '@shared/composables/useToasts'
import { useMessages } from '@shared/composables/useMessages'
import { useRouter, type Router } from 'vue-router'
import { useAppConfig } from '@shared/composables/useAppConfig'
import { useStore } from '@shared/composables/useStore'
import { useAbility } from '@core/auth/ability'

const keys = {
  modals: Symbol(),
  api: Symbol(),
  toasts: Symbol(),
  router: Symbol(),
  config: Symbol(),
  auth: Symbol(),
  store: Symbol(),
  messages: Symbol(),
} as const

export function provideGlobals() {
  provide(keys.modals, useModals())
  provide(keys.api, useApi(''))
  provide(keys.toasts, useToasts())
  provide(keys.router, useRouter())
  provide(keys.config, useAppConfig())
  provide(keys.store, useStore())
  provide(keys.messages, useMessages())
  provide(keys.auth, useAbility())
}

export const useGlobalModals = () => inject(keys.modals)
export const useGlobalApi = () => inject(keys.api)
export const useGlobalToasts = () => inject(keys.toasts)
export const useGlobalRouter = () => inject(keys.router)
export const useGlobalConfig = () => inject(keys.config)
export const useGlobalAuth = () => inject(keys.auth)
export const useGlobalStore = () => inject(keys.store)
export const useGlobalMessages = () => inject(keys.messages)
export const useGlobalAbility = () => inject('ability')
