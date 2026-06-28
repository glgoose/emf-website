import { newsTypes } from '../lib/newsTypes';
import type { NavItem } from './overEmfNav';

export function newsNavItems(items: Array<{ data: { type: string } }>, currentType?: string): NavItem[] {
  const usedTypes = new Set(items.map(item => item.data.type));

  return newsTypes
    .filter(type => usedTypes.has(type.slug) || type.slug === currentType)
    .map(type => ({
      href: `/${type.slug}`,
      label: type.pluralLabel,
      id: type.slug,
    }));
}
