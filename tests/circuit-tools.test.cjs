const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
function fixture(slug) {
    const html = fs.readFileSync(path.join(root, 'assets/tools_html', slug + '.html'), 'utf8');
    const elements = new Map([...html.matchAll(/id="([^"]+)"/g)].map(([, id]) => [id, {
        id, value: '', innerText: '', classList: { add() {}, remove() {} }
    }]));
    const document = {
        getElementById: id => elements.get(id),
        querySelectorAll: selector => selector === '.ohm-input' ? [...elements.values()].filter(e => /^ohm-[virp]$/.test(e.id)) : []
    };
    const context = vm.createContext({ document, setTimeout() {} });
    const script = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');
    vm.runInContext(script, context);
    return { context, elements, script, set(values) { for (const [id, value] of Object.entries(values)) elements.get(id).value = String(value); } };
}
test('Ohm calculator solves all six independent input pairs and subsequent edits', () => {
    const f = fixture('ohms-law-wheel');
    const values = { v: 12, i: 2, r: 6, p: 24 };
    for (const pair of ['vi', 'vr', 'vp', 'ir', 'ip', 'rp']) {
        f.context.resetOhms();
        for (const key of pair) {
            const e = f.elements.get('ohm-' + key); e.value = String(values[key]); f.context.calculateOhms(e);
        }
        for (const [key, value] of Object.entries(values)) assert.equal(Number(f.elements.get('ohm-' + key).value), value);
    }
    f.context.resetOhms();
    for (const [key, value] of [['v', 12], ['r', 6], ['v', 24]]) {
        const e = f.elements.get('ohm-' + key); e.value = String(value); f.context.calculateOhms(e);
    }
    assert.equal(Number(f.elements.get('ohm-i').value), 4);
    assert.equal(Number(f.elements.get('ohm-p').value), 96);
    f.elements.get('ohm-r').value = '0'; f.context.calculateOhms(f.elements.get('ohm-r'));
    assert.equal(f.elements.get('ohm-i').value, '');
    vm.runInContext(f.script, f.context); // Reopening a tool must not redeclare lexical state.
});
test('Reactance: 1 kHz, 1 uF, 1 mH; unit conversion and invalid input clearing', () => {
    const f = fixture('reactance-calc');
    f.set({ 'react-f': 1, 'react-f-unit': 1e3, 'react-c': 1, 'react-c-unit': 1e-6, 'react-l': 1, 'react-l-unit': 1e-3 });
    f.context.updateReactance();
    assert.equal(f.elements.get('react-xc-val').innerText, '159.2');
    assert.equal(f.elements.get('react-xl-val').innerText, '6.283');
    assert.equal(f.elements.get('react-fr').innerText, '5.033 kHz');
    for (const value of ['', '-1', 'Infinity', '0']) {
        f.set({ 'react-c': value }); f.context.updateReactance();
        assert.equal(f.elements.get('react-xc-val').innerText, '—');
    }
});
test('RC: 10 kohm, 100 nF; 50% and 90% analytic step response', () => {
    const f = fixture('rc-time-calc');
    f.set({ 'rc-r': 10, 'rc-r-unit': 1e3, 'rc-c': 100, 'rc-c-unit': 1e-9, 'rc-pct': 50 });
    f.context.updateRC();
    assert.equal(f.elements.get('rc-tau-val').innerText, '1');
    assert.equal(f.elements.get('rc-tau-unit').innerText, 'ms');
    assert.equal(f.elements.get('rc-tc-val').innerText, '693.1');
    assert.equal(f.elements.get('rc-td-val').innerText, '693.1');
    assert.equal(f.elements.get('rc-fc').innerText, '159.2 Hz');
    f.set({ 'rc-pct': 90 }); f.context.updateRC();
    assert.equal(f.elements.get('rc-tc-val').innerText, '2.303');
    assert.equal(f.elements.get('rc-td-val').innerText, '105.4');
    for (const value of ['', '-1', 'Infinity', '0']) {
        f.set({ 'rc-r': value }); f.context.updateRC();
        assert.equal(f.elements.get('rc-tau-val').innerText, '—');
    }
});
test('Published catalog and Jekyll exclusions agree; thermal calculators are retired', () => {
    const ui = fs.readFileSync(path.join(root, 'assets/js/tools_ui.js'), 'utf8');
    const config = fs.readFileSync(path.join(root, '_config.yml'), 'utf8').replace(/\r\n/g, '\n');
    const files = [...ui.matchAll(/"file": "([^"]+)"/g)].map(m => m[1]);
    assert.equal(files.length, 30);
    assert.equal(new Set(files).size, files.length);
    for (const removed of ['heatsink-simulator.html', 'thermal-network-calc.html', 'cable-thermal.html', 'multipoint-harness.html', 'can-bus.html']) assert.ok(!files.includes(removed));
    for (const kept of ['pv-yield-simulator.html', 'battery-suite.html', 'smps-loop-tuner.html', 'smith-chart.html', 'ddr-reference.html', 'ethernet-reference.html', 'serdes-reference.html', 'lvds-reference.html']) assert.ok(files.includes(kept));
    for (const file of fs.readdirSync(path.join(root, 'assets/tools_html')).filter(f => f.endsWith('.html'))) {
        assert.equal(config.includes('  - assets/tools_html/' + file + '\n'), !files.includes(file), file);
    }
    assert.ok(ui.includes('if (!allowed) return;'));
});

