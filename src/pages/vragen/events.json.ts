import type { APIRoute } from "astro";
import { getVragenEvents } from "../../lib/vragenEvents";

export const GET: APIRoute = async () => {
  const events = await getVragenEvents();
  return new Response(JSON.stringify({ events }), {
    headers: { "Content-Type": "application/json" },
  });
};
