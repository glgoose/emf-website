// GET  /api/vragen?event=<slug>[&versie=<n>]   publieke lijst (zonder verborgen vragen)
// POST /api/vragen                             nieuwe vraag insturen
import {
  MAX_TEKST,
  normaliseerNaam,
  normaliseerTekst,
  normaliseerVoorWie,
  valideerVraag,
  brusselsVandaag,
  isVoorbij,
  type Vraag,
} from "../../../src/lib/vragen";
import { type Env, json, valideerEventSlug } from "../../_lib/vragen";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const slug = url.searchParams.get("event");
  const geziene = url.searchParams.get("versie");

  const uitkomst = await valideerEventSlug(env, request.url, slug);
  if ("fout" in uitkomst) return uitkomst.fout;

  const { results: versieRows } = await env.DB.prepare(
    "SELECT versie FROM vragen_versie WHERE event_slug = ?1",
  )
    .bind(uitkomst.event.slug)
    .all<{ versie: number }>();
  const versie = versieRows[0]?.versie ?? 0;

  if (geziene !== null && /^\d+$/.test(geziene) && Number(geziene) === versie) {
    return json({ ongewijzigd: true, versie });
  }

  const { results } = await env.DB.prepare(
    `SELECT id, tekst, naam, voor_wie, status, aangemaakt_op, status_gewijzigd_op
     FROM vragen
     WHERE event_slug = ?1 AND status != 'verborgen'
     ORDER BY id ASC
     LIMIT 500`,
  )
    .bind(uitkomst.event.slug)
    .all<Vraag>();

  return json({ event: uitkomst.event.slug, versie, vragen: results });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const raw = await request.text();
  if (raw.length > 4096) {
    return json({ error: "Vraag is te lang." }, 413);
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: "Ongeldig verzoek." }, 400);
  }

  const uitkomst = await valideerEventSlug(env, request.url, body?.event);
  if ("fout" in uitkomst) return uitkomst.fout;
  const { event } = uitkomst;

  if (isVoorbij(event, brusselsVandaag())) {
    return json({ error: "Vragen insturen is afgesloten voor deze activiteit." }, 409);
  }

  const tekst = normaliseerTekst(body?.tekst);
  const naam = normaliseerNaam(body?.naam);
  const voorWie = normaliseerVoorWie(body?.voor_wie);

  const fout = valideerVraag(tekst, naam, voorWie, event.speakers);
  if (fout) return json(fout, 400);

  const insert = await env.DB.prepare(
    `INSERT INTO vragen (event_slug, tekst, naam, voor_wie)
     VALUES (?1, ?2, ?3, ?4)
     RETURNING id, tekst, naam, voor_wie, status, aangemaakt_op, status_gewijzigd_op`,
  )
    .bind(event.slug, tekst.slice(0, MAX_TEKST), naam, voorWie)
    .first<Vraag>();

  const versieRow = await env.DB.prepare(
    `INSERT INTO vragen_versie (event_slug, versie) VALUES (?1, 1)
     ON CONFLICT (event_slug) DO UPDATE SET versie = versie + 1
     RETURNING versie`,
  )
    .bind(event.slug)
    .first<{ versie: number }>();

  return json({ vraag: insert, versie: versieRow?.versie ?? 1 }, 201);
};
