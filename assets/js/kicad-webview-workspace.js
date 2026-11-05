(() => {
    'use strict';
    const page = document.querySelector('.webview-product');
    const button = document.getElementById('workspace-load');
    if (!page || !button) return;
    const host = document.getElementById('project-workspace');
    const status = document.getElementById('workspace-status');
    const theme = () => document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    let project = null;
    button.addEventListener('click', async () => {
        if (button.disabled) return;
        if (project) {
            project.dispose(); project = null; host.replaceChildren(); host.hidden = true;
            button.textContent = 'Open Advanced viewer'; button.setAttribute('aria-expanded', 'false');
            status.textContent = 'Workspace closed. Open it again to restore the inverter project.';
            return;
        }
        button.disabled = true; status.textContent = 'Loading the inverter project into two panes…';
        try {
            if (!window.KiCadWebView?.AdvancedKiCadViewer) throw new Error('Advanced viewer script unavailable. Reload to retry.');
            host.hidden = false;
            project = new window.KiCadWebView.AdvancedKiCadViewer(host, { theme: theme(), layout: 'split', linkedSelection: true });
            project.addEventListener('error', () => { status.textContent = 'A drawing could not open. Choose another listed file or close and reopen the workspace.'; });
            await project.load(page.dataset.assets + 'demo/project.json');
            button.textContent = 'Close Advanced viewer'; button.setAttribute('aria-expanded', 'true');
            status.textContent = 'Read-only · Search Files / Parts / Nets. Select a pane, then a drawing. No comments.';
        } catch (error) {
            project?.dispose(); project = null; host.replaceChildren(); host.hidden = true;
            status.textContent = 'Workspace unavailable: ' + error.message;
        } finally { button.disabled = false; }
    });
    window.addEventListener('themeChanged', () => project?.setTheme(theme()));
    window.addEventListener('pagehide', () => project?.dispose(), { once: true });
})();
