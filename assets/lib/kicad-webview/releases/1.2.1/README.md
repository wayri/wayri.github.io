# KiCad WebView 1.2.1

Source revision: 290eecc834080a6795a69a19b9fa8c5415906650. This folder runs on any static HTTPS host; no npm/Node runtime is required. Keep LICENSE and all notices beside the scripts. MPL-2.0 permits commercial use. Keep notices and make corresponding covered source available when distributing modifications. Matching source: https://github.com/wayri/kicad-webview/tree/290eecc834080a6795a69a19b9fa8c5415906650.

Classic script: <script src="./kicad-webview.min.js"></script>, then new KiCadWebView.Viewer('#board').load('/designs/project.zip'). Give #board a real height (for example 70dvh; min-height:360px). See direct.html.

ES module: import {Viewer,linkViewers} from './kivi-viewer.js'.

iframe: embed.html?src=%2Fdesigns%2Fproject.zip&view=3d&theme=dark. Relative source URLs resolve against embed.html. External sources need CORS; the library cannot bypass authorization.

Self-contained HTML: open export.html on your static host, choose local design files or one ZIP, then download the HTML. The design is read only in the browser and is not uploaded. The generated file blocks external connections. Include saved model assets inside a ZIP; unresolved models use labelled proxies. Demo kero-encoder-project.html bundles the public saved PCB and schematic sheets, with no external models.

CDN: publish this directory under an immutable releases/1.2.1/ path. Use kicad-webview.min.js from that path; an independent origin must send Access-Control-Allow-Origin: * for cross-origin ES modules, exporter asset fetches and script integrity. SRI: sha384-DVQN7dw0D5hmZMcMa85JXWLIF1vwE12Tv9RIt/Mjt8TOR9OhgYYy6GF1ywXisLvD. Update release version before changing public versioned bytes.

The source repository is https://github.com/wayri/kicad-webview. Preserve the matching-source link and license notices. HTML attachments and host app mobile support require separate client checks.
