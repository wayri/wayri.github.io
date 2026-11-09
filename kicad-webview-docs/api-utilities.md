---
layout: webview-docs
title: Demo, hierarchy and utility APIs
permalink: /kicad-webview/docs/api-utilities/
doc_section: api
---

These are release **0.1.0-beta.2** APIs from revision `86b375e`. They describe caller-scripted presentation, saved hierarchy and validated input processing, not circuit simulation.

## DemoController

For a complete browser page, face-picking workflow, display graphics and cleanup, see [Interactive models & displays](/kicad-webview/docs/model-interaction/).

```ts
new DemoController(viewer: KiCadViewer): DemoController
```

Requires an already loaded supported native 3D viewer. Only one active controller owns a viewer's demo input. Invalid/unloaded targets or duplicate active ownership throw. `active`, `suspended` and `disposed` are read-only state flags.

Each control uses a unique 1–128 character ID and a `DemoPlacement`:

```ts
type DemoPlacement = {
  anchor?: {uuid?: string; reference?: string;
    face?: 'top' | 'bottom' | 'front' | 'back' | 'left' | 'right'};
  face?: SelectedDemoFace | string;
};
```

Saved anchors must resolve unambiguously. Explicit face tokens come from `viewer.pickDemoFace()` and belong to that exact mounted scene. They are not durable saved references. A supported planar face is required for a display; a whole-component LED overlay may have no planar normal.

| Method | Return and options |
| --- | --- |
| `addLED(id, placement & {on?: boolean; brightness?: number; color?: string})` | Returns the ID. Brightness is 0–1; colors are `#rrggbb`. |
| `setLED(id, patch: boolean \| {on?: boolean; brightness?: number; color?: string})` | Copied state record. A boolean changes on/off. |
| `addDisplay(id, placement & {mode?: 'matrix' \| 'oled' \| 'lcd' \| 'tft'; width?: number; height?: number; onPress?: callback; onRelease?: callback})` | Returns the ID. Defaults: matrix 16×8, OLED 128×64, LCD/TFT 320×240. Each dimension is an integer 1–1024. |
| `drawDisplay(id, draw: (context: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => void)` | `boolean`; runs a synchronous canvas callback, then updates the texture. Async/throwing callbacks or upload failures report `error` and return `false`. Painting is not transactional. |
| `writeImage(id, image: CanvasImageSource)` | `boolean`; clears/scales an origin-clean native image to the display. Does not fetch a remote image for you. |
| `setPixels(id, bytes: Uint8Array \| Uint8ClampedArray, options?: {format?: 'rgba' \| 'mono' \| 'mono1'; foreground?: string; background?: string})` | `boolean`; validates exact buffer size, then draws. |
| `addButton(id, placement & {label?: string; onPress?: callback; onRelease?: callback})` | Returns the ID. |
| `addKnob(id, placement & {min?: number; max?: number; step?: number; value?: number; onChange?: callback})` | Returns the ID. Bounds/value must be finite, with a positive step. |
| `setKnob(id, value: number, options?: {source?: string})` | `boolean`; clamps and quantizes the value. An unchanged value does not recursively call `onChange`. |
| `press(id, detail?: Partial<DemoInput>)`, `release(id, detail?)` | `boolean`; activate/release buttons or displays. Multiple pointer/key holds aggregate. |
| `change(id, delta: number, options?: {source?: string})` | `boolean`; changes a knob by `delta × step`. |
| `toggle(id, options?: {source?: string})` | `boolean`; toggles a supported LED/button/display. |
| `bindKey(code: string, binding: DemoKeyBinding)` | Returns an unbind function. Uses `KeyboardEvent.code`, not a page-wide key listener. |
| `unbindKey(code: string)` | `boolean`; removes that binding. |
| `focus()` | `boolean`; explicitly focuses the viewer with `preventScroll`. Construction never autofocuses. |
| `getFace(id)` | Copied `{center, normal, width, height, up?, right?, shape?}`. Whole-component frames can have `shape: 'component'`, `normal: null`; do not treat these as planar display geometry. |
| `getState(id)` | Copied state, excluding materials, callbacks and source geometry. |
| `remove(id)` | `boolean`; releases held state, removes bindings/surface and returns its budget. |
| `suspend(reason?: string)` | `void`; removes controls and bindings for the current scene. |
| `dispose()` | `void`; idempotent controller cleanup; does not dispose the supplied viewer. |

