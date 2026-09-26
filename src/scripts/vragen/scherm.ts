import { leesTaal, metaTekst, type Taal, type Vraag, type VragenEvent } from "../../lib/vragen";
import { huidigEvent, escapeHtml, vragenKanaal, leesSchermTaal } from "./client";

interface SchermAntwoord {
  versie: number;
  vragen: Vraag[];
  ongewijzigd?: boolean;
}

const event = huidigEvent();
const main = document.getElementById("main") as HTMLElement | null;
const footerTitle = document.getElementById("footer-title");
const footerSub = document.getElementById("footer-sub");

const TEKST = {
  nl: {
    nu: "nu",
    volgende: "volgende",
    binnengekomen: "binnengekomen",
    meer: (n: number) => `+ ${n} andere ${n === 1 ? "vraag" : "vragen"}`,
    leeg: "Nog geen vragen.",
    leegSub: "Scan de code rechtsonder en stel de eerste.",
    uitnodiging: "Vragen uit de zaal",
    uitnodigingSub: "Stel je vraag liever niet hardop? Stuur ze online, bijvoorbeeld via je smartphone.",
    geenEvent: "Geen actieve activiteit.",
  },
  en: {
    nu: "now",
    volgende: "next",
    binnengekomen: "incoming",
    meer: (n: number) => `+ ${n} more ${n === 1 ? "question" : "questions"}`,
    leeg: "No questions yet.",
    leegSub: "Scan the code at the bottom right and ask the first one.",
    uitnodiging: "Questions from the floor",
    uitnodigingSub: "Rather not ask your question out loud? Send it online, for instance from your smartphone.",
    geenEvent: "No active event.",
  },
  fr: {
    nu: "en cours",
    volgende: "suivante",
    binnengekomen: "reçues",
    meer: (n: number) => `+ ${n} autre${n === 1 ? "" : "s"} question${n === 1 ? "" : "s"}`,
    leeg: "Pas encore de questions.",
    leegSub: "Scannez le code en bas à droite et posez la première.",
    uitnodiging: "Questions de la salle",
    uitnodigingSub: "Vous préférez ne pas poser votre question à voix haute ? Envoyez-la en ligne, par exemple depuis votre smartphone.",
    geenEvent: "Aucune activité en cours.",
  },
};

// URL-parameter voor een scherm op een andere machine, anders de keuze uit beheer in deze browser.
const urlTaal = new URLSearchParams(location.search).get("lang");
let taal: Taal = urlTaal ? leesTaal(urlTaal) : (leesSchermTaal() ?? "nl");
let T = TEKST[taal];

const meta = (q: Vraag) => escapeHtml(metaTekst(q.naam, q.voor_wie, taal));

function curHtml(qs: Vraag[]): string {
  return `<div class="current">${qs
    .map(
      (q) =>
        `<div class="q"><div class="text">${escapeHtml(q.tekst)}</div><div class="meta">${meta(q)}</div></div>`,
    )
    .join("")}</div>`;
}

function listHtml(qs: Vraag[], curIds: number[] = []): string {
  return `<ul class="queue">${qs
    .map(
      (q) =>
        `<li class="${curIds.includes(q.id) ? "is-current" : ""}"><div class="text">${escapeHtml(q.tekst)}</div><div class="meta">${meta(q)}</div></li>`,
    )
    .join("")}</ul><div class="more" hidden></div>`;
}

// Never truncate the current question: shrink the type until the whole left column fits.
function fitCurrent(root: HTMLElement, start: number) {
  const left = root.querySelector(".b .left") as HTMLElement | null;
  if (!left?.querySelector(".current")) return;
  let size = start;
  root.style.setProperty("--cur-size", `${size}cqw`);
  while (left.scrollHeight > left.clientHeight + 1 && size > 1.2) {
    size = Math.round((size - 0.1) * 10) / 10;
    root.style.setProperty("--cur-size", `${size}cqw`);
  }
}

