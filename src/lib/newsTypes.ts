export const newsTypes = [
  {
    slug: 'lezing',
    singularLabel: 'lezing',
    pluralLabel: 'lezingen',
    pageTitle: 'Lezingen',
    latestLabel: 'laatste lezing',
  },
  {
    slug: 'recensie',
    singularLabel: 'recensie',
    pluralLabel: 'recensies',
    pageTitle: 'Recensies',
    latestLabel: 'laatste recensie',
  },
  {
    slug: 'verslag',
    singularLabel: 'verslag',
    pluralLabel: 'verslagen',
    pageTitle: 'Verslagen',
    latestLabel: 'laatste verslag',
  },
] as const;

export type NewsTypeSlug = typeof newsTypes[number]['slug'];

export const newsTypeSlugs = newsTypes.map(type => type.slug) as [NewsTypeSlug, ...NewsTypeSlug[]];

export function getNewsType(slug: string) {
  return newsTypes.find(type => type.slug === slug);
}

export function newsTypeLabel(slug: NewsTypeSlug) {
  return getNewsType(slug)?.singularLabel ?? slug;
}

export function newsItemHref(item: { id: string; data: { type: NewsTypeSlug } }) {
  return `/${item.data.type}/${item.id}`;
}
