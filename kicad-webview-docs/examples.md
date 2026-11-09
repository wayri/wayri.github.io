---
layout: webview-docs
title: Examples
permalink: /kicad-webview/docs/examples/
doc_section: examples
---

These independent examples use the **0.1.0-beta.2** ES module directly from the versioned release. Paste one example into its own HTML page served over HTTPS or localhost. No package manager or build step is needed. The OLIMEX manifest includes its PCB, schematic and 28 component assets. Its display PCB remaps model paths and normalizes equivalent legacy footprint identity fields; electrical and physical geometry is unchanged. Original upstream sources, model coverage, conversions and licensing are linked below.

For a first classic-script embed, ZIP self-host or iframe, use [Quick start](/kicad-webview/docs/quick-start/). The release uses [MPL-2.0](/kicad-webview/docs/license/); input designs and model files have separate terms.

## Public hardware examples

The [product page’s public examples](/kicad-webview/#public-examples) add two independently licensed designs: **OLIMEX ESP32-P4-DevKit, Rev D1**, under **CERN-OHL-S-2.0**, and **Marble**, under **CERN-OHL-1.2**. Follow each example’s source README and retained license/provenance before reusing hardware files. Their hardware terms are separate from the viewer’s MPL-2.0 license. A successful render is not a hardware validation result.

- [OLIMEX source README, pinned revision `26705d3`](https://github.com/OLIMEX/ESP32-P4-DevKit/blob/26705d36407a07324348927dfd30fbf4ffc1d94c/README.md): Rev D1 PCB and schematic. The hardware’s CERN-OHL-S-2.0 terms are separate from the upstream software and documentation licenses.
- [Marble source README, pinned revision `a426777`](https://github.com/BerkeleyLab/Marble/blob/a426777d92c0f22a546d4740b419a3937e0c1f90/README.md): the PCB and all 25 saved schematic sheets. Exact available model assets are included; most custom CERN/vendor models are absent from the public project, so its 3D assembly still uses labelled stand-ins. Hardware copyright and contributor credits remain with their upstream authors under CERN-OHL-1.2.

Explore the [capability demos](/kicad-webview/#capability-demos) and use [Interactive models & displays](/kicad-webview/docs/model-interaction/) for a complete face-picking example with virtual LEDs, displays, buttons and knobs.

## Link a layout and assembly

Both viewers load the same exact saved PCB. Selecting a supported part or object in one view forwards its saved identity to the other; cameras remain independently navigable. The host owns both viewers and the link group.

```html
<style>
  #views { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,360px),1fr)); gap:12px; }
  #views > div { height:480px; min-width:0; }
</style>
<div id="views"><div id="layout"></div><div id="assembly"></div></div>
<p id="status" role="status">Loading the public OLIMEX board…</p>
<script type="module">
import { Viewer, linkViewers } from 'https://wayri.github.io/assets/lib/kicad-webview/releases/0.1.0-beta.2/kivi-viewer.js';
const project = 'https://wayri.github.io/assets/demos/public-hardware/olimex-p4-project.json';
const layout = new Viewer('#layout', { theme:'dark' });
const assembly = new Viewer('#assembly', { theme:'dark' });
const abort = new AbortController();
let links;
window.addEventListener('pagehide', () => {
  abort.abort(); links?.dispose(); layout.dispose(); assembly.dispose();
}, { once:true });
try {
  const loaded = await Promise.all([
    layout.load(project, { file:'ESP32-P4-DevKit_Rev_D1.kicad_pcb', view:'pcb', signal:abort.signal }),
    assembly.load(project, { file:'ESP32-P4-DevKit_Rev_D1.kicad_pcb', view:'3d', signal:abort.signal })
  ]);
  if (loaded.every(Boolean)) {
    links = linkViewers([layout, assembly]);
    document.querySelector('#status').textContent = 'Select a saved component or copper object.';
  }
} catch (error) {
  if (!abort.signal.aborted) document.querySelector('#status').textContent = error.message;
}
</script>
```

For schematic cross-probing, load the actual sheet containing the saved symbol in another viewer. Equal reference or net text alone is not a match. See [project and link APIs](/kicad-webview/docs/api-project/).

## Add an opt-in board tour

This example shows the first slide explicitly. The carousel supplies its own Previous/Next/Play controls. Presentation rendering is also an explicit opt-in and may fall back to Balanced.

```html
<div id="board" style="height:70dvh;min-height:360px"></div>
<div id="tour"></div>
<button id="quality" type="button">Try presentation rendering</button>
<p id="status" role="status"></p>
<script type="module">
import { Viewer, ViewerCarousel } from 'https://wayri.github.io/assets/lib/kicad-webview/releases/0.1.0-beta.2/kivi-viewer.js';
const viewer = new Viewer('#board', { theme:'dark' });
const button = document.querySelector('#quality'); button.disabled = true;
let tour;
window.addEventListener('pagehide', () => { tour?.dispose(); viewer.dispose(); }, { once:true });
try {
  if (await viewer.load('https://wayri.github.io/assets/demos/public-hardware/olimex-p4-project.json', { view:'3d' })) {
    tour = new ViewerCarousel('#tour', { viewer, interval:6500, slides:[
      { label:'Assembly overview', view:'3d', camera3D:'isometric', clearSelection:true },
      { label:'Top assembly', view:'3d', camera3D:'top' },
      { label:'Bottom assembly', view:'3d', camera3D:'bottom' }
    ] });
    tour.addEventListener('error', e => { document.querySelector('#status').textContent = e.detail.error.message; });
    await tour.show(0); button.disabled = false;
  }
} catch (error) { document.querySelector('#status').textContent = error.message; }
button.addEventListener('click', () => {
  document.querySelector('#status').textContent = 'Active quality: ' + viewer.setRenderQuality('presentation');
});
</script>
```

Avoid concurrent direct loads while a slide transition is in progress. Dispose the carousel before its viewer. This renders saved geometry; missing models and their warnings remain. See the [carousel reference](/kicad-webview/docs/api-project/#viewercarousel) and [viewer rendering methods](/kicad-webview/docs/api-viewer/).

## Show a sheet hierarchy

The tree loads listed schematic sources independently of a PCB/WebGL viewer. SVG export contains the bounded diagram, not the native schematic source or an electrical netlist.

```html
<div id="tree" style="height:60dvh;min-height:360px"></div>
<button id="expand" type="button" disabled>Expand all</button>
<button id="save" type="button" disabled>Download diagram SVG</button>
<p id="status" role="status"></p>
<script type="module">
import { ProjectTree } from 'https://wayri.github.io/assets/lib/kicad-webview/releases/0.1.0-beta.2/kivi-viewer.js';
const tree = new ProjectTree('#tree', { theme:'dark' });
const expand = document.querySelector('#expand'), save = document.querySelector('#save');
window.addEventListener('pagehide', () => tree.dispose(), { once:true });
try {
  if (await tree.load('https://wayri.github.io/assets/demos/public-hardware/olimex-p4-project.json')) {
    expand.disabled = save.disabled = false;
  }
} catch (error) { document.querySelector('#status').textContent = error.message; }
expand.addEventListener('click', () => tree.expandAll());
save.addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([tree.toSVG()], { type:'image/svg+xml' }));
  const link = document.createElement('a'); link.href = url; link.download = 'olimex-hierarchy.svg';
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
</script>
```

Use a complete manifest or file bundle to resolve child sheets. A direct root schematic URL can show its child references as missing. See [hierarchy reference](/kicad-webview/docs/api-utilities/).

## Paint an interactive virtual display

Choose an actual planar component face after the project loads. This creates a **virtual graphic**, not firmware or an electrical display. Tap it to update a touch marker. The display does not navigate to arbitrary URLs supplied by the design.

```html
<div id="board" style="height:70dvh;min-height:400px"></div>
<button id="choose" type="button" disabled>Choose a display face</button>
<p id="status" role="status">Loading…</p>
<script type="module">
import { Viewer, DemoController } from 'https://wayri.github.io/assets/lib/kicad-webview/releases/0.1.0-beta.2/kivi-viewer.js';
const viewer = new Viewer('#board', { theme:'dark', inspectOnSelect:false });
const choose = document.querySelector('#choose'), status = document.querySelector('#status');
let demo, taps = 0, marker;
window.addEventListener('pagehide', () => { demo?.dispose(); viewer.dispose(); }, { once:true });
function paint() {
  demo.drawDisplay('screen', (ctx, canvas) => {
    ctx.fillStyle = '#091117'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#dfbf48'; ctx.font = 'bold 48px sans-serif';
    ctx.fillText('VIRTUAL DISPLAY', 40, 80);
    ctx.fillStyle = '#edf2f4'; ctx.font = '36px sans-serif';
    ctx.fillText('Tap count: ' + taps, 40, 145);
    if (marker) {
      ctx.beginPath(); ctx.arc(marker.x * canvas.width, (1-marker.y) * canvas.height, 18, 0, Math.PI*2); ctx.fill();
    }
  });
}
try {
  if (await viewer.load('https://wayri.github.io/assets/demos/public-hardware/olimex-p4-project.json', { view:'3d' })) {
    choose.disabled = false; status.textContent = 'Choose a face on the loaded 3D geometry.';
  }
} catch (error) { status.textContent = error.message; }
choose.addEventListener('click', async () => {
  choose.disabled = true;
  try {
    const face = await viewer.pickDemoFace();
    demo?.dispose(); demo = new DemoController(viewer);
    demo.addDisplay('screen', { face, mode:'tft', width:1024, height:768,
      onRelease: event => {
        if (!event.cancelled && event.uv) { marker = event.uv; taps++; paint(); }
      }
    });
    demo.addEventListener('suspend', () => { status.textContent = 'Scene changed; choose a face again.'; });
    demo.addEventListener('error', event => { status.textContent = event.detail.error.message; });
    paint(); status.textContent = 'Tap the selected face. This is a scripted presentation.';
  } catch (error) { status.textContent = error.message; }
  finally { choose.disabled = false; }
});
</script>
```

The UV-to-pixel mapping is chosen by this example. A face's geometry sets the physical aspect ratio; a selected token is invalid after source/view replacement. Buttons, knobs and LEDs use explicit saved anchors or supported faces; check their identities rather than copying references from another design. See [DemoController API](/kicad-webview/docs/api-utilities/).

## Attach a reviewed analysis file

This example loads the public PCB in 2D and lets the reader choose an analysis JSON file locally. The data must contain the exact board source hash and the release's validated rectangular-sample schema. It supplies no fabricated numerical result and does not run a solver.

```html
<div id="board" style="height:70dvh;min-height:360px"></div>
<label>Matching analysis JSON <input id="results" type="file" accept=".json" disabled></label>
<p id="status" role="status"></p>
<script type="module">
import { Viewer } from 'https://wayri.github.io/assets/lib/kicad-webview/releases/0.1.0-beta.2/kivi-viewer.js';
const viewer = new Viewer('#board');
const input = document.querySelector('#results'), status = document.querySelector('#status');
window.addEventListener('pagehide', () => viewer.dispose(), { once:true });
try {
  if (await viewer.load('https://wayri.github.io/assets/demos/public-hardware/olimex-p4-project.json', { view:'pcb' })) input.disabled = false;
} catch (error) { status.textContent = error.message; }
input.addEventListener('change', async () => {
  const file = input.files[0]; if (!file) return;
  try {
    if (file.size > 8 * 1024 * 1024) throw new Error('Analysis JSON exceeds 8 MiB.');
    if (await viewer.setAnalysis(await file.text())) {
      status.textContent = 'Result loaded. Review its provenance, units and assumptions in the viewer.';
    }
  } catch (error) { status.textContent = error.message; }
});
</script>
```

The library rejects a wrong source hash rather than fitting the data to a similar-looking PCB. For another board, load its exact saved source and provide matching results. See [analysis contract](/kicad-webview/docs/api-utilities/) for coordinate convention, fields, provenance and limits.

## Integrate with a component framework

Construct a viewer after the mount element exists. Cancel pending work on unmount, dispose helper objects before their viewer, and ignore completions after the component is no longer current. Do not create a new renderer on every reactive value update. Use the viewer's setters for theme, layers and selection; source replacement has its own cancellation and disposal semantics.

For share-link replay, first load the allowed project, then validate/restore the state while linked propagation is suspended. A restore is not transactional, and it never grants permission to fetch an arbitrary fragment-derived URL. See the [viewer lifecycle](/kicad-webview/docs/api-viewer/), [view-state API](/kicad-webview/docs/api-project/#view-state) and [hosting/security guidance](/kicad-webview/docs/hosting/).

## Public project completeness and model coverage

Drawings and model files load on demand. Marble’s board is approximately 44 MB; allow time and memory on a phone. Its full project manifest exposes every saved sheet through the file menu and advanced project navigator. Public example viewers can be closed to release their renderer.

OLIMEX has models for 141 of its 168 saved footprints (all footprints with a resolvable saved model); an extra removable microSD card model is unavailable. Marble has exact model assets for 19 of 1006 footprints. Its missing custom CERN/vendor assets cannot be reconstructed from a schematic or footprint and are not represented as complete mechanical geometry.

The [drawing provenance](/assets/demos/public-hardware/PROVENANCE.json) and [model provenance, coverage and conversion evidence](/assets/demos/public-hardware/MODEL-PROVENANCE.json) retain upstream revisions, credits, licenses, hashes and geometry-preservation checks. Converted models remain separate selectable components. Compatible mesh batching reduces draw calls without merging the board into one object.

## Current website demo pages

- [IRCA, OLIMEX and Marble viewer](/assets/demos/direct.html)
- [Responsive iframe viewer](/assets/demos/embed.html)
- [Virtual controls on IRCA models](/assets/demos/model-interaction.html)
- [Export your own design as HTML](/assets/demos/export.html)

Older hosted demonstration URLs forward to these current pages. The original versioned SDK files and downloadable ZIP archives retain their release contents and notices; they are not the current website showcases.
