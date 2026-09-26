import { kiesHuidigEvent, type VragenEvent } from "../../lib/vragen";

export function leesEvents(): VragenEvent[] {
  try {
    return JSON.parse(document.body.dataset.events ?? "[]");
  } catch {
    return [];
  }
}

export function huidigEvent(): VragenEvent | null {
  return kiesHuidigEvent(leesEvents());
}

interface PollerOpties<T> {
  url: (versie: number | null) => string;
  intervalMs: number;
  headers?: () => Record<string, string>;
  onData: (data: T) => void;
}

// setTimeout-keten i.p.v. setInterval: een trage respons stapelt dan niet op.
// Pauzeert op een verborgen tabblad (vergrendeld telefoonscherm telt dan niet mee
// voor het gratis quotum van Functions-requests).
export function startPoller<T extends { versie: number; ongewijzigd?: boolean }>({
  url,
  intervalMs,
  headers,
  onData,
}: PollerOpties<T>): { pollNu: () => void } {
  let versie: number | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  async function poll(negeerVersie = false) {
    try {
      const res = await fetch(url(negeerVersie ? null : versie), {
        cache: "no-store",
        headers: headers?.(),
      });
      if (res.ok) {
        const data: T = await res.json();
        versie = data.versie;
        if (!data.ongewijzigd) onData(data);
      }
    } catch {
      // netwerkfout: stil opnieuw proberen, bestaande lijst blijft staan
    }
    schedule();
  }

  function schedule() {
    if (timer) clearTimeout(timer);
    if (document.visibilityState === "hidden") return;
    timer = setTimeout(() => poll(), intervalMs);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") poll();
  });

  poll();

  return { pollNu: () => poll(true) };
}

// Beheer en scherm in dezelfde browser (laptop + projectorvenster): beheer stuurt
// de nieuwe lijst meteen door, zonder op de volgende poll van het scherm te wachten.
export function vragenKanaal(): BroadcastChannel | null {
  return typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel("emf-vragen");
}

const PINCODE_KEY = "emf-vragen-pincode";

export function leesPincode(): string | null {
  try {
    return localStorage.getItem(PINCODE_KEY);
  } catch {
    return null;
  }
}

export function bewaarPincode(pincode: string) {
  try {
    localStorage.setItem(PINCODE_KEY, pincode);
  } catch {
    // lukt niet, pincode blijft alleen in het geheugen van de pagina
  }
}

export function wisPincode() {
  try {
    localStorage.removeItem(PINCODE_KEY);
  } catch {
    // geen lokale opslag beschikbaar
  }
}

export function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string,
  );
}
