const { test } = require('node:test');
const assert = require('node:assert/strict');
const m = require('../assets/js/battery-analysis.js');
function base(overrides = {}) {
    return { capacityAh: 1, resistanceOhm: 0, ocvCurve: [{ soc: 0, voltage: 3 }, { soc: 1, voltage: 3 }],
        temperatureCurve: [{ tempC: -20, capacityFactor: .5, resistanceFactor: 2 }, { tempC: 25, capacityFactor: 1, resistanceFactor: 1 }],
        series: 1, parallel: 1, initialSoc: 1, reserveSoc: 0, cutoffVoltage: 0, efficiency: 1, selfDischargePerDay: 0, temperatureC: 25,
        schedule: [{ durationSeconds: 3600, type: 'current', value: 1 }], maxTimeSeconds: 10000, timeStepSeconds: 30, ...overrides };
}
const near = (actual, expected, tol = 1e-7) => assert.ok(Math.abs(actual - expected) <= tol, `${actual} != ${expected} ± ${tol}`);

test('Constant-current runtime, energy, charge balance and fractional depletion', () => {
    const r = m.simulate(base({ schedule: [{ durationSeconds: 10000, type: 'current', value: .7 }], timeStepSeconds: 37 }));
    assert.equal(r.stopReason, 'capacity_depleted');
    near(r.elapsedSeconds, 3600 / .7, 1e-6); near(r.deliveredWh, 3); near(r.packWh, 3); near(r.internalLossWh, 0);
    near(r.remainingReferenceAh, 0); near(r.minVoltage, 3); near(r.averageVoltage, 3);
    assert.equal(r.runtimeIsLowerBound, false);
});

test('Constant-resistance load uses terminal-voltage coupling', () => {
    const r = m.simulate(base({ resistanceOhm: 1, schedule: [{ durationSeconds: 10000, type: 'resistance', value: 3 }] }));
    near(r.elapsedSeconds, 4800, 1e-6); near(r.points[0].current, .75); near(r.points[0].voltage, 2.25);
    near(r.deliveredWh, 2.25); near(r.internalLossWh, .75);
});

test('Constant-power low-current quadratic, zero-R case and infeasibility', () => {
    const x = m.evaluateLoad(4, .2, { type: 'power', value: 1 }, .8);
    const expectedI = (4 - Math.sqrt(15)) / .4;
    near(x.current, expectedI); near(x.outputPowerW, 1); near(x.packPowerW, 1.25); near(x.voltage * x.current, 1.25);
    assert.ok(x.current < 4 / (.4));
    near(m.evaluateLoad(4, 0, { type: 'power', value: 2 }, .5).current, 1);
    const max = m.evaluateLoad(4, 1, { type: 'power', value: 4 }, 1);
    assert.equal(max.feasible, true); near(max.current, 2); near(max.voltage, 2);
    const bad = m.evaluateLoad(4, 1, { type: 'power', value: 4.1 }, 1);
    assert.equal(bad.feasible, false); near(bad.unmetPowerW, .1);
    const r = m.simulate(base({ ocvCurve: [{ soc: 0, voltage: 4 }, { soc: 1, voltage: 4 }], resistanceOhm: .2,
        efficiency: .8, schedule: [{ durationSeconds: 10000, type: 'power', value: 1 }], maxTimeSeconds: 20000 }));
    near(r.elapsedSeconds, 3600 / expectedI, 1e-6); near(r.deliveredWh, r.elapsedSeconds / 3600); near(r.packWh, r.deliveredWh / .8);
});

test('Pack series/parallel scaling conserves cell charge and pack energy', () => {
    const r = m.simulate(base({ series: 4, parallel: 2, resistanceOhm: .1,
        schedule: [{ durationSeconds: 10000, type: 'current', value: 2 }] }));
    near(r.elapsedSeconds, 3600, 1e-6); near(r.points[0].voltage, 11.6);
    near(r.deliveredWh + r.internalLossWh, 24); near(r.deliveredWh, 23.2);
});

