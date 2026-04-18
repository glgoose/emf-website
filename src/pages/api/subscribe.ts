// Dev server API route (astro dev). Production uses functions/api/subscribe.ts (CF Pages Function).
// MailChannels only works in deployed CF Pages context, not locally.
import type { APIRoute } from 'astro';

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ request }) => {
  let email: string | undefined;

  try {
    const body = await request.json();
    email = typeof body?.email === 'string' ? body.email.trim() : undefined;
  } catch {
    return json({ error: 'Ongeldig verzoek.' }, 400);
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'Ongeldig e-mailadres.' }, 400);
  }

  const to = import.meta.env.EMAIL_TO ?? 'info@ernestmandelfonds.org';

  // In dev, just log — MailChannels only works on CF Pages
  if (import.meta.env.DEV) {
    console.log('[dev] Would send newsletter notification to', to, 'for subscriber:', email);
    return json({ ok: true });
  }

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

    if (res.ok || res.status === 202) return json({ ok: true });
    return json({ error: 'Inschrijving mislukt. Probeer later opnieuw.' }, 502);
  } catch {
    return json({ error: 'Netwerkfout. Probeer later opnieuw.' }, 500);
  }
};