There are at most 64 controls, 128 key bindings and 4,194,304 display pixels per controller. Missing IDs, duplicate controls, wrong control kinds, invalid bounds/geometry or exceeded budgets fail rather than silently attaching to another object. Methods require an active controller; use `active` to guard callbacks after scene changes.

Pixel formats are row-major: RGBA needs `width × height × 4` bytes; `mono` needs `width × height` bytes; `mono1` needs `ceil(width / 8) × height`, MSB-first with each row padded to a byte. Without an explicit format, an RGBA-length buffer selects RGBA, otherwise mono. Canvas/CORS origin-clean rules apply. TFT graphics are full-color caller graphics, not hardware SPI/controller emulation.

```ts
type DemoInput = {
  id: string; type: 'press' | 'release' | 'change'; source: string;
  value?: number | boolean; cancelled?: boolean; uv?: {x: number; y: number};
  code?: string; originalEvent?: Event;
};
type DemoKeyBinding = {
  id?: string; action?: 'press' | 'toggle' | 'increment' | 'decrement';
  repeat?: boolean; preventDefault?: boolean;
  shiftKey?: boolean; altKey?: boolean; ctrlKey?: boolean; metaKey?: boolean;
  onDown?: (input: Partial<DemoInput>) => unknown;
  onUp?: (input: Partial<DemoInput>) => unknown;
};
```

Bindings require exact modifier matching (all false by default). `repeat` defaults to false. Matched bindings default to preventing the native key action; editable fields, buttons, links, sliders and IME composition are ignored. Losing focus or hiding the page releases held controls with `cancelled: true`. Pointer display events provide normalized surface UVs; the host chooses how to map them to pixels.

Events: `input` has `DemoInput` detail; `error` has `{id?, phase, error}`; `suspend` has `{reason}`. Host callback errors are caught, including late promise rejection. Changing source/view/renderer suspends controls and invalidates face tokens. Recreate the controller explicitly after loading the new scene. Viewer disposal disposes its controller. Virtual controls never edit saved geometry, execute firmware, simulate a bus or connect to hardware.

## Hierarchy

```ts
buildProjectHierarchy(files: {path: string; source?: string; error?: string}[],
  options?: {root?: string; entry?: string}): ProjectHierarchy
loadProjectHierarchy(input: HierarchyLoadInput,
  options?: HierarchyLoadOptions): Promise<ProjectHierarchy>
hierarchyToSVG(model: ProjectHierarchy, options?: {theme?: 'light' | 'dark'}): string
new ProjectTree(target: string | HTMLElement,
  options?: {theme?: 'light' | 'dark'; onSelect?: (node: HierarchySelection) => unknown}): ProjectTree
```

`HierarchyLoadInput` accepts a hosted URL/manifest, supported repository source, browser/local file entries, or ZIP bytes. `HierarchyLoadOptions` combines `root`, `entry`, `file`, `ref`, `baseURL`, `credentials` and `signal`. Direct builders need source text; remote loading uses the same bounded resolver as the viewer. Sheetfile text never authorizes fetching an unlisted URL.

`ProjectHierarchy` has schema `kicad-webview.hierarchy/v1`, `rootPath`, `rootReason`, `roots`, `files`, `warnings` and `stats: {files, instances, truncated}`. Nodes contain `{id, path, file, name, uuid, status, children, role?}`. Status is `ok`, `missing`, `invalid`, `cycle`, `truncated` or `error`; unresolved `path` is `null`. Root reason is `explicit`, `entry`, `matching-entry`, `unique-root` or `forest`. Reused subsheets remain distinct parent instances; a forest is not assigned an arbitrary root.

