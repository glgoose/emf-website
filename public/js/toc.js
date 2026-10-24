// Inhoudsopgave van een artikel (ArticleToc.astro): de zijbalklijn met voortgang
// (.tl, ≥1024px) en de lopende kop (.rh, <1024px).
(() => {
  const all = [...document.querySelectorAll('.prose h2[id], .prose h3[id]')].filter(h => h.id !== 'footnote-label');
  const TOP = all.some(h => h.tagName === 'H2') ? 'H2' : 'H3';
  const tops = all.filter(h => h.tagName === TOP);
  const top = el => el.getBoundingClientRect().top + scrollY;
  const MARGIN = all[0] ? parseFloat(getComputedStyle(all[0]).scrollMarginTop) || 0 : 0;
  const id = a => decodeURIComponent(a.hash.slice(1)); // a.hash is percent-encoded (French ids have accents)
  const state = () => {
    const y = scrollY + MARGIN + 1;
    let h = null; for (const x of all) if (top(x) <= y) h = x;
    let p = -1; tops.forEach((x, i) => { if (top(x) <= y) p = i; });
    return { h, p, y };
  };
  // "back to top" shows after scrolling up more than 60px, and hides after scrolling down more
  // than 150px in one go, so a nudge or trackpad overshoot does not take it away;
  // the spine also shows it at the very bottom of the page. It first appears below the first
  // viewport, then stays while the nav is still stuck: it goes when the nav starts to move.
  const upToggle = (nav, atEnd) => {
    let last = scrollY, up = 0, down = 0, on = false, vis = false;
    const root = document.documentElement;
    const stuck = () => nav.getBoundingClientRect().top <= parseFloat(getComputedStyle(nav).top) + 1;
    const render = () => {
      const want = on || (atEnd && scrollY + innerHeight >= root.scrollHeight - 40);
      vis = want && (scrollY >= innerHeight || (vis && stuck()));
      nav.classList.toggle('is-up', vis);
    };
    addEventListener('scroll', () => {
      const d = scrollY - last; last = scrollY;
      if (d < 0) { up -= d; down = 0; if (up > 60) on = true; }
      else if (d > 0) { up = 0; down += d; if (down > 150) on = false; }
      render();
    }, { passive: true });
    render();
  };
  // "back to top" is a button, not a #top link: it leaves no fragment in the URL. A #top
  // that is already in the URL (a link shared before this) is removed on load.
  if (location.hash === '#top') history.replaceState(null, '', location.pathname + location.search);
  document.querySelectorAll('[data-top]').forEach(b => b.addEventListener('click', () => scrollTo({ top: 0 })));
  document.querySelectorAll('.toc').forEach(nav => {
  const mark = (sel, h) => nav.querySelectorAll(sel).forEach(a => id(a) === h ? a.setAttribute('aria-current', 'location') : a.removeAttribute('aria-current'));

  if (nav.classList.contains('tl')) {
    const rows = [...nav.querySelectorAll('.tl-row')];
    const heads = rows.map(r => document.getElementById(id(r)));
    const track = nav.querySelector('.tl-track'), fill = nav.querySelector('.tl-fill');
    const prose = document.querySelector('.prose');
    const TAIL = 14; // the track runs a little past the last tick
    const RUN = 32;  // scroll left below the last heading, over which the fill covers TAIL
    // and a little before the first tick when text precedes the first heading; the fill
    // covers it while that intro is read, from the intro's first paragraph to the first heading
    const intro = heads[0] && [...prose.querySelectorAll('p')].find(p => !p.closest('.not-prose')
      && p.compareDocumentPosition(heads[0]) & Node.DOCUMENT_POSITION_FOLLOWING);
    const HEAD = intro ? 14 : 0;
    const start = () => Math.max(0, top(intro) - MARGIN);
    // the two ends of the line are clickable: the top one to the start of the text, the bottom one to the end
    const capStart = nav.querySelector('.tl-cap-start');
    if (HEAD) capStart.style.height = `${HEAD}px`; else capStart.remove();
    nav.querySelectorAll('[data-cap]').forEach(c => c.addEventListener('click', () =>
      scrollTo({ top: c.dataset.cap === 'start' ? start() : document.documentElement.scrollHeight })));
    // Every position is read when it is used, never cached, so resizes, font swaps and
    // rewrapped labels need no bookkeeping. The click contract: at the scroll position where
    // heading i sits at its scroll-margin-top, the fill ends exactly on tick i.
    const ticks = () => {
      const n = nav.getBoundingClientRect().top;
      return rows.map(r => r.getBoundingClientRect().top - n + parseFloat(getComputedStyle(r).fontSize) * 0.68);
    };
    const stops = () => heads.map(h => top(h) - MARGIN);
    // Room below the article so the last heading can scroll to its spot, with RUN to spare
    // for the tail. Only on layout changes, not on scroll; padding below the text moves no heading.
    const room = () => {
      const on = nav.offsetParent !== null;
      const cur = parseFloat(prose.style.paddingBottom) || 0;
      const max = document.documentElement.scrollHeight - innerHeight - cur;
      const need = on ? Math.ceil(Math.max(0, stops().at(-1) + RUN - max)) : 0;
      if (need !== cur) prose.style.paddingBottom = need ? `${need}px` : '';
    };
    const clamp = v => Math.min(1, Math.max(0, v));
    const upd = () => {
      if (nav.offsetParent === null) return;
      const T = ticks(), P = stops(), L = T.length - 1;
      const s = scrollY, max = document.documentElement.scrollHeight - innerHeight;
      let i = -1; P.forEach((v, j) => { if (v <= s + 1) i = j; });
      const S0 = HEAD ? start() : 0;
      const px = i < 0 ? (P[0] > S0 ? clamp((s - S0) / (P[0] - S0)) : 1) * HEAD
        : HEAD + (i < L ? T[i] - T[0] + (P[i + 1] > P[i] ? clamp((s - P[i]) / (P[i + 1] - P[i])) : 1) * (T[i + 1] - T[i])
        : T[L] - T[0] + (max > P[L] ? clamp((s - P[L]) / (max - P[L])) : 1) * TAIL);
      const tt = `${T[0] - HEAD}px`, th = `${T[L] - T[0] + TAIL + HEAD}px`, fh = `${px}px`;
      if (track.style.top !== tt) track.style.top = tt;
      if (track.style.height !== th) track.style.height = th;
      if (fill.style.height !== fh) fill.style.height = fh;
      rows.forEach((r, j) => {
        r.classList.toggle('is-past', j <= i);
        j === i ? r.setAttribute('aria-current', 'location') : r.removeAttribute('aria-current');
      });
      const cur = rows[i];
      const part = cur && cur.closest('.tl-part').querySelector('.tl-title');
      nav.querySelectorAll('.tl-title').forEach(t => t.classList.toggle('is-in', t === part));
    };
    let queued = false;
    const frame = (layout) => {
      if (layout) room();
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; upd(); });
    };
    // The spine shows once the sidebar heading above it (type, "lezing gegeven op …") has
    // scrolled out of view; until then it keeps its place but is transparent (global.css).
    const head = nav.previousElementSibling;
    if (head) new IntersectionObserver(([e]) => nav.classList.toggle('is-shown', !e.isIntersecting)).observe(head);
    else nav.classList.add('is-shown');
    room(); upd(); upToggle(nav, true);
    addEventListener('scroll', () => frame(false), { passive: true });
    addEventListener('resize', () => frame(true));
    new ResizeObserver(() => frame(true)).observe(nav);
    new ResizeObserver(() => frame(true)).observe(prose);
    document.fonts && document.fonts.ready.then(() => frame(true));
  }

  if (nav.classList.contains('rh')) {
    const bar = nav.querySelector('.rh-bar'), panel = nav.querySelector('.rh-panel');
    const pn = nav.querySelector('.rh-part-now'), sn = nav.querySelector('.rh-sec-now');
    const titles = [...nav.querySelectorAll('.rh-ptitle span:first-child')].map(s => s.textContent);
    const upd = () => {
      const { h, p } = state();
      pn.textContent = p < 0 ? nav.dataset.label : titles[p];
      sn.textContent = h && h.tagName !== TOP ? nav.querySelector(`.rh-panel a[href="#${h.id}"]`).textContent : '';
      mark('.rh-panel a', h ? h.id : '');
    };
    const set = open => { bar.setAttribute('aria-expanded', open); panel.hidden = !open; };
    bar.addEventListener('click', () => set(panel.hidden));
    panel.addEventListener('click', ev => { if (ev.target.closest('a')) set(false); });
    document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && !panel.hidden) { set(false); bar.focus(); } });
    document.addEventListener('pointerdown', ev => { if (!nav.contains(ev.target)) set(false); });
    upd(); addEventListener('scroll', upd, { passive: true });
    upToggle(nav, false);
  }
  });
})();
