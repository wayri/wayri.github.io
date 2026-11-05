(() => {
    'use strict';
    const host = document.querySelector('[data-home-viewer]');
    if (!host) return;
    const stage = document.getElementById('home-design-board');
    const picture = document.getElementById('home-design-picture');
    const status = document.getElementById('home-design-status');
    const start = document.getElementById('home-design-start');
    const results = document.getElementById('home-design-results');
    const buttons = [...host.querySelectorAll('[data-home-view]')];
    const theme = () => document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    let viewer, runtime, analysis, busy = false, disposed = false, currentMode = '';
    const requests = new AbortController();

    function loadRuntime() {
        if (window.KiCadWebView) return Promise.resolve();
        if (!runtime) runtime = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = host.dataset.runtime;
            script.onload = () => {
                if (window.KiCadWebView) resolve();
                else { runtime = null; script.remove(); reject(new Error('Viewer unavailable')); }
            };
            script.onerror = () => { runtime = null; script.remove(); reject(new Error('Viewer unavailable')); };
            document.head.append(script);
        });
        return runtime;
    }
    async function loadAnalysis() {
        if (!analysis) {
            const response = await fetch(host.dataset.analysis, { signal: requests.signal });
            if (!response.ok) throw new Error('The computed study is unavailable');
            analysis = await response.json();
            if (analysis.provenance?.kind === 'illustrative') throw new Error('A computed study is required');
        }
        return analysis;
    }
    function showResults(data) {
        const field = data.fields.find(field => field.id === 'voltage-drop');
        if (!field) return;
        const summary = data.summary;
        if (!summary || !Number.isFinite(summary.maxVoltageDropMv)) throw new Error('Study summary unavailable');
        const metric = document.createElement('span'), value = document.createElement('strong');
        value.textContent = summary.maxVoltageDropMv.toFixed(2) + ' mV';
        metric.append(value, document.createTextNode('maximum copper drop'));
        const scope = document.createElement('span');
        scope.textContent = `${summary.currentA} A normalized · ${summary.sourcePad} → ${summary.loadPad} · ${summary.copperThicknessUm} µm copper`;
        results.replaceChildren(metric, scope);
        results.hidden = false;
    }
    async function show(mode) {
        if (busy || disposed) return;
        busy = true;
        host.setAttribute('aria-busy', 'true');
        buttons.forEach(button => button.disabled = true);
        start.disabled = true;
        status.textContent = 'Loading ' + (mode === 'analysis' ? 'computed DC copper study' : mode === '3d' ? '3D assembly' : mode === 'schematic' ? 'schematic' : 'PCB layout') + '…';
        try {
            await loadRuntime();
            if (disposed) return;
            stage.hidden = false; picture.hidden = true;
            if (!viewer) viewer = new window.KiCadWebView.Viewer(stage, { theme: theme() });
            viewer.clearAnalysis();
            viewer.clearSelection();
            results.hidden = true;
            if (mode === 'schematic') {
                await viewer.load(host.dataset.source, { file: 'HBD21094.kicad_sch', view: 'schematic' });
                status.textContent = 'Gate-driver schematic. Pan, zoom, and inspect the saved symbols.';
            } else {
                if (mode === 'analysis' || viewer.kind !== 'pcb' || viewer.path !== '3PD+IB.kicad_pcb') await viewer.load(host.dataset.source);
                await viewer.setView(mode === '3d' ? '3d' : 'pcb');
                if (mode === 'analysis') {
                    const data = await loadAnalysis();
                    if (disposed) return;
                    await viewer.setAnalysis(data);
                    viewer.setAnalysisField('voltage-drop');
                    const net = viewer.getNets().find(net => net.name === data.summary?.net);
                    if (net) viewer.selectNet(net.id, { locate: true });
                    viewer.setInspectorOpen(false);
                    showResults(data);
                    status.textContent = 'Computed DC copper study, not a measured inverter operating point. Hover to probe the field; open study details for method and limits.';
                } else status.textContent = mode === '3d' ? 'Drag to rotate, scroll to zoom. Missing component models use approximate stand-ins.' : 'Pan, zoom, and select copper or parts to inspect saved properties.';
            }
            if (disposed) return;
            currentMode = mode;
            buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.homeView === mode)));
            start.hidden = true;
        } catch (error) {
            if (disposed) return;
            status.textContent = 'This view could not load. Retry, choose another view, or open the full viewer.';
            start.hidden = false;
            start.textContent = 'Retry live design';
            stage.hidden = true; picture.hidden = false;
            currentMode = '';
            buttons.forEach(button => button.setAttribute('aria-pressed', 'false'));
        } finally {
            if (!disposed) {
                busy = false; host.setAttribute('aria-busy', 'false');
                buttons.forEach(button => button.disabled = false); start.disabled = false;
            }
        }
    }
    buttons.forEach(button => button.addEventListener('click', () => show(button.dataset.homeView)));
    start.addEventListener('click', () => show(currentMode || 'analysis'));
    const observer = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) {
            observer.disconnect();
            if (!navigator.connection?.saveData) show('analysis');
        }
    }, { threshold: .2 });
    observer.observe(host);
    window.addEventListener('themeChanged', () => viewer?.setTheme(theme()));
    window.addEventListener('pagehide', () => {
        disposed = true; observer.disconnect(); requests.abort(); viewer?.dispose();
    }, { once: true });
})();
