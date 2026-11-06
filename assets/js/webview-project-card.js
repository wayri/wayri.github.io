(() => {
    'use strict';
    const button = document.getElementById('webview-card-toggle');
    if (!button || button.dataset.initialized) return;
    button.dataset.initialized = 'true';
    const board = document.getElementById('webview-card-board');
    const picture = document.getElementById('webview-card-picture');
    const status = document.getElementById('webview-card-status');
    const theme = () => document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    const inspect = document.getElementById('webview-card-inspect');
    const views = [...button.closest('.webview-card-controls').querySelectorAll('[data-card-view]')];
    let viewer = null, runtime = null, busy = false, disposed = false, metadata;
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
        markView();
    }
    function lock(value) {
        busy = value; [button, inspect, ...views].forEach(control => { control.disabled = value; });
        board.setAttribute('aria-busy', String(value));
    }
    function markView() {
        views.forEach(control => control.setAttribute('aria-pressed', String(!!viewer && viewer.view === control.dataset.cardView)));
    }
    async function open(view = '3d') {
        if (!viewer) {
            status.textContent = 'Loading IRCA layout and selectable component models…';
            await loadRuntime();
            if (!window.IRCAProject) throw new Error('IRCA review adapter unavailable.');
            metadata = await window.IRCAProject.ready();
            if (disposed) return;
            board.hidden = false; picture.hidden = true;
            viewer = window.IRCAProject.createViewer(board, { theme: theme() });
            viewer.addEventListener('viewchange', markView);
            await window.IRCAProject.load(viewer, { view });
            if (disposed) return;
            button.setAttribute('aria-expanded', 'true');
            button.textContent = 'Close interactive viewer';
        } else if (viewer.path !== metadata.pcbPath) await window.IRCAProject.load(viewer, { view });
        else if (viewer.view !== view) await viewer.setView(view);
        markView();
        status.textContent = 'IRCA · ' + metadata.partCount + ' selectable PCB parts. Drag to rotate in 3D; pan and zoom the layout, or select a component to inspect it.';
    }
    async function run(action) {
        if (busy || disposed) return;
        lock(true);
        try { await action(); }
        catch (error) { close(); status.textContent = 'Preview unavailable: ' + error.message + ' Open Product & live demo below, or retry.'; }
        finally { lock(false); }
    }
    button.addEventListener('click', () => run(async () => {
        if (viewer) { close(); status.textContent = 'Rotate the assembly, explore the layout and select a part here.'; }
        else await open();
    }));
    views.forEach(control => control.addEventListener('click', () => run(() => open(control.dataset.cardView))));
    inspect.addEventListener('click', () => run(async () => {
        await open(viewer?.view === 'pcb' ? 'pcb' : '3d');
        const part = viewer?.getParts().find(item => item.reference === metadata.defaultPart);
        if (!part || !viewer.selectPart(part.id, { locate: true })) throw new Error('IRCA component unavailable.');
        viewer.setInspectorOpen(true);
        status.textContent = 'U1 selected · saved ESP32 module properties and pads are shown in Inspect.';
    }));
    markView();
    window.addEventListener('themeChanged', () => viewer?.setTheme(theme()));
    window.addEventListener('pagehide', () => { disposed = true; viewer?.dispose(); }, { once: true });
})();
