// Cloudflare Pages Function: POST /api/register
// Sends a registration email to info@ernestmandelfonds.org via Resend.
// Required env var: RESEND_API_KEY (set as secret in CF Pages dashboard)
// Optional env var: EMAIL_TO (overrides default recipient)

interface Env {
  RESEND_API_KEY: string;
  EMAIL_TO?: string;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: Record<string, string>;

  try {
    body = (await request.json()) as Record<string, string>;
  } catch {
    return json({ error: "Ongeldig verzoek." }, 400);
  }

  const naam = body?.naam?.trim();
  const email = body?.email?.trim();
  const telefoon = body?.telefoon?.trim() ?? "";
  const opmerking = body?.opmerking?.trim() ?? "";
  const event_title = body?.event_title?.trim() ?? "";

  if (!naam || !email) {
    return json({ error: "Gelieve uw naam en e-mailadres in te vullen." }, 400);
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: "Ongeldig e-mailadres." }, 400);
  }

  if (!env.RESEND_API_KEY) {
    return json({ error: "Serverconfiguratie ontbreekt." }, 500);
  }

  const to = env.EMAIL_TO ?? "info@ernestmandelfonds.org";

  const textBody = [
    `Naam:      ${naam}`,
    `E-mail:    ${email}`,
    telefoon ? `Telefoon:  ${telefoon}` : null,
    opmerking ? `Opmerking: ${opmerking}` : null,
    event_title ? `Activiteit: ${event_title}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Ernest Mandelfonds website <noreply@ernestmandelfonds.org>",
        to: [to],
        reply_to: `${naam} <${email}>`,
        subject: `Inschrijving: ${naam} — ${event_title ? `${event_title}` : ""}`,
        text: textBody,
      }),
    });

    if (res.ok) {
      return json({ ok: true });
    }

    return json(
      { error: "Inschrijving mislukt :( Probeer later opnieuw." },
      502,
    );
  } catch {
    return json({ error: "Netwerkfout. Probeer later opnieuw." }, 500);
  }
};
