import type { CollectionEntry } from 'astro:content';
import { stripHtml } from './formatDateTime';

export function escapeIcal(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

export function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [line.slice(0, 75)];
  let i = 75;
  while (i < line.length) {
    chunks.push(' ' + line.slice(i, i + 74));
    i += 74;
  }
  return chunks.join('\r\n');
}

export function prop(name: string, value: string): string {
  return foldLine(`${name}:${value}`);
}

export function buildVEvent(event: CollectionEntry<'events'>, siteBase: string): string[] {
  const { title, date, time, end_time, location, address, description } = event.data;

  const yy = String(date.getUTCFullYear());
  const mo = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const dateStr = `${yy}${mo}${dd}`;

  const [startH, startM] = time.split(':').map(Number);
  const timeStart = `${String(startH).padStart(2, '0')}${String(startM).padStart(2, '0')}00`;
  const [endH, endM] = end_time ? end_time.split(':').map(Number) : [Math.min(startH + 2, 23), startM];
  const timeEnd = `${String(endH).padStart(2, '0')}${String(endM).padStart(2, '0')}00`;

  return [
    'BEGIN:VEVENT',
    prop('UID', `${event.id}@ernestmandelfonds.org`),
    prop('DTSTART;TZID=Europe/Brussels', `${dateStr}T${timeStart}`),
    prop('DTEND;TZID=Europe/Brussels', `${dateStr}T${timeEnd}`),
    prop('SUMMARY', escapeIcal(stripHtml(title))),
    ...(description ? [prop('DESCRIPTION', escapeIcal(stripHtml(description)))] : []),
    ...([location, address].filter(Boolean).length
      ? [prop('LOCATION', escapeIcal([location, address].filter(Boolean).join(', ')))]
      : []),
    prop('URL', `${siteBase}/activiteiten/${event.id}`),
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:Herinnering',
    'TRIGGER:-P2D',
    'END:VALARM',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:Herinnering',
    'TRIGGER:-PT2H',
    'END:VALARM',
    'END:VEVENT',
  ];
}
