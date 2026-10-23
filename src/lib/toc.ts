// Inhoudsopgave van een artikel uit de koppen die Astro's `render()` teruggeeft.
// h2 = delen als die er zijn, anders zijn de h3's een platte lijst zonder subs.
export interface Heading { depth: number; slug: string; text: string }
export interface TocPart { id: string; num?: string; title: string; dates?: string; subs: { id: string; text: string }[] }
export interface Toc { parts: TocPart[]; flat: boolean }

// "I. Prehistory: socialism, 1860s–1980s" (of "…, jaren 1860–jaren 1980") → numeraal, titel, periode. Koppen
// zonder numeraal (de Nederlandse versie) houden hun tekst heel.
const PART = /^([IVXLC]+)\. (.*?)(?:, ([^,]+–[^,]+))?$/;

export function buildToc(headings: Heading[]): Toc | undefined {
  const heads = headings.filter(h => (h.depth === 2 || h.depth === 3) && h.slug !== 'footnote-label');
  const top = heads.some(h => h.depth === 2) ? 2 : 3;
  const parts: TocPart[] = [];
  for (const h of heads) {
    if (h.depth === top) {
      const m = h.text.match(PART);
      parts.push(m ? { id: h.slug, num: m[1], title: m[2], dates: m[3], subs: [] } : { id: h.slug, title: h.text, subs: [] });
    } else if (parts.length) {
      parts[parts.length - 1].subs.push({ id: h.slug, text: h.text });
    }
  }
  if (parts.length + parts.reduce((n, p) => n + p.subs.length, 0) < 2) return undefined;
  return { parts, flat: !parts.some(p => p.subs.length) };
}

export const partLabel = (p: TocPart) => (p.num ? `${p.num}. ${p.title}` : p.title);
