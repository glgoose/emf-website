// Minimale lightbox voor [data-lightbox]-links: klik opent de afbeelding groot,
// pijltjes (knoppen en toetsen) bladeren, Escape/klik naast de afbeelding sluit.
(() => {
  const dialog = document.querySelector('dialog.lightbox');
  const links = [...document.querySelectorAll('a[data-lightbox]')];
  if (!dialog || links.length === 0) return;

  const img = dialog.querySelector('img');
  let index = 0;

  const show = (i) => {
    index = (i + links.length) % links.length;
    const link = links[index];
    img.src = link.href;
    img.alt = link.querySelector('img')?.alt ?? '';
  };

  links.forEach((link, i) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      show(i);
      dialog.showModal();
      // Focus op de dialog zelf, niet op de sluitknop (anders staat er meteen een focusring).
      dialog.focus();
    });
  });

  dialog.querySelector('[data-prev]')?.addEventListener('click', () => show(index - 1));
  dialog.querySelector('[data-next]')?.addEventListener('click', () => show(index + 1));
  dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());

  // Klik op de achtergrond (niet op afbeelding of knop) sluit.
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog || e.target.classList.contains('lightbox-stage')) dialog.close();
  });

  document.addEventListener('keydown', (e) => {
    if (!dialog.open || links.length < 2) return;
    if (e.key === 'ArrowLeft') show(index - 1);
    if (e.key === 'ArrowRight') show(index + 1);
  });
})();
