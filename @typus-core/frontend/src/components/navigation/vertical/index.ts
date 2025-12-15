/* @Tags: routing, navigation */
import VerticalNav from './VerticalNav.vue'
import NavSection from './NavSection.vue'
import NavItem from './NavItem.vue'
import NavDivider from './NavDivider.vue'

export interface NavChild {
  title: string
  path: string
  icon?: string
}

export interface NavMenuItem {
  title: string
  path?: string
  icon?: string
  children?: NavChild[]
  isOpen?: boolean
}

export interface NavSection {
  title: string
  icon?: string
  items: NavMenuItem[]
  isOpen?: boolean
}

export interface NavDivider {
  type: 'line'
}

export type NavItem = NavSection | NavDivider

export {
  VerticalNav,
  NavSection,
  NavItem,
  NavDivider
}

export default VerticalNav