// URL's van posts, zonder afhankelijkheid van astro:content, zodat ook
// scripts/generate-redirects.mjs (gewone Node) ze kan gebruiken.
// Imports met `.ts`-extensie: Node's type stripping lost geen extensieloze paden op.
import { defaultLocale, isLocale, type Locale } from '../i18n/config.ts';
import { typeSlugFor } from './newsTypes.ts';

// Bestandsindeling (zie docs/adr/0001-i18n.md):
//   src/content/posts/<slug>.md          standaardtaal (nl), id "<slug>"
//   src/content/posts/<locale>/<slug>.md andere talen, id "<locale>/<slug>"

/** Taal volgens de map waarin het bestand staat. */
export function localeFromId(id: string): Locale {
  const [first, ...rest] = id.split('/');
  if (rest.length > 0 && isLocale(first) && first !== defaultLocale) return first;
  return defaultLocale;
}

/** Slug zonder taalmap. */
export function slugFromId(id: string): string {
  const locale = localeFromId(id);
  return locale === defaultLocale ? id : id.slice(locale.length + 1);
}

/**
 * Publiek pad van een post: `/lezing/<slug>` of `/en/lecture/<slug>`.
 * Gooit een fout als het type in die taal geen type-woord heeft.
 */
export function postPath(locale: Locale, type: string, slug: string): string {
  const typeSlug = typeSlugFor(type, locale);
  if (!typeSlug) {
    throw new Error(
      `Type "${type}" heeft geen URL-woord voor taal "${locale}". Voeg het toe aan \`slugs\` in src/lib/newsTypes.ts.`,
    );
  }
  return locale === defaultLocale ? `/${typeSlug}/${slug}` : `/${locale}/${typeSlug}/${slug}`;
}

/** Pad van een collectie-entry. */
export function postHref(item: { id: string; data: { type: string } }): string {
  const locale = localeFromId(item.id);
  return postPath(locale, item.data.type, slugFromId(item.id));
}