// Oldest on top, so the newest drop off the end first until the list fits; show "+ N andere vragen".
function fitQueue(root: HTMLElement) {
  root.querySelectorAll(".queue").forEach((ulEl) => {
    const ul = ulEl as HTMLElement;
    const more = ul.nextElementSibling as HTMLElement | null;
    if (!more) return;
    const total = ul.children.length;
    more.hidden = false;
    const fits = () => ul.scrollHeight <= ul.clientHeight + 1;
    while (!fits()) {
      const drop = [...ul.children].reverse().find((li) => !li.classList.contains("is-current"));
      if (!drop) break;
      drop.remove();
    }
    const hidden = total - ul.children.length;
    more.hidden = hidden === 0;
    more.textContent = T.meer(hidden);
  });
}

let curStart = 3.0;
let laatste: Vraag[] | null = null;

function render(vragen: Vraag[]) {
  if (!main) return;
  laatste = vragen;
  const zichtbaar = vragen.filter((q) => q.status !== "beantwoord" && q.status !== "verborgen");
  const oudsteEerst = [...zichtbaar].sort((a, b) => a.id - b.id);
  const cur = oudsteEerst.filter((q) => q.status === "nu");
  const rest = oudsteEerst.filter((q) => q.status !== "nu");

  let html: string;
  if (!zichtbaar.length) {
    html = `<div class="empty"><div><div class="big">${T.leeg}</div><div class="sub">${T.leegSub}</div></div></div>`;
  } else {
    const left = cur.length
      ? `<div class="kicker">${T.nu}</div>${curHtml(cur)}`
      : `<div class="invite"><div class="big">${T.uitnodiging}</div><div class="sub">${T.uitnodigingSub}</div></div>`;
    html = `<div class="b"><div class="left">${left}</div><div class="right"><div class="kicker">${cur.length ? T.volgende : T.binnengekomen}</div>${listHtml(rest)}</div></div>`;
  }
  main.innerHTML = html;

  curStart = cur.length > 1 ? 2.5 : 3.0;
  fitCurrent(main, curStart);
  fitQueue(main);
}

function vulFooter(ev: VragenEvent) {
  if (footerTitle) footerTitle.textContent = ev.title;
  if (footerSub) footerSub.textContent = ev.subtitle ?? "";
}

function renderGeenEvent() {
  if (main) main.innerHTML = `<div class="empty"><div><div class="big">${T.geenEvent}</div></div></div>`;
}

function zetTaal(nieuw: Taal) {
  taal = nieuw;
  T = TEKST[taal];
  document.documentElement.lang = taal;
  // FR heeft geen eigen QR-blok: het toont hetzelfde /questions-blok als EN.
  const askTaal = taal === "fr" ? "en" : taal;
  document.querySelectorAll<HTMLElement>(".footer .ask").forEach((el) => {
    el.hidden = el.dataset.taal !== askTaal;
  });
  // Een herlaad van dit venster houdt de taal die beheer laatst koos.
  const url = new URL(location.href);
  url.searchParams.set("lang", taal);
  history.replaceState(null, "", url);
  if (!event) renderGeenEvent();
  else if (laatste) render(laatste);
}

zetTaal(taal);

if (!event) {
  vragenKanaal()?.addEventListener("message", (e: MessageEvent<{ taal?: string }>) => {
    if (e.data?.taal) zetTaal(leesTaal(e.data.taal));
  });
} else {
  vulFooter(event);

  let versie: number | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  async function poll() {
    try {
      const res = await fetch(
        `/api/vragen?event=${encodeURIComponent(event!.slug)}${versie !== null ? `&versie=${versie}` : ""}`,
        { cache: "no-store" },
      );
      if (res.ok) {
        const data: SchermAntwoord = await res.json();
        versie = data.versie;
        if (!data.ongewijzigd) render(data.vragen);
      }
    } catch {
      // netwerkfout: stil opnieuw proberen
    }
    schedule();
  }

  function schedule() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(poll, 4000);
  }

  poll();
  vragenKanaal()?.addEventListener(
    "message",
    (e: MessageEvent<{ event?: string; vragen?: Vraag[]; taal?: string }>) => {
      if (e.data?.taal) zetTaal(leesTaal(e.data.taal));
      if (e.data?.event === event!.slug && Array.isArray(e.data.vragen)) render(e.data.vragen);
    },
  );
  window.addEventListener("resize", () => {
    if (!main) return;
    fitCurrent(main, curStart);
    fitQueue(main);
  });
}
