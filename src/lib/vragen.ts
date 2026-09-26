// Gedeeld tussen browser en Cloudflare Functions. Geen astro:*-imports hier:
// dit bestand wordt zowel door Vite (browserbundel) als door esbuild (Functions) gebundeld.

export const MAX_TEKST = 350;
export const MAX_NAAM = 60;
export const MAX_VOOR_WIE = 100;

export const STATUSSEN = ["open", "nu", "beantwoord", "verborgen"] as const;
export type Status = (typeof STATUSSEN)[number];

export interface Vraag {
  id: number;
  tekst: string;
  naam: string | null;
  voor_wie: string | null;
  status: Status;
  aangemaakt_op: string;
  status_gewijzigd_op: string;
}

export interface VragenEvent {
  slug: string;
  title: string;
  subtitle: string | null;
  date: string; // YYYY-MM-DD, kalenderdag in België
  speakers: string[]; // zonder "Allen", in programmavolgorde
}

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export function normaliseerTekst(input: unknown): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/\r\n/g, "\n")
    .replace(CONTROL_CHARS, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function normaliseerNaam(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const naam = input.replace(CONTROL_CHARS, "").replace(/\s+/g, " ").trim();
  return naam === "" ? null : naam;
}

export function normaliseerVoorWie(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  return trimmed === "" || trimmed === "Allen" ? null : trimmed;
}

export interface ValidatieFout {
  error: string;
}

export function valideerVraag(
  tekst: string,
  naam: string | null,
  voorWie: string | null,
  speakers: string[],
): ValidatieFout | null {
  if (tekst.length < 1) return { error: "Schrijf eerst je vraag." };
  if (tekst.length > MAX_TEKST) {
    return { error: `Je vraag is te lang (max. ${MAX_TEKST} tekens).` };
  }
  if (naam !== null && naam.length > MAX_NAAM) {
    return { error: `Je naam is te lang (max. ${MAX_NAAM} tekens).` };
  }
  if (voorWie !== null && !speakers.includes(voorWie)) {
    return { error: "Kies voor wie je vraag is." };
  }
  return null;
}

export function brusselsVandaag(nu: Date = new Date()): string {
  const d = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Brussels",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(nu)
      .map((p) => [p.type, p.value]),
  );
  return `${d.year}-${d.month}-${d.day}`;
}

export function kiesHuidigEvent(
  events: VragenEvent[],
  vandaag: string = brusselsVandaag(),
): VragenEvent | null {
  return events.find((e) => e.date >= vandaag) ?? null;
}

export function isVoorbij(e: VragenEvent, vandaag: string = brusselsVandaag()): boolean {
  return e.date < vandaag;
}

export function metaTekst(naam: string | null, voorWie: string | null): string {
  const wie = naam ?? "anoniem";
  return voorWie ? `${wie} · voor ${voorWie}` : wie;
}
