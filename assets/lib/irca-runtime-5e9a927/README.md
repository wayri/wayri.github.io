# Pinned IRCA homepage runtime

This directory preserves the exact runtime and notices previously published with
the IRCA interactive display at website commit
[5e9a927](https://github.com/wayri/wayri.github.io/tree/5e9a927ec72b8e5620598ca02ff4f187fe52d221/assets/lib/kicad-webview).
The JavaScript is byte-identical; it has not been rebuilt or relicensed.

IRCA's host scripts require the `modelsready` event, `setDemoInteraction`, and
bounded automatic display-face selection. Pinning this host/runtime pair restores
the display and face-relative product camera while allowing the separate SDK
demonstrations to upgrade independently. Migrate this pin only after exercising
screen touch input, focus/exit, scene changes and product orientation.

`PIN.json` lists the actual files and their SHA-256 hashes.
`ORIGINAL-BUNDLE-MANIFEST.json` and `SOURCE-PROVENANCE.json` retain the original
provenance unchanged; the former describes the broader historical distribution,
including fixtures not duplicated here. Its runtime source section identifies
the source revision, working-tree snapshot and changed-source hashes. It does
not claim those snapshot changes are present in the named source commit.

The controlling license and third-party notices remain alongside the runtime:
[LICENSE](LICENSE), [LICENSING.md](LICENSING.md),
[THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).
This historical site-specific bundle is separate from the current published SDK.
