import {
  MAX_TEKST,
  normaliseerNaam,
  normaliseerTekst,
  normaliseerVoorWie,
  valideerVraag,
  metaTekst,
  leesTaal,
  type Taal,
  type Vraag,
} from "../../lib/vragen";
import { huidigEvent, startPoller, escapeHtml } from "./client";
import { TEKST } from "./tekst";

interface PubliekAntwoord {
  versie: number;
  vragen: Vraag[];
  ongewijzigd?: boolean;
}

const TAAL_KEY = "emf-vragen-taal";

function leesOpgeslagenTaal(): Taal | null {
  try {
    const t = localStorage.getItem(TAAL_KEY);
    return t === "nl" || t === "en" || t === "fr" ? t : null;
  } catch {
    return null;
  }
}

function bewaarTaal(t: Taal) {
  try {
    localStorage.setItem(TAAL_KEY, t);
  } catch {
    // geen lokale opslag, keuze geldt alleen voor deze paginaweergave
  }
}

// Paginadefault: het lang van de server-gerenderde HTML (nl op /vragen, en op /questions).
const paginaDefault = leesTaal(document.documentElement.lang);

function begintaal(): Taal {
  const opgeslagen = leesOpgeslagenTaal();
  if (opgeslagen) return opgeslagen;
  if (paginaDefault === "en" && navigator.language.toLowerCase().startsWith("fr")) return "fr";
  return paginaDefault;
}

let taal: Taal = begintaal();
let T = TEKST[taal];

const event = huidigEvent();
const main = document.getElementById("vragen") as HTMLElement;
const form = document.getElementById("vragen-form") as HTMLFormElement | null;
const veld = document.getElementById("vragen-tekst") as HTMLTextAreaElement | null;
const hint = document.getElementById("vragen-hint");
const ok = document.getElementById("vragen-ok");
const lijst = document.getElementById("vragen-lijst");
const leeg = document.getElementById("vragen-leeg");
const submitBtn = form?.querySelector('button[type="submit"]') as HTMLButtonElement | null;
const titel = document.getElementById("event-title");
const subtitel = document.getElementById("event-subtitle");
const voorWieWrap = document.getElementById("vragen-voorwie");
const teller = document.getElementById("vragen-teller");
const taalKnoppen = document.querySelectorAll<HTMLButtonElement>(".talen button");

const breed = window.matchMedia("(min-width: 1000px)");
function waar(): string {
  return breed.matches ? T.hiernaast : T.hieronder;
}

function initHint() {
  if (hint) hint.textContent = T.hint(waar());
}
breed.addEventListener("change", initHint);

function groei() {
  if (!veld) return;
  veld.style.height = "auto";
  veld.style.height = `${veld.scrollHeight}px`;
  if (teller) teller.textContent = `${veld.value.length} / ${MAX_TEKST} ${T.tekens}`;
}
veld?.addEventListener("input", groei);
groei();

let laatsteVragen: Vraag[] = [];

function renderLijst(vragen: Vraag[]) {
  laatsteVragen = vragen;
  if (!lijst || !leeg) return;
  const zichtbaar = [...vragen].sort((a, b) => b.id - a.id);
  zichtbaar.sort((a, b) => Number(b.status === "nu") - Number(a.status === "nu"));

  leeg.hidden = zichtbaar.length > 0;
  lijst.innerHTML = zichtbaar
    .map((q) => {
      const cls = q.status === "nu" ? "is-now" : q.status === "beantwoord" ? "is-answered" : "";
      const tag =
        q.status === "nu"
          ? `<span class="tag">${T.nu} · </span>`
          : q.status === "beantwoord"
            ? `<span class="tag">${T.beantwoord} · </span>`
            : "";
      return `<li class="${cls}"><div class="text">${escapeHtml(q.tekst)}</div><div class="meta">${tag}${escapeHtml(metaTekst(q.naam, q.voor_wie, taal))}</div></li>`;
    })
    .join("");
}

function pasStatischeTekstToe() {
  document.querySelectorAll<HTMLElement>("[data-t]").forEach((el) => {
    const key = el.dataset.t as keyof typeof T;
    const waarde = T[key];
    if (typeof waarde === "string") el.textContent = waarde;
  });
  document.querySelectorAll<HTMLElement>("[data-t-placeholder]").forEach((el) => {
    const key = el.dataset.tPlaceholder as keyof typeof T;
    const waarde = T[key];
    if (typeof waarde === "string") (el as HTMLInputElement | HTMLTextAreaElement).placeholder = waarde;
  });
  document.querySelectorAll<HTMLElement>("[data-t-aria]").forEach((el) => {
    const key = el.dataset.tAria as keyof typeof T;
    const waarde = T[key];
    if (typeof waarde === "string") el.setAttribute("aria-label", waarde);
  });
  if (teller && veld) teller.textContent = `${veld.value.length} / ${MAX_TEKST} ${T.tekens}`;
}

