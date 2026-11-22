---
layout: webview-docs
title: Large-project performance
permalink: /kicad-webview/docs/large-projects/
doc_section: api
---

In WebView 1.2.0, Marble’s peak working set fell from about 562 to 513 MiB (8.6%) in the parser, drawing and connectivity benchmark. See the [benchmark scope and release notes](/kicad-webview/docs/releases/#webview-120).

# Large-project performance

The browser loader and saved-source parser accept a single modern KiCad drawing up to 256 MiB and 12 million S-expression nodes. Comparison and connectivity accept up to 512 MiB of source across 128 files. The connectivity cache retains only 96 MiB of source and metadata; larger valid inputs rebuild without caching. These are acceptance ceilings, not a promise that a device has enough memory for every drawing at the ceiling.

Direct schematic hierarchy accepts 256 MiB per modern sheet and 512 MiB total across up to 256 listed files. It keeps the existing bounded depth, 4,096 displayed hierarchy instances, cancellation, and at most three concurrent remote reads. Sheetfile names never authorize a new network request.

The ZIP reader accepts 256 MiB compressed input, 512 MiB expanded data, 256 MiB per entry, and 256 entries. Declared sizes, CRC, compression ratio, safe paths, and entry consistency remain enforced. Hosted project metadata remains capped at 8 MiB; linked 3D model assets remain capped at 8 MiB each. Manufacturing manifest loading retains its separate 32 MiB per file and 128 MiB aggregate bounds.

PCB and schematic geometry extraction and connectivity each admit up to 1.5 million drawing primitives per file. Saved-object inspection indexes up to 50,000 parts, 500,000 records, 1.5 million primitives, and 3 million geometry memberships; it reports truncation. Board/BOM analytics accepts the same 256 MiB source input but retains its separate 100,000 counted-object, 200,000 zone-point, and 64-field analysis bounds.

A focused synthetic check covers the last of 20,001 saved parts and geometry after 1.2 million frame entries on a 32-layer board. That proves late lookup in the bounded index, not full drawing speed for 1.2 million distinct primitives. Large files can use substantially more browser memory than their source size during parsing and rendering. The final 1.1.0 Marble and IRCA checks below qualify those retained fixtures; they do not establish complete fidelity at every acceptance ceiling.


## 1.2.0 large-board rendering

Saved fills use shared typed coordinates for drawing and picking. Dense views batch copper strokes and restore full detail when movement stops. See the [1.2.0 release measurements](/kicad-webview/docs/releases/#webview-120).

[Large-board lab](/assets/lib/kicad-webview/releases/1.2.0/large-projects.html) · [Narrow embed lab](/assets/lib/kicad-webview/releases/1.2.0/large-projects-embed.html)

## 1.1.0 measured large-board checks

The pinned BerkeleyLab Marble board is about 44 MB: 1,006 parts, 5,272 pads, 37,380 parsed track pieces and 12 copper layers. The renderer admits all **139 saved copper contours**, using 19,329,951 retained geometry bytes, with zero rejected copper pads/zones. Nineteen NPTH drill-only pads correctly keep holes without fabricated copper. IRCA's mirrored and rotated JP5/JP6 custom copper also passed geometry and visual checks.

Source-preparation additional retained heap fell from 462,652,424 to 284,134,384 bytes (**38.6%**), with identical object counts. Desktop and 340px iframe tests covered GND select/clear, camera preservation, expansion and layer visibility. The narrow run sampled about 701 MB of JS heap; timer sampling misses synchronous peaks, excludes process/GPU memory and is not physical-phone qualification. No universal sub-1-GB total-RAM promise is made.

[Open the explicit-load Marble/OLIMEX lab](/assets/lib/kicad-webview/releases/1.1.0/large-projects.html) · [340px iframe host](/assets/lib/kicad-webview/releases/1.1.0/large-projects-embed.html) · [IRCA and credited public projects](/assets/demos/direct.html) · [Detailed source/geometry evidence](/assets/lib/kicad-webview/releases/1.1.0/PAD-ZONE-REFINEMENT.md).

Public hardware keeps its upstream license and attribution. Marble uses disclosed component proxies; a complete copper view does not imply complete supplied CAD models. The optional outline halo has its own edge budget while filled copper remains visible. Arbitrary custom-pad Boolean combinations remain diagnosed when unsupported.

## Inspect renderer admission without a build step

```html
<div id="board" style="height:65dvh;min-height:320px"></div>
<script src="https://cdn.jsdelivr.net/npm/@wayrisignals/kicad-webview@{{ site.data.webview_release.npm }}/dist/kicad-webview.min.js"></script>
<script>
(async () => {
const viewer = new KiCadWebView.Viewer('#board', {theme:'dark'});
await viewer.load('/designs/project.json', {view:'3d'});
console.log(viewer.getRenderStats()?.zones);
window.addEventListener('pagehide', () => viewer.dispose(), {once:true});
})().catch(console.error);
</script>
```

Zone counters report source contour counts, retained geometry bytes and rejected contours; they are not process-memory counters. Dispose inactive viewers, keep very large examples behind an explicit load button, and retain diagnostics when geometry or models exceed their documented budgets.
