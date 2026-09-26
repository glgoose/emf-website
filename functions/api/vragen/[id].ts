// PATCH  /api/vragen/<id>   status wijzigen, pincode vereist
// DELETE /api/vragen/<id>   verborgen vraag definitief verwijderen, pincode vereist
import { STATUSSEN, type Status, type Vraag } from "../../../src/lib/vragen";
import { type Env, json, controleerPincode } from "../../_lib/vragen";

const ID_RE = /^[1-9][0-9]{0,9}$/;

export const onRequestPatch: PagesFunction<Env> = async ({ request, env, params }) => {
  const pincodeFout = await controleerPincode(request, env);
  if (pincodeFout) return pincodeFout;

  const idParam = String(params.id ?? "");
  if (!ID_RE.test(idParam)) {
    return json({ error: "Ongeldige vraag." }, 400);
  }
  const id = Number(idParam);

  let body: { status?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Ongeldig verzoek." }, 400);
  }

  const status = body?.status;
  if (typeof status !== "string" || !STATUSSEN.includes(status as Status)) {
    return json({ error: "Ongeldige status." }, 400);
  }

  const vraag = await env.DB.prepare(
    `UPDATE vragen
     SET status = ?2, status_gewijzigd_op = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     WHERE id = ?1
     RETURNING id, tekst, naam, voor_wie, status, aangemaakt_op, status_gewijzigd_op`,
  )
    .bind(id, status)
    .first<Vraag>();

  if (!vraag) {
    return json({ error: "Vraag niet gevonden." }, 404);
  }

  const versieRow = await env.DB.prepare(
    `INSERT INTO vragen_versie (event_slug, versie)
     SELECT event_slug, 1 FROM vragen WHERE id = ?1
     ON CONFLICT (event_slug) DO UPDATE SET versie = versie + 1
     RETURNING versie`,
  )
    .bind(id)
    .first<{ versie: number }>();

  return json({ vraag, versie: versieRow?.versie ?? 1 });
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  const pincodeFout = await controleerPincode(request, env);
  if (pincodeFout) return pincodeFout;

  const idParam = String(params.id ?? "");
  if (!ID_RE.test(idParam)) {
    return json({ error: "Ongeldige vraag." }, 400);
  }

  // Alleen verborgen vragen, zodat een misklik geen zichtbare vraag wist.
  const verwijderd = await env.DB.prepare(
    `DELETE FROM vragen WHERE id = ?1 AND status = 'verborgen' RETURNING event_slug`,
  )
    .bind(Number(idParam))
    .first<{ event_slug: string }>();

  if (!verwijderd) {
    return json({ error: "Vraag niet gevonden of niet verborgen." }, 404);
  }

  const versieRow = await env.DB.prepare(
    `INSERT INTO vragen_versie (event_slug, versie) VALUES (?1, 1)
     ON CONFLICT (event_slug) DO UPDATE SET versie = versie + 1
     RETURNING versie`,
  )
    .bind(verwijderd.event_slug)
    .first<{ versie: number }>();

  return json({ versie: versieRow?.versie ?? 1 });
};
