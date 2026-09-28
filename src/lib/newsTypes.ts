// `slug` is de waarde van `type:` in de frontmatter (in elke taal dezelfde,
// ook een Engelse vertaling houdt `type: lezing`) en het pad van het
// overzicht (`/lezing`). Posts zelf staan op `/<slug>`, zonder type-woord.
// Zie docs/adr/0001-i18n.md.

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

