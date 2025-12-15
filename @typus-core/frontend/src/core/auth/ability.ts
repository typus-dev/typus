// src/core/auth/ability.ts
/* @Tags: routing */
import { AbilityBuilder, createMongoAbility } from '@casl/ability'
import type { MongoAbility, SubjectRawRule } from '@casl/ability'
import { ref, getCurrentInstance } from 'vue' // Import getCurrentInstance

export type Actions = 'manage' | 'create' | 'read' | 'update' | 'delete' | 'navigate'
export type Subjects = 'dashboard' | 'user' | 'role' | 'permissions' | 'job' | 'profile' | 'settings' | 'project' | 'task' | 'document' | 'log' | 'finances' | 'cms' | 'routes' | 'all'

export type AppAbility = MongoAbility<[Actions, Subjects]>
export type AbilityRule = SubjectRawRule<Actions, Subjects, any>

const ability = ref<AppAbility>(createMongoAbility([]))

export function defineAbilitiesFor(rules: AbilityRule[]) {
    const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility)
    
    // Wrap rules in an object for structured logging
    logger.debug('🔑 ABILITY: defineAbilitiesFor called with rules:', { rules: JSON.stringify(rules, null, 2) })
    
    // First check if there is full access
    const hasFullAccess = rules.some(rule => 
      rule.subject === 'all' && 
      (Array.isArray(rule.action) ? rule.action : [rule.action]).includes('manage')
    )
  
    if (hasFullAccess) {
      logger.debug('🔑 ABILITY: Defining full access ability')
      can('manage', 'all') // Give full access to everything
    } else {
      // If no full access, process rules as usual
      rules.forEach(rule => {
        const actions = Array.isArray(rule.action) ? rule.action : [rule.action]
        actions.forEach((action: Actions) => {
          // Wrap action and subject in an object for structured logging
          logger.debug(`🔑 ABILITY: Defining ability: ${action} ${rule.subject}`, { action, subject: rule.subject })
          can(action, rule.subject as Subjects, rule.conditions)
        })
      })
    }
  
    // Update existing ability
    ability.value = build()
    // Wrap rules in an object for structured logging
    logger.debug('🔑 ABILITY: Updated ability rules:', { rules: JSON.stringify(ability.value.rules, null, 2) })
    
    // Also update global $ability
    if (typeof window !== 'undefined') {
      const app = getCurrentInstance()?.appContext.app
      if (app) {
        app.config.globalProperties.$ability = ability.value
      }
    }
}

export function useAbility() {
  const can = (action: Actions, subject: Subjects) => {
    const result = ability.value.can(action, subject)
    // Wrap action, subject, and result in an object for structured logging
    logger.debug(`🔒 ABILITY CHECK: ${action} ${subject} -> ${result}`, { action, subject, result })
    logger.debug('🔒 ABILITY RULES:', { rules: JSON.stringify(ability.value.rules, null, 2) })
    
    // Check if there is a rule with full access
    const hasFullAccess = ability.value.rules.some((rule: any) => 
      rule.subject === 'all' && rule.action === 'manage'
    )
    // Wrap hasFullAccess in an object for structured logging
    logger.debug(`🔒 HAS FULL ACCESS: ${hasFullAccess}`, { hasFullAccess })
    
    return result
  }

  return {
    ability,
    can,
    cannot: (action: Actions, subject: Subjects) => !can(action, subject),
    defineAbilitiesFor
  }
}

// Vue directive
export const abilityDirective = {
  mounted(el: HTMLElement, binding: any) {
    const [action, subject] = binding.value.split(' ')
    if (ability.value.cannot(action, subject)) {
      el.style.display = 'none'
    }
  },
  updated(el: HTMLElement, binding: any) {
    const [action, subject] = binding.value.split(' ')
    el.style.display = ability.value.cannot(action, subject) ? 'none' : ''
  }
}

// Plugin for Vue
export function createAbilityPlugin() {
    return {
      install(app: any) {
        logger.debug('🔑 ABILITY PLUGIN: Installing ability plugin');
        
        const wrappedAbility = {
          can: (action: Actions, subject: Subjects) => {
            const result = ability.value.can(action, subject)
            logger.debug(`🔑 ABILITY PLUGIN: Checking permission: ${action} ${subject} -> ${result}`)
            logger.debug('🔑 ABILITY PLUGIN: Current rules:', JSON.stringify(ability.value.rules, null, 2))
            
            // Check if there is a rule with full access
            const hasFullAccess = ability.value.rules.some((rule: any) => 
              rule.subject === 'all' && rule.action === 'manage'
            )
            // Wrap hasFullAccess in an object for structured logging
            logger.debug(`🔑 ABILITY PLUGIN: HAS FULL ACCESS: ${hasFullAccess}`, { hasFullAccess })
            
            return result
          },
          cannot: (action: Actions, subject: Subjects) => {
            return !wrappedAbility.can(action, subject)
          }
        }
  
        app.provide('ability', wrappedAbility)
        app.config.globalProperties.$ability = wrappedAbility
        app.config.globalProperties.$can = wrappedAbility.can
        
        logger.debug('🔑 ABILITY PLUGIN: Ability plugin installed');
      }
    }
}
