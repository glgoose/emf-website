// NOTE: This file is kept for reference.
// In production, this logic runs as a Cloudflare Pages Function at functions/api/subscribe.ts
// See /functions/api/ for the deployed handlers.
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  let email: string | undefined;

  try {
    const body = await request.json();
    email = body?.email?.trim();
  } catch {
    return new Response(JSON.stringify({ error: 'Ongeldig verzoek.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(JSON.stringify({ error: 'Ongeldig e-mailadres.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const listmonkUrl = import.meta.env.LISTMONK_URL;
  const listmonkListUuid = import.meta.env.LISTMONK_LIST_UUID;

  if (!listmonkUrl || !listmonkListUuid) {
    console.error('Listmonk env vars not set');
    return new Response(JSON.stringify({ error: 'Nieuwsbrief service niet geconfigureerd.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const res = await fetch(`${listmonkUrl}/api/subscribers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Listmonk requires basic auth; credentials should be set via env if needed.
        // For now we use the public subscriber API which typically doesn't require auth.
      },
      body: JSON.stringify({
        email,
        name: email,
        status: 'enabled',
        lists: [listmonkListUuid],
        preconfirm_subscriptions: false,
      }),
    });

    if (res.ok || res.status === 409) {
      // 409 = already subscribed — treat as success
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const text = await res.text();
    console.error('Listmonk error:', res.status, text);
    return new Response(JSON.stringify({ error: 'Inschrijving mislukt. Probeer later opnieuw.' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Listmonk fetch error:', err);
    return new Response(JSON.stringify({ error: 'Netwerkfout. Probeer later opnieuw.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
