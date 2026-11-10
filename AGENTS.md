# Personal Site Repository Guide

This is the existing Jekyll source for <https://wayri.github.io/>, published from
`master` through GitHub Pages. Read the affected layout, include and content
owner before editing. Preserve dirty work and do not deploy unrelated changes.

- Product pages use `_layouts/product.html`, which owns `{% seo %}`. Preserve
  existing SEO/sitemap plugins and one canonical permalink per product.
- WayriCAD lives in `wayricad.html`; its maintained directory and questions are
  `_data/wayricad.json`. Read [the publishing checklist](docs/WAYRICAD_PUBLISHING.md).
- Verify capabilities against the maintained project and distinguish source,
  release, preview, simulation and measurement. Do not hardcode unverified
  version/count claims, fabricate ratings or silently expand platform support.
- Prefer existing real, sanitized project screenshots. Retain attribution,
  numerical data and captions that identify preview/model limits.
- Keep page-specific CSS/JS scoped. Maintain keyboard access, responsive layout
  and useful rendered content when JavaScript is disabled.
- Run focused tests and check rendered desktop/mobile behavior. Jekyll build,
  source-only preview and live deployment are distinct evidence; report each
  honestly. Respect the user's per-volume storage reserve before builds.
- When publication is requested, review/stage only task files, check upstream
  changes and verify the deployed URL. Do not treat a push or queued Pages job
  as deployment success.
