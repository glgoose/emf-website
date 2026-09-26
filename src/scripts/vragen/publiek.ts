import {
  MAX_TEKST,
  normaliseerNaam,
  normaliseerTekst,
  normaliseerVoorWie,
  valideerVraag,
  metaTekst,
  leesTaal,
  type Vraag,
} from "../../lib/vragen";
import { huidigEvent, startPoller, escapeHtml } from "./client";

interface PubliekAntwoord {
  versie: number;
  vragen: Vraag[];
  ongewijzigd?: boolean;
}

const taal = leesTaal(document.documentElement.lang);
const T = {
  nl: {
    hiernaast: "hiernaast",
    hieronder: "hieronder",
    hint: (waar: string) => `Je vraag verschijnt meteen in de lijst ${waar} en op het scherm in de zaal.`,
    ok: (waar: string) => `Verstuurd, dank je. Je vraag staat in de lijst ${waar}.`,
    tekens: "tekens",
    nu: "nu",
    beantwoord: "beantwoord",
    allen: "Allen",
    geenEvent: "Op dit moment is er geen activiteit waarvoor je een vraag kan insturen.",
    fout: "Er ging iets mis. Probeer opnieuw.",
    netwerk: "Netwerkfout. Probeer later opnieuw.",
  },
  en: {
    hiernaast: "on the right",
    hieronder: "below",
    hint: (waar: string) => `Your question appears right away in the list ${waar} and on the screen in the room.`,
    ok: (waar: string) => `Sent, thank you. Your question is in the list ${waar}.`,
    tekens: "characters",
    nu: "now",
    beantwoord: "answered",
    allen: "Everyone",
    geenEvent: "There is currently no event for which you can submit a question.",
    fout: "Something went wrong. Please try again.",
    netwerk: "Network error. Please try again later.",
  },
}[taal];

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

function renderLijst(vragen: Vraag[]) {
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

let poller: { pollNu: () => void } | null = null;

if (!event) {
  if (main) {
    main.innerHTML = `<p class="empty-note">${T.geenEvent}</p>`;
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

  poller = startPoller<PubliekAntwoord>({
    url: (versie) =>
      `/api/vragen?event=${encodeURIComponent(event.slug)}${versie !== null ? `&versie=${versie}` : ""}`,
    intervalMs: 15000,
    onData: (data) => renderLijst(data.vragen),
  });
}

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
