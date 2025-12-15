import { Ref, ComputedRef } from 'vue';

export interface BreakpointPlugin {
  current: Ref<string>;
  isMobile: ComputedRef<boolean>;
  isCompact: ComputedRef<boolean>;
  isTablet: ComputedRef<boolean>;
  isDesktop: ComputedRef<boolean>;
}
