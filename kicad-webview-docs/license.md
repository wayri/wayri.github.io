---
layout: webview-docs
title: License & release files
description: MPL-2.0 terms, matching source, release identity and separate design rights.
permalink: /kicad-webview/docs/license/
doc_section: license
---

## Published npm and CDN release

KiCad WebView `0.1.0` is public on [npm](https://www.npmjs.com/package/@wayrisignals/kicad-webview), [jsDelivr](https://cdn.jsdelivr.net/npm/@wayrisignals/kicad-webview@0.1.0/) and [UNPKG](https://unpkg.com/@wayrisignals/kicad-webview@0.1.0/), under MPL-2.0. Matching source: [v0.1.0](https://github.com/wayri/kicad-webview/tree/v0.1.0). Source revision `3d41a26885da56b964ea6f7a75f9a23da8f73fa3`; npm artifact size 2,039,369 bytes. The npm package excludes legacy board fixtures and fixture-backed examples. [Installation and no-Node examples](/kicad-webview/docs/quick-start/).

## Immutable hosted SDK

| Item | Value |
| --- | --- |
| Release | `0.1.0-beta.2` |
| Source revision | `86b375e5f5c3f2f04df6d6c44119c25b0b2b14ee` |
| API contract | `1.0-beta` |
| Owner-authored software license | `MPL-2.0` |
| Download size | 2,817,475 bytes (2.82 MB) |
| ZIP SHA-256 | `de31ccbe99814c541d4758bd0c36f171c8ad19b0df143be37e9165360e139629` |

[Download the ZIP](/assets/lib/kicad-webview/downloads/kicad-webview-0.1.0-beta.2.zip) · [GitHub release](https://github.com/wayri/kicad-webview/releases/tag/v0.1.0-beta.2) · [File checksums](/assets/lib/kicad-webview/releases/0.1.0-beta.2/RELEASE.json) · [Distribution README](/assets/lib/kicad-webview/releases/0.1.0-beta.2/README.md)

## Software license and matching source

KiCad WebView’s owner-authored software is released under the [Mozilla Public License 2.0](/assets/lib/kicad-webview/releases/0.1.0-beta.2/LICENSE). Commercial use, self-hosting and integration into a proprietary application do not require individual approval. The complete license is authoritative; this summary does not replace it.

MPL uses source-file-level copyleft. When distributing covered software, preserve its notices and make the covered source, including covered modifications, available as the license requires. Separate host-application files do not become MPL merely because they use this library. Distributing minified JavaScript or a bundled HTML viewer also needs a way for recipients to obtain the corresponding source. See the [release’s licensing guide](/assets/lib/kicad-webview/releases/0.1.0-beta.2/LICENSING.md) and [Mozilla’s FAQ](https://www.mozilla.org/en-US/MPL/2.0/FAQ/).

The [public source repository](https://github.com/wayri/kicad-webview) contains the preferred source. Use the [matching `v0.1.0-beta.2` source](https://github.com/wayri/kicad-webview/tree/v0.1.0-beta.2) for these builds. If you modify the covered software, provide the matching modified source rather than pointing only to the unmodified upstream tag. The library is **free to use, including commercially, under MPL-2.0**. No payment or individual commercial-use approval is required. Need help embedding or customizing KiCad WebView? Optional paid implementation, maintenance, and support are available at [support.kivi@sigharmonic.com](mailto:support.kivi@sigharmonic.com). You do not need to buy these services to use or integrate the library.

## Third-party components and hardware

Three.js and fzstd retain their own MIT notices. Other dependencies retain their stated terms. This release’s owner-authored extracted subset is covered by MPL-2.0; that does not relicense the rest of SPIKE, Pocket KiView or another parent project. Historical extraction records remain for provenance.

The software license does not license your PCB designs, third-party models, documents or analysis results. The immutable beta.1 and beta.2 archives contain a legacy inverter regression fixture, separately authorized as demonstration data and not an open-hardware grant. These archives do not contain the OLIMEX project. The [public hardware examples](/kicad-webview/#public-examples) have their own sources and CERN hardware licenses: OLIMEX ESP32-P4-DevKit Rev D1 uses CERN-OHL-S-2.0; Marble uses CERN-OHL-1.2. Preserve the applicable hardware notices and check each example’s README before redistribution.

## Notices supplied with this release

- [MPL-2.0 text](/assets/lib/kicad-webview/releases/0.1.0-beta.2/LICENSE)
- [Licensing guide and matching-source offer](/assets/lib/kicad-webview/releases/0.1.0-beta.2/LICENSING.md)
- [Third-party notices](/assets/lib/kicad-webview/releases/0.1.0-beta.2/THIRD-PARTY-NOTICES.md)
- [Source provenance](/assets/lib/kicad-webview/releases/0.1.0-beta.2/SOURCE-PROVENANCE.json)
- [SPIKE engine subset notice](/assets/lib/kicad-webview/releases/0.1.0-beta.2/SPIKE-ENGINE-NOTICE.md)
- [Three.js license](/assets/lib/kicad-webview/releases/0.1.0-beta.2/THREE-LICENSE)
- [fzstd license](/assets/lib/kicad-webview/releases/0.1.0-beta.2/FZSTD-LICENSE)
- [Historical Pocket KiView license record](/assets/lib/kicad-webview/releases/0.1.0-beta.2/licenses/Pocket-KiView-Source-Available-1.0.txt)
- [Legacy beta.2 inverter fixture provenance](/assets/lib/kicad-webview/releases/0.1.0-beta.2/demo/PROVENANCE.json)

## Immutable versioned files

URLs under `/assets/lib/kicad-webview/releases/0.1.0-beta.2/` identify this release. Preserve their bytes when mirroring and verify them against `RELEASE.json`. Publish changed files under a new version path. The product page’s independently maintained site demonstrations can contain later APIs; use documentation matching your copy.

## Archived beta.1

The immutable [0.1.0-beta.1 download](/assets/lib/kicad-webview/downloads/kicad-webview-0.1.0-beta.1.zip) retains the [source-available license 1.0 supplied with that copy](/assets/lib/kicad-webview/releases/0.1.0-beta.1/LICENSE), including its commercial-permission requirement. Its source revision is `f2dd521388a29b0aea0be920e19f71edcce0f164`; [its original manifest](/assets/lib/kicad-webview/releases/0.1.0-beta.1/RELEASE.json) identifies its bytes. No archived asset or notice was rewritten. Choose the current MPL-2.0 release for new integrations.
