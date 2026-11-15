/* Website presentation only; engineering colors and viewer state stay unchanged. */
(() => {
  const marker = 'data-webview-site-theme';
  const css = `
  :host{--viewer-bg:#f7f5ee;--viewer-bar:#fffef9;--viewer-ink:#292821;--viewer-muted:#615e53;--viewer-border:#d3cfc1;--viewer-hover:#f0ead9;--viewer-accent:#805b08;--viewer-active:#f1e5be;
  --project-bar:#fffef9;--project-bg:#f7f5ee;--project-line:#d3cfc1;--project-muted:#615e53;--project-accent:#805b08;--project-active:#f1e5be;--project-ink:#292821;
  font-family:system-ui,sans-serif}
  :host([data-theme=dark]){--viewer-bg:#171715;--viewer-bar:#22221e;--viewer-ink:#f0eee5;--viewer-muted:#b5b2a5;--viewer-border:#45453c;--viewer-hover:#333127;--viewer-accent:#e7c35b;--viewer-active:#423b25;
  --project-bar:#22221e;--project-bg:#171715;--project-line:#45453c;--project-muted:#b5b2a5;--project-accent:#e7c35b;--project-active:#423b25;--project-ink:#f0eee5}
  :host:has(.shell){--ink:#f0eee5;--surface:#171715;--bar:#22221e;--border:#45453c;--accent:#e7c35b;--muted:#b5b2a5;--button:#2c2c26;--button-border:#4d4b40;--button-ink:#f0eee5;--panel:#22221e;--menu:#22221e}
  :host([data-theme=light]):has(.shell){--ink:#292821;--surface:#f7f5ee;--bar:#fffef9;--border:#d3cfc1;--accent:#805b08;--muted:#615e53;--button:#fffef9;--button-border:#d3cfc1;--button-ink:#292821;--panel:#fffef9;--menu:#fffef9}
  .viewer-toolbar{gap:8px;padding:8px 10px;min-height:46px}
  .viewer-toolbar button,.viewer-toolbar select{min-height:34px;border-radius:7px}
  .viewer-inspector{border-radius:12px;box-shadow:0 10px 35px #0003}
  button:focus-visible,select:focus-visible,input:focus-visible{outline:2px solid var(--viewer-accent,var(--accent,#e7c35b));outline-offset:2px}
  select option{background:var(--viewer-bar,var(--bar,#22221e));color:var(--viewer-ink,var(--ink,#f0eee5))}
  @media(max-width:540px){.viewer-toolbar{gap:5px;padding:6px}.viewer-toolbar button,.viewer-toolbar select{min-height:40px}}
  `;
  const watched = new Map();
  let pending = new Set(), scheduled = false;
  function scan(node) {
    if (!(node instanceof Element || node instanceof Document || node instanceof ShadowRoot)) return;
    if (node instanceof Element && node.shadowRoot) watch(node.shadowRoot);
    node.querySelectorAll('*').forEach(el => { if (el.shadowRoot) watch(el.shadowRoot); });
    if (node instanceof ShadowRoot) theme(node);
  }
  function theme(node) {
    if (!node.querySelector(`style[${marker}]`) && node.querySelector('.viewer-toolbar,.viewer-inspector,.shell,.project-shell')) {
      const style = document.createElement('style'); style.setAttribute(marker, ''); style.textContent = css; node.append(style);
    }
  }
  function flush() {
    scheduled = false;
    for (const [root, observer] of watched) if (root instanceof ShadowRoot && !root.host.isConnected) { observer.disconnect(); watched.delete(root); }
    const work = pending; pending = new Set(); work.forEach(node => { if (node instanceof ShadowRoot) theme(node); else scan(node); });
  }
  function watch(root) {
    if (watched.has(root) || watched.size >= 64) return;
    const observer = new MutationObserver(records => {
      for (const record of records) for (const node of record.addedNodes) if (node.nodeType === 1) pending.add(node);
      if (root instanceof ShadowRoot) pending.add(root);
      if (!scheduled) { scheduled = true; queueMicrotask(flush); }
    });
    watched.set(root, observer); observer.observe(root, {childList:true, subtree:true}); scan(root);
  }
  watch(document);
  addEventListener('pagehide', () => { watched.forEach(observer => observer.disconnect()); watched.clear(); pending.clear(); });
  addEventListener('pageshow', event => { if (event.persisted) watch(document); });
})();
