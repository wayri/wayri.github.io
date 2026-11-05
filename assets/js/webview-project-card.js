(() => {
    'use strict';
    const button = document.getElementById('webview-card-toggle');
    if (!button) return;
    const board = document.getElementById('webview-card-board');
    const picture = document.getElementById('webview-card-picture');
    const status = document.getElementById('webview-card-status');
    const theme = () => document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    let viewer = null, runtime = null;
    function loadRuntime() {
        if (window.KiCadWebView) return Promise.resolve();
        if (!runtime) runtime = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = button.dataset.runtime;
            script.onload = () => {
                if (window.KiCadWebView) resolve();
                else { script.remove(); runtime = null; reject(new Error('Viewer unavailable.')); }
            };
            script.onerror = () => { script.remove(); runtime = null; reject(new Error('Download failed.')); };
            document.head.append(script);
        });
        return runtime;
    }
    function close() {
        viewer?.dispose(); viewer = null; board.replaceChildren();
        board.hidden = true; picture.hidden = false;
        button.setAttribute('aria-expanded', 'false');
        button.textContent = 'Try interactive viewer';
    }
    button.addEventListener('click', async () => {
        if (button.disabled) return;
        if (viewer) { close(); status.textContent = 'Pan, zoom, inspect parts and switch to 3D.'; return; }
        button.disabled = true; status.textContent = 'Loading interactive inverter…';
        try {
            await loadRuntime();
            board.hidden = false; picture.hidden = true;
            viewer = new window.KiCadWebView.Viewer(board, { theme: theme() });
            await viewer.load(button.dataset.source);
            button.setAttribute('aria-expanded', 'true');
            button.textContent = 'Close interactive viewer';
            status.textContent = 'Live, read-only · drag to pan, scroll to zoom. Inspect parts or try 3D.';
        } catch (_) {
            close(); status.textContent = 'Preview could not load. Try again or open Product & live demo below.';
        } finally { button.disabled = false; }
    });
    window.addEventListener('themeChanged', () => viewer?.setTheme(theme()));
    window.addEventListener('pagehide', () => viewer?.dispose(), { once: true });
})();
