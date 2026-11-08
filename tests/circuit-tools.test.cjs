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
    const files = [...ui.matchAll(/file: "([^"]+)"/g)].map(m => m[1]);
    assert.deepEqual(files, ['ohms-law-wheel.html', 'reactance-calc.html', 'rc-time-calc.html']);
    for (const file of fs.readdirSync(path.join(root, 'assets/tools_html')).filter(f => f.endsWith('.html'))) {
        assert.equal(config.includes('  - assets/tools_html/' + file + '\n'), !files.includes(file), file);
    }
    assert.ok(ui.includes('if (!allowed) return;'));
});
