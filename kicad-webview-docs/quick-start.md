---
layout: webview-docs
title: Quick start
description: npm installation and no-build classic script, ES module, iframe and HTML-export setup.
permalink: /kicad-webview/docs/quick-start/
doc_section: quick-start
---

Add KiCad WebView to a plain HTML page with a script tag or browser ES module. **No Node.js, npm installation or build step is needed.** You only need an HTTP(S) host, such as GitHub Pages. The npm and CDN examples use the published `0.3.0` package. For native 3D WayriCAD field registration and linked probes, use the [self-hosted 0.4.0 SDK](#self-hosted-040-sdk); the archived website SDK retains its immutable `0.1.0-beta.2` URLs. The examples below load the credited OLIMEX public project, including its PCB, schematic and 28 supplied model assets. Unresolved models remain labelled stand-ins.

## Self-hosted 0.4.0 SDK

Use a version-pinned browser script without Node.js:

```html
<script src="https://wayri.github.io/assets/lib/kicad-webview/releases/0.4.0/kicad-webview.min.js"></script>
```

The same release provides an [ES module](/assets/lib/kicad-webview/releases/0.4.0/kivi-viewer.js), [checksums](/assets/lib/kicad-webview/releases/0.4.0/RELEASE.json) and [source/download](https://github.com/wayri/kicad-webview/releases/tag/v0.4.0). Use the [WayriCAD integration example](/kicad-webview/docs/wayricad-results/#embed-both-views-without-nodejs) for result layers, native 3D registration and linked probes. Keep the complete matching release directory and notices when self-hosting.

## npm installation

Install the public [@wayrisignals/kicad-webview package](https://www.npmjs.com/package/@wayrisignals/kicad-webview):

```sh
npm install @wayrisignals/kicad-webview@0.3.0
```

Add a sized mount to your page:

```html
<div id="board" style="height:70dvh;min-height:360px"></div>
```

Use the package from your application's browser entry point with an ES-module-capable bundler:

```js
import { Viewer } from '@wayrisignals/kicad-webview';

const viewer = new Viewer('#board', { theme: 'dark', inspectOnSelect: false });
await viewer.load('/designs/project.zip', { view: '3d' });
```

Replace `/designs/project.zip` with your own supported design URL. Cross-origin sources must permit CORS. Dispose the viewer when its host is permanently unmounted. The package also exports `/lite`, `/hierarchy` and `/slack` entry points; see the [package README](https://github.com/wayri/kicad-webview/blob/v0.3.0/README.md) for their scope.

`@latest` follows the current stable release; pin the exact version above for reproducible installs. The package includes the viewer, matching source, types and notices, but excludes legacy board fixtures and fixture-backed demo pages. Existing IRCA and public-board demonstrations remain on this website. Both this npm release and the hosted beta.2 SDK use MPL-2.0; preserve the notices supplied with the copy you use.

## Classic script

[Try the live classic-script example](/assets/demos/cdn-classic.html). Copy this complete page onto a static HTTP(S) host. The viewer is loaded directly from jsDelivr; the browser does all rendering. Give the mount a real height.

```html
<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Interactive board</title>
<div id="board" style="width:100%;height:70dvh;min-height:360px"></div>
<p id="status" role="status">Opening design…</p>
<script src="https://cdn.jsdelivr.net/npm/@wayrisignals/kicad-webview@0.3.0/dist/kicad-webview.min.js"></script>
<script>
const viewer = new KiCadWebView.Viewer('#board', { theme: 'dark' });
viewer.addEventListener('error', event => {
  document.querySelector('#status').textContent = event.detail.message;
});
viewer.load(
  'https://wayri.github.io/assets/demos/public-hardware/olimex-p4-project.json',
  { view: '3d' }
).then(loaded => {
  if (loaded) document.querySelector('#status').textContent = 'Read-only project';
}).catch(error => {
  document.querySelector('#status').textContent = error.message;
});
window.addEventListener('pagehide', () => viewer.dispose(), { once: true });
</script>
</html>
```

Replace the sample URL with your supported hosted drawing, project manifest or ZIP. Attach event listeners before calling `load`.

## ES module

[Try the live browser-module example](/assets/demos/cdn-module.html). Use the same container and status paragraph as above, then replace both classic script tags with this module. This imports directly from UNPKG; no package manager or bundler is involved.

```html
<script type="module">
import { Viewer } from 'https://unpkg.com/@wayrisignals/kicad-webview@0.3.0/dist/kivi-viewer.js';

const viewer = new Viewer('#board', { theme: 'dark' });
window.addEventListener('pagehide', () => viewer.dispose(), { once: true });
try {
  const loaded = await viewer.load(
    'https://wayri.github.io/assets/demos/public-hardware/olimex-p4-project.json',
    { view: '3d' }
  );
  if (loaded) document.querySelector('#status').textContent = 'Read-only project';
} catch (error) {
  document.querySelector('#status').textContent = error.message;
}
</script>
```

Use an HTTP(S) page rather than opening a module page directly with `file://`. Cross-origin modules and design files need appropriate CORS responses. See [hosting](/kicad-webview/docs/hosting/).

## CDN links and self-hosting

The following version-pinned files return JavaScript with cross-origin access enabled. Both CDN copies have been checked byte for byte against the published npm package.

| Entry | jsDelivr | UNPKG |
| --- | --- | --- |
| Classic script | [kicad-webview.min.js](https://cdn.jsdelivr.net/npm/@wayrisignals/kicad-webview@0.3.0/dist/kicad-webview.min.js) | [kicad-webview.min.js](https://unpkg.com/@wayrisignals/kicad-webview@0.3.0/dist/kicad-webview.min.js) |
| Browser ES module | [kivi-viewer.js](https://cdn.jsdelivr.net/npm/@wayrisignals/kicad-webview@0.3.0/dist/kivi-viewer.js) | [kivi-viewer.js](https://unpkg.com/@wayrisignals/kicad-webview@0.3.0/dist/kivi-viewer.js) |

A script URL loads the library; the design URL supplied to viewer.load loads your PCB, schematic, project manifest or ZIP. Replace the OLIMEX URL with your own same-domain file, for example `/designs/project.zip`. A local webpage opened with file:// can have browser restrictions: serve it with your normal static website. Cross-origin designs need CORS.

You can download and host the script yourself without installing Node.js. Keep the matching [license](https://cdn.jsdelivr.net/npm/@wayrisignals/kicad-webview@0.3.0/LICENSE), [third-party notices](https://cdn.jsdelivr.net/npm/@wayrisignals/kicad-webview@0.3.0/THIRD-PARTY-NOTICES.md) and [covered source](https://github.com/wayri/kicad-webview/tree/v0.3.0) available as required by MPL-2.0. Pin the exact version rather than an unversioned latest URL.

### Public hardware acknowledgement

The OLIMEX ESP32-P4-DevKit Rev.D1 example is pinned to [revision 26705d3](https://github.com/OLIMEX/ESP32-P4-DevKit/tree/26705d36407a07324348927dfd30fbf4ffc1d94c), hardware licensed CERN-OHL-S-2.0. Credit belongs to OLIMEX Ltd and upstream contributors; no affiliation or endorsement is implied. The display PCB adapts model paths and equivalent legacy identity fields. See [source and conversion provenance](/assets/demos/public-hardware/PROVENANCE.json) and [model coverage](/assets/demos/public-hardware/MODEL-PROVENANCE.json).

## iframe

Use this route when the host accepts HTML iframes but does not permit your own page scripts.

```html
<iframe
  title="Interactive OLIMEX design"
  src="https://wayri.github.io/assets/demos/embed.html?src=https%3A%2F%2Fwayri.github.io%2Fassets%2Fdemos%2Fpublic-hardware%2Folimex-p4-project.json&amp;view=3d&amp;theme=dark"
  style="width:100%;height:70dvh;min-height:360px;border:0"
  loading="lazy">
</iframe>
```

The example encodes an absolute source URL. A relative `src` resolves against `embed.html`, not the parent webpage. The [iframe parameter reference](/kicad-webview/docs/hosting/#iframe-parameters) describes the supported options; this release does not provide a general cross-origin iframe command bridge.

## Self-host the ZIP

1. [Download the archived beta.2 release ZIP](/assets/lib/kicad-webview/downloads/kicad-webview-0.1.0-beta.2.zip).
2. Unpack it and keep the release files, `LICENSE`, notices and `licenses/` together. Preserve relative paths.
3. Serve the directory through your approved static HTTP(S) host. No runtime Node service is required.
4. Open `embed.html` with an approved source parameter, or `export.html`.
5. Point your application’s script/import URLs at your versioned copy. Do not change bytes under an already published release version.

The [release manifest](/assets/lib/kicad-webview/releases/0.1.0-beta.2/RELEASE.json) supplies SHA-256 file checksums and a classic-script SRI value. Keep the entire release when you need all entry points. A smaller integration still needs the dependencies and notices required by the files it uses.

## Export a self-contained HTML viewer

Open the [browser-only exporter](/assets/demos/export.html), choose local design files or one project ZIP, select an initial view and create the HTML download. Include saved model assets in a project ZIP with their expected paths. The exporter reads your chosen files locally; it does not upload the design.

The output contains your design, viewer and notices. Review it before sharing. Its content policy blocks external network connections, so missing models cannot be fetched later. A recipient’s browser or host application must allow interactive HTML and WebGL for 3D.

For a ready interactive design, visit the [IRCA product demonstration](/kicad-webview/). The [export API](/kicad-webview/docs/api-utilities/) is available as `createStandaloneHTML` from the main module and the `KiCadWebView` global; the smaller `/html` entry exports it independently.

## Next steps

Use the [user guide](/kicad-webview/docs/user-guide/) for controls and interpretation, the [examples](/kicad-webview/docs/examples/) for application patterns, and the [API reference](/kicad-webview/docs/api/) for signatures, options and cleanup. Keep the [MPL-2.0 license, notices and matching-source link](/kicad-webview/docs/license/) with distributed builds.
