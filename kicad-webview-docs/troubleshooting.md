---
layout: webview-docs
title: Troubleshooting
description: Diagnose mounting, loading, models, selection, archives and embedding failures.
permalink: /kicad-webview/docs/troubleshooting/
doc_section: troubleshooting
---

## Start with the current failure

Attach an `error` listener before loading and catch the load Promise. Check the browser’s network and console messages. Report the release version, source type, chosen view, browser and a shareable non-private reproduction; do not include tokens or private design bytes in a public issue or URL.

| Symptom | What to check |
| --- | --- |
| Empty or zero-height viewer | The container exists before construction and has an explicit height. Dispose the previous viewer before reusing it. |
| `KiCadWebView` is undefined | The classic script loaded before your initialization code. An ES-module import does not promise the classic global. Check HTTP status, MIME type, integrity and CSP errors. |
| Module fails when opened from a file | Serve the integration through HTTP(S), or use a generated standalone HTML document for offline distribution. |
| Source request fails | Check HTTP status, CORS, source URL encoding and access permissions. Private GitHub access is not supplied by the library. |
| GitHub project is incomplete or listing rejected | Use a smaller directory or an explicit project manifest. The loader rejects truncated file listings. Branches with `/` need the matching `ref` option. |
| Hosted `.kicad_pro` does not open | List its actual schematic/PCB files in a manifest. The project settings file is not itself the drawing payload. |
| Child schematic is disabled | Its saved relationship must resolve to a supported file listed in the loaded project. Check spelling, directory paths, ambiguity and hierarchy diagnostics. |
| ZIP fails before rendering | Check the [archive limits and rejected forms](/kicad-webview/docs/hosting/#release-input-limits). Repack as a normal stored/deflate ZIP with safe unique relative names. |
| Deflate is unavailable | Use a compatible browser or unpack and supply supported files directly. Increasing a size option does not add decompression support. |
| 3D is blank or loses its graphics context | Check WebGL availability and host restrictions. Try the 2D layout, reduce project/model complexity and retain visible renderer warnings. |
| Parts look like boxes or stand-ins | Saved model assets are missing, unsupported, blocked or unresolved. Supply matching model paths; a proxy is not verified mechanical geometry. |
| A net does not cross-select another sheet | Saved component identities and supported exact drawing identities drive linking. Similar reference labels or short net names are not proof of connectivity. |
| Selection or overlay disappears | A new source/view can invalidate old identities and controls. Rebind to the successfully loaded scene; do not attach old state to guessed geometry. |
| Imported analysis is rejected or blank | Check the format, source hash/path, finite cells, units, bounds and supported release schema. A blank region does not mean zero loss or temperature. |
| Standalone HTML cannot fetch a model | The generated document deliberately blocks external network access. Include the model in the project before generating the file. |
| HTML works in a browser but not in an app | The host may block JavaScript, WebGL or attachments. Use an ordinary browser link; verify that app’s actual web/mobile client separately. |
| Controls cover the drawing on a phone | Give the embed a useful height, close scrollable panels and use named view/search controls. Do not disable user zoom in the host viewport. |

## Keep asynchronous replacements predictable

Loading methods return `true` after a completed current render, `false` for work superseded by a newer load or disposal, and reject current failures. Cancellation and render errors are distinct from a source being electrically valid. Use the [lifecycle contract](/kicad-webview/docs/api-viewer/) and dispose on framework unmount. Do not keep forwarding events from an old instance after replacement.

```js
const controller = new AbortController();
const viewer = new KiCadWebView.Viewer('#board');
try {
  const loaded = await viewer.load('/designs/project.json', {
    signal: controller.signal
  });
  if (!loaded) console.info('This load was superseded or disposed.');
} catch (error) {
  console.error(error.message);
}
// On unmount: controller.abort(); viewer.dispose();
```

## Match the documentation to your copy

This reference is pinned to `0.1.0-beta.2` / `86b375e`. The product page’s IRCA demonstrations use a newer site-specific bundle. Later `modelsready`, focused interaction locking and continuous FEM triangle overlay behavior are not APIs of this release. Use the [export inventory](/kicad-webview/docs/api/) and [release hashes](/assets/lib/kicad-webview/releases/0.1.0-beta.2/RELEASE.json) to identify the copy in use.

For integration support contact [support.kivi@sigharmonic.com](mailto:support.kivi@sigharmonic.com). Paid support is optional; MPL-2.0 does not require individual approval for commercial software use. Check the [release license and separate design terms](/kicad-webview/docs/license/).
