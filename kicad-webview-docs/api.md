---
layout: webview-docs
title: API reference
permalink: /kicad-webview/docs/api/
doc_section: api
---

This reference describes **0.1.0-beta.2**, source revision `86b375e5f5c3f2f04df6d6c44119c25b0b2b14ee`. It covers the committed release contract rather than the newer viewer used by this website's IRCA demonstrations. Import from the versioned module or use the same names on the classic `KiCadWebView` global.

```js
import { Viewer, EMBED_API_VERSION } from
  'https://unpkg.com/@wayrisignals/kicad-webview@0.1.0/dist/kivi-viewer.js';
console.log(EMBED_API_VERSION); // '1.0-beta'
```

No package manager is required. Types in this reference use TypeScript notation to explain the JavaScript inputs; they do not require a TypeScript build.

## Public exports

Every name exported by the release's main entry is listed here. Types and interfaces describe data, not additional runtime exports.

| Export | Purpose and detailed contract |
| --- | --- |
| `Viewer`, `KiCadViewer` | The same compact viewer class. [Construction, loading, inspection, cameras, layers, analysis and events](/kicad-webview/docs/api-viewer/#viewer). |
| `registerKiCadViewer` | Register the optional HTML custom element. [Signature and attributes](/kicad-webview/docs/api-viewer/#registerkicadviewer). |
| `ProjectViewer`, `AdvancedKiCadViewer` | The same two-pane project wrapper. [Methods, options and events](/kicad-webview/docs/api-project/#projectviewer). |
| `EMBED_API_VERSION` | [Contract identifier](#embed-api-version). |
| `ViewerCarousel` | [Explicit, cancellable drawing presentations](/kicad-webview/docs/api-project/#viewercarousel). |
| `linkViewers` | [Saved-identity selection linking](/kicad-webview/docs/api-project/#linkviewers). |
| `captureViewState` | [Snapshot native views and exact source hashes](/kicad-webview/docs/api-project/#view-state). |
| `restoreViewState` | [Restore validated, source-matched views](/kicad-webview/docs/api-project/#view-state). |
| `validateViewState` | [Validate and copy a view-state object](/kicad-webview/docs/api-project/#view-state). |
| `createViewLink` | [Encode state in an HTTP(S) URL fragment](/kicad-webview/docs/api-project/#view-state). |
| `parseViewLink` | [Read an optional view-state fragment](/kicad-webview/docs/api-project/#view-state). |
| `DemoController` | [Scripted LEDs, displays, buttons, knobs and scoped keys](/kicad-webview/docs/api-utilities/#democontroller). |
| `ProjectTree` | [Interactive independent schematic hierarchy](/kicad-webview/docs/api-utilities/#hierarchy). |
| `buildProjectHierarchy` | [Build hierarchy data from saved source strings](/kicad-webview/docs/api-utilities/#hierarchy). |
| `loadProjectHierarchy` | [Load a bounded project hierarchy](/kicad-webview/docs/api-utilities/#hierarchy). |
| `hierarchyToSVG` | [Export a script-free hierarchy diagram](/kicad-webview/docs/api-utilities/#hierarchy). |
| `AltiumViewer` | [Opt-in online provider adapter, not native parsing](/kicad-webview/docs/api-utilities/#altiumviewer). |
| `readZip` | [Validated in-memory archive reader](/kicad-webview/docs/api-utilities/#archives-cam-and-analysis). |
| `parseManufacturing` | [Gerber/Excellon parser dispatch](/kicad-webview/docs/api-utilities/#archives-cam-and-analysis). |
| `parseAnalysis` | [Validate imported scalar fields](/kicad-webview/docs/api-utilities/#archives-cam-and-analysis). |
| `analysisSourceHash` | [Hash the exact saved PCB text](/kicad-webview/docs/api-utilities/#archives-cam-and-analysis). |

The separate [`standalone-html.mjs` module](/kicad-webview/docs/api-utilities/#standalone-html-module) exports `createStandaloneHTML`. It is **not** a member of the main `KiCadWebView` global.

## Embed API version

```ts
const EMBED_API_VERSION: '1.0-beta'
```

A string identifying the beta embedding contract. Reading it has no side effects and does not test browser capabilities, source compatibility or solver validity. Pin the complete release directory when integrating; this identifier alone does not freeze every future beta implementation.

## Shared conventions

- Targets are a CSS selector or a browser `HTMLElement`. Give the mount a real height. A container can have one viewer owner; dispose it before reusing the container.
- Themes are `'light' | 'dark'`. Native drawing views are `'pcb' | 'schematic' | '3d' | 'manufacturing'`, subject to the loaded source kind.
- Saved drawing coordinates are millimetres. A 2D camera's zoom is CSS pixels per millimetre. 3D camera vectors are board-centred millimetres.
- Attach event listeners before loading. Events are native `CustomEvent`s; read their `detail` rather than DOM attributes.
- A successful asynchronous source operation returns `true`. Superseded or disposed work returns `false`; current failures reject and emit an error event. Check the return value as well as catching rejection.
- Use `AbortSignal` where offered. Cancelling work does not undo successful earlier steps in a multi-step presentation or restore operation.
- These APIs display saved designs and supplied results. They do not edit a native design, run native KiCad ERC/DRC, execute firmware or run an engineering solver.

## Release boundaries

This release does not expose the later `modelsready` event, `setDemoInteraction` method, or display anchor `faceSelection` / `minFaceAreaMm2` options used by newer site code. Use only the methods documented for your pinned copy.

The downloadable release uses [MPL-2.0](/kicad-webview/docs/license/); commercial use and integration need no individual approval. Keep its notices and matching-source link when distributing builds. The [source repository](https://github.com/wayri/kicad-webview) is public; input designs and third-party dependencies have separate terms.
