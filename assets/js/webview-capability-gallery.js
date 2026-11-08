(() => {
  'use strict';
  const root = document.querySelector('#capability-demos');
  if (!root) return;
  const panel = root.querySelector('#capability-panel'), stage = root.querySelector('#capability-stage');
  const controls = root.querySelector('#capability-controls'), status = root.querySelector('#capability-status');
  const api = window.KiCadWebView, project = window.IRCAProject;
  const olimex = '/assets/demos/public-hardware/olimex-p4-project.json';
  const marble = '/assets/demos/public-hardware/marble-selected-sheets.json';
  const theme = () => document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  const definitions = {
    compact: ['Compact embed', 'IRCA in a single read-only viewer. Switch drawings in its toolbar, fit, inspect and change theme.', 'quick-start/'],
    project: ['Advanced project', 'Navigate the approved IRCA files in split or single panes. The active pane controls file, part and net navigation.', 'api-project/'],
    inspection: ['Parts, pads and nets', 'Select saved geometry in the canvas or use the part/net lists. Hidden layers remain hidden during highlighting.', 'user-guide/#inspect-parts-pads-pins-and-nets'],
    layers: ['Saved layers', 'Toggle a layer set or use the native Layers controls. This changes the display, not the saved source.', 'api-viewer/#views-layers-and-measurement'],
    assembly: ['3D inspection and part focus', 'Try Bottom, then select a front-mounted part to see framing from its saved mounting side. Net selection accents saved copper.', 'user-guide/#navigate-the-drawing'],
    linked: ['Linked views and view URLs', 'Cross-select exact saved identities between two independent cameras. View links contain source hashes and state, not CAD or credentials.', 'api-project/#linkviewers'],
    hierarchy: ['Independent hierarchy', 'IRCA has one schematic sheet. The selected Marble root and PMOD sheets demonstrate a partial branch; other sheets stay labelled missing.', 'api-utilities/'],
    presentation: ['Carousel and rendering', 'Step through live IRCA views. Playback is opt-in; close the panel to release it. Presentation rendering may fall back on constrained GPUs.', 'api-project/#viewercarousel'],
    models: ['Virtual model controls', 'Choose actual planar faces to place a display, LED, button and knob. These are script-driven overlays, not firmware or circuit simulation.', 'model-interaction/'],
    analysis: ['Supplied PI analysis', 'The existing IRCA result is a computed normalized-load copper study. This panel displays supplied results; it does not run a solver.', 'user-guide/#display-supplied-analysis-results'],
    fabrication: ['Gerber and Excellon review', 'Approved IRCA fabrication review layers, source/tool inspection and the two-point millimetre ruler. Not a manufacturing qualification.', 'user-guide/#review-fabrication-files'],
    inputs: ['Native files, URLs and ZIPs', 'Choose your own local files or a public source. Local imports stay in the browser. Remote sources require CORS and normal authorization.', 'hosting/'],
    export: ['Export your own HTML', 'The browser-only exporter packages files you select. It does not upload them. This does not provide an IRCA CAD/model download.', 'quick-start/#export-a-self-contained-html-viewer'],
    integrations: ['Application and provider routes', 'HTML attachment support depends on the host client. Confluence needs Forge setup; Altium uses an external online provider.', 'hosting/']
  };
  let generation = 0, current;
  function dispose() {
    generation++;
    if (current) { current.abort.abort(); current.dispose.reverse().forEach(fn => { try { fn(); } catch {} }); }
    current = null; stage.replaceChildren(); stage.className = 'wv-gallery-stage'; controls.replaceChildren();
  }
  function element(tag, text, parent = controls) { const e = document.createElement(tag); if (text) e.textContent = text; parent.appendChild(e); return e; }
  function message(ctx, text) { if (current === ctx) status.textContent = text; }
  function own(ctx, object) { ctx.dispose.push(() => object.dispose()); return object; }
  function listen(ctx, target, event, handler) { target.addEventListener(event, handler, { signal: ctx.abort.signal }); }
  function button(ctx, text, action, parent = controls) {
    const e = element('button', text, parent); e.type = 'button';
    listen(ctx, e, 'click', async () => { e.disabled = true; try { await action(); } catch (error) { message(ctx, error.message); } finally { if (current === ctx) e.disabled = false; } }); return e;
  }
  function checkbox(ctx, text, checked, action, parent = controls) {
    const label = element('label', '', parent), input = document.createElement('input'); input.type = 'checkbox'; input.checked = checked; label.append(input, document.createTextNode(text));
    listen(ctx, input, 'change', () => { try { action(input.checked); } catch (error) { message(ctx, error.message); } }); return input;
  }
  function select(ctx, title, entries, action) {
    const label = element('label', title), input = element('select', '', label);
    for (const [value, text] of entries) { const option = element('option', text, input); option.value = value; }
    listen(ctx, input, 'change', async () => { try { await action(input.value); } catch (error) { message(ctx, error.message); } }); return input;
  }
  function pane() { return element('div', '', stage); }
  function watch(ctx, viewer) {
    ctx.viewers.push(viewer);
    listen(ctx, viewer, 'error', event => message(ctx, (event.detail?.error || event.detail)?.message || 'The view could not load.'));
    return own(ctx, viewer);
  }
  async function irca(ctx, view = 'pcb', path) {
    await project.ready(); if (current !== ctx) return null;
    const host = pane(); host.className = 'wv-gallery-pane';
    const viewer = watch(ctx, project.createViewer(host, { theme: theme(), inspectOnSelect: false }));
    await project.load(viewer, { view, ...(path ? { file: path } : {}), signal: ctx.abort.signal });
    return current === ctx ? viewer : null;
  }
  function common(ctx, viewer) {
    button(ctx, 'Fit', () => viewer.fit()); button(ctx, 'Light', () => viewer.setTheme('light')); button(ctx, 'Dark', () => viewer.setTheme('dark'));
    button(ctx, 'Inspect', () => viewer.setInspectorOpen(true));
    checkbox(ctx, 'Properties on selection', false, value => viewer.setInspectOnSelect(value));
  }
  function partsNets(ctx, viewer) {
    const parts = viewer.getParts().slice(0, 512), nets = viewer.getNets().slice(0, 512);
    select(ctx, 'Part', [['', 'Choose a saved part'], ...parts.map(p => [p.id, (p.reference + ' · ' + p.value).slice(0, 100)])], id => { if (id) viewer.selectPart(id, { locate: true }); });
    select(ctx, 'Net', [['', 'Choose a saved net'], ...nets.map(n => [n.id, n.name || '(unnamed net)'])], id => { if (id) viewer.selectNet(id); });
    button(ctx, 'Clear selection', () => viewer.clearSelection());
  }
  function layerControls(ctx, viewer) {
    const names = viewer.getLayers(), box = element('div'); box.className = 'wv-gallery-layers'; const inputs = [];
    for (const name of names) { const input = checkbox(ctx, name, true, () => viewer.setLayers(inputs.filter(item => item.input.checked).map(item => item.name)), box); inputs.push({ name, input }); }
    button(ctx, 'Show all layers', () => { inputs.forEach(x => { x.input.checked = true; }); viewer.setLayers(names); });
  }
  async function linked(ctx, initialState) {
    stage.classList.add('is-split');
    const left = await irca(ctx, 'pcb'); if (!left) return;
    const right = await irca(ctx, '3d'); if (!right) return;
    const group = own(ctx, api.linkViewers([left, right]));
    listen(ctx, group, 'link', event => message(ctx, 'Cross-selection applied: ' + event.detail.kind + '. The cameras remain independent.'));
    listen(ctx, group, 'linkerror', event => message(ctx, 'Cross-selection: ' + event.detail.error.message));
    const linking = checkbox(ctx, 'Cross-selection', true, value => group.setEnabled(value));
    button(ctx, 'Cross-probe a saved part', () => { const peers = right.getParts(); const candidates = part => peers.filter(peer => left.path === right.path ? part.uuid === peer.uuid : part.schematicUuid === peer.uuid || peer.schematicUuid === part.uuid); const part = left.getParts().find(p => candidates(p).length === 1); if (!part) throw Error('No unique saved component relationship is available in these drawings.'); left.selectPart(part.id, {locate:true}); if (!linking.checked) message(ctx, 'Part selected in the first view; enable Cross-selection to link its saved counterpart.'); });
    button(ctx, 'PCB ↔ 3D', async () => { group.setEnabled(false); try { await project.load(left, { view: 'pcb', signal: ctx.abort.signal }); } finally { if (current === ctx) group.setEnabled(linking.checked); } });
    button(ctx, 'Schematic ↔ 3D', async () => { group.setEnabled(false); try { await project.load(left, { file: 'IRCA.kicad_sch', view: 'schematic', signal: ctx.abort.signal }); } finally { if (current === ctx) group.setEnabled(linking.checked); } });
    const link = element('input'); link.type = 'text'; link.setAttribute('aria-label', 'Shareable view URL'); link.placeholder = 'Copy a view link or paste one to restore';
    async function restore(state) {
      if (state.views.length !== 2 || state.views.some(v => !['IRCA.kicad_pcb', 'IRCA.kicad_sch'].includes(v.path))) throw Error('Choose a two-view link for the approved IRCA review.');
      group.setEnabled(false);
      try { await api.restoreViewState([left, right], state, { signal: ctx.abort.signal, openFile: (index, path, signal) => project.load([left, right][index], { file: path, view: state.views[index].view, signal }) }); }
      finally { if (current === ctx) group.setEnabled(linking.checked); }
      message(ctx, 'View state restored after exact source-hash checks.');
    }
    button(ctx, 'Copy view URL', async () => {
      link.value = api.createViewLink(new URL('/kicad-webview/?demo-panel=linked', location.origin), await api.captureViewState([left, right]));
      try { await navigator.clipboard.writeText(link.value); message(ctx, 'View URL copied. It contains view state, not design bytes.'); }
      catch { link.select(); message(ctx, 'Select and copy the view URL from this field.'); }
    });
    button(ctx, 'Restore URL', async () => { const state = api.parseViewLink(link.value); if (!state) throw Error('Paste a supported view URL.'); await restore(state); });
    if (initialState) await restore(initialState);
  }
  async function models(ctx) {
    const viewer = await irca(ctx, '3d'); if (!viewer) return;
    const demo = own(ctx, new api.DemoController(viewer)); const installed = new Set(); let screenFace, mode = 'tft', dial = 25, picking = false;
    select(ctx, 'Focus component', [['', 'Choose a part before placing a control'], ...viewer.getParts().map(p => [p.id, (p.reference + ' · ' + p.value).slice(0, 100)])], id => { if (id) viewer.selectPart(id, {locate:true}); });
    const modes = { matrix: [16, 8], oled: [128, 64], lcd: [320, 240], tft: [320, 240] };
    function draw() { if (!installed.has('screen') || !demo.active) return; demo.drawDisplay('screen', (g, canvas) => { const w = canvas.width, h = canvas.height; g.fillStyle = '#071827'; g.fillRect(0, 0, w, h); g.fillStyle = mode === 'tft' ? '#e1bd62' : '#6bffd5'; if (mode === 'matrix') { for (let x = 0; x < 16; x++) for (let y = 0; y < 8; y++) if ((x + y + Math.round(dial / 10)) % 3) g.fillRect(x, y, 1, 1); } else { g.font = Math.max(10, Math.floor(w / 13)) + 'px sans-serif'; g.fillText('VIRTUAL ' + mode.toUpperCase(), w * .07, h * .26); g.fillText('Dial ' + dial, w * .07, h * .48); g.fillStyle = mode === 'tft' ? '#ff688f' : '#6bffd5'; g.fillRect(w * .07, h * .67, w * .8 * dial / 100, Math.max(2, h * .1)); } }); }
    function screen(face) { const [width, height] = modes[mode]; demo.addDisplay('screen', { face, mode, width, height, onPress: event => { if (event.uv) message(ctx, 'Display input UV: ' + event.uv.x.toFixed(2) + ', ' + event.uv.y.toFixed(2) + '. This is virtual input.'); } }); screenFace = face; installed.add('screen'); draw(); }
    async function pick(id, install) { if (!demo.active || picking) return; picking = true; const faceAbort = new AbortController(), abortPick = () => faceAbort.abort(); ctx.abort.signal.addEventListener('abort', abortPick, {once:true}); ctx.faceAbort = faceAbort; cancelPick.disabled = false; const placements = [...controls.querySelectorAll('button')].filter(b => b.textContent.startsWith('Place ')); placements.forEach(b => { b.disabled = true; }); message(ctx, 'Select a planar component face for the virtual ' + id + '. Use Cancel face selection to stop.'); try { const face = await viewer.pickDemoFace({ signal: faceAbort.signal }); if (current !== ctx || !demo.active) return; if (installed.has(id)) { demo.remove(id); installed.delete(id); } install(face); installed.add(id); message(ctx, 'Virtual ' + id + ' attached to ' + (face.reference || 'the selected component') + '.'); } catch(error) { if(error.name === 'AbortError') message(ctx, 'Face selection cancelled.'); else throw error; } finally { ctx.abort.signal.removeEventListener('abort', abortPick); ctx.faceAbort = null; cancelPick.disabled = true; picking = false; if (current === ctx && demo.active) placements.forEach(b => { b.disabled = false; }); } }
    select(ctx, 'Display mode', Object.keys(modes).map(x => [x, x.toUpperCase()]), value => { mode = value; if (installed.has('screen') && demo.active) { demo.remove('screen'); installed.delete('screen'); screen(screenFace); } }).value = mode;
    button(ctx, 'Place display', () => pick('screen', screen));
    button(ctx, 'Place LED', () => pick('led', face => demo.addLED('led', { face, on: true, brightness: .7, color: '#65ff84' })));
    button(ctx, 'Place button', () => pick('button', face => { demo.addButton('button', { face, label: 'Virtual button', onPress: () => { if (installed.has('led') && demo.active) demo.setLED('led', true); message(ctx, 'Virtual button pressed.'); }, onRelease: event => { if (installed.has('led') && demo.active) demo.setLED('led', false); message(ctx, event.cancelled ? 'Virtual button released after focus/scene cancellation.' : 'Virtual button released.'); } }); demo.bindKey('Space', { id: 'button', action: 'press' }); }));
    button(ctx, 'Place knob', () => pick('knob', face => { demo.addKnob('knob', { face, min: 0, max: 100, step: 1, value: dial, onChange: event => { dial = event.value; draw(); message(ctx, 'Virtual knob value: ' + dial); } }); demo.bindKey('ArrowUp', { id: 'knob', action: 'increment', repeat: true }); demo.bindKey('ArrowDown', { id: 'knob', action: 'decrement', repeat: true }); }));
    const cancelPick = element('button', 'Cancel face selection'); cancelPick.type = 'button'; cancelPick.disabled = true; listen(ctx, cancelPick, 'click', () => ctx.faceAbort?.abort());
    button(ctx, 'Toggle LED', () => { if (!installed.has('led')) throw Error('Place the virtual LED first.'); demo.toggle('led'); });
    const label = element('label', 'LED brightness'), brightness = element('input', '', label); brightness.type = 'range'; brightness.min = '0'; brightness.max = '1'; brightness.step = '.05'; brightness.value = '.7';
    listen(ctx, brightness, 'input', () => { if (installed.has('led') && demo.active) demo.setLED('led', { on: true, brightness: Number(brightness.value) }); });
    button(ctx, 'Focus keyboard', () => { demo.focus(); message(ctx, 'Focused board: Space holds the virtual button; Up/Down change the knob after placement.'); });
    listen(ctx, demo, 'suspend', () => message(ctx, 'Scene changed. Reopen this panel to bind new controls.'));
    listen(ctx, demo, 'error', event => message(ctx, event.detail.error.message));
  }
  async function show(key, initialState) {
    if (!definitions[key]) return; dispose(); panel.hidden = false;
    const ctx = { id: generation, abort: new AbortController(), dispose: [], viewers: [] }; current = ctx;
    const [title, help, docs] = definitions[key]; root.querySelector('#capability-panel-title').textContent = title; root.querySelector('#capability-panel-help').textContent = help;
    root.querySelector('#capability-docs').href = '/kicad-webview/docs/' + docs;
    root.querySelectorAll('[data-demo-panel]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.demoPanel === key)));
    message(ctx, 'Opening panel…');
    try {
      if (!api || !project) throw Error('The viewer runtime is unavailable. Reload the page to retry.');
      if (key === 'export') { const frame = element('iframe', '', stage); frame.title = 'Export your own interactive HTML locally'; frame.src = '/assets/lib/kicad-webview/releases/0.1.0-beta.2/export.html'; }
      else if (key === 'integrations') {
        stage.classList.add('is-info');
        const list = element('ul', '', stage);
        for (const text of ['Slack and Notion: export your own HTML and use a client that supports interactive HTML attachments. Host/client support varies.', 'Confluence: Forge adapter source and setup are available; a live installed macro is not claimed here.', 'Altium: external online-provider beta. Its design processing and fidelity are not verified by native KiCad tests.']) element('li', text, list);
        const label = element('label', 'Public Altium archive URL'), input = element('input', '', label); input.type = 'url'; input.placeholder = 'https://public.example/design.zip';
        element('p', 'Opening the provider sends this public archive URL to Altium. Do not use private or signed URLs.', stage);
        button(ctx, 'Open Altium provider beta', async () => { ctx.provider?.dispose(); ctx.providerHost?.remove(); const target = element('div', '', stage); target.style.height = '500px'; ctx.providerHost = target; const provider = own(ctx, new api.AltiumViewer(target)); ctx.provider = provider; await provider.load(input.value); message(ctx, 'Provider frame opened. Verify processing and any errors inside its own interface; this is not a native-render readiness signal.'); });
      }
      else if (key === 'inputs') {
        const host = pane(); host.className = 'wv-gallery-pane'; const viewer = watch(ctx, new api.Viewer(host, { theme: theme() }));
        const label = element('label', 'Your local files or ZIP'), input = element('input', '', label); input.type = 'file'; input.multiple = true;
        listen(ctx, input, 'change', async () => { try { const files = [...input.files]; if (!files.length) return; if (files.length > 256 || files.reduce((n, f) => n + f.size, 0) > 64 * 1024 * 1024) throw Error('Choose up to 256 files and 64 MiB total.'); if (files.length === 1 && /\.zip$/i.test(files[0].name)) await viewer.loadArchive(await files[0].arrayBuffer(), { signal: ctx.abort.signal }); else await viewer.loadFiles(files, { signal: ctx.abort.signal }); message(ctx, 'Local design loaded in browser memory. No upload occurred.'); } catch (error) { message(ctx, error.message); } });
        const url = element('input'); url.type = 'url'; url.setAttribute('aria-label', 'Public drawing, manifest, GitHub or ZIP URL'); url.value = new URL(olimex, location.origin).href;
        button(ctx, 'Load public URL', async () => { message(ctx, 'Loading the selected public source…'); await viewer.load(url.value, { signal: ctx.abort.signal }); message(ctx, 'Public source loaded. Inspect the viewer diagnostics for unsupported constructs.'); }); common(ctx, viewer);
      }
      else if (key === 'linked') await linked(ctx, initialState);
      else if (key === 'models') await models(ctx);
      else if (key === 'project') {
        await project.ready(); if (current !== ctx) return; const host = pane(); host.className = 'wv-gallery-pane';
        const workspace = own(ctx, project.createWorkspace(host, { theme: theme(), layout: 'split', linkedSelection: true })); ctx.themed = workspace;
        await project.load(workspace, { signal: ctx.abort.signal }); button(ctx, 'Single pane', () => workspace.setLayout('single')); button(ctx, 'Split panes', () => workspace.setLayout('split')); button(ctx, 'Toggle navigator', () => { ctx.navOpen = !ctx.navOpen; workspace.setNavigatorOpen(ctx.navOpen); }); ctx.navOpen = true;
      }
      else if (key === 'hierarchy') {
        const host = pane(); host.className = 'wv-gallery-pane'; const tree = own(ctx, new api.ProjectTree(host, { theme: theme() })); ctx.themed = tree;
        await tree.loadFiles((await project.files()).filter(f => f.path.endsWith('.kicad_sch')));
        button(ctx, 'IRCA single sheet', async () => tree.loadFiles((await project.files()).filter(f => f.path.endsWith('.kicad_sch'))));
        button(ctx, 'Marble selected branch · 3.16 MB', async () => { await tree.load(marble, { signal: ctx.abort.signal }); message(ctx, 'Selected Marble root and PMOD branch. Other children remain missing. CERN-OHL-1.2 applies to the upstream hardware.'); });
        button(ctx, 'Expand', () => tree.expandAll()); button(ctx, 'Collapse', () => tree.collapseAll());
        button(ctx, 'Export SVG', () => { const url = URL.createObjectURL(new Blob([tree.toSVG()], { type: 'image/svg+xml' })); const a = document.createElement('a'); a.href = url; a.download = 'project-hierarchy.svg'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); });
      }
      else if (key === 'fabrication') {
        const host = pane(); host.className = 'wv-gallery-pane'; const viewer = watch(ctx, new api.Viewer(host, { theme: theme() })); await viewer.loadFiles(await project.fabrication(), { signal: ctx.abort.signal });
        common(ctx, viewer); layerControls(ctx, viewer); checkbox(ctx, 'Two-point ruler', false, value => viewer.setMeasuring(value));
        listen(ctx, viewer, 'measure', () => message(ctx, 'Measurement updated in the viewer. Distances are millimetres; this review does not qualify fabrication.'));
      }
      else {
        const viewer = await irca(ctx, ['assembly', 'presentation'].includes(key) ? '3d' : 'pcb'); if (!viewer) return; common(ctx, viewer);
        if (['inspection', 'assembly'].includes(key)) partsNets(ctx, viewer);
        if (key === 'layers') layerControls(ctx, viewer);
        if (key === 'compact') { button(ctx, 'Schematic', () => project.load(viewer, { file: 'IRCA.kicad_sch', view: 'schematic', signal: ctx.abort.signal })); button(ctx, 'PCB', () => project.load(viewer, { view: 'pcb', signal: ctx.abort.signal })); }
        if (key === 'assembly' || key === 'presentation') {
          for (const side of ['top', 'bottom', 'isometric']) button(ctx, side[0].toUpperCase() + side.slice(1), () => viewer.setCamera3D(side));
          select(ctx, 'Render quality', [['balanced', 'Balanced'], ['high', 'High'], ['presentation', 'Presentation']], quality => message(ctx, 'Active render quality: ' + viewer.setRenderQuality(quality) + '. This is raster presentation, not path tracing or model validation.'));
        }
        if (key === 'presentation') {
          const files = await project.files(), pcb = files.find(f => f.path.endsWith('.kicad_pcb')), sch = files.find(f => f.path.endsWith('.kicad_sch'));
          const carouselHost = element('div'); carouselHost.style.flexBasis = '100%';
          const carousel = own(ctx, new api.ViewerCarousel(carouselHost, { viewer, slides: [{ label: 'PCB layout', source: pcb.source, options: { path: pcb.path }, view: 'pcb' }, { label: 'Assembly · isometric', source: pcb.source, options: { path: pcb.path }, view: '3d', camera3D: 'isometric' }, { label: 'Assembly · bottom', view: '3d', camera3D: 'bottom' }, { label: 'Schematic', source: sch.source, options: { path: sch.path }, view: 'schematic' }], interval: 7000 }));
          await carousel.show(1); listen(ctx, document, 'visibilitychange', () => { if (document.hidden) carousel.pause(); }); ctx.pause = () => carousel.pause();
        }
        if (key === 'analysis') {
          await viewer.setAnalysis(await project.analysis()); const fields = viewer.getAnalysis().fields;
          select(ctx, 'Result field', fields.map(f => [f.id, f.name + ' · ' + f.unit]), id => viewer.setAnalysisField(id));
          button(ctx, 'Clear overlay', () => viewer.clearAnalysis()); button(ctx, 'Reload result', async () => viewer.setAnalysis(await project.analysis()));
          const summary = await project.study(); message(ctx, 'Computed normalized-load IRCA study. Read the native overlay assumptions and the study section; this is supplied data, not a solver run.'); ctx.study = summary;
        }
      }
      if (current === ctx && !status.textContent.startsWith('Computed')) message(ctx, 'Panel ready. ' + help);
    } catch (error) { message(ctx, 'Panel could not open: ' + error.message); }
  }
  root.querySelectorAll('[data-demo-panel]').forEach(b => b.addEventListener('click', () => { show(b.dataset.demoPanel); panel.scrollIntoView({block:'start'}); }));
  root.querySelector('#capability-close').addEventListener('click', () => { const selected = root.querySelector('[data-demo-panel][aria-pressed="true"]'); dispose(); panel.hidden = true; root.querySelectorAll('[data-demo-panel]').forEach(b => b.setAttribute('aria-pressed', 'false')); selected?.focus({preventScroll:true}); selected?.scrollIntoView({block:'center'}); });
  window.addEventListener('themeChanged', () => { current?.viewers.forEach(v => v.setTheme(theme())); current?.themed?.setTheme(theme()); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) current?.pause?.(); });
  if ('IntersectionObserver' in window) { const observer = new IntersectionObserver(entries => { if (!entries[0].isIntersecting) current?.pause?.(); }); observer.observe(panel); window.addEventListener('pagehide', () => observer.disconnect(), { once: true }); }
  window.addEventListener('pagehide', dispose, { once: true });
  if (new URLSearchParams(location.search).get('demo-panel') === 'linked') { try { const state = api?.parseViewLink(location.href); if (state) show('linked', state).then(() => panel.scrollIntoView({block:'start'})); } catch (error) { panel.hidden = false; status.textContent = error.message; } }
})();
