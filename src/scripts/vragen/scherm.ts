import type { Vraag, VragenEvent } from "../../lib/vragen";
import { huidigEvent, escapeHtml, vragenKanaal } from "./client";

interface SchermAntwoord {
  versie: number;
  vragen: Vraag[];
  ongewijzigd?: boolean;
}

const event = huidigEvent();
const main = document.getElementById("main") as HTMLElement | null;
const footerTitle = document.getElementById("footer-title");
const footerSub = document.getElementById("footer-sub");

const meta = (q: Vraag) => escapeHtml(`${q.naam ?? "anoniem"}${q.voor_wie ? ` · voor ${q.voor_wie}` : ""}`);

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
    more.textContent = `+ ${hidden} andere ${hidden === 1 ? "vraag" : "vragen"}`;
  });
}

let curStart = 3.4;

function render(vragen: Vraag[]) {
  if (!main) return;
  const zichtbaar = vragen.filter((q) => q.status !== "beantwoord" && q.status !== "verborgen");
  const oudsteEerst = [...zichtbaar].sort((a, b) => a.id - b.id);
  const cur = oudsteEerst.filter((q) => q.status === "nu");
  const rest = oudsteEerst.filter((q) => q.status !== "nu");

  let html: string;
  if (!zichtbaar.length) {
    html = `<div class="empty"><div><div class="big">Nog geen vragen.</div><div class="sub">Scan de code rechtsonder en stel de eerste.</div></div></div>`;
  } else {
    const left = cur.length
      ? `<div class="kicker">nu</div>${curHtml(cur)}`
      : `<div class="invite"><div class="big">Vragen uit de zaal</div><div class="sub">Stel je vraag liever niet hardop? Stuur ze online, bijvoorbeeld via je smartphone.</div></div>`;
    html = `<div class="b"><div class="left">${left}</div><div class="right"><div class="kicker">${cur.length ? "volgende" : "binnengekomen"}</div>${listHtml(rest)}</div></div>`;
  }
  main.innerHTML = html;

  curStart = cur.length > 1 ? 2.7 : 3.4;
  fitCurrent(main, curStart);
  fitQueue(main);
}

function vulFooter(ev: VragenEvent) {
  if (footerTitle) footerTitle.textContent = ev.title;
  if (footerSub) footerSub.textContent = ev.subtitle ?? "";
}

if (!event) {
  if (main) {
    main.innerHTML =
      '<div class="empty"><div><div class="big">Geen actieve activiteit.</div></div></div>';
  }
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
  vragenKanaal()?.addEventListener("message", (e: MessageEvent<{ event?: string; vragen?: Vraag[] }>) => {
    if (e.data?.event === event!.slug && Array.isArray(e.data.vragen)) render(e.data.vragen);
  });
  window.addEventListener("resize", () => {
    if (!main) return;
    fitCurrent(main, curStart);
    fitQueue(main);
  });
}