function pasVoorWieLabelToe() {
  if (!voorWieWrap) return;
  const eersteSpan = voorWieWrap.querySelector("label:first-child span");
  if (eersteSpan) eersteSpan.textContent = T.allen;
}

function pasTaalToe(nieuw: Taal) {
  taal = nieuw;
  T = TEKST[taal];
  document.documentElement.lang = taal;
  document.title = T.titel;
  bewaarTaal(taal);
  taalKnoppen.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.taal === taal)));

  pasStatischeTekstToe();
  pasVoorWieLabelToe();
  initHint();
  if (event) renderLijst(laatsteVragen);
  else {
    const geenEventNote = document.getElementById("vragen-geen");
    if (geenEventNote) geenEventNote.textContent = T.geenEvent;
  }
}

// nl hoort bij /vragen, en/fr horen bij /questions: bij een taal uit de andere
// groep navigeren we naar die pagina in plaats van de tekst hier te vervangen.
const PAD_VOOR_TAALGROEP: Record<Taal, string> = { nl: "/vragen", en: "/questions", fr: "/questions" };
const huidigPad = location.pathname.replace(/\/$/, "") || "/";

taalKnoppen.forEach((b) =>
  b.addEventListener("click", () => {
    const gekozen = leesTaal(b.dataset.taal);
    const doelPad = PAD_VOOR_TAALGROEP[gekozen];
    if (doelPad !== huidigPad) {
      bewaarTaal(gekozen);
      location.href = doelPad;
      return;
    }
    pasTaalToe(gekozen);
  }),
);

let poller: { pollNu: () => void } | null = null;

if (!event) {
  if (main) {
    const cols = main.querySelector(".cols");
    if (cols) {
      cols.innerHTML = `<p class="empty-note" id="vragen-geen">${T.geenEvent}</p>`;
    }
  }
} else {
  if (titel) titel.textContent = event.title;
  if (subtitel) subtitel.textContent = event.subtitle ?? "";

  if (voorWieWrap) {
    // "Allen" blijft de waarde in elke taal, normaliseerVoorWie maakt er null van.
    const namen = ["Allen", ...event.speakers];
    voorWieWrap.innerHTML = namen
      .map(
        (n, i) =>
          `<label><input type="radio" name="voor_wie" value="${escapeHtml(n)}"${i === 0 ? " checked" : ""}><span>${escapeHtml(i === 0 ? T.allen : n)}</span></label>`,
      )
      .join("");
  }

  initHint();
  // Meteen renderen met de (lege) starttoestand, niet wachten tot de eerste poll
  // binnen is - anders blijft "nog geen vragen" ten onrechte verborgen (statische
  // hidden uit de template) totdat het netwerk voor het eerst antwoordt.
  renderLijst(laatsteVragen);

  poller = startPoller<PubliekAntwoord>({
    url: (versie) =>
      `/api/vragen?event=${encodeURIComponent(event.slug)}${versie !== null ? `&versie=${versie}` : ""}`,
    intervalMs: 15000,
    onData: (data) => renderLijst(data.vragen),
  });
}

// Server-render was in paginaDefault; als de begintaal daarvan afwijkt, meteen aanpassen.
if (taal !== paginaDefault) pasTaalToe(taal);
else taalKnoppen.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.taal === taal)));

function toonFout(bericht: string) {
  if (!hint) return;
  hint.textContent = bericht;
  hint.hidden = false;
  if (ok) ok.hidden = true;
}

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!event || !veld || !submitBtn) return;

  const tekst = normaliseerTekst(veld.value);
  const naamVeld = form.elements.namedItem("naam") as HTMLInputElement | null;
  const voorWieVeld = form.querySelector('input[name="voor_wie"]:checked') as HTMLInputElement | null;
  const naam = normaliseerNaam(naamVeld?.value);
  const voorWie = normaliseerVoorWie(voorWieVeld?.value ?? "");

  const fout = valideerVraag(tekst, naam, voorWie, event.speakers, taal);
  if (fout) {
    toonFout(fout.error);
    return;
  }

  submitBtn.disabled = true;
  try {
    const res = await fetch("/api/vragen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: event.slug, tekst, naam, voor_wie: voorWie, taal }),
    });
    const data = await res.json();
    if (!res.ok) {
      toonFout(data.error ?? T.fout);
      return;
    }
    veld.value = "";
    groei();
    if (hint) hint.hidden = true;
    if (ok) {
      ok.textContent = T.ok(waar());
      ok.hidden = false;
    }
    poller?.pollNu();
  } catch {
    toonFout(T.netwerk);
  } finally {
    submitBtn.disabled = false;
  }
});
