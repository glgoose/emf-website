// UI-teksten per taal. Alleen wat vertaalde pagina's (nu: lezingen) nodig
// hebben; de rest van de site blijft Nederlands. Een ontbrekende sleutel in
// en/fr valt terug op nl (zie `t`). Zie docs/adr/0001-i18n.md.
import { defaultLocale, localeMeta, type Locale } from './config';
import type { NewsTypeSlug } from '../lib/newsTypes';

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
    contents: 'inhoud',
    notes: 'Noten',
    topLabel: 'terug naar boven',
    draftNotice: 'Concept, nog niet gepubliceerd',
    backToNews: 'Terug naar nieuws',
    enlargeImage: 'vergroten',
    imageEnlarged: 'Afbeelding vergroot',
    close: 'Sluiten',
    previous: 'Vorige',
    next: 'Volgende',
    zoomIn: 'Inzoomen',
    zoomOut: 'Uitzoomen',
  },
  // Melding in de taalband onder de byline (LanguageLinks.astro). {fromLanguage}
  // en {translator} worden ingevuld met `fill()`. translatedBy en reviewedBy
  // hangen met ", " achter de melding.
  machineTranslationNotice: {
    machine: 'machinevertaling {fromLanguage}',
    human: 'vertaling {fromLanguage}',
    reviewedBy: 'nagelezen door {translator}',
    translatedBy: 'door {translator}',
  },
  // Taalaanbod: links naar de andere taalversies. Tekst in een latere stap.
  languageOffer: {
    original: 'origineel',
  },
  // Categorielabel in de zijbalk van een post, per `type:` uit lib/newsTypes.ts.
  newsType: { lezing: 'lezing', recensie: 'recensie', verslag: 'verslag' } as Record<NewsTypeSlug, string>,
  // Voorvoegsel van de eventregel in de zijbalk, vormt met newsType één zin
  // ("lezing / gegeven op de studiedag …"). Daarachter komt source_event.label.
  eventPrefix: { lezing: 'gegeven op de', recensie: 'over de', verslag: 'van de' } as Record<NewsTypeSlug, string>,
  // "vertaald {fromLanguage}": bronnaam met voorzetsel, want het lidwoord
  // verschilt per taal (fr: "du néerlandais", maar "de l'anglais").
  fromLanguage: { nl: 'uit het Nederlands', en: 'uit het Engels', fr: 'uit het Frans' } as Record<Locale, string>,
  // Taalnaam in deze taal, voor {sourceLanguage} in de melding hierboven.
  languageName: { nl: 'Nederlands', en: 'Engels', fr: 'Frans' } as Record<Locale, string>,
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
      contents: 'contents',
      notes: 'Notes',
      topLabel: 'back to top',
      draftNotice: 'Draft, not yet published',
      backToNews: 'Back to news',
      enlargeImage: 'enlarge',
      imageEnlarged: 'Enlarged image',
      close: 'Close',
      previous: 'Previous',
      next: 'Next',
      zoomIn: 'Zoom in',
      zoomOut: 'Zoom out',
    },
    machineTranslationNotice: {
      machine: 'machine translation {fromLanguage}',
      human: 'translation {fromLanguage}',
      reviewedBy: 'reviewed by {translator}',
      translatedBy: 'by {translator}',
    },
    languageOffer: {
      original: 'original',
    },
    newsType: { lezing: 'lecture', recensie: 'review', verslag: 'report' },
    eventPrefix: { lezing: 'given at the', recensie: 'on the', verslag: 'of the' },
    fromLanguage: { nl: 'from Dutch', en: 'from English', fr: 'from French' },
    languageName: { nl: 'Dutch', en: 'English', fr: 'French' },
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
      contents: 'sommaire',
      notes: 'Notes',
      topLabel: 'retour en haut',
      draftNotice: 'Brouillon, pas encore publié',
      backToNews: 'Retour aux actualités',
      enlargeImage: 'agrandir',
      imageEnlarged: 'Image agrandie',
      close: 'Fermer',
      previous: 'Précédente',
      next: 'Suivante',
      zoomIn: 'Zoomer',
      zoomOut: 'Dézoomer',
    },
    machineTranslationNotice: {
      machine: 'traduction automatique {fromLanguage}',
      human: 'traduction {fromLanguage}',
      reviewedBy: 'relu par {translator}',
      translatedBy: 'par {translator}',
    },
    languageOffer: {
      original: 'original',
    },
    newsType: { lezing: 'conférence', recensie: 'recension', verslag: 'compte rendu' },
    eventPrefix: { lezing: 'donnée lors de la', recensie: 'sur la', verslag: 'de la' },
    fromLanguage: { nl: 'du néerlandais', en: 'de l’anglais', fr: 'du français' },
    languageName: { nl: 'néerlandais', en: 'anglais', fr: 'français' },
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
