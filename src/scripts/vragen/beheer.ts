import { leesTaal, type Status, type Taal, type Vraag } from "../../lib/vragen";
import {
  huidigEvent,
  leesPincode,
  bewaarPincode,
  wisPincode,
  escapeHtml,
  startPoller,
  vragenKanaal,
  leesSchermTaal,
  bewaarSchermTaal,
} from "./client";

interface BeheerAntwoord {
  versie: number;
  vragen: Vraag[];
  ongewijzigd?: boolean;
}

const event = huidigEvent();
const gate = document.getElementById("gate");
const gateForm = document.getElementById("gate-form") as HTMLFormElement | null;
const gatePincode = document.getElementById("gate-pincode") as HTMLInputElement | null;
const gateFout = document.getElementById("gate-fout");
const paneel = document.getElementById("paneel");
const filtersEl = document.getElementById("filters");
const rowsEl = document.getElementById("rows");
const toast = document.getElementById("toast");
const toastMsg = document.getElementById("toast-msg");
const undoBtn = document.getElementById("undo");

const ICONEN: Record<string, string> = {
  nu: '<svg viewBox="0 0 24 24" class="play"><polygon points="7 4 19 12 7 20 7 4"/></svg>',
  beantwoord: '<svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>',
  open: '<svg viewBox="0 0 24 24"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>',
  verborgen:
    '<svg viewBox="0 0 24 24"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.53 13.53 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><path d="M2 2l20 20"/></svg>',
  tonen: '<svg viewBox="0 0 24 24"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>',
  verwijderen:
    '<svg viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 14h10l1-14"/></svg>',
};

const TITEL: Record<string, string> = {
  nu: "Nu behandelen, komt op het scherm",
  beantwoord: "Beantwoord, verdwijnt van het scherm",
  open: "Terug naar open",
  verborgen: "Verbergen, voor iedereen onzichtbaar",
  tonen: "Weer tonen, terug naar open",
  verwijderen: "Definitief verwijderen",
};

const MELDING: Record<string, string> = {
  nu: "Staat nu op het scherm",
  beantwoord: "Beantwoord",
  open: "Terug naar open",
  verborgen: "Verborgen",
  tonen: "Weer zichtbaar",
  verwijderen: "Verwijderd",
};

// `weergave` kiest icoon, tooltip en melding los van de status die de knop zet.
function knop(actie: string, id: number, primair: string | undefined, weergave = actie): string {
  const isPrimary = actie === primair;
  return `<button data-a="${actie}" data-w="${weergave}" data-id="${id}" data-tip="${TITEL[weergave]}" aria-label="${TITEL[weergave]}" class="${isPrimary ? "primary" : ""}">${ICONEN[weergave]}</button>`;
}

// Vaste kolommen [nu of terug] [beantwoord] [verbergen of verwijderen], lege cel waar de actie niet geldt.
// Verborgen vragen zetten 'weer tonen' in de middelste kolom, naast verwijderen.
function knoppenVoor(q: Vraag): string {
  const id = q.id;
  let kol1 = "";
  let kol2 = "";
  let kol3 = "";
  if (q.status === "open") {
    kol1 = knop("nu", id, "nu");
    kol2 = knop("beantwoord", id, undefined);
    kol3 = knop("verborgen", id, undefined);
  } else if (q.status === "nu") {
    kol1 = knop("open", id, undefined);
    kol2 = knop("beantwoord", id, "beantwoord");
    kol3 = knop("verborgen", id, undefined);
  } else if (q.status === "beantwoord") {
    kol1 = knop("open", id, undefined);
    kol3 = knop("verborgen", id, undefined);
  } else {
    kol2 = knop("open", id, undefined, "tonen");
    kol3 = knop("verwijderen", id, undefined);
  }
  const cel = (k: string) => k || "<span></span>";
  return `<div class="btns">${cel(kol1)}${cel(kol2)}${cel(kol3)}</div>`;
}

const meta = (q: Vraag) =>
  escapeHtml(`${q.naam ?? "anoniem"}${q.voor_wie ? ` · voor ${q.voor_wie}` : ""}`);
const uur = (iso: string) =>
  new Intl.DateTimeFormat("nl-BE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Brussels" }).format(
    new Date(iso),
  );

const FILTERS: Record<string, (q: Vraag) => boolean> = {
  actief: (q) => q.status === "open" || q.status === "nu",
  beantwoord: (q) => q.status === "beantwoord",
  verborgen: (q) => q.status === "verborgen",
  alle: () => true,
};

let vragen: Vraag[] = [];
let filter = "actief";

function renderFilters() {
  if (!filtersEl) return;
  filtersEl.innerHTML = Object.keys(FILTERS)
    .map((f) => {
      const icoon = f === "beantwoord" || f === "verborgen" ? ICONEN[f] : "";
      const n = vragen.filter(FILTERS[f]).length;
      return `<button data-f="${f}" class="${f === filter ? "on" : ""}">${icoon}${f} (${n})</button>`;
    })
    .join("");
}

