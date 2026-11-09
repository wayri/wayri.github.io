---
layout: webview-docs
title: Viewer API
permalink: /kicad-webview/docs/api-viewer/
doc_section: api
---

Current npm/CDN release **0.1.0**. The separately archived hosted SDK remains at beta.2. See the [export index](/kicad-webview/docs/api/) for the full library surface.

## Viewer

```ts
new Viewer(target: string | HTMLElement, options?: ViewerOptions): KiCadViewer
new KiCadViewer(target: string | HTMLElement, options?: ViewerOptions): KiCadViewer
```

`Viewer` and `KiCadViewer` are aliases for the same `EventTarget` class. Construction mounts the controls but does not load a design. A missing/invalid container, an already owned container, an invalid theme or a non-boolean `inspectOnSelect` throws. The mount must have an explicit height.

| `ViewerOptions` | Default / meaning |
| --- | --- |
| `theme?: 'light' \| 'dark'` | `'light'`. |
| `appearance?: 'realistic' \| 'layers' \| 'translucent'` | `'realistic'`; initial 3D appearance. |
| `inspectOnSelect?: boolean` | `true`; whether selecting an object opens Inspect. |
| `assetPaths?: string[]` | Known model asset paths for the 3D resolver. |
| `loadAsset?: (path: string) => unknown \| Promise<unknown>` | Host-supplied model loader. Use only assets the host is authorized to supply. This overrides the project model loader where provided. |

`path`, `kind` and `view` describe the current drawing after loading. `kind` is `pcb`, `schematic` or `manufacturing`; values may be absent before loading. Do not use internal renderer objects as an integration API.

## Load and navigate

```ts
type ProjectManifest = { files: { path: string; url: string }[]; entry?: string };
type LocalSource = { path: string; source?: string; bytes?: Uint8Array | ArrayBuffer };
type LoadOptions = {
  view?: 'pcb' | 'schematic' | '3d' | 'manufacturing';
  file?: string; ref?: string; signal?: AbortSignal;
  baseURL?: string; credentials?: 'omit' | 'same-origin';
};
```