test('EV cruise: independent flat-road hand calculation and invalid efficiency', () => {
    const f = fixture('ev-powertrain-calc');
    f.set({ 'ev-v': 72, 'ev-m': 1000, 'ev-crr': .01, 'ev-cd': .3, 'ev-a': 2, 'ev-bat': 50, 'ev-eta': 90 });
    f.context.updateEV();
    // 20 m/s: drag 147 N, rolling 98.1 N, P = 245.1 * 20 / .9 W.
    assert.equal(f.elements.get('ev-fdrag').innerText, '147 N');
    assert.equal(f.elements.get('ev-froll').innerText, '98 N');
    assert.equal(f.elements.get('ev-p-val').innerText, '5.4');
    assert.equal(f.elements.get('ev-eff-val').innerText, 76);
    assert.equal(f.elements.get('ev-range-val').innerText, 661);
    for (const efficiency of [0, 101, '', 'Infinity']) {
        f.set({ 'ev-eta': efficiency }); f.context.updateEV();
        assert.equal(f.elements.get('ev-p-val').innerText, '—');
    }
});

test('Linear core: gapped and ungapped reference values, zero current and invalid geometry', () => {
    const html = fs.readFileSync(path.join(root, 'assets/tools_html/magnetic-reluctance.html'), 'utf8');
    const elements = Object.fromEntries(['length','area','mu','gap','turns','current','results'].map(id => ['#rel-' + id, { value: '', textContent: '' }]));
    const panel = { querySelector: selector => elements[selector], addEventListener() {} };
    const context = vm.createContext({ document: { getElementById: () => panel } });
    const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
    const update = values => { for (const [key, value] of Object.entries(values)) elements['#rel-' + key].value = String(value); vm.runInContext(script, context); return elements['#rel-results'].textContent; };
    let result = update({ length:50, area:25, mu:2000, gap:0, turns:10, current:2 });
    assert.match(result, /125\.664 μH/);
    assert.match(result, /1\.0053 T/);
    result = update({ gap:.5 });
    assert.match(result, /5\.984 μH/);
    assert.match(result, /0\.0479 T/);
    assert.match(update({ current:0 }), /0\.0000 mJ/);
    assert.match(update({ area:0 }), /Enter finite/);
});

test('Reference sheets have unique anchors, source links, no scripts and no unsupported numeric routing rule', () => {
    for (const name of ['ddr','ethernet','serdes','lvds']) {
        const html = fs.readFileSync(path.join(root, 'assets/tools_html/' + name + '-reference.html'), 'utf8');
        const ids = [...html.matchAll(/id="([^"]+)"/g)].map(m => m[1]);
        assert.equal(ids.length, new Set(ids).size);
        for (const [, anchor] of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(anchor), anchor);
        assert.ok(html.includes('reference-source'));
        assert.ok(html.includes('href="https://'));
        assert.ok(!html.includes('<script'));
    }
});

test('Skin depth: copper at 1 MHz, DC limit and invalid inputs', () => {
    const html = fs.readFileSync(path.join(root, 'assets/tools_html/skin-depth.html'), 'utf8');
    const nodes = Object.fromEntries(['frequency','conductivity','mu','diameter','length','result'].map(id => ['#skin-'+id,{value:'',textContent:''}]));
    const panel={querySelector:s=>nodes[s],addEventListener(){}};
    const ctx=vm.createContext({document:{getElementById:()=>panel}});
    const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
    const run=values=>{for(const [key,value] of Object.entries(values)) nodes['#skin-'+key].value=String(value); vm.runInContext(script,ctx); return nodes['#skin-result'].textContent;};
    assert.match(run({frequency:1e6,conductivity:58,mu:1,diameter:1,length:1}), /66\.085 μm/);
    assert.match(nodes['#skin-result'].textContent, /21\.9524 mΩ/);
    assert.match(run({frequency:0}), /DC: no finite skin-depth/);
    assert.match(run({conductivity:0}), /Enter finite/);
});