test('Linear OCV energy integral and power-converter efficiency have an analytic result', () => {
    // One reference Ah with OCV = 3 + SOC stores integral_0^1 (3+s) ds = 3.5 Wh.
    const input = base({ ocvCurve: [{ soc: 0, voltage: 3 }, { soc: 1, voltage: 4 }],
        efficiency: .8, schedule: [{ durationSeconds: 10000, type: 'power', value: 2 }] });
    const r = m.simulate(input);
    near(r.packWh, 3.5, 1e-8); near(r.deliveredWh, 2.8, 1e-8); near(r.elapsedSeconds, 5040, 1e-5);
    const currentA = m.simulate(base({ efficiency: .2 }));
    near(currentA.elapsedSeconds, 3600, 1e-6); near(currentA.deliveredWh, 3);
    const resistive = m.simulate(base({ efficiency: .2, resistanceOhm: 1,
        schedule: [{ durationSeconds: 10000, type: 'resistance', value: 3 }] }));
    near(resistive.elapsedSeconds, 4800, 1e-6);
});

test('OCV interpolation and fractional voltage-cutoff crossing', () => {
    near(m.interpolateCurve([{ soc: 0, voltage: 3 }, { soc: .5, voltage: 3.2 }, { soc: 1, voltage: 4 }], .75, 'soc', 'voltage'), 3.6);
    const r = m.simulate(base({ resistanceOhm: .1, cutoffVoltage: 3.4,
        ocvCurve: [{ soc: 0, voltage: 3 }, { soc: 1, voltage: 4 }], timeStepSeconds: 71 }));
    assert.equal(r.stopReason, 'cutoff_voltage'); near(r.elapsedSeconds, 1800, 1e-6); near(r.remainingReferenceAh, .5); near(r.points.at(-1).voltage, 3.4);
});

test('Repeating sequential loads respect boundaries and known duty-cycle runtime', () => {
    const r = m.simulate(base({ schedule: [{ durationSeconds: 10, type: 'current', value: 1 }, { durationSeconds: 10, type: 'current', value: 0 }], timeStepSeconds: 17 }));
    near(r.elapsedSeconds, 7190, 1e-6); near(r.deliveredWh, 3); assert.equal(r.stopReason, 'capacity_depleted');
});

test('Temperature capacity window conserves charge and distinguishes cold-limited capacity', () => {
    const cold = m.simulate(base({ temperatureC: -20 }));
    assert.equal(cold.stopReason, 'temperature_capacity_limit'); near(cold.elapsedSeconds, 1800, 1e-6); near(cold.remainingReferenceAh, .5);
    const switching = m.simulate(base({ initialSoc: .6, maxTimeSeconds: 20,
        schedule: [{ durationSeconds: 10, type: 'current', value: 0, tempC: -20 }, { durationSeconds: 10, type: 'current', value: 0, tempC: 25 }] }));
    near(switching.remainingReferenceAh, .6); near(switching.points[0].soc, .2); near(switching.points.at(-1).soc, .6);
    // A horizon at the segment boundary retains the final actually simulated temperature.
    assert.ok(switching.points.some(p => p.temperatureC === 25 && Math.abs(p.soc - .6) < 1e-10));
    const t = m.temperatureAt(base().temperatureCurve, 2.5); near(t.capacityFactor, .75); near(t.resistanceFactor, 1.5);
});

test('Reserve, per-cell current limit, initial overload and cold-temperature voltage step', () => {
    const reserve = m.simulate(base({ reserveSoc: .2 })); near(reserve.elapsedSeconds, 2880, 1e-6); assert.equal(reserve.stopReason, 'reserve_soc');
    const overloaded = m.simulate(base({ resistanceOhm: 1, ocvCurve: [{ soc: 0, voltage: 4 }, { soc: 1, voltage: 4 }], schedule: [{ durationSeconds: 100, type: 'power', value: 5 }] }));
    assert.equal(overloaded.stopReason, 'power_limit'); near(overloaded.elapsedSeconds, 0); near(overloaded.deliveredWh, 0); assert.ok(overloaded.unmetLoad.unmetPowerW > 0);
    const limited = m.simulate(base({ maxCurrentA: .5 })); assert.equal(limited.stopReason, 'load_limit'); near(limited.elapsedSeconds, 0); near(limited.unmetLoad.unmetCurrentA, .5);
    const cold = m.simulate(base({ resistanceOhm: .5, cutoffVoltage: 2.2,
        schedule: [{ durationSeconds: 10, type: 'current', value: 1, tempC: 25 }, { durationSeconds: 100, type: 'current', value: 1, tempC: -20 }] }));
    assert.equal(cold.stopReason, 'cutoff_voltage'); near(cold.elapsedSeconds, 10);
});