| `ProjectTree` method | Return and behavior |
| --- | --- |
| `load(input, options?: HierarchyLoadOptions)` | `Promise<boolean>`; current successful data replaces the diagram. |
| `loadFiles(files, options?)`, `loadArchive(bytes, options?)` | `Promise<boolean>`; convenience loaders for local entries or ZIP. |
| `setHierarchy(model: ProjectHierarchy)` | `this`; validates/sets model data. |
| `setFiles(files, options?: {root?: string; entry?: string})` | `this`; builds and sets hierarchy from saved source. |
| `getHierarchy()` | Independent copy of the model or `null`, without source-file contents. |
| `select(id: string)` | `boolean`; selects an available node. Unresolved/error nodes do not invoke navigation. |
| `expandAll()`, `collapseAll()` | `void`; branch presentation only. |
| `setTheme(theme: 'light' \| 'dark')` | `void`; invalid themes throw. |
| `toSVG(options?: {theme?: 'light' \| 'dark'})` | SVG string; script-free, escaped labels and no external resources. Same export as `hierarchyToSVG`. |
| `dispose()` | `void`; aborts work, releases ownership/listeners and removes the component; repeatable. |

`ready` detail is `{hierarchy}`; `select` is `{node: {id, path, file, name, uuid, status: 'ok'}}`; `error` is `{error}`. The optional `onSelect` receives that node and can return a promise; callback errors are reported. The tree does not navigate another viewer by itself.

Bounds: 256 files, 8 MiB per schematic and 64 MiB total schematic text; 4096 expanded instances; 32 sheet edges per branch. SVG export includes at most 512 instances and reports truncation. Invalid data/paths or exceeded input bounds fail; missing/cyclic references are visible diagnostics. Caller aborts reject with `AbortError`; internally superseded/disposed component loads return `false`. Failed replacement keeps the current diagram. Hierarchy is not a native electrical netlist.

## Archives, CAM and analysis

### readZip

```ts
readZip(bytes: Uint8Array | ArrayBuffer, options?: {signal?: AbortSignal}): Promise<LocalSource[]>
```

Returns safe relative `{path, bytes: Uint8Array}` entries in memory. It checks local/central headers, CRC, path collisions and compression bounds; it never extracts to disk. Hard caps are 64 MiB compressed, 128 MiB expanded, 32 MiB per file, 256 entries and a 1000:1 expansion ratio. Source-level options `maxCompressedBytes`, `maxExpandedBytes`, `maxFileBytes`, `maxFiles` and `maxRatio` can lower these caps; this beta's declaration exposes only `signal`.

Stored/deflated ZIP with ASCII/UTF-8 paths is supported. Unsupported encryption, ZIP64, multi-disk archives, nested archives, unsafe paths, symlinks/special entries, inconsistent metadata, CRC failure and unsupported decompression reject. Cancellation rejects through the supplied signal. Deflate requires a browser supporting `DecompressionStream('deflate-raw')`; otherwise unpack locally and use `loadFiles`.

### parseManufacturing

```ts
parseManufacturing(source: string, options?: Record<string, unknown>): unknown
```

Synchronously dispatches saved text to Gerber RS-274X or Excellon/XNC parsing. Format is detected from CAM signatures; `options.format` can be `'gerber'`, `'excellon'` or `'xnc'`, and `options.path` supplies filename context. Unsupported/malformed formats and parser bounds throw. The full parser result is implementation-specific in this beta; use `Viewer.loadFiles` / `loadArchive` for normal interactive fabrication viewing rather than depending on internal primitive shapes.

### parseAnalysis and analysisSourceHash

```ts
parseAnalysis(input: AnalysisData | string): Readonly<AnalysisData>
analysisSourceHash(source: string): Promise<string>
```

`parseAnalysis` validates, copies and deeply freezes the accepted fields. A JSON string is limited to 8 MiB; malformed JSON, invalid schema/coordinates/provenance/hash, duplicate IDs, nonfinite values, invalid ranges or exceeded budgets throw. `analysisSourceHash` returns the lowercase SHA-256 of the exact UTF-8 source string; non-string input or missing secure Web Crypto rejects. Use HTTPS or localhost.

