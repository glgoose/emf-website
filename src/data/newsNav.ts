import { newsTypes } from '../lib/newsTypes';
import type { NavItem } from './overEmfNav';

export function newsNavItems(items: Array<{ data: { type: string } }>): NavItem[] {
  const usedTypes = new Set(items.map(item => item.data.type));

  return newsTypes
    .filter(type => usedTypes.has(type.slug))
    .map(type => ({
      href: `/${type.slug}`,
      label: type.pluralLabel,
      id: type.slug,
    }));
}
