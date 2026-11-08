(function (host) {
    'use strict';
    const positive = (x, name, zero = false) => {
        if (!Number.isFinite(x) || (zero ? x < 0 : x <= 0)) throw new Error(`${name} must be ${zero ? 'non-negative' : 'positive'} and finite.`);
        return x;
    };
    const add = (a, b) => ({ re: a.re + b.re, im: a.im + b.im });
    const multiply = (a, b) => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re });
    const divide = (a, b) => {
        const d = b.re * b.re + b.im * b.im;
        if (!(d > 0)) throw new Error('Singular zero-loss network; add measured parasitic resistance.');
        return finiteResults({ re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d });
    };
    const abs = z => Math.hypot(z.re, z.im);
    const finiteResults = result => {
        if (Object.values(result).some(x => typeof x === 'number' && !Number.isFinite(x))) throw new Error('Numerical range exceeded; use representable component values and frequency limits.');
        return result;
    };
    function validateBank(b) {
        positive(b.c, 'Effective capacitance'); positive(b.esr, 'ESR'); positive(b.esl, 'ESL'); positive(b.n, 'Quantity');
        if (!Number.isInteger(b.n)) throw new Error('Capacitor quantity must be a positive integer.');
        return b;
    }
    function capacitorImpedance(f, bank) {
        positive(f, 'Frequency'); validateBank(bank);
        const w = 2 * Math.PI * f;
        return finiteResults({ re: bank.esr / bank.n, im: (w * bank.esl - 1 / (w * bank.c)) / bank.n });
    }
    function bankImpedance(f, banks) {
        if (!banks.length) throw new Error('At least one capacitor bank is required.');
        return divide({ re: 1, im: 0 }, banks.reduce((sum, b) => add(sum, divide({ re: 1, im: 0 }, capacitorImpedance(f, b))), { re: 0, im: 0 }));
    }
    function resonance(bank) { validateBank(bank); return finiteResults({ f: 1 / (2 * Math.PI * Math.sqrt(bank.c * bank.esl)) }).f; }
    function buckSizing(p, banks) {
        for (const key of ['vin', 'vout', 'l', 'fs', 'load', 'rippleTarget', 'step', 'hold', 'edge', 'droopTarget']) positive(p[key], key);
        if (p.vout >= p.vin) throw new Error('Buck model requires 0 < Vout < Vin.');
        banks.forEach(validateBank);
        if (!banks.length) throw new Error('At least one capacitor bank is required.');
        const c = banks.reduce((sum, b) => sum + b.n * b.c, 0);
        // Low-frequency series resistance: branch current is proportional to C.
        const esr = banks.reduce((sum, b) => sum + b.n * b.c * b.c * b.esr, 0) / (c * c);
        const esl = 1 / banks.reduce((sum, b) => sum + b.n / b.esl, 0);
        const duty = p.vout / p.vin;
        const rippleI = p.vout * (1 - duty) / (p.l * p.fs);
        const ccm = p.load > rippleI / 2;
        const belowResonance = banks.every(b => p.fs < resonance(b));
        const rippleEsr = rippleI * esr;
        const rippleC = rippleI / (8 * p.fs * c);
        const rippleBudget = p.rippleTarget - rippleEsr;
        const stepEsr = p.step * esr;
        const stepEsl = p.step * esl / p.edge;
        const stepC = p.step * p.hold / c;
        const stepBudget = p.droopTarget - stepEsr - stepEsl;
        return finiteResults({ c, esr, esl, duty, rippleI, ccm, belowResonance, rippleEsr, rippleC, ripple: rippleEsr + rippleC,
            rippleRequiredC: rippleBudget > 0 ? rippleI / (8 * p.fs * rippleBudget) : null,
            stepEsr, stepEsl, stepC, droop: stepEsr + stepEsl + stepC,
            stepRequiredC: stepBudget > 0 ? p.step * p.hold / stepBudget : null,
            capacitorRms: rippleI / Math.sqrt(12) });
    }
    function filterResponse(f, p, banks) {
        positive(f, 'Frequency'); positive(p.l, 'Filter inductance'); positive(p.r, 'Source + inductor resistance', true); positive(p.load, 'Filter load resistance');
        const zc = bankImpedance(f, banks);
        const shunt = divide(multiply(zc, { re: p.load, im: 0 }), add(zc, { re: p.load, im: 0 }));
        const h = divide(shunt, add(shunt, { re: p.r, im: 2 * Math.PI * f * p.l }));
        return finiteResults({ f, gain: 20 * Math.log10(abs(h)), phase: Math.atan2(h.im, h.re) * 180 / Math.PI });
    }
    function sweep(low, high, count, fn) {
        positive(low, 'Sweep start'); positive(high, 'Sweep end');
        if (!(high > low) || !Number.isFinite(high / low) || !Number.isInteger(count) || count < 2 || count > 10001) throw new Error('Use finite increasing sweep limits and 2–10001 points.');
        return Array.from({ length: count }, (_, i) => fn(low * Math.pow(high / low, i / (count - 1))));
    }
    function parseLoop(text) {
        const rows = text.trim().split(/\r?\n/).filter(line => line.trim() && !line.trim().startsWith('#')).map(line => {
            const row = line.trim().split(/[,;\s]+/).map(Number);
            if (row.length !== 3 || !row.every(Number.isFinite) || row[0] <= 0) throw new Error('Loop rows need: frequency_Hz, gain_dB, unwrapped_phase_deg.');
            return { f: row[0], gain: row[1], phase: row[2] };
        });
        if (rows.length < 2) throw new Error('Enter at least two measured loop samples.');
        for (let i = 1; i < rows.length; i++) if (rows[i].f <= rows[i - 1].f) throw new Error('Loop sample frequencies must be strictly increasing.');
        return rows;
    }
    function adjustLoop(rows, p) {
        if (!Number.isFinite(p.gain)) throw new Error('Adjustment gain must be finite.');
        positive(p.zero, 'Adjustment zero'); positive(p.pole, 'Adjustment pole');
        return rows.map(row => finiteResults({ f: row.f,
            gain: row.gain + p.gain + 10 * Math.log10((1 + (row.f / p.zero) ** 2) / (1 + (row.f / p.pole) ** 2)),
            phase: row.phase + (Math.atan(row.f / p.zero) - Math.atan(row.f / p.pole)) * 180 / Math.PI }));
    }
    function crossovers(rows) {
        const results = [];
        for (let i = 0; i < rows.length; i++) {
            const a = rows[i], b = rows[i + 1];
            if (a.gain === 0) results.push({ f: a.f, pm: 180 + a.phase });
            else if (b && a.gain * b.gain < 0) {
                const t = -a.gain / (b.gain - a.gain);
                results.push({ f: a.f * (b.f / a.f) ** t, pm: 180 + a.phase + t * (b.phase - a.phase) });
            }
        }
        return results;
    }
    function mount(root) {
        if (!root || root.dataset.smpsMounted) return;
        root.dataset.smpsMounted = 'true';
        const $ = id => root.querySelector('#' + id);
        const value = id => {
            if ($(id).value.trim() === '') throw new Error('Fill in all active numerical fields.');
            return Number($(id).value);
        };
        const fmt = (x, unit) => x === null ? 'No positive budget remains' : `${Number(x.toPrecision(4))} ${unit}`;
        function plot(id, series, title, logY = false) {
            const target = $(id), w = 640, h = 240, pad = 48;
            const all = series.flatMap(s => s.points);
            const xs = all.map(p => Math.log10(p.f));
            const ys = all.map(p => logY ? Math.log10(p.y) : p.y);
            let ymin = Math.min(...ys), ymax = Math.max(...ys);
            if (ymin === ymax) { ymin--; ymax++; }
            const xmin = Math.min(...xs), xmax = Math.max(...xs);
            const px = f => pad + (Math.log10(f) - xmin) / (xmax - xmin) * (w - pad - 16);
            const py = y => h - pad - ((logY ? Math.log10(y) : y) - ymin) / (ymax - ymin) * (h - pad - 16);
            let svg = `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${title}" style="width:100%;height:auto;display:block"><title>${title}</title>`;
            for (let i = 0; i <= 4; i++) {
                const y = ymin + (ymax - ymin) * i / 4, yy = h - pad - i / 4 * (h - pad - 16);
                svg += `<path d="M${pad},${yy}H${w - 16}" stroke="currentColor" opacity=".15"/><text x="${pad - 5}" y="${yy + 4}" fill="currentColor" font-size="11" text-anchor="end">${Number((logY ? 10 ** y : y).toPrecision(3))}</text>`;
            }
            for (let x = Math.ceil(xmin); x <= xmax; x++) svg += `<text x="${px(10 ** x)}" y="${h - 26}" fill="currentColor" font-size="11" text-anchor="middle">${fmt(10 ** x, '')}</text>`;
            for (const s of series) svg += `<path d="${s.points.map((p, i) => `${i ? 'L' : 'M'}${px(p.f).toFixed(2)},${py(p.y).toFixed(2)}`).join(' ')}" fill="none" stroke="${s.color}" stroke-width="2"/>`;
            target.innerHTML = svg + `<text x="${w / 2}" y="${h - 5}" fill="currentColor" font-size="12" text-anchor="middle">Frequency / Hz (log scale)</text></svg>`;
        }
        function update() {
            $('smps-error').textContent = '';
            try {
                const banks = [{ c: value('smps-c1') * 1e-6, esr: value('smps-r1') * 1e-3, esl: value('smps-e1') * 1e-9, n: value('smps-n1') }];
                if ($('smps-bank2').checked) banks.push({ c: value('smps-c2') * 1e-6, esr: value('smps-r2') * 1e-3, esl: value('smps-e2') * 1e-9, n: value('smps-n2') });
                const low = value('smps-low'), high = value('smps-high');
                const p = { vin: value('smps-vin'), vout: value('smps-vout'), l: value('smps-l') * 1e-6, fs: value('smps-fs') * 1e3,
                    load: value('smps-load'), rippleTarget: value('smps-ripple') * 1e-3, step: value('smps-step'), hold: value('smps-hold') * 1e-6,
                    edge: value('smps-edge') * 1e-9, droopTarget: value('smps-droop') * 1e-3 };
                const sizing = buckSizing(p, banks);
                const points = sweep(low, high, 501, f => ({ f, y: abs(bankImpedance(f, banks)) }));
                const atFs = abs(bankImpedance(p.fs, banks));
                const extrema = points.reduce((r, x) => ({ min: x.y < r.min.y ? x : r.min, max: x.y > r.max.y ? x : r.max }), { min: points[0], max: points[0] });
                $('smps-bank-results').textContent = banks.map((b, i) => `Bank ${i + 1} SRF: ${fmt(resonance(b) / 1e6, 'MHz')}`).join(' · ') + ` · |Z| at fs: ${fmt(atFs * 1000, 'mΩ')} · Sampled minimum: ${fmt(extrema.min.y * 1000, 'mΩ')} at ${fmt(extrema.min.f / 1000, 'kHz')}`;
                const peaks = points.filter((x, i) => i && i < points.length - 1 && x.y > points[i - 1].y && x.y > points[i + 1].y);
                $('smps-bank-peaks').textContent = peaks.length ? 'Sampled local impedance peaks: ' + peaks.map(x => `${fmt(x.y * 1000, 'mΩ')} at ${fmt(x.f / 1e6, 'MHz')}`).join(' · ') : 'No local impedance peak found within this sampled frequency span.';
                plot('smps-impedance-plot', [{ points, color: 'var(--accent-color)' }], 'Capacitor bank impedance / ohms', true);
                $('smps-sizing-results').innerHTML = `<dl class="smps-values"><dt>Effective total C</dt><dd>${fmt(sizing.c * 1e6, 'µF')}</dd><dt>Inductor ripple / capacitor RMS</dt><dd>${fmt(sizing.rippleI, 'A p-p')} / ${fmt(sizing.capacitorRms, 'A RMS')}</dd><dt>Ripple estimate (C + ESR)</dt><dd>${sizing.ccm && sizing.belowResonance ? fmt(sizing.ripple * 1000, 'mV p-p') : 'Outside CCM or above a bank SRF: ripple sizing is not applicable'}</dd><dt>Ripple target minimum C</dt><dd>${sizing.ccm && sizing.belowResonance ? fmt(sizing.rippleRequiredC === null ? null : sizing.rippleRequiredC * 1e6, 'µF') : 'Outside CCM or above a bank SRF'}</dd><dt>Step droop budget (C + ESR + ESL)</dt><dd>${fmt(sizing.droop * 1000, 'mV')} = ${fmt(sizing.stepC * 1000, 'mV')} + ${fmt(sizing.stepEsr * 1000, 'mV')} + ${fmt(sizing.stepEsl * 1000, 'mV')}</dd><dt>Step target minimum C</dt><dd>${fmt(sizing.stepRequiredC === null ? null : sizing.stepRequiredC * 1e6, 'µF')}</dd></dl>`;
                const filter = { l: value('smps-fl') * 1e-6, r: value('smps-fr'), load: value('smps-fload') };
                const response = sweep(low, high, 501, f => filterResponse(f, filter, banks));
                const max = response.reduce((a, b) => a.gain > b.gain ? a : b);
                const nominalF = 1 / (2 * Math.PI * Math.sqrt(filter.l * sizing.c));
                const atSwitch = filterResponse(p.fs, filter, banks);
                $('smps-filter-results').textContent = `Nominal ideal LC f₀: ${fmt(nominalF / 1000, 'kHz')} · Gain at fs: ${fmt(atSwitch.gain, 'dB')} · Sampled maximum: ${fmt(max.gain, 'dB')} at ${fmt(max.f / 1000, 'kHz')} · DC gain: ${fmt(20 * Math.log10(filter.load / (filter.load + filter.r)), 'dB')}`;
                plot('smps-filter-plot', [{ points: response.map(x => ({ f: x.f, y: x.gain })), color: 'var(--accent-color)' }], 'Loaded output filter gain / dB');
                plot('smps-filter-phase', [{ points: response.map(x => ({ f: x.f, y: x.phase })), color: 'var(--accent-color)' }], 'Loaded output filter phase / degrees');
            } catch (error) {
                $('smps-error').textContent = error.message;
                ['smps-bank-results', 'smps-bank-peaks', 'smps-sizing-results', 'smps-filter-results', 'smps-impedance-plot', 'smps-filter-plot', 'smps-filter-phase'].forEach(id => $(id).textContent = '—');
            }
        }
        function updateLoop() {
            $('smps-loop-error').textContent = '';
            if (!$('smps-loop-data').value.trim()) {
                ['smps-loop-results', 'smps-loop-gain', 'smps-loop-phase'].forEach(id => $(id).textContent = 'Enter a measured open-loop sweep to calculate an adjustment.'); return;
            }
            try {
                const rows = parseLoop($('smps-loop-data').value);
                const result = adjustLoop(rows, { gain: value('smps-loop-adjust'), zero: value('smps-loop-zero'), pole: value('smps-loop-pole') });
                const x = crossovers(result);
                $('smps-loop-results').textContent = x.length ? (x.length > 1 ? 'Multiple crossings: complete loop/Nyquist review required. ' : '') + 'Interpolated 0 dB crossings: ' + x.map(point => `${fmt(point.f / 1000, 'kHz')}, phase margin ${fmt(point.pm, '°')}`).join(' · ') + '. These values do not establish closed-loop stability.' : 'No 0 dB crossing inside the supplied sample range. No extrapolation is performed.';
                plot('smps-loop-gain', [{ points: rows.map(p => ({ f: p.f, y: p.gain })), color: 'var(--muted-text)' }, { points: result.map(p => ({ f: p.f, y: p.gain })), color: 'var(--accent-color)' }], 'Measured baseline and adjusted loop gain / dB');
                plot('smps-loop-phase', [{ points: rows.map(p => ({ f: p.f, y: p.phase })), color: 'var(--muted-text)' }, { points: result.map(p => ({ f: p.f, y: p.phase })), color: 'var(--accent-color)' }], 'Measured baseline and adjusted loop phase / degrees');
            } catch (error) {
                $('smps-loop-error').textContent = error.message;
                ['smps-loop-results', 'smps-loop-gain', 'smps-loop-phase'].forEach(id => $(id).textContent = '—');
            }
        }
        root.addEventListener('input', event => event.target.closest('[data-loop-input]') ? updateLoop() : update());
        root.addEventListener('change', event => event.target.closest('[data-loop-input]') ? updateLoop() : update());
        update(); updateLoop();
    }
    const api = { capacitorImpedance, bankImpedance, resonance, buckSizing, filterResponse, sweep, parseLoop, adjustLoop, crossovers, mount };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else host.SMPSDesignTools = api;
}(typeof window !== 'undefined' ? window : globalThis));
