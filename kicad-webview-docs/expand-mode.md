---
layout: webview-docs
title: Expand mode and net shine-through
description: Lift the assembly, separate colored copper layers and inspect highlighted nets through the 3D board.
permalink: /kicad-webview/docs/expand-mode/
doc_section: examples
---

[Try OLIMEX and IRCA](/assets/demos/photoreal-fast.html). These additions are included in stable **1.0.0** from npm, CDN and the self-hosted SDK.

## A two-stage assembly view

Use the compact **Expand mode** button, or the range inside the 3D toolbar. At 0–35% the front and back components lift away from their mounting faces. At 35–100% the copper planes separate, the substrate envelope fades to 2%, and supported through-via barrels stretch between the separated outer layers. Clearing selection restores each copper layer’s own color. Hidden layers remain hidden.

```js
viewer.setExpand(100); // animated target
viewer.addEventListener('expandchange', event => {
  console.log(event.detail.amount); // displayed progress
});
viewer.setExpand(0);   // reverse smoothly and reassemble
```

`getExpand()` returns current progress. `setExplode` and `getExplode` remain compatibility aliases. Requests can be retargeted during motion. Reduced-motion preferences are honored; animation pauses while hidden/off-screen and stops scheduling frames at rest. A temporary one-million-pixel framebuffer cap reduces work during movement; full resolution returns at rest. Shadows and ambient occlusion resume after reassembly. Device-specific frame rates are not guaranteed.

This is reversible display spacing, not an edit to the saved project or physical dimensions. Existing source identities and cross-selection stay active, and focus follows a selected part’s displayed position. Missing saved internal elevations remain labelled illustrative. Separate dielectric, prepreg or MCPCB core solids are not reconstructed when they are absent from the renderer’s geometry; its existing substrate envelope is faded.

Registered numerical fields/probes and physical measurement pause while expanded because their physical elevations no longer match the display. Collapse to 0% to restore them.

## Selected nets shine through the board

Select a net in the inspector’s **Nets** tab, a trace/pad with whole-net highlighting enabled, or a linked PCB view. A bright unlit overlay follows the actual saved traces, pads and supported via barrels, including available internal copper. It remains visible through the board and component bodies. Fills stay faint and their real boundaries are accented so a large ground plane does not obscure the design.

The overlay follows expansion, respects hidden layers and the existing accent/source highlight-color choice, and disappears when selection clears. It does not alter source materials or geometry, become a pick target, or change the board’s fit. It is an inspection aid, not simulated light, current or voltage.

The overlay has bounded instance, source-mesh and edge budgets; a visible notice identifies truncation. Open the demo’s optional **Read rendering stats** control to inspect `expansion`, `netGlow` and actual rendered pixels. Source models and retained results keep their original limits and provenance.

[Photoreal Fast integration](/kicad-webview/docs/photoreal-fast/) · [Source preset notes](/assets/lib/kicad-webview/releases/1.1.0/EXPAND-MODE.md) · [Credits and development acknowledgements](/kicad-webview/docs/acknowledgements/)

Copper clicks highlight the full saved net by default in its layer colors. Only selected-net plated vias stay gold during Dim net focus; the optional accent style remains available.


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
