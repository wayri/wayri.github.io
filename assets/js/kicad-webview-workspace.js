(() => {
    'use strict';
    const page = document.querySelector('.webview-product');
    const button = document.getElementById('workspace-load');
    if (!page || !button) return;
    const host = document.getElementById('project-workspace');
    const status = document.getElementById('workspace-status');
    const probe = document.getElementById('workspace-probe');
    const theme = () => document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    let project = null, metadata;
    async function toggleWorkspace() {
        if (button.disabled) return;
        if (project) {
            project.dispose(); project = null; host.replaceChildren(); host.hidden = true;
            probe.hidden = true;
            button.textContent = 'Open Advanced viewer'; button.setAttribute('aria-expanded', 'false');
            status.textContent = 'Workspace closed. Open it again to restore IRCA.';
            return;
        }
        button.disabled = true; status.textContent = 'Loading IRCA into two panes…';
        try {
            if (!window.IRCAProject || !window.KiCadWebView?.AdvancedKiCadViewer) throw new Error('IRCA workspace unavailable. Reload to retry.');
            metadata = await window.IRCAProject.ready();
            host.hidden = false;
            project = window.IRCAProject.createWorkspace(host, { theme: theme(), layout: 'split', linkedSelection: true });
            project.addEventListener('error', () => { status.textContent = 'A drawing could not open. Choose another listed file or close and reopen the workspace.'; });
            await window.IRCAProject.load(project);
            const saved = window.KiCadWebView.parseViewLink(location.href);
            if (saved) await project.restoreViewState(saved);
            probe.hidden = false;
            button.textContent = 'Close Advanced viewer'; button.setAttribute('aria-expanded', 'true');
            status.textContent = saved ? 'Saved view restored: both drawings, cameras and selections match the linked revision.' : 'Link selection is on. Select a component or pad to cross-probe its saved counterpart. Create view link shares the current panes, zoom and selection.';
            if (saved) host.scrollIntoView({ block: 'start' });
        } catch (error) {
            project?.dispose(); project = null; host.replaceChildren(); host.hidden = true;
            status.textContent = 'Workspace unavailable: ' + error.message;
        } finally { button.disabled = false; }
    }
    button.addEventListener('click', toggleWorkspace);
    probe.addEventListener('click', async () => {
        if (!project || probe.disabled) return;
        probe.disabled = true;
        try {
            project.setLayout('split');
            await project.openFile(metadata.pcbPath, { pane: 0 });
            await project.openFile(metadata.schematicPath, { pane: 1 });
            project.setActivePane(0);
            const pcb = project.getActiveViewer();
            project.setActivePane(1);
            const schematic = project.getActiveViewer();
            const symbols = schematic.getParts();
            const counterparts = item => symbols.filter(symbol => item.schematicUuid && symbol.uuid === item.schematicUuid);
            const part = pcb.getParts().find(item => item.reference === metadata.defaultPart && counterparts(item).length === 1) || pcb.getParts().find(item => counterparts(item).length === 1);
            const matches = part ? counterparts(part) : [];
            if (!part || matches.length !== 1) throw new Error('A unique saved IRCA component relationship is unavailable in this revision.');
            // Match only the saved symbol UUID; the reference names the example, never establishes linkage.
            project.linkToggle.checked = true; project.linkedSelection = true;
            pcb.selectPart(part.id, { locate: true });
            schematic.selectPart(matches[0].id, { locate: true });
            project.setActivePane(0);
            status.textContent = part.reference + ' is selected in the IRCA PCB and schematic using its saved symbol identity. Try another component, or use Create view link in the viewer toolbar.';
        } catch (error) { status.textContent = 'Cross-probe example unavailable: ' + error.message; }
        finally { probe.disabled = false; }
    });
    async function restoreLink() {
        try {
            const saved = window.KiCadWebView?.parseViewLink(location.href);
            if (!saved) return;
            if (!project) await toggleWorkspace();
            else await project.restoreViewState(saved);
        } catch (error) { status.textContent = 'View link could not restore: ' + error.message; }
    }
    window.addEventListener('hashchange', restoreLink);
    if (location.hash.startsWith('#kicad-view=')) restoreLink();
    window.addEventListener('themeChanged', () => project?.setTheme(theme()));
    window.addEventListener('pagehide', () => project?.dispose(), { once: true });
})();
