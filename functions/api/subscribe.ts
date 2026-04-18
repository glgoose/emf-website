// Cloudflare Pages Function: POST /api/subscribe
// Sends a newsletter subscription notification to info@ernestmandelfonds.org via MailChannels.
// No env vars required for MailChannels on Cloudflare Pages (works automatically).
// Optional env var: EMAIL_TO (overrides the default recipient)
//
// Future: to switch to Listmonk, restore the Listmonk integration and set
// LISTMONK_URL and LISTMONK_LIST_UUID as secrets in the Cloudflare dashboard.

interface Env {
  EMAIL_TO?: string;
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

  const to = env.EMAIL_TO ?? 'info@ernestmandelfonds.org';

  try {
    const res = await fetch('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: 'noreply@ernestmandelfonds.org', name: 'Ernest Mandelfonds website' },
        subject: `Nieuw nieuwsbrief-abonnement: ${email}`,
        content: [{ type: 'text/plain', value: `Nieuw abonnement op de nieuwsbrief:\n\n${email}` }],
      }),
    });

    if (res.ok || res.status === 202) {
      return json({ ok: true });
    }

    return json({ error: 'Inschrijving mislukt. Probeer later opnieuw.' }, 502);
  } catch {
    return json({ error: 'Netwerkfout. Probeer later opnieuw.' }, 500);
  }
};
