// GET /api/vragen/beheer?event=<slug>[&versie=<n>]   beheerlijst (incl. verborgen), pincode vereist
import type { Vraag } from "../../../src/lib/vragen";
import { type Env, json, valideerEventSlug, controleerPincode } from "../../_lib/vragen";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const pincodeFout = await controleerPincode(request, env);
  if (pincodeFout) return pincodeFout;

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
     WHERE event_slug = ?1
     ORDER BY id ASC
     LIMIT 500`,
  )
    .bind(uitkomst.event.slug)
    .all<Vraag>();

  return json({ event: uitkomst.event.slug, versie, vragen: results });
};