function renderRows() {
  if (!rowsEl) return;
  const rows = [...vragen].sort((a, b) => a.id - b.id).filter(FILTERS[filter]);
  rows.sort((a, b) => Number(b.status === "nu") - Number(a.status === "nu"));
  rowsEl.innerHTML = rows
    .map((q) => {
      const cls = q.status === "nu" ? "is-now" : q.status === "open" ? "" : "is-dim";
      const status = q.status === "open" ? "" : `<span class="status">${q.status} · </span>`;
      return `<li class="${cls}">
        <div><div class="text">${escapeHtml(q.tekst)}</div><div class="meta">${status}${meta(q)}</div></div>
        ${knoppenVoor(q)}
        <div class="time">${uur(q.status_gewijzigd_op)}</div>
      </li>`;
    })
    .join("");
}

const kanaal = vragenKanaal();

function render() {
  renderFilters();
  renderRows();
  kanaal?.postMessage({ event: event?.slug, vragen });
}

filtersEl?.addEventListener("click", (e) => {
  const f = (e.target as HTMLElement).closest("button")?.dataset.f;
  if (f) {
    filter = f;
    render();
  }
});

let snapshot: Vraag[] | null = null;
// Een poll die al onderweg was bij een klik brengt de oude status terug; negeer die zolang er een PATCH loopt.
let bezig = 0;
let toastTimer: ReturnType<typeof setTimeout> | null = null;

function wachtMelding(wachtSeconden: unknown): string {
  const minuten = Math.max(1, Math.ceil((Number(wachtSeconden) || 60) / 60));
  return `Te veel pogingen. Probeer opnieuw over ${minuten} min.`;
}

