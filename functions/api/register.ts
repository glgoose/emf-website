// Cloudflare Pages Function: POST /api/register
// Sends a registration email to info@ernestmandelfonds.org via MailChannels.
// No env vars required for MailChannels on Cloudflare Pages (works automatically).
// Optional env var: EMAIL_TO (overrides the default recipient)
//
// Future: to switch to Baserow, restore the Baserow integration and set
// BASEROW_URL and BASEROW_TOKEN as secrets in the Cloudflare dashboard.

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
  let body: Record<string, string>;

  try {
    body = await request.json() as Record<string, string>;
  } catch {
    return json({ error: 'Ongeldig verzoek.' }, 400);
  }

  const naam = body?.naam?.trim();
  const email = body?.email?.trim();
  const telefoon = body?.telefoon?.trim() ?? '';
  const opmerking = body?.opmerking?.trim() ?? '';
  const event_title = body?.event_title?.trim() ?? '';
  const event_slug = body?.event_slug?.trim() ?? '';

  if (!naam || !email) {
    return json({ error: 'Naam en e-mail zijn verplicht.' }, 400);
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'Ongeldig e-mailadres.' }, 400);
  }

  const to = env.EMAIL_TO ?? 'info@ernestmandelfonds.org';

  const textBody = [
    `Nieuwe inschrijving${event_title ? ` voor: ${event_title}` : ''}`,
    '',
    `Naam:      ${naam}`,
    `E-mail:    ${email}`,
    telefoon ? `Telefoon:  ${telefoon}` : null,
    opmerking ? `Opmerking: ${opmerking}` : null,
    event_slug ? `Activiteit: ${event_slug}` : null,
  ].filter(Boolean).join('\n');

  try {
    const res = await fetch('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: 'noreply@ernestmandelfonds.org', name: 'Ernest Mandelfonds website' },
        reply_to: { email, name: naam },
        subject: `Inschrijving${event_title ? `: ${event_title}` : ''} – ${naam}`,
        content: [{ type: 'text/plain', value: textBody }],
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