test('Self-discharge is exponential and temperature switching does not create charge', () => {
    const input = base({ initialSoc: .8, selfDischargePerDay: .1, maxTimeSeconds: 86400, schedule: [{ durationSeconds: 86400, type: 'current', value: 0 }], timeStepSeconds: 600 });
    const r = m.simulate(input);
    near(r.remainingReferenceAh, .72, 1e-8); near(r.selfDischargeAh, .08, 1e-8); near(r.deliveredWh, 0); near(r.remainingReferenceAh + r.selfDischargeAh, .8);
    assert.equal(r.stopReason, 'time_limit'); assert.equal(r.runtimeIsLowerBound, true);
});

test('Time/step limits report a lower bound and output count remains bounded', () => {
    const zero = m.simulate(base({ maxTimeSeconds: 100, schedule: [{ durationSeconds: 10, type: 'current', value: 0 }] }));
    assert.equal(zero.stopReason, 'time_limit'); near(zero.elapsedSeconds, 100); near(zero.remainingReferenceAh, 1);
    const steps = m.simulate(base({ maxSteps: 2 })); assert.equal(steps.stopReason, 'step_limit'); assert.equal(steps.runtimeIsLowerBound, true);
    const compact = m.simulate(base({ maxPoints: 10, timeStepSeconds: 1 })); assert.ok(compact.points.length <= 10); near(compact.points.at(-1).timeSeconds, compact.elapsedSeconds);
});

test('Time-step refinement converges for a sloping OCV constant-power discharge', () => {
    const input = base({ resistanceOhm: .2, cutoffVoltage: 2.7,
        ocvCurve: [{ soc: 0, voltage: 2.8 }, { soc: .2, voltage: 3.2 }, { soc: 1, voltage: 4.1 }],
        schedule: [{ durationSeconds: 10000, type: 'power', value: 2 }] });
    const coarse = m.simulate({ ...input, timeStepSeconds: 30 });
    const fine = m.simulate({ ...input, timeStepSeconds: 3 });
    const ref = m.simulate({ ...input, timeStepSeconds: .3 });
    assert.ok(Math.abs(fine.elapsedSeconds - ref.elapsedSeconds) < Math.abs(coarse.elapsedSeconds - ref.elapsedSeconds));
    near(fine.elapsedSeconds, ref.elapsedSeconds, .01); near(fine.deliveredWh, ref.deliveredWh, 1e-5);
});

test('Strict inputs reject unsupported/extrapolated models and invalid loads', () => {
    for (const overrides of [
        { capacityAh: 0 }, { efficiency: 0 }, { resistanceOhm: -1 }, { initialSoc: NaN }, { initialSoc: '1' },
        { series: 1.5 }, { parallel: 0 }, { selfDischargePerDay: 1 }, { temperatureC: 50 }, { maxSteps: 100001 },
        { temperatureCurve: [{ tempC: 25, capacityFactor: 1.1, resistanceFactor: 1 }] },
        { ocvCurve: [{ soc: 0, voltage: 4 }, { soc: 1, voltage: 3 }] },
        { ocvCurve: [{ soc: .1, voltage: 3 }, { soc: 1, voltage: 4 }] },
        { schedule: [] }, { schedule: [{ durationSeconds: 0, type: 'current', value: 1 }] },
        { schedule: [{ durationSeconds: 10, type: 'resistance', value: 0 }] },
        { schedule: [{ durationSeconds: 10, type: 'charging', value: 1 }] }
    ]) assert.throws(() => m.simulate(base(overrides)));
});
