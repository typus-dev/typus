import { computed } from 'vue';
import { useAbility } from '@/core/auth/ability';
import { MenuItem } from '@/shared/types/menu';

/**
 * Filters menu items based on user abilities.
 */
function filterMenuByAbility(items: MenuItem[], canCheckAbility: (action: string, subject: string) => boolean): MenuItem[] {
  return items.filter(item => {
    if (item.ability && !canCheckAbility(item.ability.action, item.ability.subject)) {
      return false;
    }
    if (item.items) {
      item.items = filterMenuByAbility(item.items, canCheckAbility);
    }
    return true;
  });
}

/**
 * Composable to filter menu items reactively based on user abilities.
 */
export function useMenuFilter(menuItems: MenuItem[]) {
  const { can } = useAbility();

  const filteredMenu = computed(() => {
    const itemsCopy = JSON.parse(JSON.stringify(menuItems)) as MenuItem[];
    return filterMenuByAbility(itemsCopy, can);
  });

  return {
    filteredMenu,
  };
}