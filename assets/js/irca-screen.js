(() => {
    'use strict';
    window.IRCAMiniScreen = {
        attach(viewer, { onInteract = () => {}, onReady = () => {}, onStatus = () => {} } = {}) {
            let demo, pressed, disposed = false;
            const ui = IRCAMiniUI.create({ navigate: path => window.location.assign(new URL(path, document.baseURI)), onChange: () => paint() });
            function paint() {
                if (!demo?.active || disposed) return;
                demo.drawDisplay('site-screen', (ctx, canvas) => ui.draw(ctx, canvas));
            }
            function clear() { pressed = null; demo?.dispose(); demo = null; onReady(false); }
            function bind() {
                if (disposed || viewer.view !== '3d' || viewer.path !== 'IRCA.kicad_pcb') return false;
                clear();
                try {
                    demo = new KiCadWebView.DemoController(viewer);
                    demo.addDisplay('site-screen', {
                        anchor: { reference: 'U2', face: 'top', faceSelection: 'outermost', minFaceAreaMm2: 300 }, mode: 'tft', width: 320, height: 240,
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
            function focus() {
                if (disposed || viewer.view !== '3d') return false;
                if (!demo?.active && !bind()) return false;
                onInteract(); viewer.clearSelection(); viewer.setInspectorOpen(false);
                const face = demo.getFace('site-screen'), distance = Math.max(face.width, face.height) * 1.45;
                viewer.setCamera3D({ position: face.center.map((value, i) => value + face.normal[i] * distance), target: [...face.center], up: face.up || [0, 1, 0] });
                return true;
            }
            const viewChanged = () => { if (viewer.view !== '3d') clear(); };
            viewer.addEventListener('modelsready', bind);
            viewer.addEventListener('viewchange', viewChanged);
            function dispose() {
                if (disposed) return;
                disposed = true; clear(); ui.dispose();
                viewer.removeEventListener('modelsready', bind); viewer.removeEventListener('viewchange', viewChanged);
                viewer.removeEventListener('dispose', dispose);
            }
            viewer.addEventListener('dispose', dispose);
            return { focus, showCamera() { if (focus()) ui.show('camera'); }, dispose };
        }
    };
})();
