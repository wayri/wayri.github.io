---
layout: webview-docs
title: Projects, linking and presentations API
permalink: /kicad-webview/docs/api-project/
doc_section: api
---

These APIs use the same saved drawing identity and renderer contract as the [compact viewer](/kicad-webview/docs/api-viewer/). This page documents release **0.1.0-beta.2**, revision `86b375e`.

## ProjectViewer

```ts
new ProjectViewer(target: string | HTMLElement, options?: ProjectOptions): AdvancedKiCadViewer
new AdvancedKiCadViewer(target: string | HTMLElement, options?: ProjectOptions): AdvancedKiCadViewer
type ProjectOptions = ViewerOptions & {
  layout?: 'split' | 'single';
  linkedSelection?: boolean;
};
```

The two names are aliases for one `EventTarget` wrapper with project navigation and two owned compact viewers. Give the mount an explicit height. Options include the compact viewer's theme/model/inspection options, plus layout and component-selection linking. Defaults are `theme: 'dark'`, `layout: 'split'` and `linkedSelection: true`. Invalid targets, duplicate ownership or invalid theme/layout options throw.

| Method | Return and behavior |
| --- | --- |
| `load(input: string \| URL \| ProjectManifest, options?: LoadOptions)` | `Promise<boolean>`; loads a hosted drawing, project, repository source or ZIP through the bounded source loader. |
| `loadFiles(files: Iterable<File \| LocalSource>, options?: LoadOptions)` | `Promise<boolean>`; local file collection, without upload. |
| `loadArchive(bytes: Uint8Array \| ArrayBuffer, options?: LoadOptions)` | `Promise<boolean>`; local bounded ZIP. |
| `openFile(path: string, options?: {pane?: 0 \| 1; signal?: AbortSignal})` | `Promise<boolean>`; listed project file only. Choose a destination pane explicitly or use the active pane. |
| `getFiles()` | Copied `{path, url?}[]`. |
| `getActiveViewer()` | The active owned `KiCadViewer`; use its public selection/view methods. |
| `setActivePane(pane: 0 \| 1)` | `void`; selects pane zero or one; other values throw. |
| `setLayout(layout: 'split' \| 'single')` | `void`; invalid layouts throw. Single layout keeps one visible pane. |
| `setNavigatorOpen(open: boolean)` | `void`; shows/hides project navigation. |
| `setTheme(theme: 'light' \| 'dark')` | `void`; updates owned viewers and controls. |
| `getViewState()` | `Promise<ViewState>`; snapshots the current supported native panes. |
| `createViewLink(baseURL?: string \| URL)` | `Promise<string>`; captures source-bound state and builds a link. |
| `restoreViewState(state: ViewState, options?: {signal?: AbortSignal})` | `Promise<boolean>`; requires exactly two saved views and source-matched, project-listed paths, guarding selection linking during replay. |
| `dispose()` | `void`; idempotently aborts work, removes controls/listeners and disposes both owned viewers. |

Load errors/cancellation follow the compact viewer's contract: `true` on completion, `false` for superseded/disposed work, current errors reject. A restore can partially change a project before a later step fails; it is not a transaction. Call methods only while mounted.

| Event | `event.detail` |
| --- | --- |
| `projectready` | `{files: {path, url?}[]}`. |
| `ready` | Compact viewer ready detail plus `{pane: 0 \| 1}`. |
| `select` | Compact selection detail plus `{pane: 0 \| 1}`. |
| `error` | `{pane: 0 \| 1, error: Error}`. |
| `panechange` | `{pane: 0 \| 1}`. |

