---
layout: webview-docs
title: 0.6.0 viewer refresh
permalink: /kicad-webview/docs/extension-refresh/
doc_section: extension-refresh
description: Exploded 3D inspection, native drawing previews, a floating sheet browser and independent hierarchy camera controls.
---

{% if site.data.webview_release.self_hosted == '0.6.0' %}
The self-hosted **0.6.0 SDK** includes these additions. {% if site.data.webview_release.npm == '0.6.0' %}The same release is available from npm and CDN.{% else %}npm/CDN remains at **{{ site.data.webview_release.npm }}** while its next publication propagates; use the matching self-hosted files for the APIs below.{% endif %}
{% else %}
This guide describes the **0.6.0 source refresh**. The currently listed self-hosted SDK is **{{ site.data.webview_release.self_hosted }}**, and npm/CDN is **{{ site.data.webview_release.npm }}**. Use a matching 0.6.0 build for these additions; this page does not announce an npm/CDN publication.
{% endif %}

The refresh brings selected read-only viewer capabilities from KiCad Online into the standalone library: exploded 3D inspection, saved drawing styles, a floating sheet browser and hierarchy navigation. It retains the [saved BoM and board-data panel](/kicad-webview/docs/bom-analytics/) and [WayriCAD result views](/kicad-webview/docs/wayricad-results/). Repository authentication, extension comments, design editing and the Fast PI solver/setup UI are outside this library.

[Open the OLIMEX workspace](/assets/demos/embed.html?example=olimex&workspace=true&view=3d&theme=dark) · [Quick start](/kicad-webview/docs/quick-start/#self-hosted-060-sdk) · [Release history](/kicad-webview/docs/releases/)

## Explode a 3D assembly

Load a board in **3D**, open the 3D tools and move **Explode**. Supported copper layers, through-via walls, component models and selected geometry separate for inspection. Return the slider to zero to restore the assembly. Spacing is display-only: it does not change saved stackup thickness, model placement or simulation coordinates. Unsupported blind/buried-via geometry is not inferred.

For host controls, call `viewer.setExplode(35)` after loading 3D, and read `viewer.getExplode()` for the current value. Values must be finite numbers from 0 to 100; setting an invalid value or setting explode outside a loaded 3D board throws. The getter returns zero outside 3D. See [Viewer methods](/kicad-webview/docs/api-viewer/#exploded-3d-inspection).

**Registered result overlays and their probes are hidden while exploded**, because their saved coordinates describe the assembled board. Visibility returns at zero. Measurement is disabled while exploded. Independently reading retained result data remains possible; exploded geometry is not a physical simulation.

The refresh separates pad/via cap depth precedence from unbiased walls to reduce shallow-angle copper striping. Right-drag panning does not trigger a context-menu pick on release. Confirm appearance on your target GPU; focused depth checks do not establish universal visual fidelity.

## Reopen the sheet browser

In the advanced `ProjectViewer`, choose **Show sheet browser**. A floating schematic hierarchy opens over the workspace. Drag its heading to move it, use its zoom and fit controls, and choose an available node to open the listed drawing. Close and reopen the panel without losing its tree view.

The navigator search accepts **sheet tree**, **sheet browser**, **sheet navigator** and **minimap** to reveal the command. Hosts can use:

```js
await project.openSheetBrowser();
project.closeSheetBrowser();
```

Here `project` is a loaded `ProjectViewer`. The browser uses the project's existing listed schematic files; saved sheet text does not authorize new URLs or repository access. Missing and unreadable links stay explicit. [Project methods](/kicad-webview/docs/api-project/#projectviewer).

## Control an independent hierarchy

The standalone `ProjectTree` needs no PCB renderer or WebGL context. Use **Zoom in**, **Zoom out**, **Fit** and **Reset view**, pan by dragging the background or using Alt-drag, or scroll normally on touch devices. Ordinary node selection remains available. Its camera is independent of the PCB, schematic and 3D cameras.

```js
const previous = tree.getCamera(); // {zoom, x, y}
tree.zoomBy(1.25);
tree.fit();                       // false until the viewport has usable dimensions
tree.setCamera(previous);
```

`zoom` is 0.35–2; `x` and `y` are nonnegative scroll offsets, limited to 1,000,000. `resetView()` restores zoom 1 and zero offsets. `clear()` cancels pending loading and clears the hierarchy while keeping the component mounted. See the [independent tree camera reference](/kicad-webview/docs/api-project/#independent-projecttree-camera).

## Saved schematic previews

Saved RGBA stroke/font colors, supported native fills and dash styles remain attached to their saved objects. Schematic text boxes render with saved bounds, margins and supported orientations. **Text wrapping uses approximate browser preview metrics**, with a visible warning; exact KiCad font layout is not promised.

Embedded PNGs are validated before preview: malformed base64/chunks/checksums, animated PNGs and external image URLs are rejected. Preview limits are 4 MiB per image, 8 MiB total image data, 16 megapixels total and 16 images per schematic. Decoded images are released on drawing replacement or disposal. Unsupported constructs remain diagnostic; embedded fonts and universal KiCad pixel parity are not supported claims.

Schematic labels, sheet pins and explicit power-symbol selections preserve saved electrical membership. Power flags do not become net names. More precise hit testing retains hidden-layer and isolated-selection rules. Existing adaptive curve flattening, duplicate-UUID exclusion and bounded source/net processing remain in place.

## Switching views and loading sheets

The viewer keeps at most **four camera/explode snapshots**, keyed to the exact saved source bytes, path and view. Returning to a matching PCB, schematic or 3D view restores its retained snapshot. Different source bytes do not inherit an old snapshot. This bounded in-memory cache is separate from a shareable view link; it does not retain inactive renderers or additional WebGL contexts.

Hierarchy loading fetches up to **three listed schematics concurrently**, keeping deterministic file order and the existing file, byte and cancellation limits. This is a loading contract, **not a measured physical-phone speedup** or a private-repository SSO integration.

## Plain script, no Node.js

Host the complete matching 0.6.0 release directory and its notices at the path used below. This page runs on an HTTP(S) static host without npm, Node.js or a build step in the browser. The example does not assume that a newer version is already published to npm/CDN.

```html
<div id="board" style="height:70dvh;min-height:360px"></div>
<p id="status" role="status">Opening board…</p>
<script src="/assets/lib/kicad-webview/releases/0.6.0/kicad-webview.min.js"></script>
<script>
const viewer = new KiCadWebView.Viewer('#board', {theme:'dark'});
window.addEventListener('pagehide', () => viewer.dispose(), {once:true});
viewer.load('/assets/demos/public-hardware/olimex-p4-project.json', {view:'3d'})
  .then(loaded => {
    if (!loaded) return;
    viewer.setExplode(35);
    document.querySelector('#status').textContent = 'Read-only exploded inspection';
  })
  .catch(error => { document.querySelector('#status').textContent = error.message; });
</script>
```

Replace the project URL with your own supported project; cross-origin sources need CORS. The OLIMEX project and models retain their upstream credits and licenses. KiCad WebView remains free to use commercially under MPL-2.0; paid implementation and support are optional.
