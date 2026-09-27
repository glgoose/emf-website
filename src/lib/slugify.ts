// Slug schema, zie CLAUDE.md > SEO > Slug-schema:
// /<type>/<voornaam-achternaam>-<kern>, auteur voorop, dan 2-5 kernwoorden.

const STOPWORDS: Record<string, string[]> = {
  nl: ['de', 'het', 'een', 'en', 'van'],
  en: ['the', 'of', 'and'],
  fr: ['le', 'la', 'les', 'de', 'du', 'et'],
};

const SOFT_LIMIT = 50;
const HARD_LIMIT = 60;

function stripDiacritics(input: string): string {
  return input.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function toAsciiSlugWords(input: string): string[] {
  return stripDiacritics(input)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/[\s-]+/)
    .filter(Boolean);
}

/** Achternaam van een volledige naam ("Anton Jäger" -> "jager"). */
function lastNameSlug(fullName: string): string {
  const words = toAsciiSlugWords(fullName);
  return words[words.length - 1] ?? '';
}

/**
 * Auteursdeel van de slug.
 * - geen auteur: leeg
 * - 1-2 auteurs: volledige naam (spaties -> koppeltekens) per auteur
 * - 3+ auteurs: alleen de eerste achternaam
 */
export function authorSlugPart(authors: string[]): string {
  if (authors.length === 0) return '';
  if (authors.length >= 3) return lastNameSlug(authors[0]);
  return authors.map(author => toAsciiSlugWords(author).join('-')).join('-');
}

/** Kernwoorden uit een titel, stopwoorden per taal eruit gefilterd. */
export function keywordSlugPart(title: string, lang: keyof typeof STOPWORDS = 'nl', maxWords = 5): string {
  const stopwords = new Set(STOPWORDS[lang] ?? []);
  const words = toAsciiSlugWords(title).filter(word => !stopwords.has(word));
  return words.slice(0, maxWords).join('-');
}

export interface BuildSlugResult {
  slug: string;
  /** true wanneer de slug de zachte grens (50) overschrijdt maar onder de harde grens (60) blijft. */
  overSoftLimit: boolean;
}

/**
 * Bouwt de volledige slug (zonder type-prefix) uit auteur(s) en titel.
 * Gooit een fout als de harde grens (60 tekens) wordt overschreden.
 */
export function buildSlug(authors: string[], title: string, lang: keyof typeof STOPWORDS = 'nl'): BuildSlugResult {
  const parts = [authorSlugPart(authors), keywordSlugPart(title, lang)].filter(Boolean);
  const slug = parts.join('-');
  if (slug.length > HARD_LIMIT) {
    throw new Error(`Slug "${slug}" (${slug.length} tekens) overschrijdt de harde grens van ${HARD_LIMIT}`);
  }
  return { slug, overSoftLimit: slug.length > SOFT_LIMIT };
}
