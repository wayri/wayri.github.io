---
layout: webview-docs
title: Latest source preview
permalink: /kicad-webview/docs/source-preview/
doc_section: examples
---

The [KERO linked workspace](/assets/demos/kero-linked.html) uses the shared source updates from KiCad Online 0.12.102 plus the WebView copper-depth correction. It demonstrates saved sheet navigation, linked part/net selection and 3D focus with compact controls in the site's warm palette. Browser text metrics, unavailable component models and unsupported geometry remain approximations.

This is a **source preview**, built from [exact revision 6deefae](https://github.com/wayri/kicad-webview/tree/6deefaea8a3473614939ba6358950b9c66ed5b15), checked in the public source fix. Stable npm and jsDelivr/unpkg remain **0.8.0**; this preview is not a replacement for the published version. Existing versioned release assets are unchanged.

## Direct script: no Node.js required

Give the container a real height, serve your design from your own HTTPS site, and add:

```html
<div id="board" style="height:70dvh;min-height:340px"></div>
<script src="https://wayri.github.io/assets/lib/kicad-webview/previews/expanded-vias-6deefae/kicad-webview.min.js"></script>
<script>
const viewer = new KiCadWebView.Viewer('#board', {
  theme: 'dark', inspectOnSelect: false
});
viewer.load('/designs/project.zip', {view: '3d'});
</script>
```

Keep the notices and [matching covered source](https://github.com/wayri/kicad-webview/tree/6deefaea8a3473614939ba6358950b9c66ed5b15) when redistributing. Cross-origin design links require CORS; browser authorization is not bypassed. The library is free to use, including commercially, under MPL-2.0. Paid integration or support help is optional.

## Try the saved design

Select a part in any pane to cross-select its saved counterpart; 3D focuses the selected part. Choose a schematic from its sheet selector to navigate the project hierarchy. Select copper to highlight its saved net across layout and 3D. Layer visibility and each camera remain independent. Copper highlights follow layer colors and vias retain gold. Use Fit to restore framing. On phones, panes stack vertically; use the page gutter to scroll.

KERO Encoder drawings are pinned to [wayri/KERO revision 7be8fef](https://github.com/wayri/KERO/tree/7be8fef589bc28eee149323e3790ef95b0873032/encoder), supplied by Yawar Badri (wayri). The [provenance manifest](/assets/lib/kicad-webview/previews/expanded-vias-6deefae/demo/PROVENANCE.json) records exact paths, sizes and hashes. External component models are not bundled; labelled stand-ins are not the original mechanical models. Consult the upstream project for hardware terms. Viewer software remains MPL-2.0. [Development acknowledgements](/kicad-webview/docs/acknowledgements/).


## Expanded net focus

Select **Follow VBAT**, then **Expand** in the linked workspace. Only the selected net's via caps and stretched barrels remain gold; unrelated vias become gray and translucent in Dim mode. Select another net to move that emphasis, choose Expand again to reassemble, or Clear to restore the original colors. Source coordinates, layer spans and visibility remain unchanged.

```js
viewer.setHighlightStyle('dim', {color: 'source'});
viewer.selectNet('/VBAT');
viewer.setExpand(85);
// viewer.clearSelection();
// viewer.setExpand(0);
```
