---
layout: webview-docs
title: User guide
permalink: /kicad-webview/docs/user-guide/
doc_section: user-guide
---

This guide covers the common 0.3.0 viewer APIs and the self-hosted WayriCAD additions introduced in 0.4.0. The current self-hosted SDK is {{ site.data.webview_release.self_hosted }}; npm/CDN is {{ site.data.webview_release.npm }}. See the [BoM guide](/kicad-webview/docs/bom-analytics/) for 0.5.0 saved design data. It covers the versioned library, which may differ from the newer IRCA demonstrations elsewhere on this website. Start with [Quick start](/kicad-webview/docs/quick-start/) to mount a viewer, or [Examples](/kicad-webview/docs/examples/) for complete browser integrations.

## 0.6 inspection and navigation

The [0.6 viewer refresh](/kicad-webview/docs/extension-refresh/) adds **Explode** to the 3D tools and **Show sheet browser** to the advanced project workspace. Use a matching 0.6 build for these controls; release availability is shown above. Explode spacing is display-only. Registered result overlays and probes are hidden while exploded, and measurement is disabled; return the slider to zero to restore the assembled display and overlay visibility.

The floating sheet browser retains its tree view when closed and reopened. Drag its heading or use its zoom/fit controls. Searching the navigator for “sheet tree”, “sheet browser”, “sheet navigator” or “minimap” reveals the reopen command. It reads only the loaded project's listed schematic files.

Saved schematic colors, fills and dashes are retained. Bounded text-box wrapping uses approximate preview font metrics; embedded PNG previews reject malformed, animated and external image data. Read rendering warnings when interpreting unsupported constructs.

View switching restores a bounded cache of four snapshots for matching exact source bytes, path and view, while inactive renderer resources are released. Hierarchy loading uses at most three concurrent listed-schematic fetches; this is not a physical-phone speedup measurement.

## WayriCAD fields on the native 3D board

Use the self-hosted **0.4.0 SDK** to open the [WayriCAD demo](/assets/demos/wayricad-results.html), select a result and enable **Show on matching PCB**. The example enables supported fields automatically. Choose **Saved result layer** to change the layer; use the PCB Layers panel to control its visibility. Switch Layout/3D without losing the enabled overlay on the same source. Click a result or board field to link probe markers; selecting a saved part probes its source anchor, and a saved segment uses its midpoint. Native selection remains available. The chosen result layer stays pinned while its overlay is active.

Fields show through the board and components, with that presentation labelled. Stale sources, missing values and unsupported placement remain explicit. SI uses exported net/segment identities for electrical links; a spatial marker does not infer connectivity. [Import guide, API and limits](/kicad-webview/docs/wayricad-results/).

## Open a design

The compact viewer shows one drawing at a time. It accepts a supported hosted drawing, project manifest or GitHub source, browser-selected local files, or a supported ZIP. A project manifest lists the paths and URLs the viewer may open; it is not executable configuration. The file selector switches between listed drawings. A local project needs its related schematics, board and model assets, with their saved relative paths intact.

Local KiCad and manufacturing files are read in browser memory without uploading them. A hosted input makes requests to its authorized URLs; remote servers must permit CORS. A private GitHub repository does not become readable through a public embed. See [Hosting and integrations](/kicad-webview/docs/hosting/) for source formats and permissions, and [Troubleshooting](/kicad-webview/docs/troubleshooting/) for file and archive limits.

