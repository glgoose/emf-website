import type { Locale } from '../i18n/config';

// `slug` is de interne sleutel: de waarde van `type:` in de frontmatter, in elke
// taal dezelfde (ook een Engelse vertaling houdt `type: lezing`).
// `slugs` is het type-woord in de URL per taal. Een taal die ontbreekt heeft
// geen vertaalde URL voor dat type: een post van dat type in die taal faalt de
// build (zie src/lib/posts.ts). Zie docs/adr/0001-i18n.md.
//
// Geen value-imports hier: scripts/generate-redirects.mjs laadt dit bestand
// rechtstreeks in Node. Een `import type` wordt weggestript en mag wel.

type TypeSlugs = { nl: string } & Partial<Record<Locale, string>>;

export const newsTypes = [
  {
    slug: 'lezing',
    slugs: { nl: 'lezing', en: 'lecture', fr: 'conference' },
    singularLabel: 'lezing',
    pluralLabel: 'lezingen',
    pageTitle: 'Lezingen',
    latestLabel: 'laatste lezing',
  },
  {
    slug: 'recensie',
    slugs: { nl: 'recensie' },
    singularLabel: 'recensie',
    pluralLabel: 'recensies',
    pageTitle: 'Recensies',
    latestLabel: 'laatste recensie',
  },
  {
    slug: 'verslag',
    slugs: { nl: 'verslag' },
    singularLabel: 'verslag',
    pluralLabel: 'verslagen',
    pageTitle: 'Verslagen',
    latestLabel: 'laatste verslag',
  },
] as const satisfies ReadonlyArray<{ slug: string; slugs: TypeSlugs }>;

export type NewsTypeSlug = typeof newsTypes[number]['slug'];

export const newsTypeSlugs = newsTypes.map(type => type.slug) as [NewsTypeSlug, ...NewsTypeSlug[]];

export function getNewsType(slug: string) {
  return newsTypes.find(type => type.slug === slug);
}

export function newsTypeLabel(slug: NewsTypeSlug) {
  return getNewsType(slug)?.singularLabel ?? slug;
}

/** Type-woord in de URL voor deze taal, of `undefined` als het type daar geen vertaling heeft. */
export function typeSlugFor(type: string, locale: Locale): string | undefined {
  const slugs: TypeSlugs | undefined = getNewsType(type)?.slugs;
  return slugs?.[locale];
}
