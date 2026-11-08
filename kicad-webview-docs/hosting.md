---
layout: webview-docs
title: Hosting & integrations
description: Sources, manifests, iframe parameters, limits, CORS, privacy and platform status.
permalink: /kicad-webview/docs/hosting/
doc_section: hosting
---

## Static hosting

The release runs on a static HTTP(S) host. Retain the versioned directory and its notices. Keep your original design permissions separate from software licensing. Public runtime files and design URLs remain retrievable by visitors; a read-only interface is not access control.

Use the [complete ZIP](/assets/lib/kicad-webview/downloads/kicad-webview-0.1.0-beta.2.zip), or the immutable browser files under:

```text
https://wayri.github.io/assets/lib/kicad-webview/releases/0.1.0-beta.2/
```

Serve JavaScript with a JavaScript MIME type and JSON manifests as JSON. Modules require an HTTP(S) context with permitted origins. A relative design URL is resolved against the supplied loading base; the iframe uses its own page as that base. For readable examples see [quick start](/kicad-webview/docs/quick-start/).

## Hosted, local and GitHub sources

`Viewer.load` accepts a supported drawing URL, project manifest, supported repository URL or manifest object. A hosted `.kicad_pro` alone is not a list of its related files: provide a manifest. A supported GitHub repository/tree/project URL can discover files; the loader resolves the selected revision to an immutable commit and rejects truncated listings rather than silently omitting files.

For branches containing `/`, supply an explicit matching `ref`. Public GitHub API availability and rate limits still apply. The library does not obtain private-repository tokens. A public URL is not permission to redistribute its design.

Local browser files use `loadFiles`; bounded ZIP bytes use `loadArchive`. They are read in browser memory without uploading the design through these library methods. Local model paths need matching supplied assets. See the [viewer loading reference](/kicad-webview/docs/api-viewer/) and [archive utilities](/kicad-webview/docs/api-utilities/).

## Project manifest

List the project’s supported drawings and models explicitly. Relative URLs resolve against the hosted manifest URL. Paths identify files within the project; they are not filesystem access.

```json
{
  "entry": "board.kicad_pcb",
  "files": [
    { "path": "board.kicad_pcb", "url": "./board.kicad_pcb" },
    { "path": "board.kicad_sch", "url": "./board.kicad_sch" },
    { "path": "models/connector.glb", "url": "./models/connector.glb" }
  ]
}
```

The source files must actually exist at those URLs, and the board’s saved model reference must resolve to the supplied model path. Keep child schematics in the manifest so project navigation can resolve them. A manifest’s explicit external URL remains external; a pinned GitHub parent does not make arbitrary external URLs immutable.

## Iframe parameters

The versioned [embed page](/assets/lib/kicad-webview/releases/0.1.0-beta.2/embed.html?src=demo%2Fproject.json&view=3d&theme=dark) supports:

| Parameter | Meaning |
| --- | --- |
| `src` | Required HTTP(S) design URL; a relative value resolves against `embed.html`. URL-encode it. |
| `provider` | `kicad` by default; `altium` selects the separate beta provider. |
| `view` | Initial supported view, such as `pcb`, `schematic`, `3d` or `manufacturing`; omit for automatic choice. It must suit the loaded source/provider. |
| `theme` | `light` by default or `dark` for the KiCad viewer. |
| `file` | A listed KiCad project drawing to open. |
| `ref` | KiCad repository revision option. |
| `inspectOnSelect` | `false` disables automatic opening of the KiCad inspector on selection. |

`file`, `ref`, theme and inspection behavior are applied by the KiCad branch of this embed controller. Do not assume the Altium adapter implements the same options. This is a URL-configured viewer, not a cross-origin `postMessage` control API.

## Release input limits

These are hard guards in the release, not recommended target project sizes. Smaller projects are more comfortable on phones and in constrained host applications.

| Input or operation | Release guard |
| --- | --- |
| One ordinary hosted source download | 64 MiB |
| Project manifest or GitHub metadata budget | 8 MiB |
| One fetched linked model asset | 8 MiB |
| Listed project files | 1–256 supported paths |
| ZIP compressed bytes | 64 MiB |
| ZIP expanded total | 128 MiB |
| One expanded ZIP file | 32 MiB |
| ZIP central-directory entries | 256, including directory entries |
| ZIP expansion ratio | At most 1000:1 |
| Manufacturing project | 32 MiB per fetched file; 128 MiB total |
| Standalone HTML input | 1–256 files, at most 64 MiB total; a ZIP must be supplied alone |

ZIP reading supports stored and deflate entries with validation and CRC checks. ZIP64, encryption, multi-disk archives, nested archives, symlinks/special entries, unsafe paths and conflicting names are rejected. Deflate requires a browser with `DecompressionStream('deflate-raw')`; unpack supported files locally if unavailable. Optional limits may lower the ZIP caps, not raise them.

Additional geometry, hierarchy, virtual-control, analysis and export bounds are documented in the relevant [API sections](/kicad-webview/docs/api/). A load that fits a byte cap can still exceed a renderer’s supported feature or geometry scope.

## CORS, CSP and privacy

- Cross-origin design files, ES modules and exporter asset fetches need appropriate CORS responses. The viewer cannot bypass a server’s access policy. Prefer approved same-origin hosting for private work.
- Hosted loading defaults to `credentials: 'omit'`; the supported explicit alternative is `same-origin`, not cross-origin credential forwarding. Do not place tokens, passwords or signed/private URLs in public embed or view links.
- Configure a content security policy for the entry points and features you use. Dynamic styles, WebGL, optional blob workers and chosen source origins must be considered. Test a restrictive policy with the actual viewer instead of copying a blanket policy from a different host.
- To allow embedding by another application, `frame-ancestors` must be an HTTP response header. A meta tag does not enable it. Do not weaken unrelated pages or make a private design public to resolve an iframe failure.
- The self-contained HTML output uses a separate policy with `connect-src 'none'`. It contains the design bytes. Its lack of external fetches does not make sharing a private design safe.
- No file-selection upload is needed for local inspection. Your host page, analytics, extensions or application policies remain outside the library’s own loading contract.

## Mobile and host applications

Give the viewer `width:100%`, a real responsive height and a host viewport meta tag that allows user zoom. The renderer adapts to its container, including a narrow iframe on a desktop. Controls and scrollable panels are bounded within that embed. See [touch controls](/kicad-webview/docs/user-guide/).

The release records responsive browser checks. Those checks do not establish physical iOS/Android gesture acceptance or compatibility with every app’s embedded browser. Uploaded standalone HTML is a snapshot and must be regenerated to change the bundled viewer.

| Platform/route | Scope recorded for this release |
| --- | --- |
| Ordinary browser or iframe | Browser library route; source access, WebGL and the host’s policies still apply. |
| Slack self-contained HTML | Owner-confirmed interaction in a tested web-client attachment. No currently hosted automatic preview service is supplied here. |
| Notion HTML block | JavaScript/WebGL, view switching and inspector checked in a controlled web-client test. All gestures, mobile clients and larger projects need separate acceptance. |
| Confluence/Forge | Adapter work exists, but authenticated deployment and tenant acceptance are deferred. Not a deployed integration. |
| Native HTML attachment in another app | Depends on whether that client executes interactive HTML and permits WebGL. A download link alone is not a supported integration. |
| npm or a public package CDN | Not published as part of this release. Use the versioned static files or ZIP. |

The retired hosted preview service is not a dependency of the bundled HTML. No Forge login, app installation or platform account connection is needed to use the static release on this site.
