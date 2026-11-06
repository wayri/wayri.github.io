---
layout: webview-docs
title: KiCad WebView documentation
description: Versioned setup, user guides and API reference for KiCad WebView 0.1.0-beta.1.
permalink: /kicad-webview/docs/
doc_section: overview
---

KiCad WebView is a browser library for read-only inspection of saved electronics designs. Embed a drawing, open a project workspace, or export a design and viewer into one HTML file. A static HTTPS host is enough; visitors need no npm or Node.js runtime.

These pages document **release 0.1.0-beta.1**, source revision `f2dd521388a29b0aea0be920e19f71edcce0f164`. The [release manifest](/assets/lib/kicad-webview/releases/0.1.0-beta.1/RELEASE.json) records file checksums and the classic script’s integrity hash. The source repository remains private.

## Choose a starting point

| Your goal | Start here |
| --- | --- |
| Put a working viewer on a webpage | [Quick start](/kicad-webview/docs/quick-start/) |
| Inspect a PCB, schematic, 3D board or fabrication files | [User guide](/kicad-webview/docs/user-guide/) |
| Integrate the library into an application | [API & exports](/kicad-webview/docs/api/) |
| Link views, present a design or drive a virtual display | [Examples](/kicad-webview/docs/examples/) |
| Host files, configure an iframe or understand platform limits | [Hosting & integrations](/kicad-webview/docs/hosting/) |
| Resolve a blank view, model warning or blocked source | [Troubleshooting](/kicad-webview/docs/troubleshooting/) |
| Check permission and identify the supplied files | [License & release files](/kicad-webview/docs/license/) |

## What the viewer does

The release reads supported saved KiCad schematics and PCB layouts, provides PCB/3D inspection, navigates listed project files and hierarchy, and displays supported Gerber/Excellon fabrication geometry. It can show externally calculated analysis data when that data matches the loaded source. A separate beta Altium adapter mounts an external online provider for an authorized public archive URL; it does not parse native Altium files locally.

The API includes independent viewers, an advanced project workspace, saved-identity selection links, source-bound view URLs, presentation carousels, a project-tree diagram and caller-scripted virtual controls. See the [complete public export inventory](/kicad-webview/docs/api/).

## What a rendered view establishes

The display represents saved source data within the renderer’s supported scope. It does **not** run native KiCad, edit the design, execute firmware, perform ERC/DRC, certify manufacturing readiness or solve electrical, thermal or electromagnetic models. Missing models can become labelled stand-ins. A calculated overlay must retain its own assumptions, source identity and validation evidence.

The current [IRCA product demonstrations](/kicad-webview/) use a separately maintained site bundle. They include later features such as continuous FEM triangle overlays and the focused display interaction mode. Their presence on the site does not add those APIs to this immutable release. Follow the release-specific signatures here.

## Availability and permission

[Download the complete ZIP (2.81 MB)](/assets/lib/kicad-webview/downloads/kicad-webview-0.1.0-beta.1.zip), use a [classic script or ES module](/kicad-webview/docs/quick-start/), or open the [browser-only HTML exporter](/assets/lib/kicad-webview/releases/0.1.0-beta.1/export.html). npm publication is not available for this release.

This is source-available software under **license 1.0**, not an open-source license. Non-commercial use is permitted under its terms; **all commercial use requires explicit prior written permission**, including internal business use and commercial website embeds. Read the [license](/kicad-webview/docs/license/) before integrating.
