import 'vue'

declare module '@vue/runtime-core' {
  interface HTMLElement {
    __ClickOutsideHandler__?: (event: MouseEvent) => void;
  }
}
