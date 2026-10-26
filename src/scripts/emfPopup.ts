// Close button inside a calendar dropdown (<details data-emf-popup-root>).
// Shared by AddToCalendarDropdown and SubscribeCalendarDropdown, so the listener is registered once.
document.addEventListener('click', event => {
  const closeButton = event.target instanceof Element
    ? event.target.closest('[data-emf-popup-close]')
    : null;

  if (!(closeButton instanceof HTMLElement)) return;
  closeButton.closest('[data-emf-popup-root]')?.removeAttribute('open');
});
