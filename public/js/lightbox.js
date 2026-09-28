// Minimale lightbox voor [data-lightbox]-links: klik opent de afbeelding groot,
// pijltjes (knoppen en toetsen) bladeren, Escape/klik naast de afbeelding sluit.
// Is het origineel groter dan het scherm, dan kan er ingezoomd worden, in twee niveaus:
// schermbreed (een klik op de afbeelding) en ware grootte (de zoomknop daarna). Een klik op
// de ingezoomde afbeelding zet haar terug. Knijpen op de trackpad, Ctrl/Cmd+scrollwiel of
// +/- zoomen ook; slepen of scrollen verschuift.
(() => {
  const dialog = document.querySelector('dialog.lightbox');
  const links = [...document.querySelectorAll('a[data-lightbox]')];
  if (!dialog || links.length === 0) return;

  const img = dialog.querySelector('img');
  const stage = dialog.querySelector('.lightbox-stage');
  const zoomInBtn = dialog.querySelector('[data-zoom-in]');
  let index = 0;

  // scale is relatief t.o.v. de passende grootte (1); maxScale is ware grootte,
  // widthScale is zo breed als de ruimte tussen de bladerpijlen.
  let scale = 1;
  let fitW = 0;
  let fitH = 0;
  let maxScale = 1;
  let widthScale = 1;

  // Zoomniveaus: schermbreed (als dat merkbaar groter is dan passend) en ware grootte.
  const levels = () => (widthScale > 1.05 && widthScale < maxScale / 1.05)
    ? [widthScale, maxScale]
    : [maxScale];

  // De zoomknop wordt grijs op ware grootte.
  const updateButtons = () => {
    zoomInBtn.disabled = scale >= maxScale;
  };

  const measure = () => {
    if (scale !== 1 || !img.naturalWidth) return;
    fitW = img.clientWidth;
    fitH = img.clientHeight;
    maxScale = Math.max(1, img.naturalWidth / fitW);
    const cs = getComputedStyle(stage);
    const roomW = stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    widthScale = Math.min(maxScale, roomW / fitW);
    dialog.classList.toggle('can-zoom', maxScale > 1.05);
    updateButtons();
  };

  const unzoom = () => {
    scale = 1;
    img.style.width = '';
    img.style.height = '';
    dialog.classList.remove('is-zoomed');
    updateButtons();
  };

  // Zoom naar een niveau; het punt onder (cx, cy) blijft op zijn plaats staan.
  const zoomTo = (next, cx, cy) => {
    if (!dialog.classList.contains('can-zoom')) return;
    next = Math.min(maxScale, Math.max(1, next));
    if (next === scale) return;
    if (cx === undefined) {
      const s = stage.getBoundingClientRect();
      cx = s.left + s.width / 2;
      cy = s.top + s.height / 2;
    }
    const before = img.getBoundingClientRect();
    const fx = (cx - before.left) / before.width;
    const fy = (cy - before.top) / before.height;
    if (next === 1) {
      unzoom();
      return;
    }
    scale = next;
    dialog.classList.add('is-zoomed');
    img.style.width = `${fitW * scale}px`;
    img.style.height = `${fitH * scale}px`;
    const after = img.getBoundingClientRect();
    stage.scrollLeft += after.left + fx * after.width - cx;
    stage.scrollTop += after.top + fy * after.height - cy;
    updateButtons();
  };

  img.addEventListener('load', measure);

  // Slepen verschuift; een sleepbeweging telt daarna niet als klik.
  let drag = null;
  img.addEventListener('pointerdown', (e) => {
    if (scale === 1 || e.pointerType !== 'mouse') return;
    e.preventDefault();
    drag = { x: e.clientX, y: e.clientY, left: stage.scrollLeft, top: stage.scrollTop, moved: false };
    img.setPointerCapture(e.pointerId);
  });
  img.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) {
      drag.moved = true;
      dialog.classList.add('is-dragging');
    }
    stage.scrollLeft = drag.left - dx;
    stage.scrollTop = drag.top - dy;
  });
  const endDrag = () => {
    dialog.classList.remove('is-dragging');
    // Pas na de click-event wissen, zodat die weet dat er gesleept is.
    setTimeout(() => { drag = null; });
  };
  img.addEventListener('pointerup', endDrag);
  img.addEventListener('pointercancel', endDrag);

  img.addEventListener('click', (e) => {
    if (drag?.moved) return;
    // Zoals PhotoSwipe ('zoom-or-close'): valt er niets te zoomen, dan sluit een klik.
    if (!dialog.classList.contains('can-zoom')) {
      dialog.close();
      return;
    }
    // Een klik gaat naar het eerste zoomniveau (schermbreed), of terug naar passend.
    zoomTo(scale === 1 ? levels()[0] : 1, e.clientX, e.clientY);
  });

  // De zoomknop (en +/-) loopt de niveaus af. Tussen twee niveaus (na knijpen) gaat het
  // naar het volgende.
  const stepTo = (dir) => {
    const all = [1, ...levels()];
    const next = dir > 0
      ? all.find((l) => l > scale * 1.01)
      : all.filter((l) => l < scale / 1.01).pop();
    if (next !== undefined) zoomTo(next);
  };
  zoomInBtn.addEventListener('click', () => stepTo(1));

  // Knijpen op de trackpad komt binnen als wheel met ctrlKey, net als Ctrl+scrollwiel.
  // Op macOS vangt het systeem Ctrl+scrollwiel soms zelf af, daarom ook Cmd.
  stage.addEventListener('wheel', (e) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    zoomTo(scale * Math.exp(-e.deltaY * 0.01), e.clientX, e.clientY);
  }, { passive: false });

  const show = (i) => {
    unzoom();
    dialog.classList.remove('can-zoom');
    index = (i + links.length) % links.length;
    const link = links[index];
    img.src = link.href;
    img.alt = link.querySelector('img')?.alt ?? '';
    if (img.complete) measure();
  };

  links.forEach((link, i) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      show(i);
      dialog.showModal();
      measure();
      // Focus op de dialog zelf, niet op de sluitknop (anders staat er meteen een focusring).
      dialog.focus();
    });
  });

  dialog.querySelector('[data-prev]')?.addEventListener('click', () => show(index - 1));
  dialog.querySelector('[data-next]')?.addEventListener('click', () => show(index + 1));
  dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', unzoom);
  window.addEventListener('resize', () => {
    unzoom();
    measure();
  });

  // Klik op de achtergrond (niet op afbeelding of knop) sluit.
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog || e.target.classList.contains('lightbox-stage')) dialog.close();
  });

  document.addEventListener('keydown', (e) => {
    if (!dialog.open) return;
    if (e.key === '+' || e.key === '=') stepTo(1);
    if (e.key === '-') stepTo(-1);
    if (links.length < 2) return;
    if (e.key === 'ArrowLeft') show(index - 1);
    if (e.key === 'ArrowRight') show(index + 1);
  });
})();
