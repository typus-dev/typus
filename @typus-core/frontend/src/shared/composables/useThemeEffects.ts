/**
 * useThemeEffects - Interactive visual effects for theme
 * Ripple, Tilt, Mouse Glow, and more
 */

import { onMounted, onUnmounted, ref } from 'vue'

export function useThemeEffects() {
  const isEnabled = ref(true)

  // ========== RIPPLE EFFECT ==========
  function createRipple(event: MouseEvent) {
    const button = event.currentTarget as HTMLElement
    if (!button || !isEnabled.value) return

    const rect = button.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height)
    const x = event.clientX - rect.left - size / 2
    const y = event.clientY - rect.top - size / 2

    const ripple = document.createElement('span')
    ripple.className = 'ripple-effect'
    ripple.style.width = ripple.style.height = `${size}px`
    ripple.style.left = `${x}px`
    ripple.style.top = `${y}px`

    button.appendChild(ripple)

    ripple.addEventListener('animationend', () => {
      ripple.remove()
    })
  }

  function initRipple() {
    document.querySelectorAll('.theme-components-button-base, .theme-ripple').forEach(el => {
      el.addEventListener('click', createRipple as EventListener)
    })
  }

  function destroyRipple() {
    document.querySelectorAll('.theme-components-button-base, .theme-ripple').forEach(el => {
      el.removeEventListener('click', createRipple as EventListener)
    })
  }

  // ========== TILT EFFECT ==========
  function handleTilt(event: MouseEvent) {
    const card = event.currentTarget as HTMLElement
    if (!card || !isEnabled.value) return

    const rect = card.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2

    const rotateX = (y - centerY) / 20
    const rotateY = (centerX - x) / 20

    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`
  }

  function resetTilt(event: MouseEvent) {
    const card = event.currentTarget as HTMLElement
    if (!card) return
    card.style.transform = ''
  }

  function initTilt() {
    document.querySelectorAll('.theme-tilt-card, .theme-glass-card').forEach(el => {
      el.addEventListener('mousemove', handleTilt as EventListener)
      el.addEventListener('mouseleave', resetTilt as EventListener)
    })
  }

  function destroyTilt() {
    document.querySelectorAll('.theme-tilt-card, .theme-glass-card').forEach(el => {
      el.removeEventListener('mousemove', handleTilt as EventListener)
      el.removeEventListener('mouseleave', resetTilt as EventListener)
    })
  }

  // ========== MOUSE GLOW ==========
  function handleMouseGlow(event: MouseEvent) {
    const container = event.currentTarget as HTMLElement
    if (!container || !isEnabled.value) return

    const rect = container.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    container.style.setProperty('--mouse-x', `${x}px`)
    container.style.setProperty('--mouse-y', `${y}px`)
  }

  function initMouseGlow() {
    document.querySelectorAll('.theme-mouse-glow').forEach(el => {
      el.addEventListener('mousemove', handleMouseGlow as EventListener)
    })
  }

  function destroyMouseGlow() {
    document.querySelectorAll('.theme-mouse-glow').forEach(el => {
      el.removeEventListener('mousemove', handleMouseGlow as EventListener)
    })
  }

  // ========== MAGNETIC BUTTON ==========
  function handleMagnetic(event: MouseEvent) {
    const button = event.currentTarget as HTMLElement
    if (!button || !isEnabled.value) return

    const rect = button.getBoundingClientRect()
    const x = event.clientX - rect.left - rect.width / 2
    const y = event.clientY - rect.top - rect.height / 2

    button.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px)`
  }

  function resetMagnetic(event: MouseEvent) {
    const button = event.currentTarget as HTMLElement
    if (!button) return
    button.style.transform = ''
  }

  function initMagnetic() {
    document.querySelectorAll('.theme-magnetic').forEach(el => {
      el.addEventListener('mousemove', handleMagnetic as EventListener)
      el.addEventListener('mouseleave', resetMagnetic as EventListener)
    })
  }

  function destroyMagnetic() {
    document.querySelectorAll('.theme-magnetic').forEach(el => {
      el.removeEventListener('mousemove', handleMagnetic as EventListener)
      el.removeEventListener('mouseleave', resetMagnetic as EventListener)
    })
  }

  // ========== PARALLAX SCROLL ==========
  function handleParallax() {
    if (!isEnabled.value) return
    const scrollY = window.scrollY

    document.querySelectorAll('.theme-parallax').forEach((el, index) => {
      const speed = (el as HTMLElement).dataset.parallaxSpeed || '0.5'
      const yPos = -(scrollY * parseFloat(speed))
      ;(el as HTMLElement).style.transform = `translateY(${yPos}px)`
    })
  }

  function initParallax() {
    window.addEventListener('scroll', handleParallax, { passive: true })
  }

  function destroyParallax() {
    window.removeEventListener('scroll', handleParallax)
  }

  // ========== INIT ALL ==========
  function initAll() {
    initRipple()
    initTilt()
    initMouseGlow()
    initMagnetic()
    initParallax()
  }

  function destroyAll() {
    destroyRipple()
    destroyTilt()
    destroyMouseGlow()
    destroyMagnetic()
    destroyParallax()
  }

  // Auto-init on mount
  onMounted(() => {
    // Delay to ensure DOM is ready
    setTimeout(initAll, 100)
  })

  onUnmounted(() => {
    destroyAll()
  })

  return {
    isEnabled,
    initAll,
    destroyAll,
    // Individual controls
    initRipple,
    initTilt,
    initMouseGlow,
    initMagnetic,
    initParallax,
    // Cleanup
    destroyRipple,
    destroyTilt,
    destroyMouseGlow,
    destroyMagnetic,
    destroyParallax,
  }
}

// Global init function for non-Vue contexts
export function initThemeEffects() {
  // Ripple
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    const button = target.closest('.theme-components-button-base, .theme-ripple')
    if (button) {
      const rect = button.getBoundingClientRect()
      const size = Math.max(rect.width, rect.height)
      const x = e.clientX - rect.left - size / 2
      const y = e.clientY - rect.top - size / 2

      const ripple = document.createElement('span')
      ripple.className = 'ripple-effect'
      ripple.style.cssText = `
        width: ${size}px;
        height: ${size}px;
        left: ${x}px;
        top: ${y}px;
      `
      button.appendChild(ripple)
      setTimeout(() => ripple.remove(), 600)
    }
  })

  // Tilt on cards
  document.querySelectorAll('.theme-glass-card').forEach(card => {
    card.addEventListener('mousemove', (e: Event) => {
      const event = e as MouseEvent
      const el = card as HTMLElement
      const rect = el.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      const centerX = rect.width / 2
      const centerY = rect.height / 2
      const rotateX = (y - centerY) / 25
      const rotateY = (centerX - x) / 25
      el.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.01, 1.01, 1.01)`
    })
    card.addEventListener('mouseleave', () => {
      ;(card as HTMLElement).style.transform = ''
    })
  })

  // Mouse glow
  document.querySelectorAll('.theme-mouse-glow').forEach(el => {
    el.addEventListener('mousemove', (e: Event) => {
      const event = e as MouseEvent
      const rect = (el as HTMLElement).getBoundingClientRect()
      ;(el as HTMLElement).style.setProperty('--mouse-x', `${event.clientX - rect.left}px`)
      ;(el as HTMLElement).style.setProperty('--mouse-y', `${event.clientY - rect.top}px`)
    })
  })
}
