export const MENU_REFRESH_EVENT = 'aegis:menu:refresh';

export function triggerMenuRefresh() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(MENU_REFRESH_EVENT));
  }
}
