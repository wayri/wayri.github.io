(() => {
  'use strict';
  const root = document.querySelector('#public-examples');
  if (!root) return;
  function close(card) {
    card.querySelector('[data-example-host]').replaceChildren();
    card.querySelector('[data-example-host]').hidden = true;
    const button = card.querySelector('[data-public-example]');
    if (button.dataset.closedLabel) button.textContent = button.dataset.closedLabel;
    button.setAttribute('aria-expanded','false');
  }
  root.addEventListener('click',event => {
    const button = event.target.closest('button[data-public-example]');
    if (!button || !root.contains(button)) return;
    const card = button.closest('[data-example-card]'), host = card.querySelector('[data-example-host]');
    if (host.firstElementChild) { close(card); return; }
    root.querySelectorAll('[data-example-card]').forEach(close);
    button.dataset.closedLabel ||= button.textContent;
    const frame = document.createElement('iframe');
    frame.title = button.dataset.exampleTitle;
    const url = new URL('/assets/demos/embed.html',location.origin);
    url.searchParams.set('src',button.dataset.publicExample);
    url.searchParams.set('theme',document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
    url.searchParams.set('inspectOnSelect','true');
    frame.src = url.href; frame.allowFullscreen = true;
    host.appendChild(frame); host.hidden = false;
    button.textContent = 'Close viewer'; button.setAttribute('aria-expanded','true');
  });
  window.addEventListener('pagehide',()=>root.querySelectorAll('[data-example-card]').forEach(close),{once:true});
})();
