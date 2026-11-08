(function (host) {
    'use strict';
    // Discharge-only lumped OCV + R model. No chemistry curve is supplied here.
    // Reference charge is conserved; temperature alters an accessible capacity
    // window, not the stored charge. This is an approximation, not a measured
    // temperature-recovery model. Rate-dependent capacity, Peukert effects,
    // relaxation/recovery, hysteresis, aging, BMS behavior and heating are absent.
    const fail = message => { throw new Error(message); };
    const number = (value, name, min, max = Infinity) => {
        if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) fail(`${name} must be finite and within ${min}…${max}.`);
        return value;
    };
    const positive = (value, name) => { number(value, name, 0); if (value === 0) fail(`${name} must be positive.`); return value; };
    const finite = value => { if (!Number.isFinite(value)) fail('Numerical range exceeded. Use representable battery and load values.'); return value; };
    function interpolateCurve(points, x, xKey, yKey) {
        if (!Array.isArray(points) || !points.length || !Number.isFinite(x)) fail('A non-empty curve and finite query are required.');
        if (x < points[0][xKey] || x > points[points.length - 1][xKey]) fail(`${xKey} is outside the supplied curve; extrapolation is not supported.`);
        for (let i = 0; i < points.length; i++) {
            if (x === points[i][xKey]) return points[i][yKey];
            if (i && x < points[i][xKey]) {
                const a = points[i - 1], b = points[i];
                return finite(a[yKey] + (b[yKey] - a[yKey]) * ((x - a[xKey]) / (b[xKey] - a[xKey])));
            }
        }
        return points[points.length - 1][yKey];
    }
    function temperatureAt(curve, temperatureC) {
        return { capacityFactor: interpolateCurve(curve, temperatureC, 'tempC', 'capacityFactor'), resistanceFactor: interpolateCurve(curve, temperatureC, 'tempC', 'resistanceFactor') };
    }
    function evaluateLoad(voc, resistance, segment, efficiency) {
        positive(voc, 'Pack OCV'); number(resistance, 'Pack resistance', 0); number(efficiency, 'Efficiency', Number.MIN_VALUE, 1);
        if (!segment || !['current', 'power', 'resistance'].includes(segment.type)) fail('Load type must be current, power or resistance.');
        number(segment.value, 'Load value', 0);
        if (segment.type === 'resistance' && segment.value === 0) fail('Load resistance must be positive.');
        let current, requestedPower;
        const maximumPower = resistance > 0 ? finite((voc / (4 * resistance)) * voc) : null;
        if (segment.type === 'power') {
            requestedPower = finite(segment.value / efficiency);
            if (resistance === 0) current = requestedPower / voc;
            else {
                const fraction = finite(4 * (resistance / voc) * (requestedPower / voc));
                if (fraction > 1) return { feasible: false, current: voc / (2 * resistance), voltage: voc / 2, packPowerW: maximumPower, outputPowerW: maximumPower * efficiency, lossPowerW: maximumPower, maximumPowerW: maximumPower, unmetPowerW: Math.max(0, segment.value - maximumPower * efficiency), reason: 'power_limit' };
                // Stable low-current root of P=(Voc-I R) I. This also handles P=0.
                current = 2 * requestedPower / (voc * (1 + Math.sqrt(1 - fraction)));
            }
        } else if (segment.type === 'current') current = segment.value;
        else current = voc / (resistance + segment.value);
        const voltage = finite(voc - current * resistance);
        const packPowerW = finite(voltage * current);
        const lossPowerW = finite(current * (current * resistance));
        return { feasible: voltage >= 0, current: finite(current), voltage, packPowerW: Math.max(0, packPowerW), outputPowerW: Math.max(0, packPowerW) * (segment.type === 'power' ? efficiency : 1), lossPowerW, maximumPowerW: maximumPower, unmetPowerW: voltage >= 0 ? 0 : Math.max(0, segment.value * voc - Math.max(0, maximumPower || 0)), reason: voltage >= 0 ? null : 'load_limit' };
    }
    function validateConfig(input) {
        if (!input || typeof input !== 'object') fail('Battery configuration is required.');
        const p = { ...input };
        positive(p.capacityAh, 'Cell reference capacity / Ah'); number(p.resistanceOhm, 'Cell resistance / ohm', 0);
        for (const name of ['series', 'parallel']) { positive(p[name], name); if (!Number.isInteger(p[name])) fail(`${name} must be an integer.`); }
        number(p.initialSoc, 'Initial reference SOC', 0, 1); number(p.reserveSoc, 'Accessible reserve SOC', 0, 1);
        number(p.cutoffVoltage, 'Cell cutoff voltage', 0); number(p.efficiency, 'Efficiency', Number.MIN_VALUE, 1);
        number(p.selfDischargePerDay, 'Self-discharge fraction per day', 0, 1 - Number.EPSILON);
        if (p.maxCurrentA !== undefined) positive(p.maxCurrentA, 'Optional per-cell current limit / A');
        number(p.temperatureC, 'Temperature / C', -273.15);
        positive(p.maxTimeSeconds, 'Simulation horizon / seconds');
        p.timeStepSeconds = input.timeStepSeconds === undefined ? 30 : positive(input.timeStepSeconds, 'Time step / seconds');
        p.maxSteps = input.maxSteps === undefined ? 100000 : input.maxSteps;
        p.maxPoints = input.maxPoints === undefined ? 2000 : input.maxPoints;
        for (const [key, low, high] of [['maxSteps', 1, 100000], ['maxPoints', 2, 2000]]) {
            number(p[key], key, low, high); if (!Number.isInteger(p[key])) fail(`${key} must be an integer.`);
        }
        if (!Array.isArray(p.ocvCurve) || p.ocvCurve.length < 2) fail('OCV curve needs at least two SOC/voltage points.');
        p.ocvCurve = p.ocvCurve.map(row => ({ soc: number(row.soc, 'OCV SOC', 0, 1), voltage: positive(row.voltage, 'OCV / V') }));
        if (p.ocvCurve[0].soc !== 0 || p.ocvCurve[p.ocvCurve.length - 1].soc !== 1) fail('OCV curve must span SOC 0 to 1.');
        for (let i = 1; i < p.ocvCurve.length; i++) if (p.ocvCurve[i].soc <= p.ocvCurve[i - 1].soc || p.ocvCurve[i].voltage < p.ocvCurve[i - 1].voltage) fail('OCV SOC must increase strictly and voltage must not decrease with SOC.');
        if (!Array.isArray(p.temperatureCurve) || !p.temperatureCurve.length) fail('Temperature data is required, even for a fixed-temperature model.');
        p.temperatureCurve = p.temperatureCurve.map(row => ({ tempC: number(row.tempC, 'Temperature point / C', -273.15), capacityFactor: number(row.capacityFactor, 'Capacity factor', Number.MIN_VALUE, 1), resistanceFactor: positive(row.resistanceFactor, 'Resistance factor') }));
        for (let i = 1; i < p.temperatureCurve.length; i++) if (p.temperatureCurve[i].tempC <= p.temperatureCurve[i - 1].tempC) fail('Temperature points must increase strictly.');
        temperatureAt(p.temperatureCurve, p.temperatureC);
        if (!Array.isArray(p.schedule) || !p.schedule.length) fail('A non-empty load schedule is required.');
        p.schedule = p.schedule.map(row => {
            positive(row.durationSeconds, 'Segment duration / seconds');
            if (!['current', 'power', 'resistance'].includes(row.type)) fail('Load type must be current, power or resistance.');
            number(row.value, 'Load value', 0); if (row.type === 'resistance') positive(row.value, 'Load resistance');
            const tempC = row.tempC === undefined ? p.temperatureC : number(row.tempC, 'Segment temperature', -273.15);
            temperatureAt(p.temperatureCurve, tempC);
            return { durationSeconds: row.durationSeconds, type: row.type, value: row.value, tempC };
        });
        p.cycleSeconds = finite(p.schedule.reduce((sum, row) => sum + row.durationSeconds, 0));
        positive(p.cycleSeconds, 'Schedule duration');
        p.packResistance = finite(p.resistanceOhm * p.series / p.parallel);
        p.referenceCapacityAh = finite(p.capacityAh * p.parallel);
        positive(p.referenceCapacityAh, 'Pack reference capacity');
        return p;
    }
    function simulate(input) {
        const p = validateConfig(input);
        const qNom = p.referenceCapacityAh;
        const decayRate = -Math.log1p(-p.selfDischargePerDay) / 86400;
        let q = qNom * p.initialSoc, elapsedSeconds = 0, steps = 0, segmentIndex = 0, segmentRemaining = p.schedule[0].durationSeconds;
        let deliveredWh = 0, packWh = 0, internalLossWh = 0, selfDischargeAh = 0, voltageTime = 0;
        let minVoltage = Infinity, maxVoltage = -Infinity, stopReason = null, unmetLoad = null;
        let points = [], pointStride = 1, sampledSteps = 0;
        function state(charge, segment) {
            const t = temperatureAt(p.temperatureCurve, segment.tempC);
            const accessibleCapacity = qNom * t.capacityFactor;
            const floor = qNom - accessibleCapacity;
            const rawSoc = (charge - floor) / accessibleCapacity;
            // Endpoint projection is only for a load/cutoff event bracketing calculation.
            const soc = Math.max(0, Math.min(1, rawSoc));
            const voc = finite(p.series * interpolateCurve(p.ocvCurve, soc, 'soc', 'voltage'));
            const resistance = finite(p.packResistance * t.resistanceFactor);
            const load = evaluateLoad(voc, resistance, segment, p.efficiency);
            let reason = null;
            if (rawSoc <= p.reserveSoc + 1e-13) reason = p.reserveSoc > 0 ? 'reserve_soc' : t.capacityFactor < 1 && charge > 1e-12 * qNom ? 'temperature_capacity_limit' : 'capacity_depleted';
            else if (!load.feasible) reason = load.reason;
            else if (p.maxCurrentA !== undefined && load.current / p.parallel > p.maxCurrentA) {
                reason = 'load_limit';
                const currentLimit = p.maxCurrentA * p.parallel;
                const maxPowerCurrent = resistance > 0 ? Math.min(currentLimit, voc / (2 * resistance)) : currentLimit;
                load.maximumPowerW = maxPowerCurrent * (voc - maxPowerCurrent * resistance);
                load.availableCurrentA = currentLimit;
                load.unmetCurrentA = load.current - currentLimit;
                load.limitedBy = 'per_cell_current_limit';
                if (segment.type === 'power') load.unmetPowerW = Math.max(0, segment.value - load.maximumPowerW * p.efficiency);
            }
            else if (load.voltage <= p.cutoffVoltage * p.series) reason = 'cutoff_voltage';
            return { ...load, soc, referenceSoc: charge / qNom, temperatureC: segment.tempC, voc, resistance, reason, floor, accessibleCapacity };
        }
        function point(s, force = false) {
            minVoltage = Math.min(minVoltage, s.voltage); maxVoltage = Math.max(maxVoltage, s.voltage);
            sampledSteps++;
            if (!force && sampledSteps % pointStride !== 0) return;
            const next = { timeSeconds: elapsedSeconds, voltage: s.voltage, current: s.current, soc: s.soc, referenceSoc: s.referenceSoc, temperatureC: s.temperatureC, outputPowerW: s.outputPowerW, packPowerW: s.packPowerW, lossPowerW: s.lossPowerW };
            if (points.length >= p.maxPoints) {
                points = points.filter((_, i) => i % 2 === 0); pointStride *= 2;
            }
            points.push(next);
        }
        // Implicit midpoint conserves the reference-charge state while handling
        // voltage-dependent constant-power current without an explicit-Euler drift.
        function advance(startQ, dt, segment) {
            const first = state(startQ, segment);
            let endQ = startQ - dt * (first.current / 3600 + decayRate * startQ);
            let mid;
            for (let i = 0; i < 16; i++) {
                mid = state((startQ + endQ) / 2, segment);
                if (!mid.feasible) return { q: endQ, mid, end: mid, invalid: true };
                const estimate = startQ - dt * (mid.current / 3600 + decayRate * ((startQ + endQ) / 2));
                if (Math.abs(estimate - endQ) <= 1e-12 * qNom) { endQ = estimate; break; }
                endQ = estimate;
            }
            mid = state((startQ + endQ) / 2, segment);
            return { q: finite(endQ), mid, end: state(endQ, segment), invalid: !mid.feasible };
        }
        while (elapsedSeconds < p.maxTimeSeconds && steps < p.maxSteps) {
            const segment = p.schedule[segmentIndex];
            const start = state(q, segment);
            point(start, steps === 0);
            if (start.reason) { stopReason = start.reason; unmetLoad = { type: segment.type, requestedValue: segment.value, availablePowerW: start.limitedBy ? start.maximumPowerW * (segment.type === 'power' ? p.efficiency : 1) : start.outputPowerW, unmetPowerW: start.unmetPowerW, unmetCurrentA: start.unmetCurrentA || 0, limitedBy: start.limitedBy || start.reason }; break; }
            let dt = Math.min(p.timeStepSeconds, segmentRemaining, p.maxTimeSeconds - elapsedSeconds);
            // Limit each numerical step to at most 0.5% reference capacity drain.
            const drain = start.current / 3600 + decayRate * q;
            if (drain > 0) dt = Math.min(dt, .005 * qNom / drain);
            if (!(dt > 0) || elapsedSeconds + dt === elapsedSeconds) fail('Time resolution underflow; shorten the horizon or use representable input values.');
            let update = advance(q, dt, segment);
            if (update.invalid || update.end.reason) {
                let low = 0, high = dt;
                for (let i = 0; i < 48; i++) {
                    const middle = (low + high) / 2;
                    const candidate = advance(q, middle, segment);
                    if (candidate.invalid || candidate.end.reason) high = middle;
                    else low = middle;
                }
                dt = low;
                update = advance(q, dt, segment);
                const event = advance(q, high, segment);
                stopReason = event.end.reason || event.mid.reason || 'power_limit';
                unmetLoad = { type: segment.type, requestedValue: segment.value, availablePowerW: event.end.outputPowerW, unmetPowerW: event.end.unmetPowerW };
            }
            const mid = update.mid;
            const sd = decayRate * ((q + update.q) / 2) * dt;
            selfDischargeAh += sd;
            q = update.q; elapsedSeconds += dt; segmentRemaining -= dt; steps++;
            deliveredWh += mid.outputPowerW * dt / 3600; packWh += mid.packPowerW * dt / 3600;
            internalLossWh += mid.lossPowerW * dt / 3600; voltageTime += mid.voltage * dt;
            minVoltage = Math.min(minVoltage, mid.voltage, update.end.voltage); maxVoltage = Math.max(maxVoltage, mid.voltage, update.end.voltage);
            if (stopReason) { point(update.end, true); break; }
            if (elapsedSeconds >= p.maxTimeSeconds || steps >= p.maxSteps) { point(update.end, true); break; }
            if (segmentRemaining <= Math.max(1e-10, p.schedule[segmentIndex].durationSeconds * 1e-12)) {
                point(update.end, true);
                segmentIndex = (segmentIndex + 1) % p.schedule.length;
                segmentRemaining = p.schedule[segmentIndex].durationSeconds;
            }
        }
        if (!stopReason) stopReason = elapsedSeconds >= p.maxTimeSeconds ? 'time_limit' : 'step_limit';
        const last = state(q, p.schedule[segmentIndex]);
        point(last, true);
        const runtimeIsLowerBound = stopReason === 'time_limit' || stopReason === 'step_limit';
        return { points, elapsedSeconds, stopReason, exhausted: !runtimeIsLowerBound, runtimeIsLowerBound,
            remainingReferenceAh: q, deliveredWh: finite(deliveredWh), packWh: finite(packWh), internalLossWh: finite(internalLossWh),
            selfDischargeAh: finite(selfDischargeAh), unmetLoad, minVoltage, maxVoltage,
            averageVoltage: elapsedSeconds > 0 ? voltageTime / elapsedSeconds : last.voltage, steps,
            model: 'OCV + series R; conserved reference charge with temperature-accessible window',
            modelLimitations: 'Discharge-only fixed OCV/resistance model. Discharge-rate-dependent usable capacity, Peukert behavior, relaxation/recovery, hysteresis, aging, heating and BMS dynamics are not modeled. Temperature factors are user evidence, not chemistry defaults.',
            efficiencyScope: 'Efficiency applies only to constant-power output loads; current and resistance loads are at pack terminals.' };
    }
    const api = { interpolateCurve, temperatureAt, evaluateLoad, validateConfig, simulate };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else host.BatteryAnalysis = api;
}(typeof window !== 'undefined' ? window : globalThis));
