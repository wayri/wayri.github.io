# KiCad WebView 0.1.0-beta.1

Source revision: f2dd521388a29b0aea0be920e19f71edcce0f164. This folder runs on any static HTTPS host; no npm/Node runtime is required. Keep LICENSE and all notices beside the scripts. Commercial use requires explicit prior written permission under LICENSE.

Classic script: <script src="./kicad-webview.min.js"></script>, then new KiCadWebView.Viewer('#board').load('/designs/project.zip'). Give #board a real height (for example 70dvh; min-height:360px). See direct.html.

ES module: import {Viewer,linkViewers} from './kivi-viewer.js'.

iframe: embed.html?src=%2Fdesigns%2Fproject.zip&view=3d&theme=dark. Relative source URLs resolve against embed.html. External sources need CORS; the library cannot bypass authorization.

Self-contained HTML: open export.html on your static host, choose local design files or one ZIP, then download the HTML. The design is read only in the browser and is not uploaded. The generated file blocks external connections. Include saved model assets inside a ZIP; unresolved models use labelled proxies. Demo inverter-project.html bundles the public saved PCB and schematic sheets, with no external models.

CDN: publish this directory under an immutable releases/0.1.0-beta.1/ path. Use kicad-webview.min.js from that path; an independent origin must send Access-Control-Allow-Origin: * for cross-origin ES modules, exporter asset fetches and script integrity. SRI: sha384-Vrbajo/EOd6WsOvDTGbkoGyfxpZNiRmcFhdA/L/Xxiks4xY9S6qVLpd/df+UtHKD. Update release version before changing public versioned bytes.

The GitHub source repository can stay private. Public runtime files and downloads remain subject to the retained license. HTML attachments and host app mobile support require separate client checks.
