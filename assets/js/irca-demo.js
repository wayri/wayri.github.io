(() => {
    'use strict';
    const host = document.querySelector('[data-irca-demo]');
    if (!host) return;
    const $ = selector => host.querySelector(selector);
    const stage = $('.irca-board'), preview = $('.irca-preview'), status = $('.irca-status');
    const start = $('.irca-start'), inspect = $('.irca-inspect');
    const rotate = $('.irca-rotate');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const modes = [...host.querySelectorAll('[data-irca-mode]')];
    const theme = () => document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    const views = { assembly: '3d', pcb: 'pcb', schematic: 'schematic' };
    let viewer, carousel, loading = false, changing = false, disposed = false, runtime, study, metadata, mode = 'assembly';
    let rotating = false, rotationFrame = 0, lastRotation = 0, visible = false;
    function stopRotation() {
        rotating = false; cancelAnimationFrame(rotationFrame); rotationFrame = 0; lastRotation = 0;
        rotate.textContent = 'Rotate board'; rotate.setAttribute('aria-pressed', 'false');
    }
    function rotationTick(now) {
        rotationFrame = 0;
        if (!rotating || disposed || document.hidden || !visible || viewer?.view !== '3d' || mode !== 'assembly') { lastRotation = 0; return; }
        if (lastRotation) viewer.rotate3D('left', Math.min(now - lastRotation, 80) * .008);
        lastRotation = now; rotationFrame = requestAnimationFrame(rotationTick);
    }
    function startRotation() {
        if (!viewer || disposed || viewer.view !== '3d') return;
        viewer.setInspectorOpen(false); viewer.clearSelection();
        carousel?.pause(); rotating = true; rotate.textContent = 'Pause rotation'; rotate.setAttribute('aria-pressed', 'true');
        if (!rotationFrame && visible && !document.hidden) rotationFrame = requestAnimationFrame(rotationTick);
    }
    function display(next) {
        mode = next;
        modes.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.ircaMode === mode)));
        $('.irca-assembly').hidden = mode === 'pi'; $('.irca-pi').hidden = mode !== 'pi';
        inspect.hidden = mode === 'pi' || !viewer || loading;
    }
    function loadRuntime() {
        if (window.KiCadWebView) return Promise.resolve();
        if (!runtime) runtime = new Promise((resolve, reject) => {
            const script = document.createElement('script'); script.src = host.dataset.runtime;
            script.onload = () => window.KiCadWebView ? resolve() : fail(); script.onerror = fail;
            function fail() { script.remove(); runtime = null; reject(new Error('Viewer unavailable')); }
            document.head.append(script);
        });
        return runtime;
    }
    async function loadStudy() {
        if (study) return;
        const data = await window.IRCAProject.study();
        if (![data.maxVoltageDropMv, data.copperLossW, data.currentA].every(Number.isFinite)) throw new Error('Incomplete IRCA study.');
        $('.irca-metrics').replaceChildren(...[[data.maxVoltageDropMv, 'mV', 'maximum drop'], [data.copperLossW * 1000, 'mW', 'copper loss']].map(([number, unit, label]) => {
            const item = document.createElement('span'), value = document.createElement('strong');
            value.textContent = number.toFixed(2) + ' ' + unit; item.append(value, document.createTextNode(label)); return item;
        }));
        $('.irca-result-value').textContent = data.maxVoltageDropMv.toFixed(2) + ' mV max drop · ' + (data.copperLossW * 1000).toFixed(2) + ' mW copper loss';
        const checks = document.createElement('p'), list = document.createElement('ul');
        checks.textContent = `${data.meshMm} mm final mesh · ${data.convergenceChangePercent.toFixed(3)}% final drop change. Current conservation, power balance and an analytical conductor reference were checked. Local current-density peaks are not qualified.`;
        for (const text of data.assumptions || []) { const li = document.createElement('li'); li.textContent = text; list.append(li); }
        $('.irca-study-details').replaceChildren(checks, list); study = data;
    }
    async function mount() {
        if (loading || viewer || disposed) return;
        loading = true; start.disabled = true; modes.forEach(button => button.disabled = true);
        status.textContent = 'Loading IRCA layout, schematic and component models…';
        try {
            await loadRuntime(); metadata = await window.IRCAProject.ready(); if (disposed) return;
            stage.hidden = false; $('.irca-stage').classList.add('is-loading');
            viewer = window.IRCAProject.createViewer(stage, { theme: theme() });
            viewer.addEventListener('viewchange', event => {
                if (event.detail.view !== '3d') stopRotation();
                if (loading || changing || mode === 'pi') return;
                display(event.detail.view === '3d' ? 'assembly' : event.detail.view);
                status.textContent = 'IRCA · ' + metadata.partCount + ' PCB parts. Select a component or pad to inspect it.';
            });
            await window.IRCAProject.load(viewer, { view: '3d' });
            const adapter = {
                get view() { return viewer.view; },
                load: (_, options) => window.IRCAProject.load(viewer, options),
                setView: view => viewer.setView(view), setCamera3D: camera => viewer.setCamera3D(camera),
                clearSelection: () => viewer.clearSelection()
            };
            carousel = new KiCadWebView.ViewerCarousel($('.irca-carousel'), { viewer: adapter, interval: 6500, slides: [
                { label: 'IRCA assembly · select any component', clearSelection: true },
                { label: 'IRCA PCB layout · 59 parts', input: 'IRCA review', options: { file: metadata.pcbPath }, view: 'pcb', clearSelection: true },
                { label: 'IRCA schematic', input: 'IRCA review', options: { file: metadata.schematicPath }, view: 'schematic', clearSelection: true },
                { label: 'Top assembly', input: 'IRCA review', options: { file: metadata.pcbPath }, view: '3d', camera3D: 'top', clearSelection: true },
                { label: 'Bottom assembly', view: '3d', camera3D: 'bottom' },
                { label: 'Front profile', view: '3d', camera3D: 'front' },
                { label: 'Right profile', view: '3d', camera3D: 'right' },
                { label: 'Assembly overview', view: '3d', camera3D: 'isometric' }
            ]});
            carousel.addEventListener('error', () => { status.textContent = 'The IRCA tour paused. Choose a view or use Fit drawing.'; });
            $('.irca-carousel').addEventListener('pointerdown', stopRotation);
            $('.irca-carousel').addEventListener('keydown', stopRotation);
            await carousel.show(0); if (disposed) return;
            const camera = viewer.getCamera3D();
            if (camera) viewer.setCamera3D({ ...camera, position: camera.position.map((value, index) => camera.target[index] + (value - camera.target[index]) * .4) });
            preview.hidden = true; start.hidden = true; inspect.textContent = 'Inspect ' + metadata.defaultPart;
            rotate.disabled = false;
            status.textContent = 'IRCA · 59 PCB parts. Slow rotation uses the viewer API; drag, zoom or inspect a component to pause.';
            if (!reducedMotion.matches) startRotation();
        } catch (error) {
            if (!disposed) {
                carousel?.dispose(); carousel = null; viewer?.dispose(); viewer = null;
                stage.hidden = true; preview.hidden = false; start.hidden = false; start.textContent = 'Retry interactive IRCA';
                status.textContent = 'IRCA could not load: ' + error.message;
            }
        } finally {
            loading = false; start.disabled = false; modes.forEach(button => button.disabled = false);
            $('.irca-stage').classList.remove('is-loading'); display(mode);
        }
    }
    async function choose(next) {
        stopRotation();
        display(next); carousel?.pause();
        if (mode === 'pi') {
            start.hidden = true; status.textContent = 'Fast PI · actual precomputed IRCA copper field; assumptions and numerical checks below.';
            try { await loadStudy(); } catch (error) { status.textContent = error.message; }
            return;
        }
        await mount();
        if (!viewer || disposed || changing || mode === 'pi') return;
        changing = true;
        try {
            while (!disposed && mode !== 'pi' && (viewer.view !== views[mode] || (mode !== 'schematic' && viewer.path !== metadata.pcbPath))) {
                const target = mode;
                if (viewer.path !== (target === 'schematic' ? metadata.schematicPath : metadata.pcbPath)) await window.IRCAProject.load(viewer, { file: target === 'schematic' ? metadata.schematicPath : metadata.pcbPath, view: views[target] });
                else await viewer.setView(views[target]);
            }
            status.textContent = 'IRCA · 59 PCB parts. Select a component or pad to inspect it; use the toolbar to fit, search or switch views.';
        } catch (error) { status.textContent = 'IRCA view unavailable: ' + error.message; }
        finally { changing = false; }
    }
    modes.forEach(button => button.addEventListener('click', () => choose(button.dataset.ircaMode)));
    rotate.addEventListener('click', async () => {
        if (rotating) { stopRotation(); return; }
        await choose('assembly'); startRotation();
    });
    $('.irca-study-open').addEventListener('click', () => choose('pi'));
    loadStudy().catch(() => { /* The result view retains an explicit retry on selection. */ });
    start.addEventListener('click', () => choose(mode));
    inspect.addEventListener('click', async () => {
        await choose(mode === 'pi' ? 'pcb' : mode);
        const part = viewer?.getParts().find(item => item.reference === metadata.defaultPart);
        if (part && viewer.selectPart(part.id, { locate: true })) viewer.setInspectorOpen(true);
    });
    for (const event of ['pointerdown', 'wheel', 'keydown']) stage.addEventListener(event, () => { carousel?.pause(); stopRotation(); }, { passive: true });
    const observer = new IntersectionObserver(entries => {
        visible = entries.some(entry => entry.isIntersecting);
        if (visible) {
            if (!viewer && !loading && !navigator.connection?.saveData) choose(mode);
            else if (rotating && !rotationFrame && !document.hidden) rotationFrame = requestAnimationFrame(rotationTick);
        } else { cancelAnimationFrame(rotationFrame); rotationFrame = 0; lastRotation = 0; }
    }, { threshold: .2 }); observer.observe(host);
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) { cancelAnimationFrame(rotationFrame); rotationFrame = 0; lastRotation = 0; }
        else if (rotating && visible && !rotationFrame) rotationFrame = requestAnimationFrame(rotationTick);
    });
    reducedMotion.addEventListener('change', event => { if (event.matches) stopRotation(); });
    window.addEventListener('themeChanged', () => viewer?.setTheme(theme()));
    window.addEventListener('pagehide', () => { disposed = true; stopRotation(); observer.disconnect(); carousel?.dispose(); viewer?.dispose(); }, { once: true });
})();
