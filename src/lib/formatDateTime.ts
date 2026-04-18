export function formatShortDate(date: Date): string {
  return date
    .toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' })
    .replace(/\.$/, '');
}

export function formatLongDate(date: Date): string {
  return date.toLocaleDateString('nl-BE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatEventTime(time: string): string {
  const [h, m] = time.split(':');
  return m === '00' ? `${h}u` : `${h}u${m}`;
}

export function formatTimeRange(start: string, end?: string | null): string {
  return end ? `${formatEventTime(start)}–${formatEventTime(end)}` : formatEventTime(start);
}

export function formatSpeakersLine(speakers: { name: string }[]): string {
  if (speakers.length === 0) return '';
  const names = speakers.map(s => s.name);
  if (names.length === 1) return `met ${names[0]}`;
  const last = names[names.length - 1];
  const rest = names.slice(0, -1);
  return `met ${rest.join(', ')} en ${last}`;
}

export function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, '');
}
