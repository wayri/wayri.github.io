---
layout: webview-docs
title: Photoreal Fast presentation
description: Embed the fast studio rendering preview without Node.js.
permalink: /kicad-webview/docs/photoreal-fast/
doc_section: examples
---

[Inspect OLIMEX](/assets/demos/photoreal-fast.html?board=olimex) · [Inspect IRCA](/assets/demos/photoreal-fast.html?board=irca)

Photoreal Fast is available in stable **1.0.0** from npm, CDN and the self-hosted SDK. The demo keeps its controls compact and lets you compare Standard, Photoreal Fast and enhanced Presentation in one viewer.

## Embed without Node.js

```html
<div id="board" style="height:70dvh;min-height:380px"></div>
<script src="https://wayri.github.io/assets/lib/kicad-webview/releases/1.1.0/kicad-webview.min.js"></script>
<script>
const viewer = new KiCadWebView.Viewer('#board', {theme:'dark'});
viewer.load('https://wayri.github.io/assets/demos/public-hardware/olimex-p4-project.json', {view:'3d'})
  .then(() => viewer.setRenderQuality('photoreal-fast'))
  .catch(error => { document.querySelector('#board').textContent = error.message; });
window.addEventListener('pagehide', () => viewer.dispose(), {once:true});
</script>
```

Your host needs normal HTTP(S) access and CORS permission for the supplied project and models. No rendering service, build system or runtime Node.js installation is required. To self-host, retain the matching script, source attribution, LICENSE and third-party notices from the [versioned SDK directory](/assets/lib/kicad-webview/releases/1.1.0/BUILD.json).

## Rendering and interaction

Select **Display → Quality → Photoreal Fast**, or call `viewer.setRenderQuality('photoreal-fast')` after loading a 3D board. It uses existing PBR materials, a generated environment, filmic tone mapping, cached 1024-pixel shadow maps and an invisible shadow catcher. There is no visible gray studio floor in Fast mode. The background follows light/dark theme.

Fast mode skips screen-space ambient occlusion and supersampling. Resolved SMAA smooths stationary assembled opaque views instead of hardware multisampling with logarithmic depth. Its framebuffer is capped at one million pixels; expanded views use the movement policy and no screen-space postprocessing. These are allocation limits rather than frame-rate guarantees. Rendering is demand-driven; orbit, pan, camera buttons, source picking and cross-highlighting remain available. Translucent inspection disables shadows and hides the catcher until opaque appearance is restored.

`viewer.setRenderQuality('balanced')` restores ordinary rendering. `presentation` remains the optional, more expensive studio mode. GPU context recovery can return to Balanced with a visible diagnostic. Fast mode is opt-in and does not become a saved default for other embeds.

## Expand mode and highlighted nets

[Expand the assembly and inspect bright nets through the board](/kicad-webview/docs/expand-mode/). The release includes two-stage component/layer motion, fading substrate, stretched vias, source-layer colors and a source-bound shine-through overlay. These are display changes; source geometry and electrical data remain unchanged.

## Fidelity and credits

This is real-time rasterized PBR rendering, not path tracing or a photographic reconstruction. Fidelity depends on supplied model geometry and materials. Unresolved models remain labelled stand-ins. No HDR environment asset or new model is downloaded by the preset itself.

The OLIMEX ESP32-P4-DevKit Rev.D1 package is pinned to 26705d3, © OLIMEX Ltd and upstream contributors, CERN-OHL-S-2.0. Read the retained [source/conversion provenance](/assets/demos/public-hardware/PROVENANCE.json) and [model coverage and licenses](/assets/demos/public-hardware/MODEL-PROVENANCE.json). No affiliation or endorsement is implied.

IRCA uses approved public review geometry and display models for the thermal-camera project, not original editable CAD. See [IRCA project context](/kicad-webview/#project-irca). Design and model terms are separate from the viewer’s MPL-2.0 license. [Development acknowledgements, including AI assistance](/kicad-webview/docs/acknowledgements/).

Copper clicks highlight the full saved net by default in its layer colors. Only selected-net plated vias stay gold during Dim net focus; the optional accent style remains available.
