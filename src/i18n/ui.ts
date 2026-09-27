// UI-teksten per taal. Alleen wat vertaalde pagina's (nu: lezingen) nodig
// hebben; de rest van de site blijft Nederlands. Een ontbrekende sleutel in
// en/fr valt terug op nl (zie `t`). Zie docs/adr/0001-i18n.md.
import { defaultLocale, localeMeta, type Locale } from './config';

const nl = {
  nav: {
    label: 'Hoofdnavigatie',
    home: 'Ernest Mandelfonds – startpagina',
    activiteiten: 'activiteiten',
    nieuws: 'nieuws',
    publicaties: 'publicaties',
    overEmf: 'over EMF',
  },
  post: {
    metaLabel: 'Berichtgegevens',
    backToNews: 'Terug naar nieuws',
    enlargeImage: 'vergroten',
    imageEnlarged: 'Afbeelding vergroot',
    close: 'Sluiten',
    previous: 'Vorige',
    next: 'Volgende',
  },
  // Melding bovenaan een vertaling. Tekst in een latere stap; de component
  // (nog te bouwen) vult {fromLanguage} en {translator} in
  // en linkt readOriginal naar het origineel.
  machineTranslationNotice: {
    machine: 'Deze tekst is automatisch vertaald {fromLanguage}.',
    human: 'Vertaald {fromLanguage}.',
    reviewedBy: 'Nagelezen door {translator}.',
    translatedBy: 'Vertaling: {translator}.',
    readOriginal: 'Lees het origineel',
  },
  // Taalaanbod: links naar de andere taalversies. Tekst in een latere stap.
  languageOffer: {
    label: 'Ook beschikbaar in',
    original: 'origineel',
  },
  // "vertaald {fromLanguage}": bronnaam met voorzetsel, want het lidwoord
  // verschilt per taal (fr: "du néerlandais", maar "de l'anglais").
  fromLanguage: { nl: 'uit het Nederlands', en: 'uit het Engels', fr: 'uit het Frans' } as Record<Locale, string>,
};

export type UiStrings = typeof nl;

type DeepPartial<T> = { [K in keyof T]?: T[K] extends Record<string, unknown> ? DeepPartial<T[K]> : T[K] };

const translations: Record<Exclude<Locale, typeof defaultLocale>, DeepPartial<UiStrings>> = {
  en: {
    nav: {
      label: 'Main navigation',
      home: 'Ernest Mandelfonds – home page',
      activiteiten: 'events',
      nieuws: 'news',
      publicaties: 'publications',
      overEmf: 'about EMF',
    },
    post: {
      metaLabel: 'Article details',
      backToNews: 'Back to news',
      enlargeImage: 'enlarge',
      imageEnlarged: 'Enlarged image',
      close: 'Close',
      previous: 'Previous',
      next: 'Next',
    },
    machineTranslationNotice: {
      machine: 'This text was machine-translated {fromLanguage}.',
      human: 'Translated {fromLanguage}.',
      reviewedBy: 'Reviewed by {translator}.',
      translatedBy: 'Translation: {translator}.',
      readOriginal: 'Read the original',
    },
    languageOffer: {
      label: 'Also available in',
      original: 'original',
    },
    fromLanguage: { nl: 'from Dutch', en: 'from English', fr: 'from French' },
  },
  fr: {
    nav: {
      label: 'Navigation principale',
      home: 'Ernest Mandelfonds – page d’accueil',
      activiteiten: 'activités',
      nieuws: 'actualités',
      publicaties: 'publications',
      overEmf: 'à propos',
    },
    post: {
      metaLabel: 'Détails de l’article',
      backToNews: 'Retour aux actualités',
      enlargeImage: 'agrandir',
      imageEnlarged: 'Image agrandie',
      close: 'Fermer',
      previous: 'Précédente',
      next: 'Suivante',
    },
    machineTranslationNotice: {
      machine: 'Ce texte a été traduit automatiquement {fromLanguage}.',
      human: 'Traduit {fromLanguage}.',
      reviewedBy: 'Relu par {translator}.',
      translatedBy: 'Traduction : {translator}.',
      readOriginal: 'Lire l’original',
    },
    languageOffer: {
      label: 'Également disponible en',
      original: 'original',
    },
    fromLanguage: { nl: 'du néerlandais', en: 'de l’anglais', fr: 'du français' },
  },
};

function merge<T extends Record<string, unknown>>(base: T, override: DeepPartial<T> | undefined): T {
  if (!override) return base;
  const out: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const baseValue = base[key];
    out[key] = value && typeof value === 'object' && baseValue && typeof baseValue === 'object'
      ? merge(baseValue as Record<string, unknown>, value as DeepPartial<Record<string, unknown>>)
      : value;
  }
  return out as T;
}

/** UI-teksten voor `locale`, met nl als terugval per sleutel. */
export function t(locale: Locale): UiStrings {
  return locale === defaultLocale ? nl : merge(nl, translations[locale]);
}

/** Vult `{naam}`-plaatshouders in. */
export function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);
}

/** Lange datum in de conventie van de taal ("26 september 2026", "26 September 2026"). */
export function formatDate(date: Date, locale: Locale): string {
  return date.toLocaleDateString(localeMeta[locale].dateLocale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