```ts
type AnalysisData = {
  schema: 'kicad-webview.analysis/v1'; coordinateSystem: 'kicad-mm';
  board: {sha256: string; path?: string};
  provenance: {
    kind: 'computed' | 'measured' | 'illustrative'; tool: string; runId: string;
    generatedAt?: string; assumptions: string[];
  };
  fields: {
    id: string; name: string; unit: string; layer?: string;
    range: [number, number];
    samples: {x: number; y: number; width: number; height: number; value: number}[];
  }[];
};
```

There are 1–8 fields and at most 10,000 rectangular cells in total. Ranges must increase; cell dimensions must be positive. Coordinates/dimensions are bounded to ±1,000,000 mm and scalar values to ±1,000,000,000. Text is length-bounded; assumptions have at most 24 entries. The parser validates the declared hash format; [`viewer.setAnalysis`](/kicad-webview/docs/api-viewer/#imported-analysis) checks it against the loaded PCB and verifies declared layers. This release does not accept the site's newer FEM-triangle field extensions. No solver runs in the browser.

## AltiumViewer

```ts
new AltiumViewer(target: string | HTMLElement, options?: {
  view?: 'schematic' | 'pcb' | '3d';
  views?: ('schematic' | 'pcb' | '3d' | 'bom')[];
}): AltiumViewer
```

An opt-in **online Altium provider embed**, not native `.PcbDoc` / `.SchDoc` parsing. Construction does not contact the provider. Default initial view is schematic and enabled views are schematic/PCB/3D/BoM. Enabled views must be unique and contain the initial view; BoM cannot be the only enabled view. Invalid targets, duplicate ownership or invalid options throw.

The actual committed implementation exposes `load(url, {view?, views?} = {}): this`, `setView(view): this` and idempotent `dispose(): void`. **Declaration caveat:** the beta `types/index.d.ts` declares `load` as `Promise<unknown>` and omits `setView`; the runtime returns synchronously after mounting its iframe. Neither return form means the provider has processed the design.

`load` accepts a public HTTPS `.zip`, `.rar` or `.7z` archive URL, without embedded credentials. Localhost/LAN-style names and IP literals are rejected. Only supply a design authorized for processing by Altium: this path uses an external online service and is different from browser-local KiCad viewing. `setView` remounts the provider iframe and loses its current camera/selection; it throws before a source is loaded. Methods throw after disposal.

`mount` detail is `{provider: 'altium365', view, views}`. `providerload` detail is `{provider: 'altium365'}` and confirms bootstrap script loading only. `error` detail is an `Error` for provider script failure. The opaque sandbox isolates the embed; it does not establish end-to-end design processing, model fidelity, offline operation or mobile provider support.

## Standalone HTML module

This is a separate module, not an export on `KiCadWebView`:

```js
import { createStandaloneHTML } from
  'https://wayri.github.io/assets/lib/kicad-webview/releases/0.1.0-beta.2/standalone-html.mjs';
```

```ts
createStandaloneHTML(options: {
  viewerScript: string; licenseText: string;
  files: {path: string; bytes: Uint8Array}[];
  title?: string; view?: 'pcb' | 'schematic' | '3d' | 'manufacturing';
  theme?: 'dark' | 'light';
}): string
```

Returns a complete HTML document string. Defaults are title `'Interactive design'`, theme `'dark'` and automatic view selection. Supply the full classic script plus the complete viewer license and dependency notices. No upload occurs in this builder. The generated document bundles bytes and blocks external network connections through its CSP; include saved model assets inside a project ZIP or accept labelled unresolved-model proxies.

Input checks throw `TypeError` / `RangeError`: script up to 8 MiB of characters, nonempty license/notices up to 1 MiB of characters, 1–256 nonempty `Uint8Array` files, safe unique relative paths and at most 64 MiB total input bytes. Supply a ZIP alone or individual files, never both. HTML export contains the design and is not an access-control mechanism. Review it before sharing. For an interface that obtains the script/notices and downloads the result, use the [browser exporter](/assets/demos/export.html).
