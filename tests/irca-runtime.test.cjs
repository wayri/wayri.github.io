const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');
const vm = require('node:vm');
const root = process.env.IRCA_SITE_ROOT || path.resolve(__dirname, '..');
const directory = 'assets/lib/irca-runtime-5e9a927';
const read = file => fs.readFileSync(path.join(root, file));

test('IRCA host uses the pinned runtime with its exact original notices', () => {
    const include = read('_includes/irca-demo.html').toString();
    assert.ok(include.includes(directory + '/kicad-webview.min.js'));
    assert.ok(!include.includes('data-runtime="{{ \'/assets/lib/kicad-webview/kicad-webview.min.js'));
    const pin = JSON.parse(read(directory + '/PIN.json'));
    assert.equal(pin.websiteRevision, '5e9a927ec72b8e5620598ca02ff4f187fe52d221');
    for (const file of pin.files) {
        const bytes = read(directory + '/' + file.path);
        assert.equal(bytes.length, file.bytes, file.path);
        assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256, file.path);
    }
    for (const notice of ['LICENSE', 'THIRD-PARTY-NOTICES.md', 'THREE-LICENSE', 'FZSTD-LICENSE', 'SOURCE-PROVENANCE.json']) {
        assert.ok(pin.files.some(file => file.path === notice), notice);
    }
});

test('pinned viewer supplies the display-focus API required by the IRCA host', () => {
    const context = {EventTarget, CustomEvent, AbortController, DOMException, TextDecoder, TextEncoder, URL, HTMLElement:class {}, customElements:{get(){},define(){}}};
    context.window = context;
    vm.createContext(context);
    vm.runInContext(read(directory + '/kicad-webview.min.js').toString(), context);
    assert.equal(typeof context.KiCadWebView.Viewer.prototype.setDemoInteraction, 'function');
    assert.equal(typeof context.KiCadWebView.DemoController.prototype.getFace, 'function');
    assert.equal(typeof context.KiCadWebView.DemoController.prototype.drawDisplay, 'function');
});
