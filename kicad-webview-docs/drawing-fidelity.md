---
layout: webview-docs
title: Drawing fidelity, variables and expressions
permalink: /kicad-webview/docs/drawing-fidelity/
doc_section: drawing-fidelity
description: Saved graphics, text, project context and table previews, with explicit rendering limits.
---

The published **{{ site.data.webview_release.self_hosted }} SDK** already previews saved RGBA colors, supported fills and dashes, bounded text boxes and PNGs, non-square text and overbars. Browser font metrics are approximate; exact embedded-font layout is not supported.

[Open the version-aware drawing demo](/assets/demos/drawing-fidelity.html). Its generated formatting sample is separate from the [approved IRCA and credited OLIMEX/Marble boards](/assets/demos/direct.html); it is not a circuit or hardware validation.

## 1.0.0 text context

These additions are released in the **self-hosted 1.0.0 SDK** and its [GitHub release](https://github.com/wayri/kicad-webview/releases/tag/v1.0.0). The same **1.0.0** release is available from npm, jsDelivr and UNPKG. The live sample uses the matching self-hosted SDK and enables supported modes automatically.

```js
// A matching 1.0 build is required. This code runs directly in a browser.
const viewer = new KiCadWebView.Viewer('#drawing', {theme: 'dark'});
await viewer.loadSource(schematicText, {
  path: 'root.kicad_sch',
  textVariables: {ORG: 'Wayri'}
});
// Saved text: Project: ${ORG}  ->  Project: Wayri
// Saved text: @{pow(2,3)+sqrt(16)}  ->  12
window.addEventListener('pagehide', () => viewer.dispose(), {once:true});
```

Supply at most 256 variables, with keys up to 200 characters and string values up to 8,192 characters. One `.kicad_pro` supplied to `loadFiles` or `loadArchive` can provide `text_variables`; explicit values take precedence. No environment variables, project settings or ancestor files are fetched implicitly.

Loaded local bundles supply saved hierarchy context. For a reused sheet, `instancePath` selects its exact saved instance. Ambiguous or missing context remains unresolved. Context persists through file navigation and contextual previews; raw source remains unchanged.

## Numeric expressions and tables

The deterministic `@{...}` subset supports arithmetic and `abs`, `sqrt`, `floor`, `ceil`, `pow`, `min`, `max`, `sum` and `avg`. Parsing has length, token and nesting budgets. Unsupported syntax, invalid domains, division by zero and unresolved variables remain literal with diagnostics. There is no `eval`, arbitrary code, unit system or LaTeX engine.

Horizontal schematic tables retain saved cells, merged regions, border and separator styles, within a 1,000-cell budget. Malformed or rotated tables are omitted with a warning instead of a plausible replacement. Text wrapping uses browser metrics; table-cell contextual variables are not implemented.

## Inspect without disrupting the view

The 1.0.0 refresh also adds resizable Properties, bounded source-linked previews and selectable saved-result palettes. Panels retain the main camera and their scroll state; failed or overlapping preview requests preserve the accepted preview. Loading has host-local stages and Stop, and stale completions cannot replace newer work.

[Panels and preview examples](/kicad-webview/docs/panels-and-insets/) · [Saved-result palettes](/kicad-webview/docs/wayricad-results/) · [Release availability](/kicad-webview/docs/releases/).
