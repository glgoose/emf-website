// Gedeelde helpers voor de vragen-Functions: onRequestPost/onRequestGet exports
// ontbreken hier bewust, dus dit bestand wordt geen eigen route.
import type { VragenEvent } from "../../src/lib/vragen";

export interface Env {
  DB: D1Database;
  ADMIN_KEY: string;
  ASSETS: Fetcher;
}

export function json(data: unknown, status = 200, extraHeaders?: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
      ...extraHeaders,
    },
  });
}

let cachedEvents: VragenEvent[] | null = null;

export async function getEvents(env: Env, requestUrl: string): Promise<VragenEvent[]> {
  if (cachedEvents) return cachedEvents;
  const res = await env.ASSETS.fetch(new URL("/vragen/events.json", requestUrl));
  const data = (await res.json()) as { events: VragenEvent[] };
  cachedEvents = data.events;
  return cachedEvents;
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function valideerEventSlug(
  env: Env,
  requestUrl: string,
  slug: unknown,
): Promise<{ event: VragenEvent } | { fout: Response }> {
  if (typeof slug !== "string" || slug.length > 100 || !SLUG_RE.test(slug)) {
    return { fout: json({ error: "Ongeldige activiteit." }, 400) };
  }
  const events = await getEvents(env, requestUrl);
  const event = events.find((e) => e.slug === slug);
  if (!event) {
    return { fout: json({ error: "Onbekende activiteit." }, 404) };
  }
  return { event };
}

async function sha256(s: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
}

function hexEncode(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Verdubbelen per fout vanaf de derde: 1, 2, 4, 8, 16, 32, dan 60 min plafond.
const BLOK_PLAFOND_MIN = 60;

function blokReactie(geblokkeerdTot: string, nu: Date): Response {
  const wachtSeconden = Math.ceil((new Date(geblokkeerdTot).getTime() - nu.getTime()) / 1000);
  return json({ error: "Te veel pogingen.", wachtSeconden }, 429, { "Retry-After": String(wachtSeconden) });
}

export async function controleerPincode(request: Request, env: Env): Promise<Response | null> {
  if (!env.ADMIN_KEY) {
    return json({ error: "Serverconfiguratie ontbreekt." }, 500);
  }
  const ipHash = hexEncode(await sha256(request.headers.get("CF-Connecting-IP") ?? "onbekend"));
  const nu = new Date();

  const rij = await env.DB.prepare("SELECT fouten, geblokkeerd_tot FROM pincode_pogingen WHERE ip_hash = ?1")
    .bind(ipHash)
    .first<{ fouten: number; geblokkeerd_tot: string | null }>();

  // Tijdens een blok geen pincode vergelijken, anders lekt een juiste gok via het antwoord.
  if (rij?.geblokkeerd_tot && new Date(rij.geblokkeerd_tot) > nu) {
    return blokReactie(rij.geblokkeerd_tot, nu);
  }

  const gegeven = request.headers.get("X-Admin-Key") ?? "";
  const [a, b] = await Promise.all([sha256(gegeven), sha256(env.ADMIN_KEY)]);
  if (a.length === b.length && crypto.subtle.timingSafeEqual(a, b)) {
    if (rij) {
      await env.DB.prepare("DELETE FROM pincode_pogingen WHERE ip_hash = ?1").bind(ipHash).run();
    }
    return null;
  }

  const fouten = (rij?.fouten ?? 0) + 1;
  let geblokkeerdTot: string | null = null;
  if (fouten >= 3) {
    const minuten = Math.min(2 ** (fouten - 3), BLOK_PLAFOND_MIN);
    geblokkeerdTot = new Date(nu.getTime() + minuten * 60_000).toISOString();
  }
  await env.DB.prepare(
    `INSERT INTO pincode_pogingen (ip_hash, fouten, geblokkeerd_tot) VALUES (?1, ?2, ?3)
     ON CONFLICT (ip_hash) DO UPDATE SET fouten = ?2, geblokkeerd_tot = ?3`,
  )
    .bind(ipHash, fouten, geblokkeerdTot)
    .run();

  if (geblokkeerdTot) {
    return blokReactie(geblokkeerdTot, nu);
  }
  return json({ error: "Ongeldige pincode." }, 401);
}
