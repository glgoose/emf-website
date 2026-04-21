import type { CollectionEntry } from 'astro:content';
import { stripHtml } from './formatDateTime';

function gcalDt(date: Date, timeStr: string): string {
  const yy = String(date.getUTCFullYear());
  const mo = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const [h, m] = timeStr.split(':');
  return `${yy}${mo}${dd}T${h.padStart(2, '0')}${m.padStart(2, '0')}00`;
}

function outlookDt(date: Date, timeStr: string): string {
  const yy = String(date.getUTCFullYear());
  const mo = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const [h, m] = timeStr.split(':');
  return `${yy}-${mo}-${dd}T${h.padStart(2, '0')}:${m.padStart(2, '0')}:00`;
}

export function buildGoogleEventUrl(event: CollectionEntry<'events'>): string {
  const { title, date, time, end_time, location, address, description } = event.data;
  const [startH, startM] = time.split(':').map(Number);
  const [endH, endM] = end_time ? end_time.split(':').map(Number) : [Math.min(startH + 2, 23), startM];
  const endStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: stripHtml(title),
    dates: `${gcalDt(date, time)}/${gcalDt(date, endStr)}`,
    ...(location ? { location: [location, address].filter(Boolean).join(', ') } : {}),
    ...(description ? { details: stripHtml(description) } : {}),
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

export function buildOutlookEventUrl(event: CollectionEntry<'events'>): string {
  const { title, date, time, end_time, location, address, description } = event.data;
  const [startH, startM] = time.split(':').map(Number);
  const [endH, endM] = end_time ? end_time.split(':').map(Number) : [Math.min(startH + 2, 23), startM];
  const endStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
  const params = new URLSearchParams({
    rru: 'addevent',
    subject: stripHtml(title),
    startdt: outlookDt(date, time),
    enddt: outlookDt(date, endStr),
    ...(location ? { location: [location, address].filter(Boolean).join(', ') } : {}),
    ...(description ? { body: stripHtml(description) } : {}),
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params}`;
}

export function buildGoogleSubscribeUrl(icsHttpsUrl: string): string {
  return `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(icsHttpsUrl)}`;
}

export function buildOutlookSubscribeUrl(icsHttpsUrl: string): string {
  return `https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(icsHttpsUrl)}`;
}
