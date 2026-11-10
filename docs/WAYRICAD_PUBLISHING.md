# WayriCAD Page Maintenance

Canonical product page: <https://wayri.github.io/wayricad/>. Keep the former
KiWay name as a recognition aid, not a second landing page.

## Sources and Checks

- Edit `wayricad.html`, `_data/wayricad.json`, `assets/css/wayricad.css` and
  `assets/js/wayricad.js`. The shared product layout is not owned by this page.
- Confirm active inventory and guide filenames from `wayri/WayriCAD` at the
  intended ref. The JSON review date records catalogue review, not a release.
- Run `node --test tests/wayricad-page.test.cjs`.
- When Ruby/Jekyll is installed, run `bundle exec jekyll build --destination
  <task-owned-output>` and inspect the generated metadata, schema, page and
  sitemap. Do not install dependencies or build a whole site on a volume below
  its required storage reserve.
- A source-only preview can exercise page styling and interactions but cannot
  qualify Jekyll SEO Tag, Liquid processing or the deployed sitemap. Keep that
  limitation explicit.
- `node tools/preview-wayricad.cjs <scratch-preview.html>` creates that labelled
  visual preview. `node tests/wayricad-browser.cjs <scratch-output-directory>`
  checks three viewport sizes, images, filtering, FAQs and no-JS content with an
  existing Playwright/Chrome installation; it does not install a browser.
- Check desktop/mobile widths, actual images, no-JS directory, multiword search,
  empty results, keyboard focus and blocked clipboard behavior.

## Publishing

Inspect the personal-site dirty tree and upstream state first. Publish only
reviewed task changes when requested; do not include another task's WebView or
layout work. Verify Pages succeeds and `/wayricad/` is live, then check the
canonical, Open Graph image, directory, guide links and sitemap inclusion.

The latest deployment inspected on 2026-11-11 timed out during `syncing_files`;
its build step had completed. This is deployment evidence, not proof that this
page's source is invalid. Check the current run rather than retaining this
observation as a permanent diagnosis.

The WayriCAD repository owns its software/package inventory and release state.
Its `docs/DISCOVERABILITY.md` records the broader canonical-link and metadata
contract. Search Console actions require the owner's verified account. Neither
page changes nor successful deployment guarantee indexing or rankings.

## Candidate Validation, 2026-11-11

Seven focused Node tests passed. The source-only Chrome preview passed at
390x844, 1440x1000 and 1920x1080: no horizontal overflow, real images loaded,
search/empty/reset states, FAQ interaction and clipboard status. The entire
directory also remained visible without JavaScript. A full local Jekyll build
was not run because Ruby/Jekyll was unavailable; no dependency installation was
performed. Generated SEO-plugin output and the sitemap still need deployment
validation. The existing canonical live page returned HTTP 200, and the GitHub
repository About homepage was updated to it. New landing-page content was not
committed, pushed or deployed as part of these source checks.