async function stuurStatus(id: number, status: Status): Promise<boolean> {
  const pincode = leesPincode();
  if (!pincode) return false;
  let res: Response;
  try {
    res = await fetch(`/api/vragen/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "X-Admin-Key": pincode },
      body: JSON.stringify({ status }),
    });
  } catch {
    toonGate("Server niet bereikbaar, probeer later opnieuw.");
    return false;
  }
  if (res.status === 401) {
    toonGate("Ongeldige pincode.");
    wisPincode();
    return false;
  }
  if (res.status === 429) {
    const data = await res.json().catch(() => null);
    toonGate(wachtMelding(data?.wachtSeconden));
    return false;
  }
  if (!res.ok) {
    toonGate("Server niet bereikbaar, probeer later opnieuw.");
    return false;
  }
  return true;
}

async function verwijder(id: number) {
  const pincode = leesPincode();
  if (!pincode) return;
  bezig++;
  try {
    const res = await fetch(`/api/vragen/${id}`, { method: "DELETE", headers: { "X-Admin-Key": pincode } });
    if (res.status === 401) {
      toonGate("Ongeldige pincode.");
      wisPincode();
      return;
    }
    if (res.status === 429) {
      const data = await res.json().catch(() => null);
      toonGate(wachtMelding(data?.wachtSeconden));
      return;
    }
    if (!res.ok && res.status !== 404) {
      toonGate("Server niet bereikbaar, probeer later opnieuw.");
      return;
    }
  } catch {
    toonGate("Server niet bereikbaar, probeer later opnieuw.");
    return;
  } finally {
    bezig--;
  }
  vragen = vragen.filter((q) => q.id !== id);
  snapshot = null;
  render();
  if (toastMsg) toastMsg.textContent = MELDING.verwijderen;
  if (undoBtn) undoBtn.hidden = true;
  if (toast) toast.hidden = false;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    if (toast) toast.hidden = true;
  }, 5000);
  poller?.pollNu();
}

rowsEl?.addEventListener("click", async (e) => {
  const b = (e.target as HTMLElement).closest("button[data-a]") as HTMLButtonElement | null;
  if (!b) return;
  if (b.dataset.a === "verwijderen") {
    verwijder(Number(b.dataset.id));
    return;
  }
  const actie = b.dataset.a as Status;
  const id = Number(b.dataset.id);
  const vorige = vragen.find((q) => q.id === id);
  if (!vorige) return;

  snapshot = vragen.map((q) => ({ ...q }));
  vorige.status = actie;
  render();

  if (toastMsg) toastMsg.textContent = MELDING[b.dataset.w ?? actie];
  if (undoBtn) undoBtn.hidden = false;
  if (toast) toast.hidden = false;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    if (toast) toast.hidden = true;
  }, 5000);

  bezig++;
  const ok = await stuurStatus(id, actie).finally(() => bezig--);
  if (!ok && snapshot) {
    vragen = snapshot;
    snapshot = null;
    render();
  }
  poller?.pollNu();
});

// Taal van het zaalscherm: een open scherm in deze browser wisselt meteen via het kanaal,
// de URL-parameter draagt de keuze naar een scherm dat later of elders geopend wordt.
const presentLink = document.querySelector<HTMLAnchorElement>("a.present");
const taalKnoppen = document.querySelectorAll<HTMLButtonElement>(".taal button");

function toonSchermTaal(taal: Taal) {
  taalKnoppen.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.taal === taal)));
  if (presentLink) presentLink.href = `/vragen/scherm?lang=${taal}`;
}

toonSchermTaal(leesSchermTaal() ?? "nl");

taalKnoppen.forEach((b) =>
  b.addEventListener("click", () => {
    const taal = leesTaal(b.dataset.taal);
    bewaarSchermTaal(taal);
    toonSchermTaal(taal);
    kanaal?.postMessage({ taal });
  }),
);

// Eigen venster zodat het naar de beamer kan en de beheertab zichtbaar blijft
presentLink?.addEventListener("click", (e) => {
  const link = e.currentTarget as HTMLAnchorElement;
  const venster = window.open(link.href, "zaalscherm", "popup,width=1280,height=720");
  if (venster) {
    e.preventDefault();
    venster.focus();
  }
});

undoBtn?.addEventListener("click", async () => {
  if (!snapshot || !event) return;
  const i = vragen.findIndex((q, idx) => q.status !== snapshot![idx]?.status);
  const teHerstellen = i !== -1 ? { id: vragen[i].id, status: snapshot[i].status } : null;
  vragen = snapshot;
  snapshot = null;
  if (toast) toast.hidden = true;
  render();
  if (teHerstellen) {
    bezig++;
    await stuurStatus(teHerstellen.id, teHerstellen.status).finally(() => bezig--);
  }
  poller?.pollNu();
});

function toonGate(fout?: string) {
  if (gate) gate.hidden = false;
  if (paneel) paneel.hidden = true;
  if (gateFout) gateFout.hidden = !fout;
  if (gateFout && fout) gateFout.textContent = fout;
}

function toonPaneel() {
  if (gate) gate.hidden = true;
  if (paneel) paneel.hidden = false;
}

let poller: { pollNu: () => void } | null = null;

function startBeheerPoller() {
  if (!event) return;
  poller = startPoller<BeheerAntwoord>({
    url: (versie) =>
      `/api/vragen/beheer?event=${encodeURIComponent(event.slug)}${versie !== null ? `&versie=${versie}` : ""}`,
    intervalMs: 15000,
    headers: () => ({ "X-Admin-Key": leesPincode() ?? "" }),
    onData: (data) => {
      if (bezig) return;
      vragen = data.vragen;
      render();
    },
  });
}

type PincodeUitkomst = "ok" | "fout" | "geblokkeerd" | "storing";

async function probeerPincode(pincode: string): Promise<PincodeUitkomst> {
  if (!event) return "fout";
  let res: Response;
  try {
    res = await fetch(`/api/vragen/beheer?event=${encodeURIComponent(event.slug)}`, {
      headers: { "X-Admin-Key": pincode },
    });
  } catch {
    toonGate("Server niet bereikbaar, probeer later opnieuw.");
    return "storing";
  }
  if (res.status === 401) return "fout";
  if (res.status === 429) {
    const data = await res.json().catch(() => null);
    toonGate(wachtMelding(data?.wachtSeconden));
    return "geblokkeerd";
  }
  if (!res.ok) {
    toonGate("Server niet bereikbaar, probeer later opnieuw.");
    return "storing";
  }
  const data: BeheerAntwoord = await res.json();
  vragen = data.vragen;
  return "ok";
}

gateForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!gatePincode) return;
  const pincode = gatePincode.value.trim();
  if (!pincode) return;
  const uitkomst = await probeerPincode(pincode);
  if (uitkomst === "fout") {
    if (gateFout) {
      gateFout.hidden = false;
      gateFout.textContent = "Ongeldige pincode.";
    }
    return;
  }
  if (uitkomst === "geblokkeerd" || uitkomst === "storing") return;
  bewaarPincode(pincode);
  toonPaneel();
  render();
  startBeheerPoller();
});

if (!event) {
  if (gate) gate.hidden = true;
  if (paneel) {
    paneel.hidden = false;
    paneel.innerHTML = '<p class="hint">Geen actieve activiteit.</p>';
  }
} else {
  const opgeslagen = leesPincode();
  if (opgeslagen) {
    probeerPincode(opgeslagen).then((uitkomst) => {
      if (uitkomst === "ok") {
        toonPaneel();
        render();
        startBeheerPoller();
      } else if (uitkomst === "fout") {
        wisPincode();
        toonGate();
      }
      // "geblokkeerd" en "storing" tonen hun melding al via toonGate binnen probeerPincode.
    });
  } else {
    toonGate();
  }
}
