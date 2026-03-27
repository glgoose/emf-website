// Cloudflare Pages Function: POST /api/subscribe
// Adds a subscriber to Listmonk.
// Env vars required: LISTMONK_URL, LISTMONK_LIST_UUID

interface Env {
  LISTMONK_URL: string;
  LISTMONK_LIST_UUID: string;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let email: string | undefined;

  try {
    const body = await request.json() as Record<string, unknown>;
    email = typeof body?.email === 'string' ? body.email.trim() : undefined;
  } catch {
    return json({ error: 'Ongeldig verzoek.' }, 400);
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'Ongeldig e-mailadres.' }, 400);
  }

  const { LISTMONK_URL, LISTMONK_LIST_UUID } = env;

  if (!LISTMONK_URL || !LISTMONK_LIST_UUID) {
    return json({ error: 'Nieuwsbrief service niet geconfigureerd.' }, 500);
  }

  try {
    const res = await fetch(`${LISTMONK_URL}/api/subscribers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        name: email,
        status: 'enabled',
        lists: [LISTMONK_LIST_UUID],
        preconfirm_subscriptions: false,
      }),
    });

    if (res.ok || res.status === 409) {
      return json({ ok: true });
    }

    return json({ error: 'Inschrijving mislukt. Probeer later opnieuw.' }, 502);
  } catch {
    return json({ error: 'Netwerkfout. Probeer later opnieuw.' }, 500);
  }
};
