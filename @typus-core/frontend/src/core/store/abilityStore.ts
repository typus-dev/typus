// src/core/store/abilityStore.ts
import { defineStore } from 'pinia'
import { useAbility } from '@/core/auth/ability'
import type { AbilityRule } from '@/core/auth/ability'
import { usePersistStore } from './persistStore'

export const useAbilityStore = defineStore('ability', () => {
  const store = usePersistStore()
  const { defineAbilitiesFor } = useAbility()
  
  const initialized = computed({
    get: () => store.get('ability_initialized', false),
    set: (value) => store.set('ability_initialized', value)
  })

  const rules = computed({
    get: () => store.get('ability_rules', []),
    set: (value) => store.set('ability_rules', value)
  })

  function setRules(newRules: AbilityRule[]) {
    logger.debug('🔑 ABILITY STORE: Setting rules:', JSON.stringify(newRules, null, 2))
    rules.value = newRules
    defineAbilitiesFor(newRules)
    logger.debug('🔑 ABILITY STORE: Rules after setting:', JSON.stringify(rules.value, null, 2))
  }

  function init() {
    logger.debug(`🔑 ABILITY STORE: Initializing. initialized: ${initialized.value}, rules length: ${rules.value.length}`)
    logger.debug('🔑 ABILITY STORE: Current rules:', JSON.stringify(rules.value, null, 2))
    
    if (rules.value.length > 0) {
      logger.debug('🔑 ABILITY STORE: Applying rules from storage')
      defineAbilitiesFor(rules.value)
      initialized.value = true
    } else {
      logger.warn('🔑 ABILITY STORE: No rules found in storage')
    }
  }

  function clearRules() {
    logger.debug('🔑 ABILITY STORE: Clearing rules')
    rules.value = []
    defineAbilitiesFor([])
  }

  
  init()

  return {
    rules,
    setRules,
    init,
    clearRules
  }
})
