(() => {
    'use strict';
    const start = document.getElementById('scripted-start');
    if (!start || !window.IRCAProject || !window.KiCadWebView) return;
    const api = window.KiCadWebView, project = window.IRCAProject;
    const status = document.getElementById('scripted-status');
    const pick = document.getElementById('scripted-pick');
    const run = document.getElementById('scripted-run');
    const level = document.getElementById('scripted-level');
    const theme = () => document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    let viewer, demo, tree, phase = 0, frame = 0, running = false, last = 0, marker, faceAbort, disposed = false, displayReady = false;
    const controls = enabled => { [pick, run, level].forEach(control => { control.disabled = !enabled; }); };
    function pause() {
        running = false; cancelAnimationFrame(frame); frame = 0;
        run.textContent = 'Run graphics'; run.setAttribute('aria-pressed', 'false');
    }
    function draw() {
        if (!demo?.active || !displayReady) return;
        const amount = Number(level.value);
        const ok = demo.drawDisplay('screen', (ctx, canvas) => {
            const w = canvas.width, h = canvas.height;
            ctx.fillStyle = '#081725'; ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = '#8aaabc'; ctx.font = '12px monospace'; ctx.fillText('IRCA / VIRTUAL TFT', 16, 23);
            ctx.fillStyle = '#effaff'; ctx.font = 'bold 30px sans-serif'; ctx.fillText(String(amount).padStart(2, '0'), 16, 61);
            ctx.fillStyle = '#8aaabc'; ctx.font = '12px monospace'; ctx.fillText('GRAPHICS LEVEL', 76, 55);
            ['#ff527d', '#54e2c2', '#5a9dff'].forEach((color, channel) => {
                ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath();
                for (let x = 16; x < w - 16; x++) {
                    const y = 110 + channel * 28 + Math.sin(x * .04 + phase + channel) * amount * .2;
                    if (x === 16) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                }
                ctx.stroke();
                ctx.fillStyle = color; ctx.fillRect(16 + channel * 96, h - 27, 86, 9);
            });
            if (marker) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.strokeRect(marker.x * w - 5, (1 - marker.y) * h - 5, 10, 10); }
            ctx.fillStyle = '#8aaabc'; ctx.font = '10px monospace'; ctx.fillText('SCRIPTED GRAPHICS / NOT TELEMETRY', 16, h - 37);
        });
        if (!ok) { pause(); status.textContent = 'Graphics could not be drawn. Restart the demo to retry.'; }
    }
    function animate(now) {
        frame = 0;
        if (!running || !demo?.active || document.hidden) return;
        if (now - last > 80) { last = now; phase += .16; draw(); }
        if (running) frame = requestAnimationFrame(animate);
    }
    function toggle() {
        if (!demo?.active || !displayReady) return;
        if (running) pause();
        else { running = true; run.textContent = 'Pause graphics'; run.setAttribute('aria-pressed', 'true'); frame = requestAnimationFrame(animate); }
    }
    function screenOptions(placement) {
        return { ...placement, mode: 'tft', width: 320, height: 240, onPress: event => {
            marker = event.uv || null; draw(); status.textContent = 'Display touch received · virtual input on the selected 3D face.';
        } };
    }
    function frameScreen() {
        const face = demo.getFace('screen');
        if (!face.normal) return;
        const distance = Math.max(face.width, face.height, 1) * 2.3;
        viewer.setInspectorOpen(false);
        viewer.setCamera3D({ position: face.center.map((n, i) => n + face.normal[i] * distance), target: [...face.center], up: face.up || [0, 1, 0] });
    }
    start.addEventListener('click', async () => {
        start.disabled = true; controls(false); pause(); displayReady = false; faceAbort?.abort(); demo?.dispose(); viewer?.dispose();
        status.textContent = 'Loading IRCA and attaching a virtual full-color display…';
        try {
            await project.ready(); if (disposed) return;
            document.getElementById('scripted-board').replaceChildren();
            viewer = project.createViewer('#scripted-board', { theme: theme() });
            await project.load(viewer, { view: '3d' }); if (disposed) return;
            demo = new api.DemoController(viewer);
            demo.bindKey('KeyP', { onDown: toggle });
            for (const [key, delta] of [['ArrowUp', 5], ['ArrowDown', -5]]) demo.bindKey(key, { repeat: true, onDown: () => {
                level.value = String(Math.max(0, Math.min(100, Number(level.value) + delta))); draw();
            } });
            demo.addEventListener('suspend', () => { pause(); controls(false); status.textContent = 'Scene changed. Restart the virtual display to bind it again.'; });
            demo.addEventListener('error', event => { pause(); status.textContent = 'Virtual display: ' + event.detail.error.message; });
            marker = null; pick.disabled = false;
            viewer.setCamera3D('isometric');
            status.textContent = 'IRCA loaded. Choose display face, then click the flat screen surface to attach the virtual TFT.';
            start.textContent = 'Restart virtual display';
        } catch (error) { demo?.dispose(); controls(false); status.textContent = 'Could not start the virtual display: ' + error.message; }
        finally { start.disabled = false; }
    });
    run.addEventListener('click', toggle);
    level.addEventListener('input', draw);
    pick.addEventListener('click', async () => {
        if (!demo?.active) return;
        const current = demo; faceAbort?.abort(); faceAbort = new AbortController();
        status.textContent = 'Click a flat component face in this 3D view. Escape cancels.';
        try {
            const face = await viewer.pickDemoFace({ signal: faceAbort.signal });
            if (current !== demo || !current.active || disposed) return;
            if (displayReady) current.remove('screen');
            displayReady = false; current.addDisplay('screen', screenOptions({ face })); displayReady = true; marker = null; controls(true); draw(); frameScreen();
            status.textContent = 'Virtual TFT attached to the selected face of ' + (face.reference || 'the component') + '.';
        } catch (error) { if (current === demo) status.textContent = error.name === 'AbortError' ? 'Face selection cancelled.' : 'Could not attach display: ' + error.message; }
    });
    const treeStatus = document.getElementById('hierarchy-status');
    const treeStart = document.getElementById('hierarchy-start');
    const treeControls = ['hierarchy-expand', 'hierarchy-collapse', 'hierarchy-export'].map(id => document.getElementById(id));
    let treeBusy = false;
    async function loadTree(files) {
        if (treeBusy || disposed) return;
        treeBusy = true; treeStart.disabled = true; treeControls.forEach(control => { control.disabled = true; });
        treeStatus.textContent = 'Reading saved schematic hierarchy…';
        try {
            if (!tree) { document.getElementById('hierarchy-board').replaceChildren(); tree = new api.ProjectTree('#hierarchy-board', { theme: theme() }); }
            if (files) {
                if ([...files].reduce((total, file) => total + file.size, 0) > 64 * 1024 * 1024) throw new Error('Choose at most 64 MiB of local files.');
                if (files.length === 1 && /\.zip$/i.test(files[0].name)) await tree.loadArchive(await files[0].arrayBuffer());
                else await tree.loadFiles(files);
            } else { await project.ready(); await tree.loadFiles((await project.files()).filter(file => /\.kicad_sch$/i.test(file.path))); }
            if (disposed) return;
            treeControls.forEach(control => { control.disabled = false; });
            treeStatus.textContent = files ? 'Local hierarchy loaded in your browser. Missing, cyclic or unresolved sheets remain labelled.' : 'IRCA has one schematic sheet. Open a local multi-sheet project to explore its branches.';
        } catch (error) { treeStatus.textContent = 'Could not read hierarchy: ' + error.message; }
        finally { treeBusy = false; treeStart.disabled = false; }
    }
    treeStart.addEventListener('click', () => loadTree());
    document.getElementById('hierarchy-files').addEventListener('change', event => { if (event.target.files.length) loadTree([...event.target.files]); event.target.value = ''; });
    treeControls[0].addEventListener('click', () => tree?.expandAll());
    treeControls[1].addEventListener('click', () => tree?.collapseAll());
    treeControls[2].addEventListener('click', () => {
        if (!tree) return;
        const url = URL.createObjectURL(new Blob([tree.toSVG()], { type: 'image/svg+xml' }));
        const link = document.createElement('a'); link.href = url; link.download = 'schematic-hierarchy.svg'; link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else if (running && demo?.active) frame = requestAnimationFrame(animate); });
    window.addEventListener('themeChanged', () => { viewer?.setTheme(theme()); tree?.setTheme(theme()); });
    window.addEventListener('pagehide', () => { disposed = true; faceAbort?.abort(); pause(); demo?.dispose(); viewer?.dispose(); tree?.dispose(); }, { once: true });
})();
