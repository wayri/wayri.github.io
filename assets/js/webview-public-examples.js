(function () {
    'use strict';
    const root = document.getElementById('public-examples');
    if (!root) return;
    root.addEventListener('click', event => {
        const button = event.target.closest('button[data-public-example]');
        if (!button || !root.contains(button)) return;
        const card = button.closest('[data-example-card]');
        const host = card.querySelector('[data-example-host]');
        if (host.firstElementChild) return;
        const iframe = document.createElement('iframe');
        iframe.title = button.dataset.exampleTitle;
        const url = new URL('/assets/lib/kicad-webview/releases/0.1.0-beta.2/embed.html', location.origin);
        url.searchParams.set('src', button.dataset.publicExample);
        url.searchParams.set('theme', document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
        iframe.src = url.href;
        iframe.loading = 'eager';
        iframe.allowFullscreen = true;
        host.appendChild(iframe);
        host.hidden = false;
        button.disabled = true;
        button.textContent = 'Viewer loaded below';
    });
})();
