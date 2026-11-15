---
layout: webview-docs
title: Stable panels, contextual previews and palettes
permalink: /kicad-webview/docs/panels-and-insets/
doc_section: panels-and-insets
description: Keep the main camera steady, inspect saved selections in bounded contextual previews and choose a saved-result palette.
---

{% if site.data.webview_release.self_hosted == '0.7.0' %}
The self-hosted **0.7.0 SDK** includes these features. {% if site.data.webview_release.npm == '0.7.0' %}The matching package is also available from npm/CDN.{% else %}npm/CDN is **{{ site.data.webview_release.npm }}**; use the matching self-hosted build for these APIs.{% endif %}
{% else %}
This guide describes the upcoming **0.7.0 source refresh**. Published self-hosted and npm/CDN versions remain **{{ site.data.webview_release.self_hosted }}** and **{{ site.data.webview_release.npm }}**. Use a matching locally built distribution for the new APIs; publication is not announced here.
{% endif %}

The viewer keeps its own ribbon, popup styling, theme and visible controls. **Open contextual preview**, **Fit selection**, **Close** and the palette selector remain explicit actions. Saved identities automate locate, cross-selection and preview focus; they do not turn the viewer into an editor or a solver.

## Inspect without moving the drawing

The inspector is an overlay. Opening, closing or resizing it does not resize the canvas, refit the board or change the camera. Properties retain their scroll position during selection updates, and focus returns to the same action when it still exists. Loading a new source resets that scroll. Parts and Nets search inputs stay mounted while selection changes.

Drag the inspector's left edge, or focus its separator and use Left/Right, Shift+Left/Right, Home or End. Its preferred width is local to the viewer instance; temporary viewport clamps do not overwrite it. Narrow embeds use a bottom drawer. No panel preference is written to the host website's storage.

```js
viewer.setInspectorWidth(360); // finite number, 240–480 CSS pixels
viewer.setInspectorOpen(true);
const panel = viewer.getPanelState(); // {open, preferredWidth, width}
```

