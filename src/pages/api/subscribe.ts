// Dev server API route (astro dev). Production uses functions/api/subscribe.ts (CF Pages Function).
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
  const apiKey = import.meta.env.RESEND_API_KEY;

  if (!apiKey) {
    console.log('[dev] No RESEND_API_KEY — would send to', to, 'for:', email);
    return json({ ok: true });
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: 'Ernest Mandelfonds website <noreply@ernestmandelfonds.org>',
        to: [to],
        subject: `Nieuw nieuwsbrief-abonnement: ${email}`,
        text: `Nieuw abonnement op de nieuwsbrief:\n\n${email}`,
      }),
    });

    if (res.ok) return json({ ok: true });
    return json({ error: 'Inschrijving mislukt. Probeer later opnieuw.' }, 502);
  } catch {
    return json({ error: 'Netwerkfout. Probeer later opnieuw.' }, 500);
  }
};
