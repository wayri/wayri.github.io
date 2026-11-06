(() => {
    'use strict';
    window.IRCAMiniScreen = {
        attach(viewer, { onInteract = () => {}, onReady = () => {}, onStatus = () => {}, onFocusChange = () => {}, getViewport = () => ({ width: 1, height: 1 }) } = {}) {
            let demo, pressed, disposed = false, focused = false, savedCamera;
            const ui = IRCAMiniUI.create({ navigate: path => window.location.assign(new URL(path, document.baseURI)), onChange: () => paint() });
            function paint() {
                if (!demo?.active || disposed) return;
                demo.drawDisplay('site-screen', (ctx, canvas) => ui.draw(ctx, canvas));
            }
            function exit() {
                if (!focused) return;
                focused = false;
                if (!viewer.disposed) viewer.setDemoInteraction(false);
                onFocusChange(false);
                if (savedCamera && !viewer.disposed && viewer.view === '3d') viewer.setCamera3D(savedCamera);
                savedCamera = null;
            }
            function clear() { exit(); pressed = null; demo?.dispose(); demo = null; onReady(false); }
            function bind() {
                if (disposed || viewer.view !== '3d' || viewer.path !== 'IRCA.kicad_pcb') return false;
                clear();
                try {
                    demo = new KiCadWebView.DemoController(viewer);
                    demo.addDisplay('site-screen', {
                        anchor: { reference: 'U2', face: 'top', faceSelection: 'outermost', minFaceAreaMm2: 300 }, mode: 'tft', width: 1024, height: 768,
                        onPress: event => { onInteract(); pressed = event.uv ? { ...event.uv } : null; },
                        onRelease: event => {
                            const start = pressed; pressed = null;
                            if (!event.cancelled && start && event.uv && Math.hypot(start.x - event.uv.x, start.y - event.uv.y) < .05) ui.press(event.uv);
                        }
                    });
                    const face = demo.getFace('site-screen');
                    if (!face.normal || face.width < 10 || face.height < 10) throw new Error('The display model is not ready.');
                    demo.addEventListener('suspend', () => { pressed = null; onReady(false); });
                    demo.addEventListener('error', () => { onStatus('Mini display unavailable. The board viewer remains interactive.'); });
                    paint(); onReady(true); onStatus('Tap the display to explore the site, or open the simulated thermal camera.');
                    return true;
                } catch (error) { clear(); onStatus('Mini display unavailable: ' + error.message); return false; }
            }
            function reframe() {
                if (!focused || !demo?.active) return;
                const face = demo.getFace('site-screen'), viewport = getViewport();
                const aspect = Math.max(.1, viewport.width / Math.max(1, viewport.height));
                const distance = Math.max(face.height, face.width / aspect) * 1.4;
                viewer.setCamera3D({ position: face.center.map((value, i) => value + face.normal[i] * distance), target: [...face.center], up: face.up || [0, 1, 0] });
            }
            function focus() {
                if (disposed || viewer.view !== '3d') return false;
                if (!demo?.active && !bind()) return false;
                onInteract(); viewer.clearSelection(); viewer.setInspectorOpen(false);
                if (!focused) {
                    savedCamera = viewer.getCamera3D(); focused = true;
                    viewer.setDemoInteraction(true); onFocusChange(true);
                }
                reframe();
                return true;
            }
            const viewChanged = () => { if (viewer.view !== '3d') clear(); };
            viewer.addEventListener('modelsready', bind);
            viewer.addEventListener('viewchange', viewChanged);
            function dispose() {
                if (disposed) return;
                clear(); disposed = true; ui.dispose();
                viewer.removeEventListener('modelsready', bind); viewer.removeEventListener('viewchange', viewChanged);
                viewer.removeEventListener('dispose', dispose);
            }
            viewer.addEventListener('dispose', dispose);
            return { focus, exit, reframe, showCamera() { if (focus()) ui.show('camera'); }, dispose };
        }
    };
})();
