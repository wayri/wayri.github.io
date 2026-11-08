(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.SmithTools = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';
    const open = () => ({re: Infinity, im: 0});
    const isOpen = z => z.re === Infinity && z.im === 0;
    const add = (a, b) => isOpen(a) || isOpen(b) ? open() : ({re: a.re + b.re, im: a.im + b.im});
    const reciprocal = a => {
        if (isOpen(a)) return {re: 0, im: 0};
        const scale = Math.max(Math.abs(a.re), Math.abs(a.im));
        if (scale === 0) return open();
        const re = a.re / scale, im = a.im / scale, d = scale * (re * re + im * im);
        return {re: re / d, im: -im / d};
    };
    function validate(z, z0) {
        if (!z || !Number.isFinite(z.re) || !Number.isFinite(z.im) || z.re < 0 || !Number.isFinite(z0) || z0 <= 0) throw new RangeError('Use a finite passive load R ≥ 0 and a positive real reference resistance.');
    }
    function reflection(z, z0) {
        if (!Number.isFinite(z0) || z0 <= 0) throw new RangeError('Reference resistance must be positive.');
        if (isOpen(z)) return {re: 1, im: 0};
        validate(z, z0);
        const rn = z.re / z0, xn = z.im / z0, scale = Math.max(rn + 1, Math.abs(xn));
        if (![rn, xn, scale].every(Number.isFinite)) throw new RangeError('Normalized impedance exceeds the supported numeric range.');
        const r = (rn + 1) / scale, x = xn / scale, d = scale * (r * r + x * x);
        return {re: 1 - 2 * r / d, im: 2 * x / d};
    }
    function impedance(g, z0) {
        if (!Number.isFinite(z0) || z0 <= 0 || !g || !Number.isFinite(g.re) || !Number.isFinite(g.im) || Math.hypot(g.re, g.im) > 1 + 1e-12) throw new RangeError('Reflection coefficient must be inside the passive unit circle.');
        const inv = reciprocal({re: 1 - g.re, im: -g.im});
        return isOpen(inv) ? open() : {re: Math.max(0, z0 * (2 * inv.re - 1)), im: 2 * z0 * inv.im};
    }
    function metrics(z, z0) {
        const gamma = reflection(z, z0), magnitude = Math.min(1, Math.hypot(gamma.re, gamma.im));
        return {gamma, magnitude, angle: Math.atan2(gamma.im, gamma.re) * 180 / Math.PI,
            swr: magnitude >= 1 - 1e-14 ? Infinity : (1 + magnitude) / (1 - magnitude),
            returnLoss: magnitude === 0 ? Infinity : magnitude === 1 ? 0 : -20 * Math.log10(magnitude), reflectedPower: magnitude * magnitude};
    }
    function componentImpedance(c, f) {
        if (!c || !['R', 'L', 'C'].includes(c.kind) || !['series', 'shunt'].includes(c.connection) || !Number.isFinite(c.value) || c.value <= 0 || !Number.isFinite(f) || f <= 0) throw new RangeError('Use positive finite component values and frequency.');
        if (c.kind === 'R') return {re: c.value, im: 0};
        const x = c.kind === 'L' ? 2 * Math.PI * f * c.value : -1 / (2 * Math.PI * f * c.value);
        if (!Number.isFinite(x)) throw new RangeError('Reactance exceeds the supported numeric range.');
        return {re: 0, im: x};
    }
    function applyComponent(z, c, f) {
        const part = componentImpedance(c, f);
        return c.connection === 'series' ? add(z, part) : reciprocal(add(reciprocal(z), reciprocal(part)));
    }
    function network(load, z0, f, components) {
        validate(load, z0);
        if (!Number.isFinite(f) || f <= 0 || !Array.isArray(components) || components.length > 24) throw new RangeError('Use positive frequency and at most 24 elements.');
        const points = [{z: {...load}, label: 'Load', ...metrics(load, z0)}]; let z = {...load};
        for (const [i, c] of components.entries()) {z = applyComponent(z, c, f); points.push({z, label: `${i + 1}. ${c.connection} ${c.kind}`, ...metrics(z, z0)});}
        return points;
    }
    const api = {reflection, impedance, metrics, componentImpedance, applyComponent, network};
    if (typeof window !== 'undefined') {
        let elements = [], observer = null, currentPoints = [], frame = null;
        const el = id => document.getElementById('smith-' + id);
        const text = (id, value) => {if (el(id)) el(id).textContent = value;};
        const num = id => Number.parseFloat(el(id).value);
        const fmt = n => n === Infinity ? '∞' : Math.abs(n) < 1e-9 ? '0' : Number(n.toPrecision(5)).toString();
        const fmtZ = z => isOpen(z) ? 'Open circuit' : `${fmt(z.re)} ${z.im < 0 ? '−' : '+'} j${fmt(Math.abs(z.im))} Ω`;
        const state = () => ({load: {re: num('r'), im: num('x')}, z0: num('z0'), f: num('freq') * 1e6});
        function draw() {
            const canvas = el('chart'); if (!canvas) return;
            const size = Math.max(240, Math.min(700, canvas.getBoundingClientRect().width)), dpr = Math.min(3, window.devicePixelRatio || 1);
            canvas.width = Math.round(size * dpr); canvas.height = Math.round(size * dpr);
            const ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            const style = getComputedStyle(document.documentElement), dark = document.documentElement.getAttribute('data-theme') === 'dark';
            const accent = style.getPropertyValue('--accent-color').trim() || '#d4af37', foreground = style.getPropertyValue('--text-color').trim() || '#ddd';
            const center = size / 2, radius = size * 0.41, point = g => ({x: center + radius * g.re, y: center - radius * g.im});
            ctx.clearRect(0, 0, size, size); ctx.save(); ctx.beginPath(); ctx.arc(center, center, radius, 0, 2 * Math.PI); ctx.clip();
            function curve(points) {ctx.beginPath(); points.forEach((g, i) => {const p = point(g); if (!i) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);}); ctx.stroke();}
            const yMode = el('mode').value === 'y', map = (r, x) => {const g = reflection({re: r, im: x}, 1); return yMode ? {re: -g.re, im: -g.im} : g;};
            ctx.lineWidth = .8; ctx.strokeStyle = dark ? '#46515b' : '#c4cbd1';
            for (const r of [0, .2, .5, 1, 2, 5]) curve(Array.from({length: 321}, (_, i) => map(r, Math.tan(-Math.PI / 2 + Math.PI * (i + .5) / 321))));
            for (const x of [-5, -2, -1, -.5, -.2, 0, .2, .5, 1, 2, 5]) curve(Array.from({length: 201}, (_, i) => map((i / 200) ** 2 * 1000, x)));
            ctx.strokeStyle = accent; ctx.lineWidth = 2;
            if (currentPoints.length > 1) {
                const {f, z0} = state();
                elements.forEach((c, i) => {
                    const start = currentPoints[i].z, part = componentImpedance(c, f), y = reciprocal(part);
                    curve(Array.from({length: 81}, (_, j) => {
                        const fraction = j / 80;
                        const z = c.connection === 'series' ? add(start, {re: part.re * fraction, im: part.im * fraction}) : reciprocal(add(reciprocal(start), {re: y.re * fraction, im: y.im * fraction}));
                        return reflection(z, z0);
                    }));
                });
            }
            for (const [i, entry] of currentPoints.entries()) {
                const p = point(entry.gamma); ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(p.x, p.y, i === currentPoints.length - 1 ? 5 : 3.5, 0, 2 * Math.PI); ctx.fill();
                ctx.fillStyle = foreground; ctx.font = '12px system-ui'; ctx.fillText(String(i), p.x + 7, p.y - 5);
            }
            ctx.restore(); ctx.strokeStyle = dark ? '#8c969e' : '#526070'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(center, center, radius, 0, 2 * Math.PI); ctx.stroke();
            ctx.fillStyle = foreground; ctx.font = '12px system-ui'; ctx.textAlign = 'center';
            ctx.fillText('short', center - radius, center + radius + 20); ctx.fillText('match', center, center + radius + 20); ctx.fillText('open', center + radius, center + radius + 20);
            ctx.fillText(yMode ? 'Admittance grid: +b below / −b above' : 'Impedance grid: +jx above / −jx below', center, 18);
            frame = {center, radius, size};
        }
        function update() {
            if (!el('chart')) return;
            try {
                const {load, z0, f} = state(); currentPoints = network(load, z0, f, elements);
                const result = currentPoints.at(-1), y = reciprocal(result.z);
                text('result-z', fmtZ(result.z)); text('gamma', `${fmt(result.gamma.re)} ${result.gamma.im < 0 ? '−' : '+'} j${fmt(Math.abs(result.gamma.im))} · ${fmt(result.magnitude)} ∠ ${result.angle.toFixed(1)}°`);
                text('swr', fmt(result.swr)); text('rl', `${fmt(result.returnLoss)} dB`); text('power', `${(100 * result.reflectedPower).toFixed(2)}%`);
                text('admittance', isOpen(y) ? 'Short circuit (Y → ∞)' : `${fmt(y.re * 1000)} ${y.im < 0 ? '−' : '+'} j${fmt(Math.abs(y.im) * 1000)} mS`);
                const body = el('steps'); body.replaceChildren();
                currentPoints.forEach((p, i) => {
                    const row = document.createElement('tr');
                    const c = i ? elements[i - 1] : null, units = c ? (c.kind === 'R' ? 'Ω' : c.kind === 'L' ? 'nH' : 'pF') : '', scale = c ? (c.kind === 'R' ? 1 : c.kind === 'L' ? 1e-9 : 1e-12) : 1;
                    [p.label, fmtZ(p.z), fmt(p.magnitude), `${fmt(p.returnLoss)} dB`, ''].forEach(value => {const td = document.createElement('td'); td.textContent = value; row.appendChild(td);});
                    if (i) {
                        const input = document.createElement('input'); input.type = 'number'; input.min = '0'; input.step = 'any'; input.value = Number((c.value / scale).toPrecision(8)); input.style.width = '7rem'; input.setAttribute('aria-label', `Element ${i} value in ${units}`);
                        input.onchange = () => {c.value = Number.parseFloat(input.value) * scale; update();};
                        const label = document.createElement('span'); label.textContent = ' ' + units + ' '; row.lastChild.appendChild(input); row.lastChild.appendChild(label);
                        const b = document.createElement('button'); b.type = 'button'; b.textContent = 'Remove'; b.setAttribute('aria-label', `Remove matching element ${i}`); b.onclick = () => {elements.splice(i - 1, 1); update();}; row.lastChild.appendChild(b);
                    }
                    body.appendChild(row);
                });
                el('error').hidden = true; draw();
            } catch (e) {
                text('error', e.message); el('error').hidden = false; currentPoints = [];
                for (const id of ['result-z', 'gamma', 'swr', 'rl', 'power', 'admittance']) text(id, '—');
                el('steps').replaceChildren(); draw();
            }
        }
        api.ui = {
            update,
            add() {try {const kind = el('kind').value, c = {kind, connection: el('connection').value, value: num('value') * (kind === 'R' ? 1 : kind === 'L' ? 1e-9 : 1e-12)}; componentImpedance(c, state().f); if (elements.length >= 24) throw new RangeError('At most 24 matching elements.'); elements.push(c); update();} catch (e) {text('error', e.message); el('error').hidden = false;}},
            units() {text('units', el('kind').value === 'R' ? 'Ω' : el('kind').value === 'L' ? 'nH' : 'pF');},
            reset() {elements = []; update();},
            preset(r, x) {el('r').value = r; el('x').value = x; elements = []; update();},
            init() {
                if (observer) observer.disconnect(); elements = []; currentPoints = [];
                const canvas = el('chart');
                observer = new ResizeObserver(() => {if (canvas.isConnected) draw(); else observer.disconnect();}); observer.observe(canvas);
                canvas.onclick = event => {
                    if (!frame) return; const rect = canvas.getBoundingClientRect();
                    const g = {re: ((event.clientX - rect.left) / rect.width * frame.size - frame.center) / frame.radius, im: (frame.center - (event.clientY - rect.top) / rect.height * frame.size) / frame.radius};
                    if (Math.hypot(g.re, g.im) >= .9999) return;
                    try {const z = impedance(g, state().z0); el('r').value = Number(z.re.toPrecision(6)); el('x').value = Number(z.im.toPrecision(6)); elements = []; update();} catch (e) {text('error', e.message); el('error').hidden = false;}
                };
                api.ui.units(); update();
            }
        };
        window.addEventListener('themeChanged', () => {if (el('chart')) draw();});
    }
    return api;
});
