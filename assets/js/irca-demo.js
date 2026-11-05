(() => {
    'use strict';
    const host = document.querySelector('[data-irca-demo]');
    if (!host) return;
    const $ = selector => host.querySelector(selector);
    const stage = $('.irca-board'), preview = $('.irca-preview'), status = $('.irca-status');
    const start = $('.irca-start'), modes = [...host.querySelectorAll('[data-irca-mode]')];
    const theme = () => document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    const abort = new AbortController();
    const sourceURL = new URL(host.dataset.source, location.href);
    let viewer, carousel, loading = false, disposed = false, runtime, study, mode = 'assembly';

    function loadRuntime() {
        if (window.KiCadWebView) return Promise.resolve();
        if (!runtime) runtime = new Promise((resolve, reject) => {
            const script = document.createElement('script'); script.src = host.dataset.runtime;
            script.onload = () => window.KiCadWebView ? resolve() : fail();
            script.onerror = fail;
            function fail() { script.remove(); runtime = null; reject(new Error('Viewer unavailable')); }
            document.head.append(script);
        });
        return runtime;
    }
    async function loadStudy() {
        if (study) return study;
        const response = await fetch(host.dataset.study, { signal: abort.signal });
        if (!response.ok) throw new Error('Study summary unavailable');
        const data = await response.json();
        if (![data.maxVoltageDropMv, data.copperLossW, data.currentA].every(Number.isFinite)) throw new Error('Incomplete study');
        study = data;
        const metrics = [['maxVoltageDropMv', 'mV', 'maximum drop', 2], ['copperLossW', 'mW', 'copper loss', 2]];
        $('.irca-metrics').replaceChildren(...metrics.map(([key, unit, label, decimals]) => {
            const item = document.createElement('span'), value = document.createElement('strong');
            value.textContent = (data[key] * (key === 'copperLossW' ? 1000 : 1)).toFixed(decimals) + ' ' + unit;
            item.append(value, document.createTextNode(label)); return item;
        }));
        const detail = $('.irca-study-details'), checks = document.createElement('p'), list = document.createElement('ul');
        checks.textContent = `${data.meshMm} mm final mesh · ${data.convergenceChangePercent.toFixed(3)}% final voltage-drop change. Current conservation, power balance, and an analytical conductor reference were checked. Local current-density hotspots are not qualified.`;
        for (const text of data.assumptions || []) { const li = document.createElement('li'); li.textContent = text; list.append(li); }
        detail.replaceChildren(checks, list);
        return data;
    }
    async function loadAssembly() {
        if (loading || viewer || disposed) return;
        loading = true; start.disabled = true; status.textContent = 'Loading the complete IRCA assembly…';
        const modelRequests = [];
        try {
            await loadRuntime(); if (disposed || mode !== 'assembly') return;
            stage.hidden = false; $('.irca-stage').classList.add('is-loading');
            viewer = new KiCadWebView.Viewer(stage, { theme: theme(), loadAsset: path => {
                // Only the neutral mesh listed beside the display carrier is public.
                if (!/^assembly(?:-\d+)?\.glb$/.test(path)) return Promise.reject(new Error('Unlisted display asset'));
                const pending = (async () => {
                    const response = await fetch(new URL(path, sourceURL), { signal: abort.signal });
                    if (!response.ok) throw new Error('Assembly mesh unavailable');
                    const bytes = new Uint8Array(await response.arrayBuffer());
                    if (bytes.length > 8 * 1024 * 1024) throw new Error('Assembly mesh exceeds the viewer budget');
                    let binary = '';
                    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
                    return { base64: btoa(binary) };
                })();
                modelRequests.push(pending); return pending;
            }});
            await viewer.load(host.dataset.source, { view: '3d' });
            if (!modelRequests.length) throw new Error('No assembly model was requested');
            await Promise.all(modelRequests);
            if (disposed) return;
            carousel = new KiCadWebView.ViewerCarousel($('.irca-carousel'), { viewer, interval: 6500, slides: [
                // Leave the initial camera alone so linked-model loading can fit its bounds.
                { label: 'Complete assembly · drag to inspect', clearSelection: true },
                { label: 'Top assembly', view: '3d', camera3D: 'top' },
                { label: 'Bottom assembly', view: '3d', camera3D: 'bottom' },
                { label: 'Front profile', view: '3d', camera3D: 'front' },
                { label: 'Right profile', view: '3d', camera3D: 'right' },
                { label: 'Assembly overview', view: '3d', camera3D: 'isometric' }
            ]});
            carousel.addEventListener('error', () => { status.textContent = 'The tour paused. Use Fit drawing or choose another view.'; });
            await carousel.show(0);
            if (disposed) return;
            preview.hidden = true; start.hidden = true;
            if (mode === 'assembly') status.textContent = 'Drag to rotate, scroll to zoom. Previous / Next changes the view; Play starts an optional tour.';
            else carousel.pause();
        } catch (_) {
            if (!disposed) {
                carousel?.dispose(); carousel = null; viewer?.dispose(); viewer = null;
                stage.hidden = true; preview.hidden = false; start.hidden = false; start.textContent = 'Retry interactive assembly';
                status.textContent = 'The interactive view could not load. The native assembly render remains available.';
            }
        } finally {
            if (!disposed) { loading = false; start.disabled = false; $('.irca-stage').classList.remove('is-loading'); }
        }
    }
    async function choose(next) {
        mode = next;
        modes.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.ircaMode === mode)));
        $('.irca-assembly').hidden = mode !== 'assembly'; $('.irca-pi').hidden = mode !== 'pi';
        if (mode === 'pi') {
            carousel?.pause(); start.hidden = true;
            status.textContent = 'Fast PI · executed DC copper study on IRCA. The displayed image contains solved finite-element values.';
            try { await loadStudy(); } catch (_) { status.textContent = 'The calculated field is shown; the numerical summary could not load.'; }
        } else {
            if (!viewer) { start.hidden = false; loadAssembly(); }
            else if (!loading) { viewer.fit(); await carousel?.show(0); status.textContent = 'Drag to rotate, scroll to zoom. Tour playback is opt-in.'; }
        }
    }
    modes.forEach(button => button.addEventListener('click', () => choose(button.dataset.ircaMode)));
    start.addEventListener('click', loadAssembly);
    for (const event of ['pointerdown', 'wheel', 'keydown']) stage.addEventListener(event, () => carousel?.pause(), { passive: true });
    const observer = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) { observer.disconnect(); if (!navigator.connection?.saveData && mode === 'assembly') loadAssembly(); }
    }, { threshold: .2 });
    observer.observe(host);
    window.addEventListener('themeChanged', () => viewer?.setTheme(theme()));
    window.addEventListener('pagehide', () => { disposed = true; observer.disconnect(); abort.abort(); carousel?.dispose(); viewer?.dispose(); }, { once: true });
})();
