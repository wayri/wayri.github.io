---
layout: webview-docs
title: What’s new in KiCad WebView
permalink: /kicad-webview/docs/releases/
doc_section: releases
description: KiCad WebView release notes, WayriCAD saved results, layer inspection and mobile integrations.
---

## 0.6.0 — viewer refresh

{% if site.data.webview_release.self_hosted == '0.6.0' %}
The self-hosted **0.6.0 SDK** includes these additions. {% if site.data.webview_release.npm == '0.6.0' %}The same release is available from npm and CDN.{% else %}npm/CDN remains at **{{ site.data.webview_release.npm }}** while its next publication propagates; use the matching self-hosted files for the APIs below.{% endif %}
{% else %}
This guide describes the **0.6.0 source refresh**. The currently listed self-hosted SDK is **{{ site.data.webview_release.self_hosted }}**, and npm/CDN is **{{ site.data.webview_release.npm }}**. Use a matching 0.6.0 build for these additions; this page does not announce an npm/CDN publication.
{% endif %}

- Explode a supported 3D assembly with `setExplode(0–100)` and restore it at zero. Spacing is display-only; registered result overlays/probes are hidden and measurement is disabled while exploded.
- Retain saved RGBA colors, fills and dashes. Preview bounded schematic text boxes and validated embedded PNGs, with explicit approximation and omission warnings.
- Reopen the advanced workspace's floating sheet browser, or control an independent `ProjectTree` camera with zoom, fit and reset.
- Restore up to four exact-source/path/view camera snapshots while releasing inactive renderers. Fetch up to three listed schematics concurrently without changing deterministic ordering or loading limits.

[0.6 guide, examples and limits](/kicad-webview/docs/extension-refresh/) · [No-Node self-hosting](/kicad-webview/docs/quick-start/#self-hosted-060-sdk) · [Open the OLIMEX workspace](/assets/demos/embed.html?example=olimex&workspace=true&view=3d&theme=dark)

Hierarchy concurrency is not a physical-phone performance benchmark. These are read-only inspection features; extension comments, authentication, editing and the Fast PI solver/setup UI are not included. Existing BoM analytics and WayriCAD retained-result APIs remain available.

## 0.5.0 — saved BoM and board data

The 0.5.0 SDK adds a read-only BoM panel linked to a native KiCad drawing, grouping and searching saved parts, exporting CSV, and locating uniquely identified components in PCB, schematic and 3D views. A board-data view summarizes saved pad and object counts, track centreline lengths and zone polygon sums. [Try the OLIMEX demo](/assets/demos/bom.html) · [Integration and limits](/kicad-webview/docs/bom-analytics/).

Reports describe saved source data; overlapping fill polygons are counted repeatedly, holes are not subtracted and placement candidates do not prove containment. No copper refill, clearance check or solver is performed. See the guide for source limits and interpretation.
## 0.4.0 — results directly on the 3D PCB

At its publication, 0.4.0 was available as the **self-hosted SDK and GitHub download**, while npm/CDN remained at 0.3.0. The current release status is shown above; immutable 0.4.0 files retain these additions.

- Register supported WayriCAD PI and thermal fields on the matching native **2D/3D PCB**. The through-board presentation is labelled; hidden PCB layers hide their field.
- Choose **Saved result layer** while retaining the quantity where available. Link spatial probe markers between result plots and the board; native saved-part and trace selection remains usable.
- Preserve exact 3D hit values, triangle identity and elevation. Change saved thermal frames without changing the field range; source changes disable registration.
- Use a refined two-pane demo, grouped controls and a taller mobile board viewport.

[Try the demo](/assets/demos/wayricad-results.html) · [Guide and API additions](/kicad-webview/docs/wayricad-results/) · [Download and source](https://github.com/wayri/kicad-webview/releases/tag/v0.4.0) · [Self-hosted manifest](/assets/lib/kicad-webview/releases/0.4.0/RELEASE.json)

The release passed **455 automated tests**. Browser checks covered registered fields, saved-layer visibility, exact linked probes, native part selection, thermal frames and 2D/3D mode retention. A desktop-browser embed had equal 340 px content and viewport widths. Physical-phone performance is unmeasured. The viewer displays saved results; it does not run or qualify a solver. Registration needs exact source identity and a supported saved elevation/basis or explicitly named outer copper surface. Unknown values remain missing; grid preview cells are not clipped to copper or cutouts.

## 0.3.0 — saved WayriCAD results

Read retained PI fields, SI waveforms and eye traces, and steady or transient thermal grids using WayriCADResultsViewer. Probe saved values, select recorded time frames, graph a thermal cell history and browse or download complete numerical data. Independent 3D fields require explicit saved elevation and share their color range with the 2D plot.

Exact saved PCB bytes are checked before enabling supported 2D field registration and saved net/segment links. Stale, unverified or unsupported coordinate data remains independently inspectable. Unknown values stay missing; no solver runs in the viewer. Project-library identity integrity and registration onto the native PCB 3D scene are not supported in this release.

[Open the public example](/assets/demos/wayricad-results.html) · [Import and API guide](/kicad-webview/docs/wayricad-results/) · [Source and download](https://github.com/wayri/kicad-webview/releases/tag/v0.3.0)

The library remains free to use commercially under MPL-2.0. Optional implementation, maintenance and support help is paid. The generated example runs are credited to the pinned WayriCAD source and are not measured hardware or production boards.

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
