---
layout: webview-docs
title: KiCad WebView documentation
description: Versioned setup, user guides and API reference for KiCad WebView 0.1.0-beta.2.
permalink: /kicad-webview/docs/
doc_section: overview
---

KiCad WebView is a browser library for read-only inspection of saved electronics designs. Embed a drawing, open a project workspace, or export a design and viewer into one HTML file. A static HTTPS host is enough; visitors need no npm or Node.js runtime.

These pages document **release 0.1.0-beta.2**, source revision `86b375e5f5c3f2f04df6d6c44119c25b0b2b14ee`. The [release manifest](/assets/lib/kicad-webview/releases/0.1.0-beta.2/RELEASE.json) records file checksums and the classic script’s integrity hash. The [source repository](https://github.com/wayri/kicad-webview) and [matching release source](https://github.com/wayri/kicad-webview/tree/v0.1.0-beta.2) are public.

## Choose a starting point

| Your goal | Start here |
| --- | --- |
| Put a working viewer on a webpage | [Quick start](/kicad-webview/docs/quick-start/) |
| Inspect a PCB, schematic, 3D board or fabrication files | [User guide](/kicad-webview/docs/user-guide/) |
| Integrate the library into an application | [API & exports](/kicad-webview/docs/api/) |
| Link views, present a design or drive a virtual display | [Examples](/kicad-webview/docs/examples/) |
| Attach a virtual screen, LED, button or knob to 3D geometry | [Interactive models & displays](/kicad-webview/docs/model-interaction/) |
| Host files, configure an iframe or understand platform limits | [Hosting & integrations](/kicad-webview/docs/hosting/) |
| Resolve a blank view, model warning or blocked source | [Troubleshooting](/kicad-webview/docs/troubleshooting/) |
| Check licensing and identify the supplied files | [License & release files](/kicad-webview/docs/license/) |

## What the viewer does

The release reads supported saved KiCad schematics and PCB layouts, provides PCB/3D inspection, navigates listed project files and hierarchy, and displays supported Gerber/Excellon fabrication geometry. It can show externally calculated analysis data when that data matches the loaded source. A separate beta Altium adapter mounts an external online provider for an authorized public archive URL; it does not parse native Altium files locally.

The API includes independent viewers, an advanced project workspace, saved-identity selection links, source-bound view URLs, presentation carousels, a project-tree diagram and caller-scripted virtual controls. See the [complete public export inventory](/kicad-webview/docs/api/).

## What a rendered view establishes

The display represents saved source data within the renderer’s supported scope. It does **not** run native KiCad, edit the design, execute firmware, perform ERC/DRC, certify manufacturing readiness or solve electrical, thermal or electromagnetic models. Missing models can become labelled stand-ins. A calculated overlay must retain its own assumptions, source identity and validation evidence.

The current [IRCA product demonstrations](/kicad-webview/) and [capability demos](/kicad-webview/#capability-demos) use a separately maintained site bundle. They include later features such as continuous FEM triangle overlays and the focused display interaction mode. Their presence on the site does not add those APIs to this immutable release. Follow the release-specific signatures here.

## Availability and permission

[Download the complete ZIP (2.82 MB)](/assets/lib/kicad-webview/downloads/kicad-webview-0.1.0-beta.2.zip), use a [classic script or ES module](/kicad-webview/docs/quick-start/), or open the [browser-only HTML exporter](/assets/demos/export.html). npm publication is not available for this release.

The owner-authored software in this release is open source under **MPL-2.0**. Commercial use and integration do not need individual approval. Preserve license notices and provide the matching covered source as required when distributing builds. Design files and third-party components retain their separate terms. Read [License & release files](/kicad-webview/docs/license/) and [Acknowledgements](/kicad-webview/docs/acknowledgements/).
