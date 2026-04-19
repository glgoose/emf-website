// Cloudflare Pages Function: POST /api/subscribe
// Sends a newsletter subscription notification via Resend.
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
  let email: string | undefined;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    email = typeof body?.email === "string" ? body.email.trim() : undefined;
  } catch {
    return json({ error: "Ongeldig verzoek." }, 400);
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: "Ongeldig e-mailadres." }, 400);
  }

  if (!env.RESEND_API_KEY) {
    return json({ error: "Serverconfiguratie ontbreekt." }, 500);
  }

  const to = env.EMAIL_TO ?? "info@ernestmandelfonds.org";

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
        subject: `Aanmelding nieuwsbrief: ${email}`,
        text: `Nieuwe abonnee:\n\n${email}`,
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
