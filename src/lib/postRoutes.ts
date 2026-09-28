// URL's van posts, zonder afhankelijkheid van astro:content, zodat ook
// scripts/generate-redirects.mjs (gewone Node) ze kan gebruiken.
// Imports met `.ts`-extensie: Node's type stripping lost geen extensieloze paden op.
import { defaultLocale, isLocale, type Locale } from '../i18n/config.ts';

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
 * Publiek pad van een post: `/<slug>`, in elke taal en voor elk type. Geen taalprefix en geen
 * type-woord: de slug (auteur voorop) beschrijft de tekst al. `src/lib/posts.ts` en
 * `src/pages/[slug].astro` laten de build falen als twee paden botsen. Zie docs/adr/0001-i18n.md.
 */
export function postPath(slug: string): string {
  return `/${slug}`;
}

/** Pad van een collectie-entry. */
export function postHref(item: { id: string }): string {
  return postPath(slugFromId(item.id));
}
