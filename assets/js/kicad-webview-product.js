(() => {
    'use strict';
    const page = document.querySelector('.webview-product');
    if (!page) return;
    if (!window.KiCadWebView) {
        document.getElementById('demo-readout').textContent = 'The viewer script could not load. Reload the page to retry.';
        page.querySelectorAll('button, input, select').forEach(control => control.disabled = true);
        return;
    }
    const base = page.dataset.assets;
    const source = base + 'demo/project.json';
    const status = document.getElementById('demo-readout');
    const hint = document.getElementById('demo-hint');
    const theme = () => document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    const viewer = new KiCadWebView.Viewer('#advanced-board', { theme: theme() });
    const simple = document.getElementById('simple-board');
    let busy = false, localLoaded = false;
    function lock(value) {
        busy = value;
        page.querySelectorAll('[data-view], [data-action], [data-layer], [data-part], [data-field], #local-design').forEach(button => button.disabled = value);
        document.getElementById('advanced-board').setAttribute('aria-busy', String(value));
    }
    async function run(action) {
        if (busy) return;
        lock(true);
        try { await action(); }
        catch (error) { status.textContent = 'Could not open this view: ' + error.message; }
        finally { lock(false); }
    }
    async function board() {
        if (localLoaded || viewer.kind !== 'pcb' || viewer.path !== '3PD+IB.kicad_pcb') { await viewer.load(source); localLoaded = false; }
        if (viewer.view !== 'pcb') await viewer.setView('pcb');
    }
    viewer.addEventListener('ready', event => {
        page.querySelectorAll('[data-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === event.detail.view)));
        const parts = viewer.getParts();
        status.textContent = event.detail.path + ' · ' + event.detail.view + (parts.length ? ' · ' + parts.length + ' saved parts' : '') + ' · read-only';
    });
    viewer.addEventListener('select', event => {
        const item = event.detail.item;
        status.textContent = item ? 'Selection opened in Inspect · saved source properties · ' + event.detail.view : 'Selection cleared · read-only';
    });
    viewer.addEventListener('measure', event => {
        if (Number.isFinite(event.detail.distance)) status.textContent = 'Drawing measurement: ' + event.detail.distance.toFixed(3) + ' mm';
    });
    page.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => run(async () => {
        const view = button.dataset.view;
        if (view === 'manufacturing') await viewer.load(base + 'manufacturing/inverter-fabrication.zip');
        else if (view === 'schematic') { await viewer.load(source, { file: 'HBD21094.kicad_sch', view: 'schematic' }); localLoaded = false; }
        else { await board(); if (view === '3d') await viewer.setView('3d'); }
        hint.textContent = view === 'manufacturing' ? 'Six real exported layers. Open Layers to toggle copper or drills; use the ruler for a two-click measurement in mm.' : view === '3d' ? 'Drag to orbit, scroll to zoom. Open the 3D View / Measure / Display controls. Component stand-ins are approximate.' : view === 'schematic' ? 'HBD21094 schematic sheet. Use the drawing selector for other sheets; Inspect searches this sheet’s saved symbols.' : 'Pan, zoom and Fit. Open Inspect to search parts, or try the U2 shortcut below.';
    })));
    function reveal() { document.getElementById('demo').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    page.querySelectorAll('.wv-lab [data-view]').forEach(button => button.addEventListener('click', reveal));
    page.querySelectorAll('[data-action="u2"]').forEach(button => button.addEventListener('click', () => run(async () => {
        await board();
        const part = viewer.getParts().find(part => part.reference === 'U2');
        if (!part || !viewer.selectPart(part.id, { locate: true })) throw new Error('U2 is not available in this drawing.');
        viewer.setInspectorOpen(true);
        hint.textContent = 'U2 is selected. In the Properties panel, choose “Pad 2 · GPa” to inspect its saved IN / input / GPa metadata. This is source-file information, not a solved voltage.';
        reveal();
    })));
    page.querySelectorAll('[data-action="copper"]').forEach(button => button.addEventListener('click', () => run(async () => { await board(); viewer.setLayers(viewer.getLayers().filter(layer => ['F.Cu', 'B.Cu'].includes(layer))); viewer.clearSelection(); viewer.fit(); hint.textContent = 'Front and back copper only. Use Layers to restore individual layers, or Reset board to restore the demo.'; reveal(); })));
    page.querySelectorAll('[data-action="reset"]').forEach(button => button.addEventListener('click', () => run(async () => { await viewer.load(source); localLoaded = false; viewer.setInspectorOpen(false); viewer.fit(); hint.textContent = 'Inverter demo restored. Pan, zoom, inspect parts or switch views.'; reveal(); })));
    page.querySelectorAll('[data-layer]').forEach(button => button.addEventListener('click', () => run(async () => {
        await board(); viewer.setLayers([button.dataset.layer]); viewer.clearSelection(); viewer.fit();
        hint.textContent = button.textContent + ' isolated. Select geometry to inspect its saved net; All layers restores the complete drawing.';
        reveal();
    })));
    page.querySelector('[data-action="sheet"]').addEventListener('click', () => run(async () => {
        const file = document.getElementById('sheet-select').value;
        await viewer.load(source, { file, view: 'schematic' }); localLoaded = false;
        hint.textContent = file + ' · Pan, zoom and inspect saved symbols. Choose another sheet below to continue.';
        reveal();
    }));
    let demoParts = [];
    function searchParts() {
        const query = document.getElementById('part-search').value.trim().toLowerCase();
        const matches = demoParts.filter(part => [part.reference, part.value, part.footprint].some(value => String(value || '').toLowerCase().includes(query)));
        const results = document.getElementById('part-results');
        results.replaceChildren();
        matches.slice(0, 8).forEach(part => {
            const button = document.createElement('button');
            button.type = 'button'; button.dataset.part = part.id;
            button.textContent = part.reference; button.title = [part.value, part.footprint].filter(Boolean).join(' · ');
            button.disabled = busy;
            button.addEventListener('click', () => run(async () => {
                await board();
                if (!viewer.selectPart(part.id, { locate: true })) throw new Error('Part unavailable in this drawing.');
                viewer.setInspectorOpen(true); hint.textContent = part.reference + ' selected. Inspect shows saved value, footprint and pads.'; reveal();
            }));
            results.append(button);
        });
        document.getElementById('part-count').textContent = matches.length ? matches.length + ' matching parts · showing ' + Math.min(matches.length, 8) : 'No saved parts match. Try a reference such as U2.';
    }
    document.getElementById('part-search').addEventListener('input', searchParts);
    page.querySelectorAll('[data-field]').forEach(button => button.addEventListener('click', () => run(async () => {
        await board();
        // Restore source layers so a previous copper-only demo cannot hide the field.
        await viewer.load(source); localLoaded = false;
        const response = await fetch(base + 'analysis/inverter-illustrative.json');
        if (!response.ok) throw new Error('Illustrative overlay unavailable.');
        await viewer.setAnalysis(await response.json());
        viewer.setAnalysisField(button.dataset.field);
        hint.textContent = 'ILLUSTRATIVE DATA ONLY · ' + button.textContent + '. Move over coloured cells to probe values. Analysis controls provide opacity, scale and run assumptions. No solver has run.';
        reveal();
    })));
    page.querySelector('[data-action="clear-analysis"]').addEventListener('click', () => run(async () => {
        viewer.clearAnalysis(); hint.textContent = 'Analysis overlay cleared. Saved board geometry is unchanged.'; reveal();
    }));
    document.getElementById('local-design').addEventListener('change', event => run(async () => {
        const files = event.target.files;
        if (!files.length) return;
        const bytes = [...files].reduce((sum, file) => sum + file.size, 0);
        if (bytes > 64 * 1024 * 1024) throw new Error('Choose files totalling no more than 64 MiB.');
        if (files.length === 1 && /\.zip$/i.test(files[0].name)) await viewer.loadArchive(await files[0].arrayBuffer());
        else await viewer.loadFiles(files);
        localLoaded = true;
        hint.textContent = 'Your selected local files are read in this browser. Reset board returns to the public inverter demo.';
        event.target.value = '';
    }));
    page.querySelectorAll('[data-copy]').forEach(button => button.addEventListener('click', async () => {
        const label = button.textContent;
        try { await navigator.clipboard.writeText(document.getElementById(button.dataset.copy).textContent); button.textContent = 'Copied'; }
        catch (_) { button.textContent = 'Select and copy the code above'; }
        setTimeout(() => button.textContent = label, 2500);
    }));
    function loadSimple() {
        simple.setAttribute('theme', theme());
        simple.setAttribute('src', source);
        // The custom element already exists; use its instance after lazy activation.
        simple.viewer?.setTheme(theme());
        if (simple.viewer && !simple.viewer.source) simple.viewer.load(source).catch(error => {
            simple.nextElementSibling.textContent = 'Inline preview unavailable: ' + error.message;
        });
    }
    const observer = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) { observer.disconnect(); loadSimple(); }
    }, { rootMargin: '150px' });
    observer.observe(simple);
    window.addEventListener('themeChanged', () => { viewer.setTheme(theme()); simple.viewer?.setTheme(theme()); });
    window.addEventListener('pagehide', () => { observer.disconnect(); viewer.dispose(); simple.viewer?.dispose(); }, { once: true });
    run(async () => { await viewer.load(source); demoParts = viewer.getParts(); searchParts(); });
})();
