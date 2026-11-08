const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const model = require('../assets/js/smps-design-tools.js');
const close = (a, b, rel = 1e-10) => assert.ok(Math.abs(a - b) <= rel * Math.max(1, Math.abs(b)), `${a} != ${b}`);
const cap = { c: 100e-6, esr: .02, esl: 1e-9, n: 1 };
const buck = { vin: 12, vout: 6, l: 10e-6, fs: 100e3, load: 3, rippleTarget: .1, step: 1, hold: 10e-6, edge: 100e-9, droopTarget: .2 };

test('Series RLC SRF, ESR minimum and identical parallel scaling', () => {
    const f0 = model.resonance(cap);
    close(f0, 503292.12104487035);
    const z = model.capacitorImpedance(f0, cap);
    close(z.re, .02); close(z.im, 0);
    const two = model.bankImpedance(f0, [{ ...cap, n: 2 }]);
    close(two.re, .01); close(two.im, 0);
    const at1k = model.bankImpedance(1000, [cap]);
    close(at1k.re, .02);
    close(at1k.im, 2 * Math.PI * 1000 * 1e-9 - 1 / (2 * Math.PI * 1000 * 100e-6));
});

test('Mixed capacitor banks use complex admittance and reveal anti-resonance', () => {
    const banks = [{ c: 10e-6, esr: .001, esl: 1e-9, n: 1 }, { c: .1e-6, esr: .001, esl: 1e-9, n: 1 }];
    // Two lossless branch reactances cancel in parallel near this frequency.
    const f = Math.sqrt((1 / banks[0].c + 1 / banks[1].c) / (banks[0].esl + banks[1].esl)) / (2 * Math.PI);
    const z = model.bankImpedance(f, banks);
    assert.ok(Math.hypot(z.re, z.im) > 2);
    const individual = banks.map(b => model.capacitorImpedance(f, b));
    assert.ok(individual.every(x => Math.hypot(x.re, x.im) < .1));
    assert.throws(() => model.capacitorImpedance(0, cap));
    assert.throws(() => model.bankImpedance(1e3, []));
    assert.throws(() => model.resonance({ ...cap, esr: 0 }));
    assert.throws(() => model.resonance({ ...cap, n: 1.5 }));
    assert.throws(() => model.resonance({ ...cap, c: 1e-300, esl: 1e-300 }));
    assert.throws(() => model.capacitorImpedance(1e300, { ...cap, esl: 1e300 }));
});

test('Buck sizing independent hand case and ESR/ESL budgets', () => {
    const r = model.buckSizing(buck, [cap]);
    close(r.duty, .5); close(r.rippleI, 3); close(r.rippleC, .0375); close(r.rippleEsr, .06); close(r.ripple, .0975);
    close(r.rippleRequiredC, 93.75e-6); close(r.capacitorRms, 3 / Math.sqrt(12));
    close(r.stepC, .1); close(r.stepEsr, .02); close(r.stepEsl, .01); close(r.droop, .13);
    close(r.stepRequiredC, 58.8235294117647e-6);
    assert.equal(r.ccm, true); assert.equal(r.belowResonance, true);
    assert.equal(model.buckSizing({ ...buck, load: 1 }, [cap]).ccm, false);
    assert.equal(model.buckSizing({ ...buck, fs: 1e6 }, [cap]).belowResonance, false);
    assert.equal(model.buckSizing({ ...buck, rippleTarget: .01, droopTarget: .01 }, [cap]).rippleRequiredC, null);
    assert.equal(model.buckSizing({ ...buck, rippleTarget: .01, droopTarget: .01 }, [cap]).stepRequiredC, null);
    assert.throws(() => model.buckSizing({ ...buck, l: Number.MIN_VALUE, fs: Number.MIN_VALUE }, [cap]));
    for (const p of [{ ...buck, vin: 6 }, { ...buck, fs: 0 }, { ...buck, hold: Infinity }, { ...buck, edge: NaN }]) assert.throws(() => model.buckSizing(p, [cap]));
});

test('Mixed-bank low-frequency ESR weighted by capacitance, not resistor-only parallel', () => {
    const banks = [cap, { c: 10e-6, esr: .1, esl: 2e-9, n: 1 }];
    const r = model.buckSizing(buck, banks);
    close(r.esr, ((100e-6) ** 2 * .02 + (10e-6) ** 2 * .1) / (110e-6) ** 2);
    close(r.esl, 1 / (1 / 1e-9 + 1 / 2e-9));
});

