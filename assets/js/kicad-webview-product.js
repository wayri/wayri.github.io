(async () => {
    'use strict';
    const page = document.querySelector('.webview-product');
    if (!page) return;
    const status = document.getElementById('demo-readout');
    const hint = document.getElementById('demo-hint');
    if (!window.KiCadWebView || !window.IRCAProject) {
        status.textContent = 'The IRCA viewer could not load. Reload the page to retry.';
        return;
    }
    const project = window.IRCAProject;
    const theme = () => document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    const simple = document.getElementById('simple-board');
    const tourHost = document.getElementById('demo-carousel');
    let viewer, simpleViewer, metadata, carousel, observer, simpleLoading = false;
    let busy = false, commandBusy = false, localLoaded = false, disposed = false, demoParts = [];
    const tourObserver = new MutationObserver(updateLock);
    tourObserver.observe(tourHost, { subtree: true, attributes: true, attributeFilter: ['aria-busy'] });
    function pauseTour() { carousel?.pause(); }
    function updateLock() {
        busy = commandBusy || tourHost.querySelector('[aria-busy="true"]') !== null;
        page.querySelectorAll('[data-view], [data-action], [data-layer], [data-part], [data-field], [data-tour], #local-design').forEach(control => control.disabled = busy);
        document.getElementById('advanced-board').setAttribute('aria-busy', String(busy));
    }
    function bindViewer() {
        viewer.addEventListener('ready', event => {
            page.querySelectorAll('[data-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === event.detail.view)));
            const parts = viewer.getParts();
            status.textContent = event.detail.path + ' · ' + event.detail.view + (parts.length ? ' · ' + parts.length + ' parts' : '') + ' · read-only';
        });
        viewer.addEventListener('select', event => {
            status.textContent = event.detail.item ? 'Selection opened in Inspect · ' + (localLoaded ? 'local design properties' : 'IRCA review properties') + ' · ' + event.detail.view : 'Selection cleared · read-only';
        });
        viewer.addEventListener('measure', event => {
            if (Number.isFinite(event.detail.distance)) status.textContent = 'Drawing measurement: ' + event.detail.distance.toFixed(3) + ' mm';
        });
    }
    function replaceViewer(local = false) {
        viewer?.dispose();
        viewer = local ? new KiCadWebView.Viewer('#advanced-board', { theme: theme() }) : project.createViewer('#advanced-board', { theme: theme() });
        localLoaded = local;
        bindViewer();
    }
    async function board() {
        if (localLoaded) replaceViewer();
        if (viewer.kind !== 'pcb' || viewer.path !== metadata.pcbPath) await project.load(viewer, { view: 'pcb' });
        else if (viewer.view !== 'pcb') await viewer.setView('pcb');
    }
    function slides(name) {
        const pcb = { input: 'IRCA review', options: { file: metadata.pcbPath } };
        if (name === 'board') return [
            { ...pcb, label: 'IRCA assembly · isometric', view: '3d', camera3D: 'isometric', clearSelection: true },
            { label: 'IRCA assembly · top', view: '3d', camera3D: 'top', clearSelection: true },
            { label: 'IRCA assembly · bottom', view: '3d', camera3D: 'bottom', clearSelection: true },
            { label: 'IRCA board profile', view: '3d', camera3D: 'front', clearSelection: true },
            { label: 'IRCA assembly overview', view: '3d', camera3D: 'isometric', clearSelection: true }
        ];
        return [
            { ...pcb, label: 'IRCA layout · ' + metadata.partCount + ' PCB parts', view: 'pcb', clearSelection: true },
            { input: 'IRCA review', options: { file: metadata.schematicPath }, label: 'IRCA schematic · inspect the circuit', view: 'schematic', clearSelection: true },
            { ...pcb, label: 'IRCA copper · ' + metadata.defaultNet, view: 'pcb', clearSelection: true, net: metadata.defaultNet },
            { label: 'IRCA assembly · independently selectable parts', view: '3d', camera3D: 'isometric', clearSelection: true },
            { label: 'IRCA assembly · bottom', view: '3d', camera3D: 'bottom', clearSelection: true }
        ];
    }
    // Adapt carousel source loading to the same in-memory IRCA review used everywhere else.
    const presentationViewer = {
        get view() { return viewer.view; },
        load: (_input, options) => project.load(viewer, options),
        setView: view => viewer.setView(view),
        setCamera: camera => viewer.setCamera(camera),
        setCamera3D: camera => viewer.setCamera3D(camera),
        clearSelection: () => viewer.clearSelection(),
        selectNet: net => viewer.selectNet(net)
    };
    async function chooseTour(name) {
        carousel?.dispose(); tourHost.replaceChildren();
        if (localLoaded) replaceViewer();
        viewer.clearAnalysis(); viewer.setInspectorOpen(false);
        page.querySelectorAll('[data-tour]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.tour === name)));
        carousel = new KiCadWebView.ViewerCarousel(tourHost, { viewer: presentationViewer, slides: slides(name), interval: 8000 });
        carousel.addEventListener('slidechange', event => { hint.textContent = event.detail.label + '. Pan, zoom and select a component to inspect it. Model limitations remain labelled.'; });
        carousel.addEventListener('error', event => { status.textContent = 'Tour paused: ' + event.detail.error.message; });
        await carousel.show(0);
    }
    async function run(action, presenting = false) {
        if (busy || !metadata || disposed) return;
        pauseTour();
        if (!presenting && carousel) {
            carousel.dispose(); carousel = undefined;
            tourHost.textContent = 'Choose a tour above to restart its slides.';
            page.querySelectorAll('[data-tour]').forEach(button => button.setAttribute('aria-pressed', 'false'));
        }
        commandBusy = true; updateLock();
        try { await action(); }
        catch (error) { status.textContent = 'Could not open this view: ' + error.message; }
        finally { commandBusy = false; updateLock(); }
    }
    function reveal() { document.getElementById('demo').scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); }
    function searchParts() {
        const query = document.getElementById('part-search').value.trim().toLowerCase();
        const matches = demoParts.filter(part => [part.reference, part.value, part.footprint].some(value => String(value || '').toLowerCase().includes(query)));
        const results = document.getElementById('part-results'); results.replaceChildren();
        for (const part of matches.slice(0, 8)) {
            const button = document.createElement('button'); button.type = 'button'; button.dataset.part = part.id;
            button.textContent = part.reference; button.title = [part.value, part.footprint].filter(Boolean).join(' · '); button.disabled = busy;
            button.addEventListener('click', () => run(async () => {
                await board();
                if (!viewer.selectPart(part.id, { locate: true })) throw new Error('Part unavailable in this drawing.');
                viewer.setInspectorOpen(true); hint.textContent = part.reference + ' selected. Inspect shows its review value, footprint and pads.'; reveal();
            }));
            results.append(button);
        }
        document.getElementById('part-count').textContent = matches.length ? matches.length + ' matching parts · showing ' + Math.min(matches.length, 8) : 'No parts match. Try ' + metadata.defaultPart + '.';
    }
    async function showStudy(field = 'voltage-drop-front') {
        await board();
        await project.load(viewer, { view: 'pcb' });
        await viewer.setAnalysis(await project.analysis());
        viewer.setAnalysisField(field);
        const data = await project.study();
        document.getElementById('dc-study-summary').textContent = `${data.maxVoltageDropMv.toFixed(2)} mV maximum drop · ${(data.copperLossW * 1000).toFixed(2)} mW copper loss · ${data.currentA} A normalized load.`;
        hint.textContent = 'Computed IRCA DC copper drop · 1 A normalized load. Sample patches lie inside actual FEM triangles and cover 31.15% of their area; gaps are not zero-valued copper. The complete field and assumptions are below.';
        reveal();
    }
    async function loadSimple() {
        if (simpleLoading || simpleViewer || disposed) return;
        simpleLoading = true;
        try {
            simpleViewer = project.createViewer(simple, { theme: theme() });
            await project.load(simpleViewer, { view: 'pcb' });
        } catch (error) {
            simpleViewer?.dispose(); simpleViewer = null;
            simple.nextElementSibling.textContent = 'IRCA inline preview unavailable: ' + error.message;
        } finally { simpleLoading = false; }
    }
    page.querySelectorAll('[data-tour]').forEach(button => button.addEventListener('click', () => run(() => chooseTour(button.dataset.tour), true)));
    page.addEventListener('focusin', event => { if (!tourHost.contains(event.target)) pauseTour(); });
    for (const type of ['pointerdown', 'wheel', 'keydown']) document.getElementById('advanced-board').addEventListener(type, pauseTour, { passive: true });
    page.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => run(async () => {
        const view = button.dataset.view;
        if (localLoaded) replaceViewer();
        if (view === 'manufacturing') await viewer.loadFiles(await project.fabrication());
        else if (view === 'schematic') await project.load(viewer, { file: metadata.schematicPath, view });
        else { await board(); if (view === '3d') await viewer.setView('3d'); }
        hint.textContent = view === 'manufacturing' ? 'IRCA Gerbers and drills exported from the saved board. Use Layers to inspect fabrication geometry and the ruler to measure in mm.' : view === '3d' ? 'IRCA full assembly. Drag to orbit, scroll to zoom, or select a component for its properties.' : view === 'schematic' ? 'IRCA schematic. Pan, zoom and select symbols; open Inspect to search parts.' : 'IRCA layout. Pan, zoom, select a component, or inspect copper and pads.';
    })));
    page.querySelectorAll('.wv-lab [data-view]').forEach(button => button.addEventListener('click', reveal));
    page.querySelectorAll('[data-action="inspect-part"]').forEach(button => button.addEventListener('click', () => run(async () => {
        await board(); const part = viewer.getParts().find(item => item.reference === metadata.defaultPart);
        if (!part || !viewer.selectPart(part.id, { locate: true })) throw new Error('The example component is unavailable.');
        viewer.setInspectorOpen(true); hint.textContent = part.reference + ' selected. Choose one of its pads in Inspect to see its saved net and geometry.'; reveal();
    })));
    page.querySelectorAll('[data-action="copper"]').forEach(button => button.addEventListener('click', () => run(async () => {
        await board(); viewer.setLayers(viewer.getLayers().filter(layer => ['F.Cu', 'B.Cu'].includes(layer))); viewer.clearSelection(); viewer.fit();
        hint.textContent = 'IRCA front and back copper isolated. Use Layers or Reset board to restore the other layers.'; reveal();
    })));
    page.querySelectorAll('[data-action="reset"]').forEach(button => button.addEventListener('click', () => run(async () => {
        if (localLoaded) replaceViewer(); await project.load(viewer, { view: 'pcb' }); viewer.setInspectorOpen(false); viewer.fit();
        hint.textContent = 'IRCA layout restored. Pan, zoom, inspect parts or switch views.'; reveal();
    })));
    page.querySelectorAll('[data-action="net"]').forEach(button => button.addEventListener('click', () => run(async () => {
        await board(); const nets = viewer.getNets().filter(net => net.count > 0);
        const net = nets.find(item => item.name === metadata.defaultNet) || nets[0];
        if (!net || !viewer.selectNet(net.id || net.name, { locate: true })) throw new Error('No selectable IRCA copper net is available.');
        viewer.setInspectorOpen(true); hint.textContent = 'IRCA net ' + net.name + ' highlighted. Hidden layers stay hidden; use Inspect → Nets to choose another.'; reveal();
    })));
    page.querySelectorAll('[data-layer]').forEach(button => button.addEventListener('click', () => run(async () => {
        await board(); viewer.setLayers([button.dataset.layer]); viewer.clearSelection(); viewer.fit(); hint.textContent = 'IRCA ' + button.textContent.toLowerCase() + ' isolated.'; reveal();
    })));
    page.querySelector('[data-action="sheet"]').addEventListener('click', () => run(async () => {
        if (localLoaded) replaceViewer(); await project.load(viewer, { file: metadata.schematicPath, view: 'schematic' });
        hint.textContent = 'IRCA schematic · pan, zoom and inspect symbols.'; reveal();
    }));
    document.getElementById('part-search').addEventListener('input', searchParts);
    page.querySelectorAll('[data-field]').forEach(button => {
        button.addEventListener('click', () => run(() => showStudy(button.dataset.field === 'voltage-drop-back' ? 'voltage-drop-back' : 'voltage-drop-front')));
    });
    page.querySelector('[data-action="clear-analysis"]').addEventListener('click', () => run(async () => { viewer.clearAnalysis(); hint.textContent = 'IRCA analysis overlay cleared.'; reveal(); }));
    document.getElementById('local-design').addEventListener('change', event => run(async () => {
        const files = event.target.files; if (!files.length) return;
        if ([...files].reduce((sum, file) => sum + file.size, 0) > 64 * 1024 * 1024) throw new Error('Choose files totalling no more than 64 MiB.');
        replaceViewer(true);
        if (files.length === 1 && /\.zip$/i.test(files[0].name)) await viewer.loadArchive(await files[0].arrayBuffer()); else await viewer.loadFiles(files);
        hint.textContent = 'Your selected local files are read in this browser. Reset board returns to IRCA.'; event.target.value = '';
    }));
    page.querySelectorAll('[data-copy]').forEach(button => button.addEventListener('click', async () => {
        const label = button.textContent;
        try { await navigator.clipboard.writeText(document.getElementById(button.dataset.copy).textContent); button.textContent = 'Copied'; }
        catch (_) { button.textContent = 'Select and copy the code above'; }
        setTimeout(() => { button.textContent = label; }, 2500);
    }));
    window.addEventListener('themeChanged', () => { viewer?.setTheme(theme()); simpleViewer?.setTheme(theme()); });
    window.addEventListener('pagehide', () => { disposed = true; observer?.disconnect(); tourObserver.disconnect(); carousel?.dispose(); viewer?.dispose(); simpleViewer?.dispose(); }, { once: true });
    commandBusy = true; updateLock();
    try {
        metadata = await project.ready(); if (disposed) return;
        replaceViewer();
        page.querySelectorAll('[data-irca-part-count]').forEach(node => { node.textContent = metadata.partCount + ' PCB parts · IRCA review geometry'; });
        const sheet = document.getElementById('sheet-select'); sheet.replaceChildren(new Option('IRCA schematic', metadata.schematicPath));
        page.querySelectorAll('[data-action="inspect-part"]').forEach(button => { button.textContent = 'Inspect ' + metadata.defaultPart; });
        await chooseTour('project'); demoParts = viewer.getParts(); searchParts();
        observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) { observer.disconnect(); loadSimple(); } }, { rootMargin: '150px' }); observer.observe(simple);
    } catch (error) { status.textContent = 'IRCA demo unavailable: ' + error.message; }
    finally { commandBusy = false; updateLock(); }
})();
