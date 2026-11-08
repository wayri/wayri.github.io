const {test} = require('node:test');
const assert = require('node:assert/strict');
const S = require('../assets/js/smith-tools.js');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const close = (a, b, tol = 1e-10) => assert.ok(Math.abs(a - b) < tol * Math.max(1, Math.abs(b)), `${a} != ${b}`);
const pair = (a, b) => {close(a.re, b.re); close(a.im, b.im);};

test('Smith transform: match, short, pure reactance, published ADI 100+j50 example', () => {
    pair(S.reflection({re: 50, im: 0}, 50), {re: 0, im: 0});
    pair(S.reflection({re: 0, im: 0}, 50), {re: -1, im: 0});
    pair(S.reflection({re: 100, im: 50}, 50), {re: .4, im: .2});
    close(S.metrics({re: 0, im: 50}, 50).magnitude, 1);
    const matched = S.metrics({re: 50, im: 0}, 50);
    assert.equal(matched.swr, 1); assert.equal(matched.returnLoss, Infinity);
    assert.equal(S.metrics({re: 0, im: 0}, 50).swr, Infinity);
    assert.equal(S.metrics({re: 0, im: 0}, 50).returnLoss, 0);
});
test('Smith forward/inverse round trips across passive plane and reference resistances', () => {
    for (const z0 of [25, 50, 75, 100]) for (const r of [0, 1, 25, 50, 1000]) for (const x of [-1000, -20, 0, 20, 1000]) {
        const z = {re: r, im: x}, g = S.reflection(z, z0);
        assert.ok(Math.hypot(g.re, g.im) <= 1 + 1e-12);
        pair(S.impedance(g, z0), z);
    }
    pair(S.impedance({re: -1, im: 0}, 50), {re: 0, im: 0});
    assert.equal(S.impedance({re: 1, im: 0}, 50).re, Infinity);
});
test('Metrics: 150 ohm load on 50 ohm gives gamma .5, SWR 3, 6.0206 dB RL, 25% reflected power', () => {
    const m = S.metrics({re: 150, im: 0}, 50);
    close(m.magnitude, .5); close(m.swr, 3); close(m.returnLoss, 6.020599913279624); close(m.reflectedPower, .25);
});
test('Series inductance cancels capacitive load, with explicit frequency dependence', () => {
    const f = 100e6, c = {kind: 'L', connection: 'series', value: 50 / (2 * Math.PI * f)};
    pair(S.applyComponent({re: 50, im: -50}, c, f), {re: 50, im: 0});
    pair(S.applyComponent({re: 50, im: -50}, c, 2 * f), {re: 50, im: 50});
});
test('Shunt capacitor matches 25+j25 ohm to 50 ohm at 100 MHz by cancelling susceptance', () => {
    const f = 100e6, c = {kind: 'C', connection: 'shunt', value: .02 / (2 * Math.PI * f)};
    const points = S.network({re: 25, im: 25}, 50, f, [c]);
    pair(points[1].z, {re: 50, im: 0}); close(points[1].magnitude, 0);
    const changed = S.network({re: 25, im: 25}, 50, 2 * f, [c]);
    assert.ok(changed[1].magnitude > .3);
});
test('Series/shunt resistors follow actual complex circuit operations, short remains short when shunted', () => {
    pair(S.applyComponent({re: 25, im: 10}, {kind: 'R', connection: 'series', value: 25}, 1e6), {re: 50, im: 10});
    pair(S.applyComponent({re: 100, im: 0}, {kind: 'R', connection: 'shunt', value: 100}, 1e6), {re: 50, im: 0});
    pair(S.applyComponent({re: 0, im: 0}, {kind: 'R', connection: 'shunt', value: 100}, 1e6), {re: 0, im: 0});
});
test('Invalid loads/reference/frequency/components are rejected rather than returning plausible results', () => {
    assert.throws(() => S.reflection({re: -1, im: 0}, 50));
    assert.throws(() => S.reflection({re: 50, im: NaN}, 50));
    assert.throws(() => S.reflection({re: 50, im: 0}, 0));
    assert.throws(() => S.impedance({re: 2, im: 0}, 50));
    assert.throws(() => S.network({re: 50, im: 0}, 50, 0, []));
    for (const value of [0, -1, NaN, Infinity]) assert.throws(() => S.componentImpedance({kind: 'L', connection: 'series', value}, 1e6));
    assert.throws(() => S.componentImpedance({kind: 'C', connection: 'unknown', value: 1e-9}, 1e6));
});

test('Smith UI initializes, adds/edits/removes elements, switches grid, handles clicks/errors and reopens', () => {
    const markup = fs.readFileSync(path.join(__dirname, '../assets/tools_html/smith-chart.html'), 'utf8');
    const create = () => ({children: [], style: {}, value: '', textContent: '', hidden: false, isConnected: true,
        appendChild(child) {this.children.push(child);}, replaceChildren() {this.children = [];}, setAttribute() {},
        get lastChild() {return this.children.at(-1);}});
    const nodes = new Map([...markup.matchAll(/id="([^"]+)"/g)].map(([, id]) => [id, create()]));
    const document = {getElementById: id => nodes.get(id), createElement: create,
        documentElement: {getAttribute: () => 'dark'}};
    const canvas = nodes.get('smith-chart'), canvasContext = new Proxy({}, {get: () => () => {}});
    canvas.getBoundingClientRect = () => ({left: 0, top: 0, width: 600, height: 600});
    canvas.getContext = () => canvasContext;
    for (const [name, value] of Object.entries({z0: 50, freq: 100, r: 25, x: 25, kind: 'L', connection: 'series', value: 10, mode: 'z'})) nodes.get('smith-' + name).value = String(value);
    const context = vm.createContext({document, console, ResizeObserver: class {observe() {} disconnect() {}}, getComputedStyle: () => ({getPropertyValue: () => ''})});
    context.window = context; context.addEventListener = () => {};
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../assets/js/smith-tools.js'), 'utf8'), context);
    const ui = context.SmithTools.ui;
    ui.init(); assert.equal(nodes.get('smith-error').hidden, true); assert.equal(nodes.get('smith-steps').children.length, 1);
    const initial = nodes.get('smith-result-z').textContent;
    ui.add(); assert.equal(nodes.get('smith-steps').children.length, 2); assert.notEqual(nodes.get('smith-result-z').textContent, initial);
    const controls = nodes.get('smith-steps').children[1].lastChild;
    controls.children[0].value = '20'; controls.children[0].onchange();
    assert.match(nodes.get('smith-result-z').textContent, /37\.566/);
    const impedanceBefore = nodes.get('smith-result-z').textContent;
    nodes.get('smith-mode').value = 'y'; ui.update(); assert.equal(nodes.get('smith-result-z').textContent, impedanceBefore);
    nodes.get('smith-steps').children[1].lastChild.children[2].onclick(); assert.equal(nodes.get('smith-steps').children.length, 1);
    canvas.onclick({clientX: 300, clientY: 300}); assert.equal(nodes.get('smith-r').value, 50); assert.equal(nodes.get('smith-x').value, 0);
    nodes.get('smith-r').value = '-1'; ui.update(); assert.equal(nodes.get('smith-error').hidden, false); assert.equal(nodes.get('smith-result-z').textContent, '—');
    nodes.get('smith-r').value = '50'; ui.init(); assert.equal(nodes.get('smith-error').hidden, true);
});