test('Loaded LC filter matches independent real/imaginary transfer formula', () => {
    const p = { l: 10e-6, r: .1, load: 10 };
    const f = 10000, w = 2 * Math.PI * f;
    // H = 1 / [1 + (Rs+jwL) * (1/Rload + 1/Zcap)].
    const x = w * cap.esl - 1 / (w * cap.c);
    const yre = 1 / p.load + cap.esr / (cap.esr ** 2 + x ** 2);
    const yim = -x / (cap.esr ** 2 + x ** 2);
    const dre = 1 + p.r * yre - w * p.l * yim;
    const dim = p.r * yim + w * p.l * yre;
    const h = model.filterResponse(f, p, [cap]);
    close(h.gain, -20 * Math.log10(Math.hypot(dre, dim)));
    close(h.phase, -Math.atan2(dim, dre) * 180 / Math.PI);
    close(model.filterResponse(.001, p, [cap]).gain, 20 * Math.log10(10 / 10.1), 1e-8);
    assert.throws(() => model.filterResponse(f, { ...p, load: 0 }, [cap]));
});

test('Measured loop adjustment preserves neutral response and finds interpolated crossings', () => {
    const rows = model.parseLoop('# f gain phase\n1000, 20, -90\n10000, 0, -120\n100000, -20, -160');
    const neutral = model.adjustLoop(rows, { gain: 0, zero: 10000, pole: 10000 });
    assert.deepEqual(neutral, rows);
    assert.deepEqual(model.crossovers(neutral), [{ f: 10000, pm: 60 }]);
    const lead = model.adjustLoop([{ f: 10000, gain: 0, phase: -120 }], { gain: 0, zero: 1000, pole: 100000 });
    close(lead[0].gain, 20); close(lead[0].phase, -41.421186274999286);
    const crossing = model.crossovers([{ f: 1000, gain: 10, phase: -90 }, { f: 100000, gain: -10, phase: -150 }]);
    close(crossing[0].f, 10000); close(crossing[0].pm, 60);
    assert.deepEqual(model.crossovers([{ f: 1, gain: 1, phase: -20 }, { f: 10, gain: 2, phase: -30 }]), []);
    assert.equal(model.crossovers([{ f: 1, gain: 1, phase: -90 }, { f: 10, gain: -1, phase: -180 }, { f: 100, gain: 1, phase: -270 }]).length, 2);
    assert.throws(() => model.adjustLoop(rows, { gain: 0, zero: Number.MIN_VALUE, pole: 10000 }));
    for (const input of ['', '1000,0,-90', '1000,0,-90\n1000,-2,-100', '1000,abc,-90\n2000,-2,-100', '1000,0,-90,7\n2000,-2,-100']) assert.throws(() => model.parseLoop(input));
});

test('Sweep honors endpoints and does not accept reversed or overflowing range', () => {
    const points = model.sweep(10, 1e6, 5, x => x);
    close(points[0], 10); close(points[4], 1e6);
    assert.throws(() => model.sweep(10, 1, 5, x => x));
    assert.throws(() => model.sweep(1e-300, 1e300, 5, x => x));
});

test('Browser mounting uses actual fragment IDs, renders, clears errors and reopens safely', () => {
    const html = fs.readFileSync(path.join(__dirname, '../assets/tools_html/smps-loop-tuner.html'), 'utf8');
    const elements = new Map([...html.matchAll(/id="([^"]+)"/g)].map(([, id]) => [id, { value: '', textContent: '', innerHTML: '', checked: false }]));
    for (const tag of html.matchAll(/<input[^>]+>/g)) {
        const id = /id="([^"]+)"/.exec(tag[0])?.[1];
        const value = /value="([^"]+)"/.exec(tag[0])?.[1];
        if (id && value) elements.get(id).value = value;
    }
    const events = new Map();
    const root = { dataset: {}, querySelector: sel => elements.get(sel.slice(1)), addEventListener: (type, fn) => events.set(type, fn) };
    model.mount(root); model.mount(root);
    assert.equal(events.size, 2);
    assert.equal(elements.get('smps-error').textContent, '');
    assert.ok(elements.get('smps-filter-plot').innerHTML.includes('<svg'));
    assert.ok(elements.get('smps-sizing-results').innerHTML.includes('µF'));
    elements.get('smps-c1').value = '';
    events.get('input')({ target: { closest() { return null; } } });
    assert.ok(elements.get('smps-error').textContent.includes('Fill in'));
    assert.equal(elements.get('smps-filter-plot').textContent, '—');
    const code = fs.readFileSync(path.join(__dirname, '../assets/js/smps-design-tools.js'), 'utf8');
    const sandbox = vm.createContext({ window: {} });
    vm.runInContext(code, sandbox); vm.runInContext(code, sandbox);
    assert.equal(typeof sandbox.window.SMPSDesignTools.mount, 'function');
});