Explore the [IRCA demonstration](/kicad-webview/) and [public hardware examples](/kicad-webview/#public-examples). The OLIMEX manifest supplies its PCB, schematic and converted component models under the upstream terms. Marble now includes its PCB and all 25 schematic sheets, but many custom 3D models are unavailable publicly. Missing models remain labelled stand-ins. The display PCB copies change model paths and normalize equivalent legacy footprint identity fields; they do not change physical or electrical geometry.

In 3D, choose **Display → Appearance → Translucent** to see layer-colored copper through the board and models. Fills are faint; layers remain independently hideable. Saved XY positions remain exact, while internal elevations are illustrative when stackup information is missing and a diagnostic explains this. Transparent surfaces can show raster sorting artifacts. Model refreshes are batched as models load, and internal copper is constructed on demand. See the [performance notes](https://github.com/wayri/kicad-webview/blob/v0.3.0/docs/PERFORMANCE.md) for measurement scope and limitations.

## Navigate the drawing

Use **Fit** when you lose the drawing or change the viewport size. A schematic and PCB remain separate views of their saved source: changing the camera does not modify that source.

| View | Useful controls |
| --- | --- |
| PCB layout | Pan and zoom; toggle saved layers; select copper, components or pads; use Inspect to search parts and nets. |
| Schematic | Pan and zoom; inspect symbols and pins; follow resolved saved child-sheet links in a project workspace. |
| 3D board | Drag to orbit; use the Pan toggle for left-drag panning; zoom; choose a named board side or use the on-screen orbit, tilt and roll buttons. |
| Fabrication | Pan and zoom the overlaid Gerber/drill layers; toggle layers; inspect source/tool metadata; use the two-point ruler. |

The 3D camera moves in the visible camera frame, including after a top/bottom view or roll. A stationary right-click can open an object menu; dragging with the right button does not select an object on release. Turn off **Pan** to return to orbiting.

### Keyboard, touch and small embeds

Click the 3D canvas or explicitly focus the viewer before using shortcuts. They apply to that viewer, including inside an iframe, rather than the whole page. Editable fields and toolbar controls keep their normal keyboard behavior.

| Shortcut | 3D action |
| --- | --- |
| `1`, `2` | Top, bottom |
| `3`, `4` | Front, back |
| `5`, `6` | Left, right |
| `0` | Isometric |
| `Shift` + arrows | Orbit or tilt by 15° |
| `Shift` + `Q` / `E` | Roll counterclockwise / clockwise |
| `+` / `−` | Zoom in / out |
| `F` | Fit |

On-screen **Top**, **Bottom**, **Iso**, rotation and zoom buttons provide an alternative to fine gestures. In short embeds this control group scrolls. The renderer supports pointer/touch navigation, but physical mobile-device and third-party attachment compatibility are separate acceptance checks, not a universal support guarantee. Give the viewer a usable height and room around it for scrolling the host page. If a site has placed a viewer in a dedicated interaction mode, use that site's exit control to return to its normal page.

## Inspect parts, pads, pins and nets

Selecting saved geometry highlights it. With the default inspection preference it also opens Properties; the inspector's **Open properties on selection** checkbox disables that automatic opening. Hosts can choose the same behavior with `inspectOnSelect: false` or `setInspectOnSelect(false)`. Inspect can still be opened explicitly.

Parts and Nets searches use saved drawing metadata. A component's pad/pin selection can expose its saved net, dimensions and layers. Selecting a net highlights its available geometry; hidden layers stay hidden. **Highlight entire net** changes the visual selection scope, not the design's connectivity.

Selecting a uniquely identified part in 3D frames its rendered bounds from the saved mounting side. If a model is missing, the labelled footprint proxy may be framed instead. Unknown or ambiguous identities and unsupported board sides do not produce a guessed camera focus. A net-only selection keeps the camera in place. Programmatic callers can use `{ locate: false }` when highlighting should not reframe the part.

Reference text and matching short net names are not proof that objects in different drawings are identical. Cross-probing follows the saved identities described below.

### Inspection controls

In the 0.3.0 viewer, **Highlight settings** offers Dim context, Bright only and Isolate selection, with Accent color or Source colors. Clearing a selection restores source appearance; hidden layers stay hidden. Settings are independent per embed.

**Layers** lists searchable saved layers with colors and primitive counts. All, None, Front, Back and Copper presets control visibility. In PCB view, focus can dim or isolate a layer; fit frames its saved geometry, clear focus retains visibility, and restore returns to the visibility saved before focus or presets. With the drawing focused, `[` and `]` cycle layers and `Shift+F` fits the focused layer; text fields retain normal keyboard behavior. In 3D, the panel controls saved copper layers; internal copper requires Translucent appearance. Manufacturing supports visibility and presets. Schematic references show saved multi-unit letters and field rotation. See the [inspection API](/kicad-webview/docs/api-viewer/#inspection-controls).

## Work with a project

`ProjectViewer` (also exported as `AdvancedKiCadViewer`) surrounds two compact viewers with a project navigator. **Files**, **Parts** and **Nets** operate on the active pane. Choose the active pane before opening a drawing. The complementary PCB or schematic opens in the second pane when available.

**Split** mode keeps independent cameras; narrow layouts stack the panes. **Single** mode preserves the other pane's state. Close the project navigator when the drawing needs more room on a phone. Saved child-sheet links open only drawings listed in the project. Missing or unresolved links remain disabled.

With linked selection enabled, PCB and schematic components cross-probe only when their saved UUID relationship resolves unambiguously. Two views of the same saved file can share exact object selection. The workspace does not infer identity from references, reconstruct every repeated-sheet instance or infer cross-sheet net connectivity from equal names. Open the relevant schematic sheet in the other pane before trying component cross-probing.

The workspace is read-only. It has no comments, annotation editor, conflict resolution, editable BoM workflow or design editing commands. See the [project API](/kicad-webview/docs/api-project/).

### Independent linked embeds and shareable views

`linkViewers` connects two to eight existing compact viewers anywhere on one page. It forwards supported selection and clear-selection events while preserving each camera's independent navigation. It does not load another file or open an unloaded sheet. A linked part selection can deliberately frame the part in a 3D peer.

View links describe already loaded native KiCad drawings: exact saved-source SHA-256, paths, supported cameras, layers and selections. They do **not** contain design files, models or credentials. The destination page must load the same revision before restoring the link. A changed source, missing layer or ambiguous selection rejects restoration rather than guessing by label. The native view-state schema does not cover Gerber/Excellon or Altium provider states.

Hosts should suspend selection propagation while replaying independent saved selections. The advanced workspace handles its own link guard. See [linked-view examples](/kicad-webview/docs/examples/#link-a-layout-and-assembly) and the [view-state reference](/kicad-webview/docs/api-utilities/).

## Explore the schematic hierarchy

`ProjectTree` is an independent sheet diagram; it does not need a PCB viewer or WebGL. It retains saved sheet names, file paths and parent/child instance relationships. Reusing one subsheet under two parents creates separate instances in the diagram.

Expand or collapse branches, select an available node, or export the diagram as SVG. In 0.6, Zoom in/out, Fit and Reset view control the tree independently; background/Alt-drag pans and native touch scrolling remains available. Hosts can save `{zoom,x,y}` with `getCamera()` / `setCamera()`, use `zoomBy()`, `fit()` or `resetView()`, and clear data with `clear()`. [Camera reference](/kicad-webview/docs/api-project/#independent-projecttree-camera). Missing, invalid, cyclic, truncated and unreadable nodes remain labelled. A hierarchy is not a full electrical netlist. Selecting a node does not navigate another viewer unless the host explicitly connects that event.

When no unique root can be established, the result is a forest rather than an arbitrary chosen root. The interactive tree is bounded to 4,096 instances and 32 sheet edges per branch; SVG export includes at most 512 instances and labels that limit. See [hierarchy example](/kicad-webview/docs/examples/#show-a-sheet-hierarchy) and [API limits](/kicad-webview/docs/api-utilities/).

## Present a design

`ViewerCarousel` adds controls to an existing viewer. Slides can reuse its loaded design, switch drawing/view, use named 3D cameras, restore a 2D camera or highlight a saved net. **Previous**, **Next** and the live label remain ordinary accessible controls. The host must explicitly show the first slide and opt into timed playback.

Playback pauses when the controls receive focus, the document is hidden or reduced motion is enabled. It does not resume automatically. A failed transition pauses the presentation; an earlier load/view step may already have completed. The carousel does not create a second renderer or change source geometry.

In a loaded 3D view, **Display → Quality → Presentation** opts into studio-style raster rendering. It adds supported shadows, ambient occlusion and a receiving stage. This is not path tracing, mechanical validation or a replacement for missing CAD models. Enhanced rendering can fall back to **Balanced**, with a visible diagnostic; use Balanced on constrained devices. Presentation mode is not silently restored as an expensive default on later visits.

## Add virtual displays and controls

`DemoController` attaches caller-scripted LEDs, matrix/OLED/LCD/TFT graphics, buttons, knobs and viewer-scoped keys to actual loaded 3D geometry. Choose an actual face with `pickDemoFace()` or bind a unique saved component identity. A selected face token belongs to the current scene and cannot be reused after source/view replacement.

A virtual display may use a synchronous Canvas2D drawing function, an origin-clean image or a validated pixel buffer. TFT retains full-color RGBA graphics. Each display dimension is 1–1,024 pixels; the controller allows at most 64 controls and 4,194,304 display pixels in total. These modes do not emulate firmware, a display chip, an electrical bus, a backlight or circuit behavior.

Button callbacks receive press/release information, including cancellation. Display input includes normalized surface UV coordinates; the host maps those coordinates to its own graphic regions. Knobs clamp and quantize finite values to their declared range and step. A key binding acts only while that viewer has focus; explicit demo bindings take priority over a matching built-in camera shortcut. Held input is cancelled when focus is lost or the page is hidden.

Changing the loaded source, view or renderer suspends the controller and disposes its surfaces and bindings. Recreate it for the new scene. Dispose the controller before disposing the viewer. See [interactive display example](/kicad-webview/docs/examples/#paint-an-interactive-virtual-display) and [DemoController reference](/kicad-webview/docs/api-utilities/).

## Display supplied analysis results

The release visualizes supplied scalar data on a saved **2D PCB**. It does not run or qualify a solver, verify that a producer's `computed`/`measured` claim is true, or turn an image into quantitative evidence.

The `kicad-webview.analysis/v1` contract binds results to the exact UTF-8 PCB source hash. In this release, samples are constant-value, axis-aligned rectangles in saved KiCad millimetres: X rightward, Y downward. There is no coordinate conversion, copper clipping or interpolation. A field's optional saved layer controls visibility. The last overlapping cell wins for drawing and probing; missing coverage remains missing rather than becoming zero.

The field selector, fixed scale, opacity, visibility, pointer readout and run assumptions let a reader inspect the supplied result. Values remain unchanged when colors clamp at scale endpoints. Source replacement clears the overlay; switching to 3D pauses it, and returning to PCB restores it. The newer continuous FEM gradient on this website is not a promise of that API in this versioned release.

Use [the local-result example](/kicad-webview/docs/examples/#attach-a-reviewed-analysis-file) and the [analysis API](/kicad-webview/docs/api-utilities/) for the validated contract and budgets.

## Review fabrication files

Open a supported Gerber/Excellon collection or ZIP to overlay fabrication layers. File paths become layer IDs. Use layer visibility, source/tool inspection and the two-point ruler; reported distances are millimetres. Fabrication data does not synthesize a 3D assembly or reconstruct the original source schematic.

The beta implements a bounded RS-274X and Excellon subset. Rendering notes identify omitted constructs; an omitted shape is not empty space or proof of clearance. Some geometry-affecting unsupported states reject the file. Header-less Excellon is unsupported. Ambiguous integer drill coordinates require reviewed units, integer/fractional digit counts and zero suppression from the exporter; the parser must not guess the scale. `.txt` is only a candidate suffix, not proof of drill content.

No pixels are used to invent connectivity. Supported source/X2 attributes can retain available metadata, but this is not ERC, DRC or manufacturing readiness certification. See [import options and limits](/kicad-webview/docs/api-utilities/).

## Altium provider beta

`AltiumViewer` embeds Altium's online service; it is not a native `.SchDoc`/`.PcbDoc` parser. It accepts an authorized, publicly retrievable HTTPS ZIP/RAR/7z project URL on a public hostname. Loading sends that URL to Altium so its service can retrieve and process the design. Local files, localhost, private credentials and offline use are unavailable through this adapter.

The provider's UI owns its schematic/PCB/3D/optional BoM tabs. JavaScript `setView` remounts it and loses provider camera/selection state. The adapter exposes no native selection, layers, fit, theme or cross-probing API. `mount` means an iframe was created; `providerload` means its bootstrap loaded. Neither means the design is ready. Service processing and access errors can remain inside the provider frame.

Live design fidelity and provider/sandbox/mobile compatibility are not established by adapter unit tests. Use the KiCad-native routes for local browser rendering, and read [hosting, privacy and platform status](/kicad-webview/docs/hosting/) before choosing a provider embed.

## Finish and share responsibly

Dispose temporary carousels, link groups, trees and demo controllers when their host unmounts, then dispose their viewers. Source loads can be cancelled or superseded; an earlier view change may already have occurred before a later operation fails. Show errors and warnings near the drawing rather than replacing missing data with a plausible illustration.

The downloadable software uses [MPL-2.0](/kicad-webview/docs/license/), including commercial integrations. Preserve its license, matching-source link and third-party notices when redistributing or self-hosting. Design files and model assets need their own redistribution rights.


## Mobile performance

The optimization work introduced in 0.2.1 reuses named-source parsing, suspends off-screen 3D drawing and reduces net-selection and toolbar work. The website demo loads as its viewer approaches the screen; Load starts it immediately. In three bounded desktop Chromium samples at 340 px using the supplied OLIMEX proxy fixture, median source-to-PCB load and 3D mount times were approximately 42% lower; source download was excluded. This is not a physical-phone benchmark; physical phone performance remains unverified. For integrations use lazy-loading iframes with a stable responsive height, mount once per container, dispose on unmount, and choose Low or Balanced rendering on constrained devices. Keep large board/model downloads behind a Load button when appropriate.
