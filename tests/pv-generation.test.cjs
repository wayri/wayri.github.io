const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const P = require('../assets/js/pv-generation.js');
const base = {dcKw: 1, acKw: 1, dcLossPct: 0, inverterEfficiencyPct: 100, tempCoeffPct: -.4, tempModel: 'provided', noctC: 45};
const close = (a, b, tolerance = 1e-10) => assert.ok(Math.abs(a - b) <= tolerance * Math.max(1, Math.abs(b)), `${a} != ${b}`);
test('STC, night, temperature coefficient, DC loss, conversion loss and AC clipping', () => {
    close(P.power({poa: 1000, cellC: 25}, base).acKw, 1);
    close(P.power({poa: 0, cellC: 25}, base).acKw, 0);
    close(P.power({poa: 1000, cellC: 50}, base).acKw, .9);
    const result = P.power({poa: 1000, cellC: 25}, {...base, dcLossPct: 10, inverterEfficiencyPct: 90, acKw: .75});
    close(result.dcKw, .9); close(result.availableAcKw, .81); close(result.acKw, .75);
    close(result.dcLossKw, .1); close(result.inverterLossKw, .09); close(result.clippedKw, .06);
    close(result.acKw + result.dcLossKw + result.inverterLossKw + result.clippedKw, result.temperatureKw);
});
test('NOCT-linear optional approximation is explicit, uses ambient, and ignores wind', () => {
    const c = {...base, tempModel: 'noct', noctC: 45};
    const a = P.power({poa: 800, ambientC: 20, wind: 1}, c);
    close(a.cellC, 45); close(a.acKw, .8 * .92);
    close(P.power({poa: 800, ambientC: 20, wind: 20}, c).cellC, 45);
    assert.throws(() => P.power({poa: 800}, c));
    assert.throws(() => P.power({poa: 800, ambientC: 20}, base));
});
test('Irregular intervals integrate kW × actual hours; gaps are neither filled nor annualized', () => {
    const rows = P.parseCSV('time_h,duration_h,poa_w_m2,cell_c\n0,.5,1000,25\n.5,1.5,500,25\n3,.25,1000,25');
    const result = P.intervals(rows, base);
    close(result.totals.acKWh, 1.5); close(result.coveredHours, 2.25); close(result.gapHours, 1);
    close(result.elapsedHours, 3.25); close(result.totals.poaKWhM2, 1.5);
    assert.equal(result.annualAcKWh, null);
    assert.equal(result.rows[0].acKWh, .5);
});
test('ISO interval boundaries require offset and accept unequal intervals across calendar dates', () => {
    const rows = P.parseCSV('start_iso,end_iso,poa_w_m2,cell_c\n2026-11-09T00:00+05:30,2026-11-09T00:30+05:30,1000,25\n2026-11-08T19:00Z,2026-11-08T20:30Z,500,25');
    const result = P.intervals(rows, base);
    close(result.totals.acKWh, 1.25); close(result.gapHours, 0);
    assert.equal(new Date(rows[0].startHour * 3600000).toISOString(), '2026-11-08T18:30:00.000Z');
    assert.throws(() => P.parseCSV('start_iso,end_iso,poa_w_m2,cell_c\n2026-11-09T00:00,2026-11-09T01:00,1000,25'));
    assert.throws(() => P.parseCSV('start_iso,end_iso,poa_w_m2,cell_c\n2026-02-30T00:00Z,2026-03-03T00:00Z,1000,25'));
});
test('Overlaps, duplicates, missing duration, unknown units and invalid values are rejected', () => {
    const overlapping = P.parseCSV('time_h,duration_h,poa_w_m2,cell_c\n0,2,1000,25\n1,1,1000,25');
    assert.throws(() => P.intervals(overlapping, base));
    assert.throws(() => P.intervals([overlapping[0], overlapping[0]], base));
    for (const csv of ['time_h,poa_w_m2,cell_c\n0,1000,25', 'time_h,duration_h,GHI,cell_c\n0,1,1000,25', 'time_h,duration_h,poa_w_m2,cell_c\n0,0,1000,25', 'time_h,duration_h,poa_w_m2,cell_c\n0,1,,25']) assert.throws(() => P.parseCSV(csv));
    for (const poa of [-1, Infinity, NaN]) assert.throws(() => P.power({poa, cellC: 25}, base));
    assert.throws(() => P.power({poa: 1000, cellC: 25}, {...base, dcLossPct: -1}));
    assert.throws(() => P.power({poa: 1000, cellC: 25}, {...base, acKw: 0}));
    assert.throws(() => P.power({poa: 1000, cellC: 25}, {...base, inverterEfficiencyPct: 101}));
});
test('Energy ledger balances over irregular clipped/lossy intervals', () => {
    const rows = P.parseCSV('time_h,duration_h,poa_w_m2,cell_c\n0,.25,0,10\n.25,1.25,500,30\n1.5,.5,1200,40');
    const t = P.intervals(rows, {...base, dcLossPct: 7, inverterEfficiencyPct: 96, acKw: .5}).totals;
    assert.ok(t.clippedKWh > 0);
    close(t.temperatureKWh, t.dcLossKWh + t.inverterLossKWh + t.clippedKWh + t.acKWh);
});
test('Monthly PSH uses real month lengths; 12 complete months only; clipping remains unknown', () => {
    const rows = Array.from({length: 12}, () => ({poaDaily: 4, cellC: 25}));
    const normal = P.monthly(rows, base, 2026), leap = P.monthly(rows, base, 2024);
    close(normal.annualUnclippedKWh, 1460); close(leap.annualUnclippedKWh, 1464);
    assert.equal(normal.months[1].days, 28); assert.equal(leap.months[1].days, 29);
    assert.equal(leap.clippingKWh, null);
    close(P.monthly(rows, {...base, acKw: .1}, 2024).annualUnclippedKWh, 1464); // Clipping cannot be inferred from PSH.
    rows[2] = null;
    const partial = P.monthly(rows, base, 2026);
    assert.equal(partial.knownMonths, 11); assert.equal(partial.annualUnclippedKWh, null);
    close(partial.partialUnclippedKWh, 1460 - 31 * 4);
    rows[2] = {poaDaily: 0, cellC: 25}; assert.equal(P.monthly(rows, base, 2026).knownMonths, 12);
});
test('Only a complete gap-free UTC calendar year produces an interval annual total', () => {
    const start = Date.UTC(2024, 0, 1) / 3600000;
    const rows = Array.from({length: 366}, (_, day) => ({startHour: start + day * 24, durationHours: 24, timeType: 'iso', poa: 1000, cellC: 25}));
    const complete = P.intervals(rows, base);
    assert.equal(complete.annualYear, 2024); close(complete.annualAcKWh, 8784);
    assert.equal(P.intervals(rows.slice(0, -1), base).annualAcKWh, null);
    assert.equal(P.intervals(rows.filter((_, i) => i !== 100), base).annualAcKWh, null);
});
test('UI mounts and calculates, preserves unknown monthly data, clears stale interval results, and reopens', () => {
    const nodes = new Map();
    const create = () => ({value: '', textContent: '', hidden: false, isConnected: true, children: [],
        appendChild(child) {this.children.push(child);}, replaceChildren() {this.children = [];},
        set innerHTML(html) {for (const match of html.matchAll(/<(?:input|td)[^>]*id="([^"]+)"[^>]*>/g)) {const node = create(); node.value = (match[0].match(/value="([^"]*)"/) || [])[1] || ''; nodes.set(match[1], node);}},
        getBoundingClientRect() {return {width: 600};}, getContext() {return new Proxy({}, {get: () => () => {}});}});
    const html = fs.readFileSync(path.join(__dirname, '../assets/tools_html/pv-yield-simulator.html'), 'utf8');
    for (const match of html.matchAll(/id="([^"]+)"/g)) nodes.set(match[1], create());
    for (const [id, value] of Object.entries({dc: 1, ac: 1, loss: 5, eff: 96, gamma: -.35, 'temp-model': 'provided', noct: 45, year: 2026})) nodes.get('pvg-' + id).value = String(value);
    const context = vm.createContext({document: {getElementById: id => nodes.get(id), createElement: create, documentElement: {}}, ResizeObserver: class {observe() {} disconnect() {}}, getComputedStyle: () => ({getPropertyValue: () => ''})});
    context.window = context; context.addEventListener = () => {};
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../assets/js/pv-generation.js'), 'utf8'), context);
    const ui = context.PVGeneration.ui;
    ui.init(); assert.equal(nodes.get('pvg-interval-error').textContent, ''); assert.match(nodes.get('pvg-energy').textContent, /1\.824 kWh/);
    assert.match(nodes.get('pvg-monthly-total').textContent, /0\/12/);
    ui.edited(); assert.equal(nodes.get('pvg-source').value, ''); assert.equal(nodes.get('pvg-energy').textContent, '—');
    ui.update(); assert.match(nodes.get('pvg-interval-error').textContent, /source/);
    ui.init(); assert.equal(nodes.get('pvg-interval-error').textContent, ''); assert.equal(nodes.get('pvg-monthly-rows').children.length, 12);
});