The displayed width may be smaller in a narrow host. [Viewer methods and events](/kicad-webview/docs/api-viewer/#panels-and-contextual-previews).

## Open a contextual preview

Select a saved part, pad or net, then choose **Open contextual preview** in Properties. The preview follows saved selections without moving the main camera. It has its own normal viewer controls and **Fit selection** / **Close** buttons. Opening another floating preview replaces the previous floating preview.

```js
const preview = await viewer.openInset(); // loaded native drawing; 2D by default
preview?.focus();                        // refocus the preview, not the parent
preview?.dispose();
```

For a schematic-to-PCB or PCB-to-schematic preview, explicitly supply another already-loaded viewer. A unique saved symbol/footprint UUID relationship establishes the link; a matching reference such as `U1` does not.

```js
// schematic and pcb are already-loaded Viewer instances.
const preview = await schematic.openInset({sourceViewer:pcb, view:'3d'});
```

Selections link in both directions without forcing Properties open on the receiving viewer. Same-drawing net links require identical source bytes and path. Sheet-local net names are not guessed across documents. Unsupported or ambiguous identities remain unlinked.

Each parent owns at most **two insets**. Insets close and release listeners/renderers when their parent or source viewer is disposed, or loads different source bytes or a different path. They render an explicitly supplied viewer's loaded source; they do not discover repository files, upload a drawing or fetch a project to find a match. Optional 3D previews use an additional bounded renderer and normal model-loading rules. Prefer default 2D previews on constrained devices.

## Add a host-managed inset without Node.js

Host the complete matching 0.7.0 distribution and notices at the local path in this example. A static HTTP(S) page needs no npm installation or Node.js runtime. This example uses the credited OLIMEX project; replace the manifest with your own supported project URL when integrating. Remote files require CORS.

```html
<div id="board" style="height:70dvh;min-height:360px"></div>
<div id="context" style="height:360px"></div>
<p id="status" role="status">Opening project…</p>
<script src="/vendor/kicad-webview-0.7.0/kicad-webview.min.js"></script>
<script>
const board = new KiCadWebView.Viewer('#board', {
  theme:'dark', inspectOnSelect:false
});
let inset;
window.addEventListener('pagehide', () => {
  inset?.dispose();
  board.dispose();
}, {once:true});
board.load('/assets/demos/public-hardware/olimex-p4-project.json', {view:'pcb'})
  .then(async loaded => {
    if (!loaded) return;
    board.setInspectorWidth(360);
    inset = new KiCadWebView.ViewerInset('#context', {parent:board, view:'pcb'});
    if (await inset.ready) {
      document.querySelector('#status').textContent = 'Select a saved part or net';
    }
  })
  .catch(error => { document.querySelector('#status').textContent = error.message; });
</script>
```

The main drawing and inset have independent cameras. When finished, dispose the inset before the parent. [Complete inset contract](/kicad-webview/docs/api-viewer/#viewerinset).

## Choose a saved-result palette

**Saved field palette** offers `wayricad` (the existing default), `viridis`, `inferno` and `grayscale`. Viridis and Inferno use four-stop approximations, rather than full scientific lookup tables. Missing samples stay transparent. The legend identifies the palette, original units and numerical endpoints.

```js
// results is a loaded WayriCADResultsViewer.
results.setPalette('viridis');
const palette = results.getPalette();
```

Palette changes preserve saved values, units, fixed frame ranges, source registration, probes and the standalone 3D camera. Independent 2D/3D fields and supported matching-source PCB overlays use the same palette stops. Invalid names throw before changing presentation. Registered fields and probes remain hidden during exploded inspection and return when assembled; a palette change does not override that rule. [Palette API](/kicad-webview/docs/wayricad-results/#field-palettes).

## Before and after

| Inspection task | Earlier release | 0.7 refresh |
| --- | --- | --- |
| Make Properties wider | Fixed panel width | A viewer-local preferred width with drag and keyboard controls; main camera stays fixed. |
| Inspect a detail beside the board | Use a separate viewer and wire host selection behavior | Open a bounded contextual preview using saved source identities, with its own camera. |
| Change a retained field's colors | Default WayriCAD palette | Four explicit palette choices sharing the same retained range and probes. |

{% assign panel_proof = site.data.webview_release.panel_comparison %}
{% if panel_proof.before_image and panel_proof.after_image %}
<figure>
  <p><strong>Before</strong></p>
  <img src="{{ panel_proof.before_image | relative_url }}" alt="{{ panel_proof.before_alt | escape }}" loading="lazy">
  <p><strong>After</strong></p>
  <img src="{{ panel_proof.after_image | relative_url }}" alt="{{ panel_proof.after_alt | escape }}" loading="lazy">
  {% if panel_proof.caption %}<figcaption>{{ panel_proof.caption | escape }}</figcaption>{% endif %}
</figure>
{% endif %}

The comparison concerns viewer behavior and presentation. Local source regressions and Chromium/GPU checks are separate from publication, installed-extension testing and physical-phone acceptance. Keep the target browser/GPU in your acceptance checks. No numerical result becomes more accurate because its palette changes.

KiCad WebView remains **free to use commercially under MPL-2.0**. Optional implementation, maintenance and support are paid services; buying them is not required to use the library. [License and support](/kicad-webview/docs/license/).


## Failed and overlapping requests

The accepted floating preview stays available until its replacement is ready.
Invalid options or a failed renderer leave the accepted preview and main camera
intact. Only the newest floating request is accepted; superseded requests return
`null`. Closing the accepted preview also cancels a pending replacement.

A preparing preview counts toward the two-inset limit. When both slots are
occupied, close one before requesting another; failure does not close either
accepted preview or allocate a third renderer.

Without an explicit initial `selection`, the preview uses the parent's current
selection after loading. Initialization is local to the preview: it cannot replay
a stale selection back to the parent. Explicit selection or `null` initializes
the preview without changing the parent's selection. Later clicks still use
normal saved-identity cross-selection.