| Method | Return and behavior |
| --- | --- |
| `load(input: string \| URL \| ProjectManifest, options?: LoadOptions)` | `Promise<boolean>`; hosted drawing, manifest, supported repository URL or hosted ZIP. A manifest lists the project files; it does not authorize arbitrary requests from sheet text. |
| `loadProject(input, options?)` | Alias for `load`; same return and errors. |
| `loadFiles(files: Iterable<File \| LocalSource>, options?: LoadOptions)` | `Promise<boolean>`; reads local files in memory, without uploading. Keep project-relative paths. |
| `loadArchive(bytes: Uint8Array \| ArrayBuffer, options?: LoadOptions)` | `Promise<boolean>`; reads a bounded ZIP without disk extraction. See [archive constraints](/kicad-webview/docs/api-utilities/#archives-cam-and-analysis). |
| `loadSource(source: string, options?: LoadOptions & { path?: string; project?: ProjectManifest })` | `Promise<boolean>`; parses already supplied saved drawing text without fetching it. Supply the path to retain project identity and model context. |
| `getFiles()` | Copied `{path, url?}[]` from the current project. |
| `openFile(path: string, options?: LoadOptions)` | `Promise<boolean>`; opens only a file listed in the loaded project. An unlisted/unsupported path rejects. |
| `getSheets()` | `{uuid, name, file, path}[]`; saved child-sheet links for a schematic, otherwise an empty list. Unresolved or out-of-project targets have `path: null`. |

URL sources use HTTP(S), normal browser CORS and default `credentials: 'omit'`. Explicit `'same-origin'` credentials do not enable cross-origin credentials or bypass authentication. `ref` selects a supported repository revision; `file` selects a listed project drawing. See [hosting and source inputs](/kicad-webview/docs/hosting/) for path and download limits.

Each new load supersedes previous pending work. Current parse, network, unsupported-format and size-limit failures reject and emit `error` once. Caller cancellation can reject with `AbortError`; superseded/disposed operations return `false`. A failed replacement keeps the still-mounted drawing and its selection callbacks. Cancelling while 3D code loads cannot mount a cancelled operation, even if the shared import finishes later.

## Inspect and select

| Method | Return and constraints |
| --- | --- |
| `getParts()` | Copied `Part[]`: `{id, uuid, reference, value, footprint, layer, schematicUuid?}`. Use saved IDs for subsequent selection. |
| `selectPart(id: string, options?: {locate?: boolean})` | `boolean`; selects a saved component, optionally locating it. Missing/ambiguous identities do not become reference-name guesses. |
| `getSelection()` | Copied `ViewSelection` or `null`: `{kind, uuid?, ownerUuid?, id?, netName?, pinNumber?}`. |
| `selectObject(id: string, options?: {locate?: boolean; pinNumber?: string \| number})` | `boolean`; restores a saved object or terminal identity. |
| `getNets()` | Copied `{id, name, layers, count}[]`. These are local to the current drawing. |
| `selectNet(idOrUniqueName: string, options?: {locate?: boolean})` | `boolean`; saved ID preferred, a name accepted only when unique. Works with supported native layout/3D net highlighting. |
| `clearSelection()` | `void`; clears the selected object/highlights. |
| `setInspectOnSelect(enabled: boolean)` | `void`; a non-boolean value throws. |
| `setInspectorOpen(open: boolean)` | `void`; opens/closes the external inspection panel. |

Hidden layers remain hidden during net highlighting. Schematic connectivity uses bounded saved wires, labels and terminals for one file; it is not KiCad's full netlist. Buses, implicit hidden power pins and repeated-sheet instance connectivity have limits. For multiple drawings use [linked viewers](/kicad-webview/docs/api-project/#linkviewers), which match saved identities rather than short reference labels.

## Views, layers and measurement

| Method | Return and errors |
| --- | --- |
| `setView(view: DrawingView, options?: {signal?: AbortSignal})` | `Promise<boolean>`; schematic files allow `schematic`, boards allow `pcb` / `3d`, CAM allows `manufacturing`. Rejects before a design is loaded or for an incompatible view. |
| `fit()` | `void`; fits the current drawing/board using that renderer's controls. |
| `getLayers()` | Copied `string[]` of saved layer names. |
| `setLayers(layers: string[])` | `void`; PCB or manufacturing only. Unknown layer names or incompatible views throw. |
| `setTheme(theme: 'light' \| 'dark')` | `void`; invalid themes throw. |
| `setMeasuring(enabled: boolean)` | `void`; enables the **manufacturing** ruler. Other views throw. Native 3D surface measurement is a viewer control, not a programmable measurement API in this release. |
| `setRenderQuality(quality: 'low' \| 'balanced' \| 'high' \| 'presentation')` | Returns the active quality, which can fall back. Requires loaded 3D and a supported quality. Presentation rendering is explicit and GPU-intensive; it does not improve source/model accuracy. |

## Cameras

For `pickDemoFace()` with virtual displays and controls, see [Interactive models & displays](/kicad-webview/docs/model-interaction/).

```ts
type Camera2D = { center: {x: number; y: number}; zoom: number; flipped: boolean };
type Camera3D = {
  position: [number, number, number];
  target: [number, number, number];
  up: [number, number, number];
};
```

| Method | Return and constraints |
| --- | --- |
| `getCamera()` | Copied `Camera2D` or `null`; PCB/schematic only. |
| `setCamera(camera: Camera2D)` | `void`; requires an active 2D camera, finite centre within ±1,000,000 mm, zoom `0.001`–`10000`, and boolean `flipped`. |
| `getCamera3D()` | Copied `Camera3D` or `null` outside 3D. |
| `setCamera3D(preset: 'top' \| 'bottom' \| 'front' \| 'back' \| 'left' \| 'right' \| 'isometric' \| Camera3D)` | `boolean`; requires 3D. Invalid presets or invalid camera vectors throw. A snapshot contains board-centred millimetre vectors. |
| `rotate3D(direction: 'left' \| 'right' \| 'up' \| 'down' \| 'clockwise' \| 'counterclockwise', degrees = 15)` | `boolean`; rotates while preserving target/distance. Requires loaded 3D and valid direction/angle. |
| `pickDemoFace(options?: {signal?: AbortSignal})` | `Promise<SelectedDemoFace>`; lets the user select an actual supported planar component face. Rejects outside 3D, on invalid geometry, cancellation or scene loss. The token belongs to that mounted scene. |

The 2D camera API does not control manufacturing or 3D cameras. Camera events currently report 2D changes, not every 3D frame. A named top view is not an independent native mechanical verification.

## Imported analysis

| Method | Return and errors |
| --- | --- |
| `setAnalysis(input: AnalysisData \| string)` | `Promise<boolean>`; requires a saved PCB, a supported analysis schema, exact source SHA-256 and existing declared layers. Validation/hash errors reject. A stale/disposed attachment returns `false`. |
| `getAnalysis()` | Deeply read-only accepted `AnalysisData` or `null`. |
| `setAnalysisField(id: string)` | `void`; requires loaded analysis and a known field. |
| `clearAnalysis()` | `void`; removes results and invalidates pending analysis attachment. |

See [analysis types and limits](/kicad-webview/docs/api-utilities/#archives-cam-and-analysis). The downloadable release accepts rectangular scalar cells. It does not expose the newer continuous FEM-triangle rendering used by the live site's separate bundle. Computed, measured and illustrative provenance are distinct; attaching a result does not run or validate a solver.

## Events and cleanup

| Event | `event.detail` |
| --- | --- |
| `ready` | `{view, path, revision: string \| null, warnings: string[]}` after a successful rendered view. It is not a promise that every asynchronous external 3D model has finished loading. |
| `viewchange` | `{view, path}` after mounting a view. |
| `select` | `{item: SelectedItem \| null, path, view, multi?}`. Selected items may include saved `uuid`, `id`, `kind`, `netName`, `ownerUuid`, `reference`, `pinNumber` and renderer-specific saved properties. |
| `error` | The current `Error` itself. Catch the load rejection too. |
| `camerachange` | `{view, path, camera: Camera2D}`; copied 2D snapshot. |
| `analysis` | `{fields: {id, name, unit}[], provenance}`. |
| `measure` | Manufacturing measurement detail; its detailed shape remains beta-specific. |
| `dispose` | `null`. |

`dispose(): void` is idempotent. It aborts pending source/model work, removes the mounted component and listeners, and releases renderer ownership/resources. Other methods generally throw after disposal. Dispose companion carousel/link/demo controllers first where practical, then the viewer.

```js
const viewer = new KiCadWebView.Viewer(element, { theme: 'dark' });
const abort = new AbortController();
viewer.addEventListener('error', event => reportError(event.detail));
viewer.load(projectURL, { signal: abort.signal }).catch(reportError);
// Framework unmount/effect cleanup:
const cleanup = () => { abort.abort(); viewer.dispose(); };
```

`element`, `projectURL` and `reportError` above are supplied by the host application. Create one instance in a framework mount/effect, not on every render. Cleanup still matters when the source promise has not settled.

## registerKiCadViewer

```ts
registerKiCadViewer(tag = 'kicad-viewer'): void
```

Registers a custom element if that tag is not already registered. It requires browser Custom Elements support; invalid custom-element names can throw through the platform API. The classic script registers its default element automatically; importing ESM alone does not.

Supported attributes are `src`, `theme`, `view`, `file`, `ref` and `inspect-on-select` (`'false'` disables auto-inspection). Give the element a height. Connection creates a viewer and optionally loads `src`; disconnection disposes it. Events are forwarded as `kicad:ready`, `kicad:select`, `kicad:measure`, `kicad:analysis`, `kicad:error`, `kicad:viewchange` and `kicad:camerachange`. Attribute mutation is not a reactive reload contract in this release; use the viewer API for later changes.

## 3D appearance and statistics

`setAppearance(mode)` requires a loaded 3D view and returns the active mode. `getAppearance()` returns that mode or `null` outside 3D. `getRenderStats()` returns a copied snapshot or `null` outside 3D, including appearance, draw calls, render count, loaded model and component counts, and model update counts and CPU milliseconds.

Translucent mode shows the board and models transparently, copper in layer colors, and faint fills. Saved XY positions are exact; internal elevations are illustrative when stackup data is unavailable, with a diagnostic. Transparent raster sorting can produce visual ordering artifacts. Layers remain independently hideable and clearing a selection restores translucency.
