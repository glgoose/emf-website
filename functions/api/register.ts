// Cloudflare Pages Function: POST /api/register
// Writes a registration row to a Baserow table.
// Env vars required: BASEROW_URL, BASEROW_TOKEN

interface Env {
  BASEROW_URL: string;
  BASEROW_TOKEN: string;
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

  const { BASEROW_URL, BASEROW_TOKEN } = env;

  // The table ID should be passed from the form (sourced from frontmatter)
  const tableId = body?.baserow_table_id?.trim() ?? event_slug;

  if (!BASEROW_URL || !BASEROW_TOKEN || !tableId) {
    return json({ error: 'Registratieservice niet geconfigureerd.' }, 500);
  }

  try {
    const res = await fetch(
      `${BASEROW_URL}/api/database/rows/table/${tableId}/?user_field_names=true`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${BASEROW_TOKEN}`,
        },
        body: JSON.stringify({
          Naam: naam,
          'E-mail': email,
          Telefoon: telefoon,
          Opmerking: opmerking,
          Activiteit: event_title,
        }),
      }
    );

    if (res.ok) {
      return json({ ok: true });
    }

    return json({ error: 'Inschrijving mislukt. Probeer later opnieuw.' }, 502);
  } catch {
    return json({ error: 'Netwerkfout. Probeer later opnieuw.' }, 500);
  }
};
