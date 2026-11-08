const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
for (const version of ['0.1.0-beta.1', '0.1.0-beta.2']) {
    test(`${version} payload preserves the published manifest checksums`, () => {
        const prefix = `assets/lib/kicad-webview/releases/${version}/`;
        const manifest = JSON.parse(read(prefix + 'RELEASE.json'));
        assert.equal(manifest.version, version);
        for (const item of manifest.files) {
            const bytes = read(prefix + item.path);
            assert.equal(bytes.length, item.bytes, item.path);
            assert.equal(sha(bytes), item.sha256, item.path);
        }
    });
}
test('Beta2 distribution identity, MPL and matching source remain explicit', () => {
    assert.equal(sha(read('assets/lib/kicad-webview/downloads/kicad-webview-0.1.0-beta.2.zip')), 'de31ccbe99814c541d4758bd0c36f171c8ad19b0df143be37e9165360e139629');
    assert.match(read('assets/lib/kicad-webview/releases/0.1.0-beta.2/LICENSE').toString(), /^Mozilla Public License Version 2\.0/);
    assert.match(read('assets/lib/kicad-webview/releases/0.1.0-beta.2/README.md').toString(), /86b375e5f5c3f2f04df6d6c44119c25b0b2b14ee/);
});
test('Public examples are pinned, selected manifests with no large Marble board or models', () => {
    for (const file of ['olimex-p4-project.json','marble-selected-sheets.json']) {
        const manifest = JSON.parse(read('assets/demos/public-hardware/' + file));
        assert.equal(manifest.files.length, 2);
        assert.ok(manifest.files.some(item => item.path === manifest.entry));
        for (const item of manifest.files) {
            assert.match(item.url, /^https:\/\/raw\.githubusercontent\.com\/[^/]+\/[^/]+\/[a-f0-9]{40}\//);
            assert.match(item.path, /\.kicad_(pcb|sch)$/);
            if (file.startsWith('marble')) assert.ok(!item.path.endsWith('.kicad_pcb'));
        }
    }
});
test('Public example iframe is created only on explicit activation and only once', () => {
    let listener, frameCount=0;
    const host = { firstElementChild:null, hidden:true, appendChild(frame) { this.firstElementChild=frame; frameCount++; } };
    const card = { querySelector: () => host };
    const button = { dataset:{ publicExample:'/assets/demos/public-hardware/olimex-p4-project.json', exampleTitle:'OLIMEX example' }, closest:()=>card };
    const panel = { addEventListener(type,fn) { assert.equal(type,'click'); listener=fn; }, contains:()=>true };
    const document = { getElementById:()=>panel, createElement:()=>({}), documentElement:{ getAttribute:()=> 'dark' } };
    vm.runInNewContext(read('assets/js/webview-public-examples.js').toString(), { document, URL, location:{origin:'https://wayri.github.io'} });
    assert.equal(frameCount,0);
    listener({target:{closest:()=>button}});
    assert.equal(frameCount,1);
    assert.equal(host.hidden,false);
    assert.equal(button.disabled,true);
    const url = new URL(host.firstElementChild.src);
    assert.ok(url.pathname.includes('/0.1.0-beta.2/'));
    assert.equal(url.searchParams.get('src'),button.dataset.publicExample);
    listener({target:{closest:()=>button}});
    assert.equal(frameCount,1);
});

test('Runnable interaction example stays identical to its documented complete example', () => {
    const markdown = read('kicad-webview-docs/model-interaction.md').toString().replace(/\r\n/g, '\n');
    const example = markdown.match(/```html\n([\s\S]*?)\n```/)[1].trim();
    assert.equal(read('assets/demos/model-interaction.html').toString().replace(/\r\n/g, '\n').trim(), example);
    assert.ok(!example.includes('setDemoInteraction'));
    assert.ok(!example.includes('modelsready'));
});
