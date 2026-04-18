import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { buildVEvent } from '../../lib/ical';

const SITE = ((import.meta.env.SITE as string | undefined) ?? 'https://ernestmandelfonds.org').replace(/\/$/, '');

export async function getStaticPaths() {
  const events = await getCollection('events');
  return events.map(event => ({
    params: { slug: event.id },
    props: { event },
  }));
}

export const GET: APIRoute = ({ props }) => {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Ernest Mandelfonds//Activiteiten//NL',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...buildVEvent(props.event, SITE),
    'END:VCALENDAR',
  ];

  return new Response(lines.join('\r\n'), {
    headers: { 'Content-Type': 'text/calendar;charset=utf-8' },
  });
};
