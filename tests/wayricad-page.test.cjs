const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const data = JSON.parse(read('_data/wayricad.json'));
const page = read('wayricad.html');

test('source-only preview renders the maintained directory without unresolved Liquid', () => {
    const html = require('../tools/preview-wayricad.cjs').preview();
    assert.doesNotMatch(html, /{[{%]/);
    assert.equal((html.match(/class="wayricad-tool"/g)||[]).length,data.groups.flatMap(group=>group.tools).length);
    assert.match(html, /\[source preview\]/);
});

test('product identity and search/social metadata have one maintained owner', () => {
    assert.match(page, /permalink: \/wayricad\//);
    assert.match(page, /description: "[^"\n]{90,180}"/);
    assert.match(page, /image: \/assets\/images\/projects\/wayricad-quick-pi.png/);
    assert.match(read('_layouts/product.html'), /{% seo %}/);
    const schema = JSON.parse(page.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    const app = schema['@graph'].find(item => item['@type'] === 'SoftwareApplication');
    assert.equal(app.url, 'https://wayri.github.io/wayricad/');
    assert.equal(app.name, 'WayriCAD');
    assert.equal(app.alternateName, 'KiWay');
    assert.equal(app.downloadUrl, 'https://github.com/wayri/WayriCAD/releases');
    assert.ok(!('aggregateRating' in app));
    assert.ok(!('softwareVersion' in app));
    assert.equal((page.match(/<h1\b/g) || []).length, 1);
});

test('directory has unique descriptive tools, valid guide paths and no brittle count anchors', () => {
    const tools = data.groups.flatMap(group => group.tools);
    assert.ok(tools.length > 0);
    assert.equal(new Set(tools.map(tool => tool.guide.split('/')[0])).size, tools.length);
    assert.equal(new Set(tools.map(tool => tool.name)).size, tools.length);
    for (const tool of tools) {
        assert.match(tool.guide, /^[a-z0-9_]+_plugin\/(?:README|ReadMe)\.md$/);
        assert.ok(tool.description.length > 50);
    }
    assert.doesNotMatch(page, /#all-\d+-plugins/);
    assert.match(page, /{% for group in site.data.wayricad.groups %}/);
    assert.match(page, /<noscript>/);
    assert.ok(data.questions.every(item => item.title && item.answer));
});

test('installation, evidence limits, local CLI and licence remain visible', () => {
    for (const id of ['tool-directory', 'install', 'automation', 'model-limits', 'questions']) {
        assert.ok(page.includes(`id="${id}"`));
    }
    assert.match(page, /raw\.githubusercontent\.com\/wayri\/WayriCAD\/develop\/pcm\/repo\.json/);
    assert.match(page, /docs\/CLI_USER_GUIDE\.md/);
    assert.match(page, /wayricad_runtime\/JOBSETS\.md/);
    assert.match(page, /GPL-3\.0/);
    assert.match(page, /not a solved field/);
    assert.match(page, /development documentation may describe newer work/i);
});

function fixture(clipboard) {
    const element = extra => ({hidden:false, value:'', textContent:'', listeners:{},
        addEventListener(name, handler) { this.listeners[name] = handler; }, ...extra});
    const rows = ['Trace RLC impedance', 'BOM Studio bill of materials', 'Harness Workbench wire links']
        .map(text => element({dataset:{search:text}}));
    const groups = rows.map(row => element({querySelectorAll:()=>[row]}));
    const elements = Object.fromEntries(['plugin-search','plugin-count','plugin-empty','copy-pcm','pcm-feed','copy-status']
        .map(id => [id, element()]));
    Object.assign(elements['pcm-feed'], {value:'https://example.test/repo.json', focus(){this.focused=true;}, select(){this.selected=true;}});
    const document = {getElementById:id=>elements[id],querySelectorAll:selector=>selector === '.wayricad-tool' ? rows : groups};
    vm.runInNewContext(read('assets/js/wayricad.js'), {document,navigator:{clipboard}});
    return {rows,groups,elements};
}

test('directory filters by all words, handles empty results and restores rows', () => {
    const {rows,groups,elements} = fixture();
    const search = elements['plugin-search'];
    assert.equal(elements['plugin-count'].textContent, '3 of 3 tools shown.');
    search.value = 'RLC impedance'; search.listeners.input();
    assert.deepEqual(rows.map(row=>row.hidden), [false,true,true]);
    assert.deepEqual(groups.map(row=>row.hidden), [false,true,true]);
    search.value = 'not-a-real-tool'; search.listeners.input();
    assert.equal(elements['plugin-empty'].hidden, false);
    search.value = ''; search.listeners.input();
    assert.ok(rows.every(row=>!row.hidden));
});

test('copy reports success and has a selectable fallback when blocked', async () => {
    let copied;
    const success = fixture({writeText:async value=>{copied=value;}}).elements;
    await success['copy-pcm'].listeners.click();
    assert.equal(copied, success['pcm-feed'].value);
    assert.equal(success['copy-status'].textContent, 'Repository URL copied.');
    const blocked = fixture({writeText:async()=>{throw new Error('denied');}}).elements;
    await blocked['copy-pcm'].listeners.click();
    assert.ok(blocked['pcm-feed'].focused && blocked['pcm-feed'].selected);
    assert.match(blocked['copy-status'].textContent, /manual copying/);
});

test('new page styles have no negative tracking, viewport font scaling or fixed wide tables', () => {
    const css = read('assets/css/wayricad.css');
    assert.match(css, /letter-spacing: 0/);
    assert.doesNotMatch(css, /font-size:[^;}]*vw|letter-spacing:\s*-/);
    assert.match(css, /\[hidden\]/);
    assert.match(css, /@media\(max-width:700px\)/);
});
