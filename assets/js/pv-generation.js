(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.PVGeneration = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';
    const HOUR = 3600000;
    const finite = (value, name) => {if (!Number.isFinite(value)) throw new RangeError(name + ' must be finite.'); return value;};
    const range = (value, name, min, max) => {finite(value, name); if (value < min || value > max) throw new RangeError(`${name} must be between ${min} and ${max}.`); return value;};
    function config(input) {
        const c = {...input};
        range(c.dcKw, 'DC nameplate kWp', .001, 1e6); range(c.acKw, 'Inverter AC limit kW', .001, 1e6);
        range(c.dcLossPct, 'Other DC loss percent', 0, 99); range(c.inverterEfficiencyPct, 'Inverter efficiency percent', .1, 100);
        range(c.tempCoeffPct, 'Power temperature coefficient percent/°C', -2, .5);
        if (!['provided', 'noct'].includes(c.tempModel)) throw new RangeError('Choose supplied cell temperature or NOCT-linear approximation.');
        if (c.tempModel === 'noct') range(c.noctC, 'NOCT °C', 20, 80);
        return c;
    }
    function power(row, input) {
        const c = config(input), irradiance = range(row.poa, 'Plane-of-array irradiance W/m²', 0, 2000);
        const cellC = c.tempModel === 'provided'
            ? range(row.cellC, 'Supplied cell temperature °C', -100, 200)
            : range(row.ambientC, 'Ambient temperature °C', -100, 100) + (c.noctC - 20) * irradiance / 800;
        const temperatureFactor = 1 + c.tempCoeffPct / 100 * (cellC - 25);
        if (!Number.isFinite(temperatureFactor) || temperatureFactor < 0) throw new RangeError('Temperature correction is outside the linear model’s usable domain.');
        const referenceKw = c.dcKw * irradiance / 1000, temperatureKw = referenceKw * temperatureFactor;
        const dcKw = temperatureKw * (1 - c.dcLossPct / 100), availableAcKw = dcKw * c.inverterEfficiencyPct / 100;
        const acKw = Math.min(availableAcKw, c.acKw);
        return {cellC, referenceKw, temperatureKw, dcKw, availableAcKw, acKw,
            dcLossKw: temperatureKw - dcKw, inverterLossKw: dcKw - availableAcKw, clippedKw: availableAcKw - acKw};
    }
    function csvCells(line) {
        const cells = []; let value = '', quoted = false;
        for (let i = 0; i < line.length; i++) {
            const character = line[i];
            if (character === '"') {if (quoted && line[i + 1] === '"') {value += '"'; i++;} else quoted = !quoted;}
            else if (character === ',' && !quoted) {cells.push(value.trim()); value = '';}
            else value += character;
        }
        if (quoted) throw new RangeError('Unclosed CSV quote; multi-line fields are not accepted.');
        cells.push(value.trim()); return cells;
    }
    const parseNumber = (value, name) => {if (value === undefined || value.trim() === '') throw new RangeError(name + ' is required.'); return finite(Number(value), name);};
    function isoHour(value, name) {
        if (!value || !/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d{1,3})?)?(?:Z|[+-]\d\d:\d\d)$/.test(value)) throw new RangeError(name + ' needs an ISO date/time with Z or an explicit UTC offset.');
        const hour = Date.parse(value) / HOUR; finite(hour, name);
        // Date.parse normalizes e.g. February 30; reject invalid local calendar fields first.
        const match = value.match(/^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)(?::(\d\d))?/);
        const [year, month, day, h, minute, second] = match.slice(1).map(x => Number(x || 0));
        if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month) || h > 23 || minute > 59 || second > 59) throw new RangeError(name + ' has an invalid calendar date/time.');
        return hour;
    }
    function parseCSV(text) {
        if (typeof text !== 'string' || text.length > 2000000) throw new RangeError('Use a CSV smaller than 2 MB.');
        const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(line => line.trim());
        if (lines.length < 2 || lines.length > 25001) throw new RangeError('Provide 1–25,000 interval rows.');
        const headers = csvCells(lines[0]).map(x => x.toLowerCase());
        if (new Set(headers).size !== headers.length) throw new RangeError('Duplicate CSV headers.');
        const known = new Set(['time_h', 'start_h', 'duration_h', 'start_iso', 'end_iso', 'poa_w_m2', 'ambient_c', 'cell_c', 'wind_m_s']);
        if (headers.some(h => !known.has(h))) throw new RangeError('Unknown CSV header. Use the documented interval schema.');
        const iso = headers.includes('start_iso'), numeric = headers.includes('time_h') || headers.includes('start_h');
        if (iso === numeric || (headers.includes('time_h') && headers.includes('start_h'))) throw new RangeError('Choose exactly one time schema: time_h + duration_h, or start_iso + end_iso.');
        if (!headers.includes('poa_w_m2') || (iso ? !headers.includes('end_iso') || headers.includes('duration_h') : !headers.includes('duration_h') || headers.includes('end_iso'))) throw new RangeError('Every row needs POA and explicit interval boundaries/duration.');
        return lines.slice(1).map((line, index) => {
            const cells = csvCells(line); if (cells.length !== headers.length) throw new RangeError(`Row ${index + 2}: column count differs from header.`);
            const values = Object.fromEntries(headers.map((h, i) => [h, cells[i]]));
            const startHour = iso ? isoHour(values.start_iso, 'start_iso') : parseNumber(values.time_h ?? values.start_h, 'time_h');
            const durationHours = iso ? isoHour(values.end_iso, 'end_iso') - startHour : parseNumber(values.duration_h, 'duration_h');
            if (!iso) range(startHour, 'Relative time_h', 0, 1e7);
            range(durationHours, 'Interval duration hours', 1 / 3600, 168);
            const row = {startHour, durationHours, timeType: iso ? 'iso' : 'relative', poa: parseNumber(values.poa_w_m2, 'poa_w_m2')};
            for (const [header, key] of [['ambient_c', 'ambientC'], ['cell_c', 'cellC'], ['wind_m_s', 'wind']]) if (values[header] !== undefined && values[header] !== '') row[key] = parseNumber(values[header], header);
            if (row.wind !== undefined) range(row.wind, 'Wind speed m/s', 0, 100);
            return row;
        });
    }
    function intervals(rows, input) {
        const c = config(input);
        if (!Array.isArray(rows) || !rows.length || rows.length > 25000) throw new RangeError('Provide 1–25,000 explicit intervals.');
        let end = null, gapHours = 0, coveredHours = 0;
        const totals = {referenceKWh: 0, temperatureKWh: 0, dcKWh: 0, acKWh: 0, dcLossKWh: 0, inverterLossKWh: 0, clippedKWh: 0, poaKWhM2: 0};
        const calculated = rows.map((row, index) => {
            finite(row.startHour, 'Start time'); range(row.durationHours, 'Interval duration hours', 1 / 3600, 168);
            if (!['iso', 'relative'].includes(row.timeType) || row.timeType !== rows[0].timeType) throw new RangeError('Do not mix absolute and relative times.');
            if (end !== null && row.startHour < end - 1e-9) throw new RangeError(`Interval ${index + 1} overlaps an earlier interval or is not chronological.`);
            if (end !== null) gapHours += Math.max(0, row.startHour - end);
            const p = power(row, c), dt = row.durationHours; end = row.startHour + dt; coveredHours += dt;
            totals.referenceKWh += p.referenceKw * dt; totals.temperatureKWh += p.temperatureKw * dt; totals.dcKWh += p.dcKw * dt; totals.acKWh += p.acKw * dt;
            totals.dcLossKWh += p.dcLossKw * dt; totals.inverterLossKWh += p.inverterLossKw * dt; totals.clippedKWh += p.clippedKw * dt; totals.poaKWhM2 += row.poa * dt / 1000;
            return {...row, ...p, endHour: end, acKWh: p.acKw * dt};
        });
        const annual = completeYear(calculated[0].startHour, end, gapHours, rows[0].timeType);
        return {rows: calculated, totals, coveredHours, gapHours, elapsedHours: end - rows[0].startHour,
            annualAcKWh: annual === null ? null : totals.acKWh, annualYear: annual,
            ignoredWindRows: rows.filter(row => row.wind !== undefined).length};
    }
    function completeYear(start, end, gaps, type) {
        if (type !== 'iso' || gaps > 1e-8) return null;
        const year = new Date(start * HOUR).getUTCFullYear();
        return Math.abs(start - Date.UTC(year, 0, 1) / HOUR) < 1e-8 && Math.abs(end - Date.UTC(year + 1, 0, 1) / HOUR) < 1e-8 ? year : null;
    }
    function daysInMonth(year, month) {
        if (!Number.isInteger(year) || year < 1900 || year > 2200 || !Number.isInteger(month) || month < 1 || month > 12) throw new RangeError('Use calendar year 1900–2200 and month 1–12.');
        return new Date(Date.UTC(year, month, 0)).getUTCDate();
    }
    function monthly(rows, input, year) {
        const c = config(input); daysInMonth(year, 1);
        if (!Array.isArray(rows) || rows.length !== 12) throw new RangeError('Provide one record per calendar month (null for unknown).');
        const months = rows.map((row, i) => {
            const days = daysInMonth(year, i + 1);
            if (row === null || row.poaDaily === null || row.poaDaily === undefined) return {month: i + 1, days, acUnclippedKWh: null};
            const poaDaily = range(row.poaDaily, 'Monthly mean daily POA kWh/m²/day', 0, 20), cellC = range(row.cellC, 'Representative cell temperature °C', -100, 200);
            const factor = 1 + c.tempCoeffPct / 100 * (cellC - 25);
            if (factor < 0) throw new RangeError('Monthly temperature factor is outside the linear model’s usable domain.');
            return {month: i + 1, days, poaDaily, cellC, acUnclippedKWh: c.dcKw * poaDaily * days * factor * (1 - c.dcLossPct / 100) * c.inverterEfficiencyPct / 100};
        });
        const known = months.filter(row => row.acUnclippedKWh !== null);
        return {months, knownMonths: known.length, partialUnclippedKWh: known.reduce((sum, row) => sum + row.acUnclippedKWh, 0),
            annualUnclippedKWh: known.length === 12 ? known.reduce((sum, row) => sum + row.acUnclippedKWh, 0) : null, clippingKWh: null};
    }
    const api = {config, power, parseCSV, intervals, monthly, daysInMonth};
    if (typeof window !== 'undefined') {
        const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const fixture = 'time_h,duration_h,poa_w_m2,ambient_c,cell_c\n0,1,0,25,25\n1,1,500,25,25\n2,1,1000,25,25\n3,1,500,25,25';
        let observer = null, lastInterval = null, lastMonthly = null, lastConfig = null;
        const el = id => document.getElementById('pvg-' + id), num = id => Number.parseFloat(el(id).value);
        const text = (id, value) => {if (el(id)) el(id).textContent = value;};
        const kwh = n => n === null ? 'Unknown' : n.toLocaleString(undefined, {maximumFractionDigits: 3}) + ' kWh';
        function settings() {return config({dcKw: num('dc'), acKw: num('ac'), dcLossPct: num('loss'), inverterEfficiencyPct: num('eff'), tempCoeffPct: num('gamma'), tempModel: el('temp-model').value, noctC: num('noct')});}
        function draw(canvas, bars, label, xLabels) {
            const rect = canvas.getBoundingClientRect();
            if (!(rect.width > 0)) return;
            const width = rect.width, height = 250, dpr = Math.min(window.devicePixelRatio || 1, 3);
            canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
            const ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, width, height);
            const style = getComputedStyle(document.documentElement), accent = style.getPropertyValue('--accent-color').trim() || '#d4af37', ink = style.getPropertyValue('--muted-text').trim() || '#888';
            const left = Math.min(52, width * .22), right = width - Math.min(16, width * .05), top = 24, bottom = height - 44;
            const maxX = Math.max(1, ...bars.map(b => b.end)), maxY = Math.max(.001, ...bars.map(b => b.value || 0));
            const px = x => left + x / maxX * (right - left), py = y => bottom - y / maxY * (bottom - top);
            ctx.font = '12px system-ui'; ctx.fillStyle = ink; ctx.textAlign = 'right'; ctx.strokeStyle = ink; ctx.globalAlpha = .35;
            for (let i = 0; i <= 4; i++) {const y = maxY * i / 4; ctx.beginPath(); ctx.moveTo(left, py(y)); ctx.lineTo(right, py(y)); ctx.stroke();}
            ctx.globalAlpha = 1;
            for (let i = 0; i <= 4; i++) ctx.fillText((maxY * i / 4).toFixed(width < 320 && maxY * i / 4 >= 100 ? 0 : 2), left - 5, py(maxY * i / 4) + 4);
            ctx.textAlign = 'left'; ctx.fillText(label, left, 13, Math.max(1, right - left));
            for (const bar of bars) if (bar.value !== null) {ctx.fillStyle = accent; ctx.globalAlpha = .65; ctx.fillRect(px(bar.start) + .5, py(bar.value), Math.max(.5, px(bar.end) - px(bar.start) - 1), bottom - py(bar.value));}
            ctx.globalAlpha = 1; ctx.fillStyle = ink; ctx.textAlign = 'center';
            const ticks = width < 360 && xLabels.length > 6 ? xLabels.filter((_, i) => i % 2 === 0) : xLabels;
            for (const item of ticks) ctx.fillText(item.text, px(item.x), bottom + 18);
        }
        function redraw() {
            if (!el('power-chart')) return;
            if (lastInterval) {
                let origin = lastInterval.rows[0].startHour, final = lastInterval.rows.at(-1).endHour - origin, end = origin + final;
                const day = el('day').value.trim();
                if (day) {
                    try {
                        if (lastInterval.rows[0].timeType === 'iso') {
                            if (!/^\d{4}-\d\d-\d\d$/.test(day)) throw new RangeError('Use YYYY-MM-DD for an ISO series.');
                            origin = isoHour(day + 'T00:00Z', 'Chart day');
                        } else {
                            const relativeDay = Number(day);
                            if (!Number.isInteger(relativeDay) || relativeDay < 0) throw new RangeError('Use a non-negative whole relative day number.');
                            origin = relativeDay * 24;
                        }
                        final = 24; end = origin + 24;
                        text('chart-note', `Selected day: ${day}; horizontal axis is hours from its start. Unprovided intervals remain empty.`);
                    } catch (e) {text('chart-note', e.message); draw(el('power-chart'), [], 'Invalid chart day', []); return;}
                } else text('chart-note', 'Hours from the first supplied interval; each bar is its interval-mean AC power. Gaps are left empty.');
                const bars = lastInterval.rows.filter(row => row.endHour > origin && row.startHour < end).map(row => ({start: Math.max(row.startHour, origin) - origin, end: Math.min(row.endHour, end) - origin, value: row.acKw}));
                bars.push({start: final, end: final, value: null});
                draw(el('power-chart'), bars, 'AC power · kW (interval mean)', Array.from({length: 5}, (_, i) => ({x: final * i / 4, text: (final * i / 4).toFixed(1) + ' h'})));
            } else draw(el('power-chart'), [], 'No valid interval result', []);
            draw(el('month-chart'), names.map((_, i) => ({start: i, end: i + .8, value: lastMonthly ? lastMonthly.months[i].acUnclippedKWh : null})), 'AC energy before clipping · kWh', names.map((name, i) => ({x: i + .4, text: name})));
        }
        function update() {
            if (!el('csv')) return;
            try {lastConfig = settings(); el('noct-wrap').hidden = lastConfig.tempModel !== 'noct';}
            catch (e) {lastConfig = null;}
            lastInterval = null; lastMonthly = null;
            try {
                if (!lastConfig) throw new RangeError('Check the system parameters.');
                if (!el('source').value.trim()) throw new RangeError('State the data source and interval-mean convention before calculating.');
                lastInterval = intervals(parseCSV(el('csv').value), lastConfig);
                text('interval-error', '');
                text('energy', kwh(lastInterval.totals.acKWh)); text('clip', kwh(lastInterval.totals.clippedKWh));
                text('covered', lastInterval.coveredHours.toFixed(3) + ' h of supplied intervals');
                text('gaps', lastInterval.gapHours > 1e-8 ? `${lastInterval.gapHours.toFixed(3)} h of gaps: excluded, not filled` : 'No gaps between supplied intervals');
                text('annual', lastInterval.annualAcKWh === null ? 'No complete UTC reference year' : `${lastInterval.annualYear}: ${kwh(lastInterval.annualAcKWh)}`);
                text('ledger', `Temperature-adjusted DC ${kwh(lastInterval.totals.temperatureKWh)} − other DC loss ${kwh(lastInterval.totals.dcLossKWh)} − inverter conversion loss ${kwh(lastInterval.totals.inverterLossKWh)} − clipping ${kwh(lastInterval.totals.clippedKWh)} = AC ${kwh(lastInterval.totals.acKWh)}`);
                text('wind-note', lastInterval.ignoredWindRows ? 'Wind columns are preserved in the result export but not used by the supplied-temperature or simple NOCT-linear model.' : '');
            } catch (e) {
                text('interval-error', e.message); for (const id of ['energy', 'clip', 'covered', 'gaps', 'annual', 'ledger', 'wind-note']) text(id, '—');
            }
            try {
                if (!lastConfig) throw new RangeError('Check the system parameters.');
                const year = num('year'), rows = names.map((_, i) => {const value = el('month-' + i).value; return value.trim() === '' ? null : {poaDaily: Number(value), cellC: num('month-temp-' + i)};});
                lastMonthly = monthly(rows, lastConfig, year);
                names.forEach((_, i) => {text('days-' + i, lastMonthly.months[i].days); text('month-result-' + i, kwh(lastMonthly.months[i].acUnclippedKWh));});
                text('monthly-total', lastMonthly.annualUnclippedKWh === null ? `Annual unknown · ${lastMonthly.knownMonths}/12 months entered` : `${year}: ${kwh(lastMonthly.annualUnclippedKWh)} before clipping`);
                text('monthly-partial', `Entered-month subtotal: ${kwh(lastMonthly.partialUnclippedKWh)} before clipping`); text('monthly-error', '');
            } catch (e) {text('monthly-error', e.message); text('monthly-total', 'Unknown'); text('monthly-partial', '—'); names.forEach((_, i) => text('month-result-' + i, '—'));}
            redraw();
        }
        api.ui = {
            update, redraw,
            edited() {el('source').value = ''; text('interval-error', 'CSV changed: state its source and confirm interval-mean semantics, then calculate.'); lastInterval = null; for (const id of ['energy', 'clip', 'covered', 'gaps', 'annual', 'ledger']) text(id, '—'); redraw();},
            example() {el('csv').value = fixture; el('source').value = 'Analytic constant-irradiance fixture — not measured or modeled weather'; update();},
            async importFile(input) {
                try {
                    const file = input.files && input.files[0]; if (!file) return;
                    if (file.size > 2000000) throw new RangeError('Use a CSV smaller than 2 MB.');
                    const value = await file.text(); if (!el('csv')) return;
                    el('csv').value = value; api.ui.edited();
                } catch (e) {text('interval-error', e.message);}
            },
            exportCSV() {
                if (!lastInterval) {text('interval-error', 'Calculate a valid interval result first.'); return;}
                const header = 'start_time,end_time,duration_h,poa_w_m2,ambient_c,cell_c_used,wind_m_s,dc_kw,ac_kw,clipped_kw,ac_kwh';
                const rows = lastInterval.rows.map(row => [row.timeType === 'iso' ? new Date(row.startHour * HOUR).toISOString() : row.startHour, row.timeType === 'iso' ? new Date(row.endHour * HOUR).toISOString() : row.endHour, row.durationHours, row.poa, row.ambientC ?? '', row.cellC, row.wind ?? '', row.dcKw, row.acKw, row.clippedKw, row.acKWh].join(','));
                const blob = new Blob([header + '\n' + rows.join('\n') + '\n'], {type: 'text/csv;charset=utf-8'}), url = URL.createObjectURL(blob), link = document.createElement('a');
                link.href = url; link.download = 'pv-generation-interval-results.csv'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
            },
            exportJSON() {
                if (!lastInterval || !lastConfig) {text('interval-error', 'Calculate a valid interval result first.'); return;}
                const evidence = {schema: 'pv-generation-evidence-v1', model: 'Linear STC DC scaling; constant-efficiency AC inverter; explicit clipping', source: el('source').value.trim(), sourceTrust: 'User-stated; not independently verified', timeConvention: 'Explicit start/end; input rows treated as constant interval means; absolute calendar is UTC', settings: lastConfig, inputCSV: el('csv').value, intervalResult: lastInterval, monthlyResult: lastMonthly, monthlyClipping: 'Unknown; daily irradiation totals cannot determine clipping'};
                const blob = new Blob([JSON.stringify(evidence, null, 2)], {type: 'application/json'}), url = URL.createObjectURL(blob), link = document.createElement('a');
                link.href = url; link.download = 'pv-generation-evidence.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
            },
            init() {
                if (observer) observer.disconnect();
                const body = el('monthly-rows'); body.replaceChildren();
                names.forEach((name, i) => {
                    const row = document.createElement('tr');
                    row.innerHTML = `<th scope="row">${name}</th><td id="pvg-days-${i}">—</td><td><input id="pvg-month-${i}" type="number" min="0" max="20" step="any" aria-label="${name} mean daily plane-of-array irradiation kWh per square metre" oninput="PVGeneration.ui.update()"></td><td><input id="pvg-month-temp-${i}" type="number" value="25" min="-100" max="200" step="any" aria-label="${name} representative cell temperature Celsius" oninput="PVGeneration.ui.update()"></td><td id="pvg-month-result-${i}">Unknown</td>`;
                    body.appendChild(row);
                });
                api.ui.example(); const canvas = el('power-chart');
                observer = new ResizeObserver(() => {if (canvas.isConnected) redraw(); else observer.disconnect();}); observer.observe(canvas); observer.observe(el('month-chart'));
            }
        };
        window.addEventListener('themeChanged', () => {if (el('power-chart')) redraw();});
    }
    return api;
});
