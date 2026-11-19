---
layout: webview-docs
title: KERO linked workspace
permalink: /kicad-webview/docs/source-preview/
doc_section: examples
---

The [KERO linked workspace](/assets/demos/kero-linked.html) now uses stable **KiCad WebView 1.0.0**, available from npm, jsDelivr, UNPKG and self-hosted files. The former source-preview URL is retained for existing links. [Release and migration notes](/kicad-webview/docs/api-stability/).

Select a sheet, part, pad or saved net to cross-highlight the other panes. Each camera remains independent. Net selection retains the 3D camera; explicit part selection frames its mounting side. Compact controls and the website's warm palette remain unchanged. On phones, panes stack; use the page gutter to scroll.

## Direct script without Node.js

```html
<div id="board" style="height:70dvh;min-height:340px"></div>
<script src="https://cdn.jsdelivr.net/npm/@wayrisignals/kicad-webview@1.1.0/dist/kicad-webview.min.js"></script>
<script>
const viewer = new KiCadWebView.Viewer('#board', {
  theme:'dark', inspectOnSelect:false
});
viewer.load('/designs/project.zip', {view:'3d'});
</script>
```

Self-host the [versioned distribution](/assets/lib/kicad-webview/releases/1.1.0/RELEASE.json) and its notices, or [download the static SDK ZIP](https://github.com/wayri/kicad-webview/releases/download/v1.1.0/kicad-webview-1.1.0.zip). Cross-origin designs require CORS. The library is free to use, including commercially, under MPL-2.0; paid customization and support help is optional.

## Design provenance

KERO Encoder drawings are pinned to [wayri/KERO revision 7be8fef](https://github.com/wayri/KERO/tree/7be8fef589bc28eee149323e3790ef95b0873032/encoder), supplied by Yawar Badri (wayri). The [provenance manifest](/assets/lib/kicad-webview/releases/1.1.0/demo/PROVENANCE.json) records exact paths, sizes and hashes. External component models are not bundled; labelled stand-ins are not original mechanical models. Consult upstream for hardware terms. Viewer software is MPL-2.0. [Development acknowledgements, including AI assistance](/kicad-webview/docs/acknowledgements/).


## Camera-preserving net focus in 1.0.0

Selecting a net, trace or pad with **Highlight entire net** enabled keeps the current 3D camera position, target and orientation, including selections coming from linked PCB views. It does not switch to Top. Explicit part selection still centers the part and shows its mounting side.

In the default **Dim + source colors** style, the selected net retains its layer colors, and only its via caps and barrels stay gold. Unrelated copper, all component bodies and board structures become gray and translucent in both assembled and expanded views. Clear restores their original appearance. Bright and Isolate remain explicit alternative styles.

```js
viewer.setHighlightStyle('dim', {color: 'source'});
viewer.selectNet('/VBAT'); // camera unchanged
viewer.setExpand(85);     // optional animated assembly separation
// viewer.clearSelection();
// viewer.setExpand(0);
```
