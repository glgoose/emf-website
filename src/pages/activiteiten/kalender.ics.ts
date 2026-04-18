import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { prop, escapeIcal, buildVEvent } from '../../lib/ical';

const SITE = ((import.meta.env.SITE as string | undefined) ?? 'https://ernestmandelfonds.org').replace(/\/$/, '');

export const GET: APIRoute = async () => {
  const events = await getCollection('events');
  events.sort((a, b) => a.data.date.getTime() - b.data.date.getTime());

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Ernest Mandelfonds//Activiteiten//NL',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    prop('X-WR-CALNAME', 'Ernest Mandelfonds'),
    prop('X-WR-CALDESC', escapeIcal('Activiteiten van het Ernest Mandelfonds')),
    'REFRESH-INTERVAL;VALUE=DURATION:P1D',
    'X-PUBLISHED-TTL:P1D',
  ];

  for (const event of events) {
    lines.push(...buildVEvent(event, SITE));
  }

  lines.push('END:VCALENDAR');

  return new Response(lines.join('\r\n'), {
    headers: { 'Content-Type': 'text/calendar;charset=utf-8' },
  });
};
