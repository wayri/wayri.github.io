# KiCad WebView 0.8.0

Source revision: 6deefaea8a3473614939ba6358950b9c66ed5b15. This folder runs on any static HTTPS host; no npm/Node runtime is required. Keep LICENSE and all notices beside the scripts. MPL-2.0 permits commercial use. Keep notices and make corresponding covered source available when distributing modifications. Matching source: https://github.com/wayri/kicad-webview/tree/6deefaea8a3473614939ba6358950b9c66ed5b15.

Classic script: <script src="./kicad-webview.min.js"></script>, then new KiCadWebView.Viewer('#board').load('/designs/project.zip'). Give #board a real height (for example 70dvh; min-height:360px). See direct.html.

ES module: import {Viewer,linkViewers} from './kivi-viewer.js'.

iframe: embed.html?src=%2Fdesigns%2Fproject.zip&view=3d&theme=dark. Relative source URLs resolve against embed.html. External sources need CORS; the library cannot bypass authorization.

Self-contained HTML: open export.html on your static host, choose local design files or one ZIP, then download the HTML. The design is read only in the browser and is not uploaded. The generated file blocks external connections. Include saved model assets inside a ZIP; unresolved models use labelled proxies. Demo kero-encoder-project.html bundles the public saved PCB and schematic sheets, with no external models.

CDN: publish this directory under an immutable releases/0.8.0/ path. Use kicad-webview.min.js from that path; an independent origin must send Access-Control-Allow-Origin: * for cross-origin ES modules, exporter asset fetches and script integrity. SRI: sha384-rM1stj0M3v7hx6QeYb9xBPMy49aFwx0QTC7dcUtM+uj5/KZj1PvC2uztlhhJn83e. Update release version before changing public versioned bytes.

The source repository is https://github.com/wayri/kicad-webview. Preserve the matching-source link and license notices. HTML attachments and host app mobile support require separate client checks.
