---
layout: webview-docs
title: Quick start
description: npm installation and no-build classic script, ES module, iframe and HTML-export setup.
permalink: /kicad-webview/docs/quick-start/
doc_section: quick-start
---

Choose the public npm package for a browser application, or use the no-build routes below. The npm option is pinned to `0.1.0-beta.3`; the existing website-hosted examples retain their immutable `0.1.0-beta.2` URLs. The no-build examples load the OLIMEX public project manifest, which references pinned original upstream sources under CERN-OHL-S-2.0. Models are not bundled; unresolved components use labelled stand-ins.

## npm installation (0.1.0-beta.3)

Install the public [@wayrisignals/kicad-webview package](https://www.npmjs.com/package/@wayrisignals/kicad-webview):

```sh
npm install @wayrisignals/kicad-webview@0.1.0-beta.3
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

Replace `/designs/project.zip` with your own supported design URL. Cross-origin sources must permit CORS. Dispose the viewer when its host is permanently unmounted. The package also exports `/lite`, `/hierarchy` and `/slack` entry points; see the [package README](https://github.com/wayri/kicad-webview/blob/v0.1.0-beta.3/README.md) for their scope.

`@beta` follows the current prerelease; the exact version above is reproducible. The package includes the viewer, matching source, types and notices, but excludes legacy board fixtures and fixture-backed demo pages. Existing IRCA and public-board demonstrations remain on this website. Both this npm release and the hosted beta.2 SDK use MPL-2.0; preserve the notices supplied with the copy you use.

## Classic script

Save this as a webpage on an HTTP(S) host. Give the mount a real height; an empty container with no height cannot show the drawing.

```html
<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Interactive board</title>
<div id="board" style="width:100%;height:70dvh;min-height:360px"></div>
<p id="status" role="status">Opening design…</p>
<script src="https://wayri.github.io/assets/lib/kicad-webview/releases/0.1.0-beta.2/kicad-webview.min.js"></script>
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

Use the same container, then replace the classic scripts with this module. The filename `kivi-viewer.js` is the supplied full ES-module entry.

```html
<script type="module">
import { Viewer } from 'https://wayri.github.io/assets/lib/kicad-webview/releases/0.1.0-beta.2/kivi-viewer.js';

const viewer = new Viewer('#board', { theme: 'dark' });
window.addEventListener('pagehide', () => viewer.dispose(), { once: true });
try {
  await viewer.load(
    'https://wayri.github.io/assets/demos/public-hardware/olimex-p4-project.json',
    { view: '3d' }
  );
} catch (error) {
  document.querySelector('#status').textContent = error.message;
}
</script>
```

Use an HTTP(S) page rather than opening a module page directly with `file://`. Cross-origin modules and design files need appropriate CORS responses. See [hosting](/kicad-webview/docs/hosting/).

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

1. [Download the complete release ZIP](/assets/lib/kicad-webview/downloads/kicad-webview-0.1.0-beta.2.zip).
2. Unpack it and keep the release files, `LICENSE`, notices and `licenses/` together. Preserve relative paths.
3. Serve the directory through your approved static HTTP(S) host. No runtime Node service is required.
4. Open `embed.html` with an approved source parameter, or `export.html`.
5. Point your application’s script/import URLs at your versioned copy. Do not change bytes under an already published release version.

The [release manifest](/assets/lib/kicad-webview/releases/0.1.0-beta.2/RELEASE.json) supplies SHA-256 file checksums and a classic-script SRI value. Keep the entire release when you need all entry points. A smaller integration still needs the dependencies and notices required by the files it uses.

## Export a self-contained HTML viewer

Open the [browser-only exporter](/assets/demos/export.html), choose local design files or one project ZIP, select an initial view and create the HTML download. Include saved model assets in a project ZIP with their expected paths. The exporter reads your chosen files locally; it does not upload the design.

The output contains your design, viewer and notices. Review it before sharing. Its content policy blocks external network connections, so missing models cannot be fetched later. A recipient’s browser or host application must allow interactive HTML and WebGL for 3D.

For a ready interactive design, visit the [IRCA product demonstration](/kicad-webview/). The [export API](/kicad-webview/docs/api-utilities/) is a separate module; it is not a method on the `KiCadWebView` global.

## Next steps

Use the [user guide](/kicad-webview/docs/user-guide/) for controls and interpretation, the [examples](/kicad-webview/docs/examples/) for application patterns, and the [API reference](/kicad-webview/docs/api/) for signatures, options and cleanup. Keep the [MPL-2.0 license, notices and matching-source link](/kicad-webview/docs/license/) with distributed builds.
