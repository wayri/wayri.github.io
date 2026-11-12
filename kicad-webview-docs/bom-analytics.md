---
layout: webview-docs
title: Saved BoM and board data
permalink: /kicad-webview/docs/bom-analytics/
doc_section: bom-analytics
description: Link a read-only bill of materials and saved PCB statistics to a KiCad viewer.
---

The **0.5.0** BoM viewer groups saved parts by value, footprint and population, searches references and fields, and exports the eligible full BoM as CSV. A linked viewer locates a uniquely identified saved part in the current PCB, schematic or 3D view. The Board data tab summarizes a saved PCB's counts, track centreline lengths and saved zone polygons. [Open the credited OLIMEX demo](/assets/demos/bom.html).

The [0.6 viewer refresh](/kicad-webview/docs/extension-refresh/) retains these BoM APIs and adds exploded 3D inspection and sheet navigation. BoM selection still requires exact saved identity; display-only explode spacing does not change analytics. The 0.5 example below remains version-pinned to the release that introduced the panel. Current self-hosted and npm/CDN availability is shown above.

## Link the drawing and panel

The example below uses the self-hosted 0.5.0 module path; host that release and its dependencies together. Give the drawing an explicit height. `BOMViewer` listens for the viewer's native-source `ready` event, so it updates when a supported drawing changes. A schematic has BoM data; board statistics are available for PCBs only.

```html
<div id="board" style="height:500px"></div>
<div id="bom"></div>
<script type="module">
import {Viewer, BOMViewer} from '/assets/lib/kicad-webview/releases/0.5.0/kivi-viewer.js';
const board = new Viewer('#board', {theme:'dark'});
const bom = new BOMViewer('#bom', {viewer:board, theme:'dark'});
await board.load('/assets/demos/public-hardware/olimex-p4-project.json', {view:'pcb'});
const parts = bom.getBOM();
const statistics = bom.getBoardStatistics(); // null for a schematic
bom.setMode('board'); // 'parts' returns to the BoM
// When finished: bom.dispose(); board.dispose();
</script>
```

The panel also supports `loadSource(text, {path})`, `setQuery(text)`, `setGrouped(boolean)`, `setTheme('light'|'dark')`, `exportCSV()` and `dispose()`. An independently loaded source is summarized but selection links require the viewer to have the same saved source and path. `selectPart(part)` returns false when the association or saved UUID is absent or ambiguous. No fallback matches a reference to a different object. CSV neutralizes spreadsheet formula prefixes. `getBOM()` and `getBoardStatistics()` return frozen reports; the latter is computed on demand.

## Source-only functions

For a report without UI, import `buildBOM(source, {path})`, `analyzeBoard(source, {path})` and `bomToCSV(report)` from the same module. The CSV function accepts a report returned by `buildBOM` in the same module instance. These functions accept native saved KiCad text, not uploaded HTML, external imports or executable content. Callers choose how to provide source text; the functions do not fetch it.

## Interpretation and limits

- BoM totals count saved physical identities; schematic units sharing a reference in one file count once. Reused sheet instances are not expanded. DNP parts remain visible; saved exclusions are counted but omitted from eligible groups and CSV. Ambiguous duplicate PCB UUIDs remain separate and cannot be selected by UUID.
- Source text is limited to 8 MiB; analytics accepts at most 100,000 source objects and 200,000 saved zone polygon points. Up to 64 saved properties per part are kept; a warning reports truncation. CSV is limited to 32 MiB of UTF-8 output. See each report's warnings and limits for details.
- Track lengths sum saved straight segments and circular-arc centrelines. Vias add no length. Zone areas are absolute sums of saved straight-edge polygon areas: overlaps count repeatedly and holes are not subtracted. They are not copper unions, material mass, clearance checks or new zone fills.
- Placement candidates are review hints based on saved origins and, when supported, a straight-edge envelope. They do not establish placement intent or containment. Curved or unsupported edge geometry makes that envelope unavailable.

The OLIMEX example is credited in the demo and its provenance files. Drawing review is not a replacement for native KiCad checks or fabrication qualification.
