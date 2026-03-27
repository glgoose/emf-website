// NOTE: This file is kept for reference.
// In production, this logic runs as a Cloudflare Pages Function at functions/api/register.ts
// See /functions/api/ for the deployed handlers.
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, string>;

  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Ongeldig verzoek.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const naam = body?.naam?.trim();
  const email = body?.email?.trim();
  const telefoon = body?.telefoon?.trim() ?? '';
  const opmerking = body?.opmerking?.trim() ?? '';
  const event_slug = body?.event_slug?.trim() ?? '';
  const event_title = body?.event_title?.trim() ?? '';

  if (!naam || !email) {
    return new Response(JSON.stringify({ error: 'Naam en e-mail zijn verplicht.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(JSON.stringify({ error: 'Ongeldig e-mailadres.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const baserowUrl = import.meta.env.BASEROW_URL;
  const baserowToken = import.meta.env.BASEROW_TOKEN;
  const tableId = body?.baserow_table_id?.trim() ?? event_slug;

  if (!baserowUrl || !baserowToken || !tableId) {
    console.error('Baserow env vars not set or no table ID');
    return new Response(JSON.stringify({ error: 'Registratieservice niet geconfigureerd.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const res = await fetch(`${baserowUrl}/api/database/rows/table/${tableId}/?user_field_names=true`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Token ${baserowToken}`,
      },
      body: JSON.stringify({
        Naam: naam,
        'E-mail': email,
        Telefoon: telefoon,
        Opmerking: opmerking,
        Activiteit: event_title,
      }),
    });

    if (res.ok) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const text = await res.text();
    console.error('Baserow error:', res.status, text);
    return new Response(JSON.stringify({ error: 'Inschrijving mislukt. Probeer later opnieuw.' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Baserow fetch error:', err);
    return new Response(JSON.stringify({ error: 'Netwerkfout. Probeer later opnieuw.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