Component cross-probing uses saved schematic/PCB identities. Matching references such as `U1`, or matching short net names on different sheets, do not establish connectivity. A selected PCB trace does not automatically select an unrelated schematic net. [Hierarchy](/kicad-webview/docs/api-utilities/#hierarchy) is also available independently of this wrapper.

## linkViewers

```ts
linkViewers(viewers: KiCadViewer[], options?: {enabled?: boolean}): LinkedViewGroup
```

Links **2–8 explicitly supplied compact viewers**. Invalid collections or incompatible viewer inputs throw. It does not create, load or dispose those viewers.

- Exact saved components can cross-select between schematic, PCB and 3D.
- Identical saved source/path views can share supported pads, copper objects and net selections.
- Clearing selection propagates; cameras remain independent.
- The group does not guess from references, infer cross-sheet nets or resolve arbitrary sources.

The returned `EventTarget` has `readonly enabled: boolean`, `setEnabled(enabled: boolean): void` and `dispose(): void`. Disposal removes the link listeners, not the viewers. `link` detail is `{source, target, kind: 'part' | 'net' | 'object' | 'clear'}`. `linkerror` detail is `{source, target, error}`.

Disable linking during manual saved-state replay, then restore its previous setting in `finally`, so one replayed pane does not overwrite another pane's selection. `ProjectViewer.restoreViewState` manages its own guard.

## View state

```ts
captureViewState(viewers: KiCadViewer[], settings?: {
  theme?: 'light' | 'dark'; layout?: 'split' | 'single';
  activePane?: number; linkedSelection?: boolean;
}): Promise<ViewState>

restoreViewState(viewers: KiCadViewer[], state: ViewState, options?: {
  signal?: AbortSignal;
  current?: () => boolean;
  openFile?: (index: number, path: string, signal?: AbortSignal) => boolean | Promise<boolean>;
}): Promise<boolean>

validateViewState(state: unknown): ViewState
createViewLink(baseURL: string | URL, state: ViewState): string
parseViewLink(url: string | URL): ViewState | null
```

`ViewState` uses schema `kicad-webview.views/v1`. It contains 1–8 `views`, optional theme/layout/active-pane/link settings, and this per-view shape:

```ts
type SavedView = {
  path: string;
  sha256: string;
  view: 'pcb' | 'schematic' | '3d';
  camera?: Camera2D;
  camera3D?: Camera3D;
  layers?: string[];
  selection?: ViewSelection | null;
};
```

| Function | Result and failure rules |
| --- | --- |
| `captureViewState` | Copies supported cameras/layers/selections and computes SHA-256 of exact native source text using Web Crypto. Rejects without a secure context, if the source changes while hashing, or for unsupported/unloaded views. |
| `validateViewState` | Returns a validated copy. Throws for invalid/unknown fields, unsafe paths, oversized state and invalid cameras/selections rather than silently accepting them. |
| `createViewLink` | Returns the HTTP(S) base path/query with a `#kicad-view=` encoded JSON fragment. No request or history mutation. Throws for invalid state, authority credentials, unsupported URL protocols or encoded fragments over 16 KiB. |
| `parseViewLink` | Returns `null` for ordinary fragments; otherwise returns validated state. Malformed encoded state throws rather than becoming a best-effort camera instruction. |
| `restoreViewState` | Verifies each exact saved source hash, kind, layers and identities before applying saved camera/selection. Returns `true`, or `false` when a viewer is disposed, `current()` becomes false, or a loader/view switch declines. Validation/mismatch/current errors reject; pre-aborted caller signals reject with `AbortError`. |

Hosts load the project before restoration. `openFile(index, path, signal)` may open a different **already listed** project file; confine it to that project, and honor cancellation. A fragment never authorizes arbitrary network loading. Source hashes prevent replaying selections against a different revision.

Restoration is not transactional: earlier file openings or pane changes may have occurred before a later failure. Hash mismatch never applies saved camera/selection. Neither view state nor URLs contain design bytes, models or credentials; paths and selection metadata are still visible to recipients. CAM and Altium provider state are outside this native schema.

## ViewerCarousel

```ts
new ViewerCarousel(target: string | HTMLElement, options: {
  viewer: KiCadViewer;
  slides: CarouselSlide[];
  interval?: number;
}): ViewerCarousel
```

Mount controls in a container separate from the viewer. Construction neither loads a slide nor starts playback. `slides` must contain 1–100 entries, each with a nonempty plain-text `label` of at most 500 characters. The default interval is 5000 ms; accepted values are 1000–3600000 ms. Invalid targets, viewer contracts, slides or intervals throw.

| Slide option | Behavior |
| --- | --- |
| `input?: string \| URL \| ProjectManifest` | Passed to `viewer.load`. Mutually exclusive with `source`. |
| `source?: string` | Passed to `loadSource`, with `options.path` where needed. |
| `options?: LoadOptions & {path?: string; project?: ProjectManifest}` | Source/view context. The carousel owns the operation's cancellation signal. |
| `view?: DrawingView` | Must suit the selected drawing kind. |
| `camera?: Camera2D` | Applied after source/view selection. Cannot combine with `camera3D`. |
| `camera3D?: Camera3DPreset` | A named camera; requires 3D. |
| `clearSelection?: boolean` | Clears the previous selection before optional highlighting. |
| `net?: string` | Exact saved net name; a missing net fails that slide. |

Omit `input`/`source` to reuse the loaded design. Local projects can be loaded before constructing the carousel; it does not upload local files.

| Method/property | Return and behavior |
| --- | --- |
| `readonly index` | Last successful zero-based slide index; initially `-1`. |
| `readonly playing` | Whether explicit timed playback is active. |
| `show(index: number)` | `Promise<boolean>`; `true` on success, `false` when stale/cancelled or a viewer transition declines; rejects current errors. |
| `next()`, `previous()` | `Promise<boolean>`; manual navigation clamps to the first/last slide. |
| `play()` | `boolean`; refuses fewer than two slides, a hidden document or reduced-motion preference. Playback loops when enabled. |
| `pause()` | `void`; stops the timer. |
| `dispose()` | `void`; cancels pending/queued work, timers and controls. Does not dispose the supplied viewer. |

`slidechange` detail is `{index, label}`; `error` detail is `{index, error}`. A failed slide pauses playback and keeps the last successful index. Focusing controls, hiding the document or enabling reduced motion pauses playback; resumption requires explicit `play()`. Transitions serialize, but are not transactional. Avoid unrelated direct source/view changes on the same viewer while a presentation owns its transitions.
