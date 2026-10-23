// Voetnoot-popover voor markdown-voetnoten ([^1]): hover of focus op het nummer toont de
// tekst van die ene noot naast de tekst, zonder naar onderen te springen. Op een
// aanraakscherm opent de eerste tik de popover en volgt een tweede tik de link naar de noot.
// Escape, een klik ernaast of wegbewegen sluit. De popover staat buiten de flow (absolute),
// dus er verschuift niets.
(() => {
  const refs = [...document.querySelectorAll('a[data-footnote-ref]')];
  if (refs.length === 0) return;

  const pop = document.createElement('div');
  pop.className = 'fn-popover';
  pop.id = 'fn-popover';
  pop.setAttribute('role', 'tooltip');
  pop.hidden = true;
  document.body.append(pop);

  const GUTTER = 16;
  let current = null;
  let hideTimer = 0;

  const noteHtml = ref => {
    const li = document.getElementById(decodeURIComponent(ref.hash.slice(1)));
    if (!li) return '';
    const copy = li.cloneNode(true);
    copy.querySelectorAll('[data-footnote-backref]').forEach(a => a.remove());
    return copy.innerHTML;
  };

  const place = ref => {
    const r = ref.getBoundingClientRect();
    const width = pop.offsetWidth;
    const maxLeft = document.documentElement.clientWidth - width - GUTTER;
    // Binnen de tekstkolom houden, niet over de zijbalk.
    const column = ref.closest('article')?.getBoundingClientRect();
    const minLeft = Math.max(GUTTER, Math.min(column?.left ?? GUTTER, maxLeft));
    const left = Math.max(minLeft, Math.min(r.left + r.width / 2 - width / 2, maxLeft));
    const below = r.bottom + 8;
    const fitsBelow = below + pop.offsetHeight < window.innerHeight;
    const top = fitsBelow ? below : r.top - pop.offsetHeight - 8;
    pop.style.left = `${left + window.scrollX}px`;
    pop.style.top = `${Math.max(top, GUTTER) + window.scrollY}px`;
  };

  const show = ref => {
    clearTimeout(hideTimer);
    if (current === ref) return;
    const html = noteHtml(ref);
    if (!html) return;
    current?.setAttribute('aria-describedby', 'footnote-label');
    current = ref;
    pop.innerHTML = html;
    pop.hidden = false;
    ref.setAttribute('aria-describedby', pop.id);
    place(ref);
  };

  const hide = () => {
    clearTimeout(hideTimer);
    current?.setAttribute('aria-describedby', 'footnote-label');
    current = null;
    pop.hidden = true;
  };

  // Even wachten, zodat de muis van het nummer naar de popover kan (voor links in de noot).
  const hideSoon = () => {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(hide, 200);
  };

  for (const ref of refs) {
    ref.addEventListener('mouseenter', () => show(ref));
    ref.addEventListener('mouseleave', hideSoon);
    ref.addEventListener('focus', () => show(ref));
    ref.addEventListener('blur', hideSoon);
    // Een tik vuurt ook mouseenter af, dus onthoud of de popover al open stond vóór de tik.
    let wasOpen = false;
    let touched = false;
    ref.addEventListener('pointerdown', event => {
      touched = event.pointerType !== 'mouse';
      wasOpen = current === ref;
    });
    ref.addEventListener('click', event => {
      if (touched && !wasOpen) {
        event.preventDefault();
        show(ref);
      }
    });
  }

  pop.addEventListener('mouseenter', () => clearTimeout(hideTimer));
  pop.addEventListener('mouseleave', hideSoon);
  pop.addEventListener('focusin', () => clearTimeout(hideTimer));
  pop.addEventListener('focusout', hideSoon);

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && current) hide();
  });
  document.addEventListener('pointerdown', event => {
    if (current && !pop.contains(event.target) && !current.contains(event.target)) hide();
  });
  window.addEventListener('resize', () => current && place(current));
})();
