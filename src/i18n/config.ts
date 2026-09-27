// Talen van de site. Eén bron: astro.config.mjs (i18n + sitemap), het
// contentschema, de routes en scripts/generate-redirects.mjs lezen dit bestand.
// Zie docs/adr/0001-i18n.md.
//
// Geen imports hier: scripts/generate-redirects.mjs laadt dit bestand
// rechtstreeks in Node (type stripping), buiten Vite om.

export const defaultLocale = 'nl' as const;

/** Volgorde = volgorde van het taalaanbod. De eerste is `defaultLocale`. */
export const locales = ['nl', 'en', 'fr'] as const;

export type Locale = typeof locales[number];

export interface LocaleMeta {
  /** `<html lang>` en `hreflang`: alleen de taal, de teksten richten zich niet op een land. */
  lang: string;
  /** JSON-LD `inLanguage` (BCP 47). */
  contentLanguage: string;
  /** Open Graph `og:locale` (ll_CC, verplicht met land). */
  ogLocale: string;
  /** Locale voor `toLocaleDateString`. */
  dateLocale: string;
  /** Naam van de taal in die taal zelf, voor het taalaanbod. */
  nativeName: string;
}

export const localeMeta: Record<Locale, LocaleMeta> = {
  nl: { lang: 'nl', contentLanguage: 'nl-BE', ogLocale: 'nl_BE', dateLocale: 'nl-BE', nativeName: 'Nederlands' },
  en: { lang: 'en', contentLanguage: 'en', ogLocale: 'en_GB', dateLocale: 'en-GB', nativeName: 'English' },
  fr: { lang: 'fr', contentLanguage: 'fr-BE', ogLocale: 'fr_BE', dateLocale: 'fr-BE', nativeName: 'Français' },
};

export function isLocale(value: string | undefined): value is Locale {
  return (locales as readonly string[]).includes(value ?? '');
}

/** Talen met een URL-prefix (`/en/…`, `/fr/…`): alles behalve de standaardtaal. */
export const prefixedLocales = locales.filter(locale => locale !== defaultLocale);
