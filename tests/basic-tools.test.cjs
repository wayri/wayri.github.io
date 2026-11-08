const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
function fixture(slug) {
    const html = fs.readFileSync(path.join(root, 'assets/tools_html', slug + '.html'), 'utf8');
    const els = new Map();
    function element(id, value = '') {
        const e = { id, value, innerText: '', style: {}, classList: { add() {}, remove() {}, toggle() {} }, setAttribute() {}, options: [], selectedIndex: 0 };
        Object.defineProperty(e, 'innerHTML', { get() { return this._html || ''; }, set(v) { this._html = v; this.options = [...v.matchAll(/<option value="([^"]+)"/g)].map(m => ({ value: m[1] })); if (this.options.length) this.value = this.options[0].value; } });
        els.set(id, e); return e;
    }
    for (const [, tag, attrs, id] of html.matchAll(/<(\w+)([^>]*\bid="([^"]+)"[^>]*)>/g)) element(id, (attrs.match(/\bvalue="([^"]*)"/) || [,''])[1]);
    for (const [, id, options] of html.matchAll(/<select[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g)) {
        const opts = [...options.matchAll(/<option[^>]*value="([^"]+)"([^>]*)>/g)];
        const chosen = opts.find(m => m[2].includes('selected')) || opts[0];
        if (chosen) els.get(id).value = chosen[1];
    }
    const document = { getElementById: id => els.get(id), querySelectorAll: () => [] };
    const context = vm.createContext({ document, console, setTimeout() {} }); context.window = context;
    const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');
    vm.runInContext(script, context);
    return { context, els, script, set(values) { for (const [id, value] of Object.entries(values)) els.get(id).value = String(value); }, text(id) { return els.get(id).innerText; } };
}
test('Loaded voltage divider uses parallel load and separates resistor dissipation', () => {
    const f = fixture('resistor-divider');
    f.set({ 'div-vin': 12, 'div-r1': 1000, 'div-r2': 1000, 'div-load': 0 }); f.context.updateDivider();
    assert.equal(f.text('div-vout'), '6.00000 V');
    assert.equal(f.text('div-p1'), '0.0360000 W');
    f.set({ 'div-load': 1000 }); f.context.updateDivider();
    assert.equal(f.text('div-vout'), '4.00000 V');
    assert.equal(f.text('div-p2'), '0.0160000 W');
    f.set({ 'div-r1': 0 }); f.context.updateDivider(); assert.equal(f.text('div-vout'), '—');
});
test('E-series lookup uses actual tables and crosses decade boundaries', () => {
    const f = fixture('e-series-finder');
    f.set({ 'eseries-in': 4850 }); f.context.runESeries();
    assert.match(f.text('eseries-e24'), /^4700/); assert.match(f.text('eseries-e96'), /^4870/);
    f.set({ 'eseries-in': 99 }); f.context.runESeries(); assert.match(f.text('eseries-e12'), /^100/);
    f.set({ 'eseries-in': -1 }); f.context.runESeries(); assert.equal(f.text('eseries-e12'), '—');
});
test('SMD nominal codes handle decimal and EIA-96 without inferring tolerance', () => {
    const f = fixture('smd-resistor');
    for (const [code, ohms] of [['103',10000],['1002',10000],['R047',0.047],['4R7',4.7],['01C',10000],['000',0]]) {
        f.set({ 'smd-input': code }); f.context.decodeSMD(); assert.equal(Number(f.text('smd-res-val')),ohms); assert.equal(f.text('smd-tol-val'),'Check datasheet');
    }
    f.set({ 'smd-input': '1RX' }); f.context.decodeSMD(); assert.equal(f.text('smd-res-val'),'—');
});
test('LED resistor rounds E12 upward; invalid current cannot produce a recommendation', () => {
    const f = fixture('led-resistor');
    f.set({ 'led-vs': 5, 'led-vf': 2, 'led-if': 20, 'led-n': 1 }); f.context.updateLED();
    assert.equal(f.text('led-r-val'),150); assert.equal(f.text('led-p-val'),'0.060');
    f.set({ 'led-vf':1.98 }); f.context.updateLED(); assert.equal(f.text('led-r-e12'),'180 ohms');
    f.set({ 'led-if': 0 }); f.context.updateLED(); assert.equal(f.text('led-r-val'),'-');
});
test('555 output frequency agrees with the computed period; monostable ln(3) timing', () => {
    const f = fixture('555-timer-calc');
    f.set({ 'timer-mode':'astable','t555-r1':1,'t555-r1-unit':1000,'t555-r2':1,'t555-r2-unit':1000,'t555-c':1,'t555-c-unit':1e-6 }); f.context.update555();
    assert.equal(f.text('t555-f-val'),'480.9'); assert.equal(f.text('t555-d-val'),'66.7');
    f.set({ 'timer-mode':'monostable' }); f.context.update555(); assert.equal(f.text('t555-mono-t-val'),'1.099');
    f.set({ 't555-r1':0 }); f.context.update555(); assert.equal(f.text('t555-f-val'),'—');
});
test('Current sensing: three solve paths agree for 10 A, 50 mV, 3.3 V ADC', () => {
    const f = fixture('current-sense-amp');
    f.set({ 'csa-imax':10,'csa-vadc':3.3,'csa-vshunt-max':50 }); f.context.updateCSA();
    assert.equal(f.els.get('csa-rshunt').value,'5.00'); assert.equal(f.els.get('csa-gain').value,'66.0');
    assert.equal(f.text('csa-pd-val'),'0.500'); assert.equal(f.text('csa-res12-val'),'2.44');
    f.context.updateCSA_FromShunt(); assert.equal(f.text('csa-pd-val'),'0.500');
    f.context.updateCSA_FromGain(); assert.equal(f.text('csa-pd-val'),'0.500');
    f.set({ 'csa-gain':0 }); f.context.updateCSA_FromGain(); assert.equal(f.text('csa-pd-val'),'—');
});
test('Runtime estimate is duty-weighted current arithmetic only', () => {
    const f=fixture('battery-life-estimator');
    f.set({ 'life-cap':2000,'life-active':100,'life-sleep':0,'life-duty':10 }); f.context.updateRuntime();
    assert.equal(f.text('life-mean'),'10.0000 mA'); assert.equal(f.text('life-hours'),'200.000 h');
    f.set({ 'life-duty':101 });f.context.updateRuntime();assert.equal(f.text('life-hours'),'—');
});
test('Pack estimate uses series/parallel arithmetic without a safety verdict', () => {
    const f=fixture('battery-pack-s-p-config');
    f.set({ 'pack-s':4,'pack-p':2,'pack-v':3.6,'pack-ah':3,'pack-i':5,'pack-r':20 });f.context.updatePack();
    assert.equal(f.text('pack-vout'),'14.4000 V');assert.equal(f.text('pack-energy'),'86.4000 Wh');assert.equal(f.text('pack-loss'),'1.00000 W');
    f.set({ 'pack-s':2.5 });f.context.updatePack();assert.equal(f.text('pack-vout'),'—');
});
test('Grid power: balanced three-phase power and per-delta-branch capacitance', () => {
    const f=fixture('grid-power-calc');
    f.set({ 'grid-phase':3,'grid-v':400,'grid-i':10,'grid-pf':0.8,'grid-pf-target':1,'grid-f':50 });f.context.updateGrid();
    assert.equal(f.text('grid-s'),'6.93');assert.equal(f.text('grid-p'),'5.54');assert.equal(f.text('grid-q'),'4.16');assert.equal(f.text('grid-c'),'27.6');
    f.set({ 'grid-pf':1.1 });f.context.updateGrid();assert.equal(f.text('grid-p'),'—');
});
test('Hydro uses supplied net head and efficiencies, rejecting impossible efficiencies', () => {
    const f=fixture('hydro-power-calc');
    f.set({ 'hydro-h':10,'hydro-q':1,'hydro-eta-t':80,'hydro-eta-g':90 });f.context.updateHydro();
    assert.equal(f.text('hydro-pe-val'),'70.63');assert.equal(f.text('hydro-pe-unit'),'kW');
    f.set({ 'hydro-eta-t':101 });f.context.updateHydro();assert.equal(f.text('hydro-pe-val'),'—');
});
test('Unit conversion: SI, logarithmic reference values and absolute zero', () => {
    const f=fixture('unit-converter');
    function convert(category,from,to,value){f.set({'uc-category':category,'uc-unit-from':from,'uc-unit-to':to,'uc-val-from':value});f.context.UnitConverterApp.convert();return Number(f.els.get('uc-val-to').value);}
    assert.equal(convert('length','in','mm',1),25.4);assert.equal(convert('energy','Wh','J',1),3600);
    assert.equal(convert('temperature','C','F',0),32);assert.equal(convert('power','dBm','W',30),1);
    assert.equal(convert('voltage','dBmV','V',0),0.001);
    convert('temperature','K','C',-1);assert.equal(f.els.get('uc-val-to').value,'');
});
test('All restored scripts can mount twice and do not leak generic formatters', () => {
    for(const slug of ['resistor-divider','e-series-finder','smd-resistor','led-resistor','555-timer-calc','current-sense-amp','battery-life-estimator','battery-pack-s-p-config','grid-power-calc','hydro-power-calc','unit-converter']){
        const f=fixture(slug);vm.runInContext(f.script,f.context);
        assert.ok(f.script.includes('(function(){'));
        assert.equal(f.context.formatFreq,undefined);
    }
});
