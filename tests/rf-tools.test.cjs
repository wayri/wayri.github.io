const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function fixture(slug) {
    const html = fs.readFileSync(path.join(__dirname, '../assets/tools_html', slug + '.html'), 'utf8');
    const elements = new Map([...html.matchAll(/id="([^"]+)"/g)].map(([, id]) => [id, {
        id, value: '', innerText: '', innerHTML: '', style: {}, disabled: false,
        classList: {add() {}, remove() {}, toggle() {}}
    }]));
    const document = {getElementById(id) {assert.ok(elements.has(id), `Missing #${id} in ${slug}`); return elements.get(id);}};
    const context = vm.createContext({document, setTimeout() {}});
    const script = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');
    vm.runInContext(script, context);
    vm.runInContext(script, context); // Reopening a fragment must be safe.
    return {context, elements, set(values) {for (const [id, value] of Object.entries(values)) elements.get(id).value = String(value);}, get(id) {return elements.get(id).innerText;}};
}
const close = (actual, expected, tolerance = 1e-10) => assert.ok(Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected)), `${actual} != ${expected}`);

test('RF power/voltage: loaded 50 ohm conversions, sine peak, zero and invalid data', () => {
    const f = fixture('rf-unit-translator');
    f.set({'db-val': 0, 'db-unit': 'dBm', 'db-z0': 50}); f.context.updateDbCalc();
    assert.equal(f.get('db-out-w'), '0.0010');
    assert.equal(f.get('db-out-vrms'), '0.2236');
    assert.equal(f.get('db-out-dbuv'), '106.99');
    f.set({'db-val': 1, 'db-unit': 'Vrms'}); f.context.updateDbCalc();
    assert.equal(f.get('db-out-dbm'), '13.01');
    assert.equal(f.get('db-out-vpk'), '1.414 Vpk / 2.828 Vpp');
    f.set({'db-val': 0, 'db-unit': 'W'}); f.context.updateDbCalc();
    assert.equal(f.get('db-out-dbm'), '-∞');
    assert.equal(f.get('db-out-vrms'), '0.0000');
    for (const value of ['', '-1', 'Infinity']) {
        f.set({'db-val': value}); f.context.updateDbCalc(); assert.equal(f.get('db-out-w'), '—');
    }
    f.set({'db-val': 1, 'db-z0': 0}); f.context.updateDbCalc(); assert.equal(f.get('db-out-w'), '—');
});

test('Free-space Friis: 1 GHz, 100 m, isotropic link and explicit gains/losses', () => {
    const f = fixture('friis-transmission');
    f.set({'friis-pt': 0, 'friis-gt': 0, 'friis-gr': 0, 'friis-l': 0, 'friis-f': 1000, 'friis-r': 100}); f.context.updateFriis();
    assert.equal(f.get('friis-fspl-val'), '72.4');
    assert.equal(f.get('friis-pr-val'), '-72.4');
    f.set({'friis-pt': 20, 'friis-gt': 2, 'friis-gr': 3, 'friis-l': 1}); f.context.updateFriis();
    assert.equal(f.get('friis-pr-val'), '-48.4');
    for (const value of ['', '-1', 'Infinity', '0']) {
        f.set({'friis-r': value}); f.context.updateFriis(); assert.equal(f.get('friis-pr-val'), '—');
    }
});

test('Cascade noise factor: skipped stage, loss temperature convention, zero NF and invalid inputs', () => {
    const f = fixture('rf-noise-figure');
    f.set({'nf-s1-type': 'amp', 'nf-s1-g': 10, 'nf-s1-nf': 3, 'nf-s2-type': 'none', 'nf-s3-type': 'amp', 'nf-s3-g': 10, 'nf-s3-nf': 6});
    f.context.updateNF();
    assert.equal(f.get('nf-total-val'), '3.60');
    assert.equal(f.get('gain-total-val'), '20.00');
    f.set({'nf-s1-type': 'loss', 'nf-s1-g': -3, 'nf-s3-type': 'amp', 'nf-s3-g': 10, 'nf-s3-nf': 2}); f.context.updateNF();
    assert.equal(f.get('nf-total-val'), '5.00');
    assert.equal(f.get('gain-total-val'), '7.00');
    f.set({'nf-s1-type': 'amp', 'nf-s1-g': 10, 'nf-s1-nf': 0, 'nf-s3-type': 'none'}); f.context.updateNF();
    assert.equal(f.get('nf-total-val'), '0.00');
    f.set({'nf-s1-nf': ''}); f.context.updateNF(); assert.equal(f.get('nf-total-val'), '—');
});

test('PDN budget uses the actual entered current step and does not recommend capacitance', () => {
    const f = fixture('pdn-impedance');
    f.set({'pdn-vdd': 1.2, 'pdn-ripple': 5, 'pdn-imax': 2.5}); f.context.updatePdn();
    assert.equal(f.get('pdn-ztarget'), '24.0');
    assert.equal(f.get('pdn-vripple'), '0.060 V');
    assert.equal(f.get('pdn-delta-i'), '2.50 A');
    assert.equal(f.elements.has('pdn-ctarget'), false);
    for (const value of ['', '-1', 'Infinity', '0']) {
        f.set({'pdn-imax': value}); f.context.updatePdn(); assert.equal(f.get('pdn-ztarget'), '—');
    }
});

test('Matched attenuators: independent loaded-network check of match, loss and resistor powers', () => {
    const f = fixture('attenuator-calc');
    for (const type of ['pi', 'tee']) for (const db of [3, 6, 20]) for (const z0 of [50, 75]) {
        const pad = f.context.calculateMatchedPad(type, z0, db, 1);
        const [a, b, c] = pad.resistors.map(r => r.val);
        let inputImpedance, vin = Math.sqrt(z0), vout, powers;
        if (type === 'pi') {
            const outParallel = b * z0 / (b + z0);
            inputImpedance = 1 / (1 / a + 1 / (c + outParallel));
            vout = vin * outParallel / (c + outParallel);
            powers = [vin ** 2 / a, vout ** 2 / b, (vin - vout) ** 2 / c];
        } else {
            const centerParallel = c * (b + z0) / (c + b + z0);
            inputImpedance = a + centerParallel;
            const centerVoltage = vin * centerParallel / inputImpedance;
            vout = centerVoltage * z0 / (b + z0);
            powers = [(vin - centerVoltage) ** 2 / a, (centerVoltage - vout) ** 2 / b, centerVoltage ** 2 / c];
        }
        close(inputImpedance, z0);
        close(10 * Math.log10(1 / (vout ** 2 / z0)), db);
        close(pad.outputPower + pad.resistors.reduce((sum, r) => sum + r.pwr, 0), 1);
        powers.forEach((power, index) => close(pad.resistors[index].pwr, power));
    }
    assert.equal(f.context.calculateMatchedPad('l-pad', 50, 3, 1), null);
    assert.equal(f.context.calculateMatchedPad('pi', 0, 3, 1), null);
    assert.equal(f.context.calculateMatchedPad('pi', 50, 0, 1), null);
    assert.equal(f.context.calculateMatchedPad('pi', 50, 3, -1), null);
    f.set({'att-type': 'pi', 'att-z1': 50, 'att-db': 3, 'att-pin': 0}); f.context.updateAttenuator();
    assert.equal(f.get('att-pout'), '0.000');
    f.set({'att-db': ''}); f.context.updateAttenuator(); assert.equal(f.get('att-pout'), '—');
});
