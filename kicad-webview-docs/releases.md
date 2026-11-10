---
layout: webview-docs
title: What’s new in KiCad WebView
permalink: /kicad-webview/docs/releases/
doc_section: releases
description: KiCad WebView 0.2.1 highlights, layer inspection, mobile performance improvements and integration examples.
---

## 0.2.1 — inspection controls and mobile embedding

Version **0.2.1** is available from [npm](https://www.npmjs.com/package/@wayrisignals/kicad-webview/v/0.2.1), jsDelivr, UNPKG and the [versioned self-hosted files](/assets/lib/kicad-webview/releases/0.2.1/RELEASE.json). It is **free to use, including commercially, under MPL-2.0**; paid implementation, maintenance and support help is optional. [Release download and source](https://github.com/wayri/kicad-webview/releases/tag/v0.2.1).

[Try PCB inspection](/assets/demos/embed.html?example=olimex&view=pcb&theme=dark) · [Explore 3D copper](/assets/demos/embed.html?example=olimex&view=3d&theme=dark) · [Open the project workspace](/assets/demos/embed.html?example=olimex&workspace=true&view=pcb&theme=dark)

### Highlight the design your way

Open **Highlight settings** to choose **Dim context**, **Bright only** or **Isolate selection**, with **Accent color** or **Source colors**. Styles apply to saved parts, pads and nets in schematic, PCB and 3D views. Select a part or trace before comparing them. Clearing selection restores the source appearance, and hidden layers stay hidden.

Choose whether clicks open saved properties with `inspectOnSelect`. Highlight settings belong to each viewer instance; linked selections can remain synchronized while panes use independent display settings.

### Find and focus layers

The **Layers** panel searches saved layer names and shows layer colors and primitive counts. Use All, None, Front, Back or Copper presets. In **2D PCB view**, Focus dims or isolates a layer, Fit focused layer frames its geometry, and Restore view recovers the saved visibility. With the drawing focused, `[` and `]` cycle layers and `Shift+F` fits the focused layer; text fields retain their normal keys.

In **3D**, choose saved copper layers independently. **Reveal internal copper** switches to Translucent appearance, where internal copper becomes visible through the board and models. Focus and fit are 2D PCB operations. Where a complete saved stackup is unavailable, internal layer elevations are labelled illustrative.

The advanced workspace also has a **Layers** navigator tab for its active pane. Cross-selection does not force every pane to use the same layer visibility.

### Lighter mobile integrations

Named KiCad files reuse one source-scoped parser result for drawing geometry, net information and later 3D switches. Unchanged file menus and theme icons retain their nodes. Net-only selection avoids constructing component bounds and outline buffers.

3D frames pause when the embed is off-screen, the document is hidden, the container has no size or its graphics context is interrupted. Pending changes remain dirty and refresh when the view becomes available. This suspends drawing; it does not cancel an already-running parse, model decoding or a caller’s animation timer. Browsers without IntersectionObserver retain the document, size and context checks.

The website’s direct and embedded demos start loading the design when the viewer approaches the screen; Load starts immediately. The approved IRCA runtime is loaded only when an IRCA example is requested. Switching between it and the released SDK opens a fresh document to keep their renderers separate.

#### What was measured

Three samples used the credited OLIMEX ESP32-P4-DevKit Rev.D1 PCB in a **340-pixel-wide desktop Chromium embed**, Balanced rendering and proxy component models. Source download was excluded.

| Measurement | Previous working build | 0.2.1 candidate |
| --- | ---: | ---: |
| Median source-to-PCB load | 507.7 ms | 296.5 ms |
| Median 3D mount | 1263.3 ms | 736.0 ms |
| Draws during 20 separated off-screen display updates | 20 | 0 |

The two timing medians were approximately **42% lower in this sample**. Returning the viewer to the screen produced one coalesced refresh. Selecting the sampled signal net avoided 160 bounds evaluations without bounds or outline-buffer work.

These observations are not phone FPS, total network loading, battery or peak-memory measurements. **Physical-phone performance remains unverified.** The library passed 416 automated tests; the website loading and runtime-switch checks passed four tests. Unit tests do not establish compatibility with every host application. See the [source performance notes](https://github.com/wayri/kicad-webview/blob/v0.2.1/docs/MOBILE-PERFORMANCE.md).

For your own website, give the embed a stable responsive height, use `loading="lazy"` for iframes, mount once per container and dispose on unmount. Prefer a single pane on smaller screens, Low or Balanced quality, and a Load button for large projects or metered connections. See [hosting](/kicad-webview/docs/hosting/) and [the user guide](/kicad-webview/docs/user-guide/#mobile-performance).

### Carry settings into your embed

The same initial `highlightStyle`, `highlightColor` and `appearance` settings are available to JavaScript viewers, validated viewer URLs and standalone HTML exports. Custom elements use `highlight-style`, `highlight-color` and `appearance` attributes at initial connection. The advanced project viewer uses the active pane’s layer API.

```js
// After loading the 0.2.1 classic browser script:
const viewer = new KiCadWebView.Viewer('#board', {
  inspectOnSelect: false,
  highlightStyle: 'bright',
  highlightColor: 'source'
});
await viewer.load(
  'https://wayri.github.io/assets/demos/public-hardware/olimex-p4-project.json',
  { file: 'ESP32-P4-DevKit_Rev_D1.kicad_pcb', view: 'pcb' }
);
viewer.focusLayer('F.Cu', { mode: 'dim', fit: true });
// Later: viewer.restoreLayerView();
window.addEventListener('pagehide', () => viewer.dispose(), { once: true });
```

The snippet uses the classic `KiCadWebView` global; when importing an ES module, use its `Viewer` export instead. Give `#board` an explicit height. [Copy a complete no-Node.js page](/kicad-webview/docs/quick-start/).

`createStandaloneHTML()` is available from the main module, the classic global and the smaller `/html` entry. Bundle the viewer script, required notices, design and model files. The exported HTML blocks external network connections; missing models cannot be fetched later. [Use the browser-only exporter](/assets/demos/export.html), or read [the export API](/kicad-webview/docs/api-utilities/).

### More faithful schematic details

Multi-unit references display their unit letters, and saved symbol/field rotations are combined without changing field anchors or selection identities. The port was checked against retained KiCad 10.0.6 native-orientation cases; a fresh native export was not run for this update.

### Existing capabilities remain available

Linked schematic, PCB and 3D selection, flip-to-part focus, shareable source-bound views, hierarchy diagrams, Gerber/Excellon and ZIP input, carousels, and scripted LEDs, displays and controls remain available within their documented scope. Translucent appearance predates 0.2.1; this release adds the inspection and integration controls described above.

The product page’s approved IRCA demonstrations use a separate site runtime. Their additional overlays and model interactions should not be assumed to be APIs of every library release. Platform adapters also retain their own host and sandbox limits. [API reference](/kicad-webview/docs/api/) · [Model interaction guide](/kicad-webview/docs/model-interaction/) · [Platform integration status](/kicad-webview/docs/hosting/).

### Example credits and source

The OLIMEX example belongs to OLIMEX Ltd and upstream contributors, pinned to [26705d3](https://github.com/OLIMEX/ESP32-P4-DevKit/tree/26705d36407a07324348927dfd30fbf4ffc1d94c), with hardware under CERN-OHL-S-2.0. Display adaptations, model coverage and omissions are recorded in the [public-hardware provenance](/assets/demos/public-hardware/PROVENANCE.json). No affiliation or endorsement is implied. Viewer licensing does not replace hardware, model or third-party terms.

[Read all acknowledgements, including AI assistance](/kicad-webview/docs/acknowledgements/) · [Matching 0.2.1 source](https://github.com/wayri/kicad-webview/tree/v0.2.1) · [License and notices](/kicad-webview/docs/license/).
