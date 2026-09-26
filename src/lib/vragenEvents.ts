import { getCollection } from "astro:content";
import { stripHtml } from "./formatDateTime";
import type { VragenEvent } from "./vragen";

interface ProgrammeItem {
  title: string;
}

interface Speaker {
  name: string;
}

function sprekersInProgrammavolgorde(speakers: Speaker[], programme: ProgrammeItem[]): string[] {
  const regels = programme.map((p) => stripHtml(p.title).toLocaleLowerCase("nl"));
  const sleutel = speakers.map(({ name }, i) => {
    const n = name.toLocaleLowerCase("nl");
    const regel = regels.findIndex((r) => r.includes(n));
    return {
      naam: name,
      regel: regel === -1 ? Infinity : regel,
      pos: regel === -1 ? 0 : regels[regel].indexOf(n),
      i,
    };
  });
  sleutel.sort((a, b) => a.regel - b.regel || a.pos - b.pos || a.i - b.i);
  return sleutel.map((s) => s.naam);
}

export async function getVragenEvents(): Promise<VragenEvent[]> {
  const entries = await getCollection("events");

  const events: (VragenEvent & { time: string })[] = entries.map((entry) => ({
    slug: entry.id,
    title: stripHtml(entry.data.title),
    subtitle: entry.data.subtitle ?? null,
    date: entry.data.date.toISOString().slice(0, 10),
    time: entry.data.time,
    speakers: sprekersInProgrammavolgorde(entry.data.speakers ?? [], entry.data.programme ?? []),
  }));

  events.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  return events.map(({ time: _time, ...rest }) => rest);
}
