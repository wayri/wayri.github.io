(() => {
    'use strict';
    const TAU = Math.PI * 2, rad = Math.PI / 180;
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const fallbackTargets = [
        ['solar', 'Sunflower Solar Fields', 'infra', .23, .42], ['wind', 'Crescent Wind Coast', 'infra', .72, .31],
        ['hydro', 'Blue Gorge Hydropower', 'infra', .61, .63], ['city', 'Aurora City Grid', 'infra', .43, .55],
        ['reef', 'Turquoise Reef', 'reef', .79, .72], ['volcano', 'Ember Volcano', 'mountain', .14, .67],
        ['delta', 'Silver River Delta', 'river', .49, .29], ['desert', 'Golden Dune Sea', 'desert', .35, .76],
        ['ice', 'Polar Ice Spiral', 'ice', .57, .12], ['island', 'Jade Island Chain', 'island', .88, .48],
        ['forest', 'Emerald Rainforest', 'forest', .31, .24], ['crater', 'Ancient Impact Basin', 'crater', .66, .83]
    ].map(t => ({ id: t[0], name: t[1], kind: t[2], x: t[3], y: t[4] }));
    let chartState, history = [], lastSample = -1;
    function label(c, value, x, y, color, size = 11, align = 'left') {
        c.fillStyle = color; c.font = `${size}px 'Courier New', monospace`; c.textAlign = align; c.fillText(value, x, y);
    }
    function box(c, x, y, w, h, color, radius = 3) {
        c.fillStyle = color; c.beginPath(); c.roundRect(x, y, Math.max(0, w), Math.max(0, h), radius); c.fill();
    }
    function path(c, points, color, line = 1, fill = false) {
        c.beginPath(); points.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]));
        if (fill) { c.closePath(); c.fillStyle = color; c.fill(); }
        else { c.strokeStyle = color; c.lineWidth = line; c.stroke(); }
    }
    function circle(c, x, y, r, color, stroke = false) {
        c.beginPath(); c.arc(x, y, r, 0, TAU); c.fillStyle = color; c.strokeStyle = color; stroke ? c.stroke() : c.fill();
    }
    function rover(c, p, time, fold = 0) {
        // The road rover retains its four battery cells and wheels in flight.
        for (const side of [-1, 1]) {
            c.save(); c.rotate(side * fold); box(c, side < 0 ? -25 : 0, -12, 25, 25, p.ink, 5);
            for (let i = 0; i < 2; i++) box(c, (side < 0 ? -21 : 4) + i * 10, -8, 7, 16, p.accent, 1);
            circle(c, side * 17, 15, 8, '#17242d'); c.lineWidth = 2; circle(c, side * 17, 15, 4, p.accent, true);
            path(c, [[side * 17, 15], [side * 17 + Math.cos(time * 3) * 4, 15 + Math.sin(time * 3) * 4]], p.accent);
            if (side > 0) { box(c, 9, -23, 13, 12, p.ink, 4); box(c, 16, -20, 4, 4, p.accent, 1); }
            c.restore();
        }
        box(c, -35, -6, 12, 12, '#8c9da5', 2); box(c, -39, -8, 5, 16, p.ink, 1);
    }
    function space(c, w, h, p, altitude, time) {
        const blend = clamp(altitude / 100, 0, 1), sky = c.createLinearGradient(0, 0, 0, h);
        sky.addColorStop(0, blend > .45 ? '#071324' : '#294760'); sky.addColorStop(1, '#437f9b');
        c.fillStyle = sky; c.fillRect(0, 0, w, h);
        c.globalAlpha = .2 + .7 * blend;
        for (let i = 0; i < 70; i++) circle(c, (i * 137.51) % w, (i * 73.81) % (h * .8), i % 7 === 0 ? 1.3 : .65, '#deeced');
        c.globalAlpha = 1;
        const cy = h * 2.9, radius = h * 2.15 - clamp(altitude, 0, 500) * .11;
        c.save(); c.shadowColor = '#79d7f2'; c.shadowBlur = 24; circle(c, w * .45, cy, radius + 5, '#75bdd1'); c.shadowBlur = 0;
        circle(c, w * .45, cy + 4, radius, '#244d64');
        c.beginPath(); c.arc(w * .45, cy + 4, radius, 0, TAU); c.clip();
        for (let i = 0; i < 16; i++) {
            const x = (i * 111 - time * 2) % (w + 160) - 80, y = h * .77 + Math.sin(i * 2.7) * 43;
            c.fillStyle = i % 3 ? '#477f75' : '#d2d5ae'; c.beginPath(); c.ellipse(x, y + i % 4 * 17, 68, 15, -.22, 0, TAU); c.fill();
        }
        c.restore();
    }
    function flight(c, w, h, s, p, options) {
        const f = Object.assign({ altitude: 0, pitch: 90, targetPitch: 90, vertical: 0, horizontal: 0, throttle: 0, burnLeft: 0, elapsed: 0 }, s.flight);
        const t = Number(s.time) || 0, failed = s.status === 'lost', ft = Math.max(0, options.failureTime || 0), reason = s.reason;
        space(c, w, h, p, f.altitude, t);
        const x = w * .47, y = h * .45, scale = clamp(w / 600, .83, 1.15);
        c.save(); c.setLineDash([3, 7]);
        path(c, Array.from({ length: 30 }, (_, i) => [x - (29 - i) * (2 + f.horizontal * 2), y + (29 - i) * (2 + Math.max(0, f.vertical) * 1.7)]), '#759bb4'); c.setLineDash([]); c.restore();
        // Pitch guides share the actual vehicle origin, so a turn is directly readable.
        for (const [angle, color, dashed] of [[f.targetPitch, '#8ce5b2', true], [Math.atan2(f.vertical, Math.max(.0001, f.horizontal)) / rad, '#7dcaf4', false]]) {
            const dx = Math.cos(angle * rad), dy = -Math.sin(angle * rad), r = 65;
            c.save(); if (dashed) c.setLineDash([5, 4]); path(c, [[x, y], [x + dx * r, y + dy * r]], color, 1.5); c.restore();
            circle(c, x + dx * r, y + dy * r, 5, color, true);
        }
        label(c, `TARGET ${Math.round(f.targetPitch)}°`, 14, 22, '#8ce5b2');
        label(c, `PITCH ${Math.round(f.pitch)}°`, 14, 39, '#f2dfac');
        label(c, '○ PROGRADE', 14, 56, '#7dcaf4', 10);
        label(c, `${Math.max(0, f.altitude).toFixed(1)} km`, w - 14, 22, '#e0edf3', 12, 'right');
        c.save();
        const escape = failed && reason === 'escape';
        c.translate(x + (escape ? Math.min(w * .35, ft * 35) : 0), y + (failed && reason === 'ballistic' ? Math.min(h * .47, ft * ft * 21) : escape ? -ft * 18 : 0));
        c.scale(scale * (escape ? Math.max(.08, Math.exp(-ft * .37)) : 1), scale * (escape ? Math.max(.08, Math.exp(-ft * .37)) : 1));
        c.rotate(-f.pitch * rad + (failed && reason === 'ballistic' ? ft * .6 : 0));
        if (!failed && f.throttle > .01 && f.burnLeft > 0) {
            const length = 18 + f.throttle * 52 + Math.sin(t * 49) * 6;
            path(c, [[-38, -7], [-38 - length, 0], [-38, 7]], '#ec8d55', 1, true);
            path(c, [[-38, -4], [-38 - length * .7, 0], [-38, 4]], '#fff0ac', 1, true);
        }
        if (failed && (reason === 'burnup' || reason === 'ballistic')) {
            for (let i = 0; i < 16; i++) {
                const spread = reason === 'burnup' ? Math.min(85, ft * 32) : 8;
                const px = Math.sin(i * 21) * spread, py = Math.cos(i * 17) * spread;
                path(c, [[px - 5, py - 2], [px - 55 - Math.sin(t * 12 + i) * 18, py], [px - 5, py + 3]], i % 2 ? '#ef8851' : '#fcd785', 1, true);
                box(c, px, py, 5, 4, p.ink, 1);
            }
        }
        if (!(failed && reason === 'burnup' && ft > .8)) rover(c, p, t, failed && reason === 'maxq' ? clamp(ft / 1.5, 0, 1) * .85 : 0);
        c.restore();
        const caption = failed ? ({ maxq: 'STRUCTURAL FAILURE · MAX Q', burnup: 'THERMAL BREAKUP', escape: 'SIGNAL LOST · ESCAPE TRAJECTORY', ballistic: 'BALLISTIC REENTRY' }[reason] || 'MISSION LOST') : s.phase === 'launch' ? 'BOOSTER ARMED · READY FOR ASCENT' : f.burnLeft > 0 ? 'POWERED ASCENT' : 'COASTING · BOOSTER SPENT';
        label(c, caption, w / 2, h - 19, failed ? '#ffc08a' : '#dbe9e8', w < 430 ? 10 : 12, 'center');
    }
    function island(c, x, y, rx, ry, seed, color) {
        const pts = Array.from({ length: 30 }, (_, i) => { const a = i / 30 * TAU, k = 1 + .13 * Math.sin(i * 2.3 + seed) + .09 * Math.cos(i * 1.7 + seed); return [x + Math.cos(a) * rx * k, y + Math.sin(a) * ry * k]; });
        path(c, pts, '#91b5a0', 1, true); c.save(); c.translate(x, y); c.scale(.9, .85); path(c, pts.map(v => [v[0] - x, v[1] - y]), color, 1, true); c.restore();
    }
    function landmark(c, t, time) {
        const green = '#315e49', light = '#7d9a66', sand = '#c9b67f', blue = '#649cbb';
        island(c, 0, 0, 44, 30, t.x * 80, t.kind === 'desert' ? sand : t.kind === 'ice' ? '#d9e9e5' : light);
        if (t.id === 'solar') {
            for (let r = 0; r < 5; r++) for (let col = 0; col < 7; col++) { box(c, -29 + col * 8, -17 + r * 7, 6, 5, '#254962', .5); path(c, [[-26 + col * 8, -17 + r * 7], [-26 + col * 8, -12 + r * 7]], '#76a6ba', .5); }
            path(c, [[-34, 21], [28, 21], [37, 9]], '#d8d1ad', 2);
        } else if (t.id === 'wind') {
            for (let i = 0; i < 6; i++) {
                const x = -27 + i * 11, y = 9 + Math.sin(i) * 6;
                path(c, [[x, y], [x, y - 18]], '#e7e8d2', 1.3);
                for (let j = 0; j < 3; j++) { const a = time * .6 + j * TAU / 3; path(c, [[x, y - 18], [x + Math.cos(a) * 8, y - 18 + Math.sin(a) * 8]], '#f1eedb', 1.3); }
            }
        } else if (t.id === 'hydro') {
            path(c, [[-17, -29], [-7, -9], [-14, 8], [12, 30]], blue, 13);
            path(c, [[-23, -2], [12, 3]], '#d5d8cf', 7); path(c, [[-19, 3], [10, 8]], '#6f8991', 2);
            for (let i = 0; i < 4; i++) path(c, [[-14 + i * 5, 5], [-11 + i * 5, 16]], '#bbeced', 1);
        } else if (t.id === 'city') {
            for (let i = -2; i <= 2; i++) { path(c, [[-32, i * 10], [32, i * 10]], '#b9b79d', 2); path(c, [[i * 12, -22], [i * 12, 23]], '#b9b79d', 2); }
            for (let i = 0; i < 29; i++) { const x = (i * 17 % 55) - 29, y = (i * 23 % 37) - 21; box(c, x, y, 5, 4, i % 3 ? '#c5c9b8' : '#e3d697', .5); box(c, x - 1, y - 3, 5, 3, '#607b7c', .5); }
        } else if (t.kind === 'mountain') {
            for (let i = 0; i < 5; i++) path(c, [[-33 + i * 13, 18], [-18 + i * 8, -22 + i % 2 * 10], [7 + i * 9, 18]], i % 2 ? '#5f6c60' : '#7e7c66', 1, true);
            c.fillStyle = '#d98651'; c.beginPath(); c.ellipse(-2, -13, 7, 3, 0, 0, TAU); c.fill();
        } else if (t.kind === 'river') {
            for (let i = -2; i <= 2; i++) path(c, [[-10, -29], [-4, -10], [i * 9, 12], [i * 15, 29]], '#81b5c3', 2.4);
        } else if (t.kind === 'desert') {
            for (let i = 0; i < 6; i++) { c.beginPath(); c.ellipse(-26 + i * 11, Math.sin(i) * 11, 7, 18, .6, .1, Math.PI); c.strokeStyle = '#a18b59'; c.lineWidth = 2; c.stroke(); }
        } else if (t.kind === 'ice') {
            for (let i = 0; i < 7; i++) { c.beginPath(); c.ellipse(0, 0, 4 + i * 5, 2 + i * 3, i * .4, 0, Math.PI * 1.6); c.strokeStyle = '#95bcc8'; c.lineWidth = 1.2; c.stroke(); }
        } else if (t.kind === 'crater') {
            for (let i = 0; i < 4; i++) { c.beginPath(); c.ellipse(0, 0, 30 - i * 6, 21 - i * 4, -.2, 0, TAU); c.strokeStyle = i % 2 ? '#66775c' : '#c2b68c'; c.lineWidth = 3; c.stroke(); }
        } else if (t.kind === 'reef' || t.kind === 'island') {
            for (let i = 0; i < 7; i++) { const x = Math.cos(i * 2.5) * 27, y = Math.sin(i * 2.5) * 18; island(c, x, y, 9, 5, i, t.kind === 'reef' ? '#5cbbb0' : green); }
        } else {
            for (let i = 0; i < 44; i++) circle(c, i * 19 % 66 - 33, i * 29 % 39 - 19, 3 + i % 3, i % 3 ? green : '#477950');
            path(c, [[-37, 7], [-15, 13], [3, 8], [28, 15]], '#729b9a', 2);
        }
    }
    function orbit(c, w, h, s, p, options) {
        const o = Object.assign({ cameraX: .5, cameraY: .5, zoom: 1, time: 0 }, s.orbit), z = o.zoom;
        const targets = (window.PowerRunner && window.PowerRunner.TARGETS) || fallbackTargets;
        const sx = x => (x - o.cameraX) * w * z + w / 2, sy = y => (y - o.cameraY) * h * z + h / 2;
        const ocean = c.createLinearGradient(0, 0, w, h); ocean.addColorStop(0, '#193f54'); ocean.addColorStop(1, '#37788a'); c.fillStyle = ocean; c.fillRect(0, 0, w, h);
        c.save(); c.globalAlpha = .14;
        for (let i = 0; i < 55; i++) { const y = sy(i / 50); path(c, [[0, y], [w, y - 9]], '#9edbd4', 1); } c.restore();
        c.save(); c.translate(sx(0), sy(0)); c.scale(w * z, h * z);
        island(c, .34, .43, .22, .32, 2, '#56805c'); island(c, .68, .61, .17, .3, 8, '#6d8d63'); island(c, .62, .17, .16, .08, 10, '#d0ded5');
        c.restore();
        for (const t of targets) {
            const x = sx(t.x), y = sy(t.y); if (x < -160 || x > w + 160 || y < -140 || y > h + 140) continue;
            c.save(); c.translate(x, y); const artScale = z * Math.min(w / 850, h / 370) * .8; c.scale(artScale, artScale); landmark(c, t, o.time); c.restore();
            if (z > 1.7 || t.id === options.selectedTarget) {
                const selected = t.id === options.selectedTarget; circle(c, x, y, selected ? 9 : 3, selected ? p.accent : '#e0e9d5', true);
                const tx = clamp(x, 85, w - 85), ty = clamp(y + 35 * Math.min(z, 2), 45, h - 26);
                label(c, t.name, tx, ty, '#f1f0d9', w < 430 ? 9 : 10, 'center');
            }
        }
        const selected = targets.find(t => t.id === options.selectedTarget);
        if (selected) {
            const dx = sx(selected.x) - w / 2, dy = sy(selected.y) - h / 2, distance = Math.hypot(dx, dy);
            if (distance > 58) { const a = Math.atan2(dy, dx), r = Math.min(w * .3, h * .29); c.save(); c.translate(w / 2 + Math.cos(a) * r, h / 2 + Math.sin(a) * r); c.rotate(a); path(c, [[9, 0], [-6, -5], [-6, 5]], p.accent, 1, true); c.restore(); }
        }
        c.save(); c.strokeStyle = '#dfebd8'; c.lineWidth = 1; c.globalAlpha = .8;
        for (const dx of [-1, 1]) for (const dy of [-1, 1]) path(c, [[w / 2 + dx * 29, h / 2 + dy * 43], [w / 2 + dx * 43, h / 2 + dy * 43], [w / 2 + dx * 43, h / 2 + dy * 29]], '#dfebd8');
        path(c, [[w / 2 - 7, h / 2], [w / 2 + 7, h / 2]], '#dfebd8'); path(c, [[w / 2, h / 2 - 7], [w / 2, h / 2 + 7]], '#dfebd8'); c.restore();
        box(c, 10, 10, 166, 38, '#102f40', 4); label(c, 'ORBITAL SURVEY / FICTIONAL', 19, 25, '#d1e5df', 9); label(c, `${z.toFixed(1)}×  ·  ${(o.steady || 0) >= 1.2 ? 'CAMERA STEADY' : 'STABILIZING'}`, 19, 40, p.accent, 10);
        label(c, 'N ↑', w - 18, 25, '#e3e9dc', 11, 'right');
        const length = Math.min(w * .16, 100); path(c, [[w - length - 16, h - 23], [w - 16, h - 23]], '#e3e9dc', 2); label(c, 'SURVEY SCALE', w - 16, h - 10, '#e3e9dc', 8, 'right');
        if (options.flash > 0) { c.fillStyle = `rgba(255,250,227,${clamp(options.flash, 0, 1) * .8})`; c.fillRect(0, 0, w, h); }
    }
    function grid(c, w, h, s, p) {
        const g = Object.assign({ time: 0, demand: 60, generation: 60, storage: 65, frequency: 50, solar: 12, wind: 6, dispatch: 42, batteryCommand: 0, stability: 100, progress: 0 }, s.grid);
        if (chartState !== s.grid || g.time < lastSample) { chartState = s.grid; history = []; lastSample = -1; }
        if (g.time - lastSample >= .2) { history.push([g.time, g.demand, g.generation]); if (history.length > 150) history.shift(); lastSample = g.time; }
        c.fillStyle = p.sky; c.fillRect(0, 0, w, h);
        const healthy = Math.abs(g.generation - g.demand) < 9 && s.status !== 'lost', status = healthy ? '#58a68b' : '#d18261';
        label(c, 'AURORA / LIVE POWER DISPATCH', 16, 23, p.ink, w < 430 ? 10 : 12);
        label(c, `${g.frequency.toFixed(2)} Hz`, w - 16, 44, status, 13, 'right');
        label(c, `${healthy ? '● BALANCED' : s.status === 'lost' ? '● BLACKOUT' : '● LOAD IMBALANCE'}`, 16, 43, status, 10);
        const y = h * .38, left = w * .15, mid = w * .49, right = w * .82;
        const flow = (a, b, yy, color, reverse = false) => {
            path(c, [[a, yy], [b, yy]], color, 2);
            for (let i = 0; i < 5; i++) { const pos = ((g.time * .35 * (reverse ? -1 : 1) + i / 5) % 1 + 1) % 1; circle(c, a + (b - a) * pos, yy, 2, color); }
        };
        flow(left + 24, mid - 26, y, status); flow(mid + 25, right - 27, y, status);
        flow(left + 24, mid - 26, y + 43, p.accent); path(c, [[mid - 26, y + 43], [mid, y + 43], [mid, y + 15]], p.accent, 2);
        // Source station, photovoltaic roof and a moving wind rotor.
        box(c, left - 23, y - 24, 46, 34, p.mountain); path(c, [[left - 27, y - 25], [left, y - 39], [left + 27, y - 25]], p.edge, 2);
        box(c, left - 15, y - 17, 30, 18, '#355c72', 1);
        for (let i = 0; i < 3; i++) path(c, [[left - 10 + i * 10, y - 17], [left - 10 + i * 10, y + 1]], '#88b2bf');
        const turbineX = left - 18; path(c, [[turbineX, y + 51], [turbineX, y + 25]], p.edge, 2);
        for (let i = 0; i < 3; i++) { const a = g.time + i * TAU / 3; path(c, [[turbineX, y + 25], [turbineX + Math.cos(a) * 12, y + 25 + Math.sin(a) * 12]], p.edge, 2); }
        label(c, `${Math.round(g.solar + g.wind)} MW`, left, y + 72, p.ink, 10, 'center');
        box(c, mid - 25, y - 25, 50, 44, p.ink, 6); box(c, mid - 10, y - 30, 20, 5, p.ink, 1);
        box(c, mid - 19, y - 18, 38 * clamp(g.storage / 100, 0, 1), 30, p.accent, 2);
        label(c, `${Math.round(g.storage)}%`, mid, y + 38, p.ink, 12, 'center');
        label(c, g.batteryCommand > .05 ? 'DISCHARGING' : g.batteryCommand < -.05 ? 'CHARGING' : 'STORAGE', mid, y + 54, p.muted, 9, 'center');
        for (let i = 0; i < 6; i++) {
            const x = right - 28 + i * 11, bh = 19 + i * 13 % 32;
            box(c, x, y + 16 - bh, 9, bh, p.mountain, 1);
            for (let row = 0; row < 4; row++) { c.globalAlpha = s.status === 'lost' ? .1 : healthy ? 1 : .45 + .3 * Math.sin(g.time * 7 + i); box(c, x + 2, y + 11 - row * 7, 2, 3, p.accent, 0); c.globalAlpha = 1; }
        }
        label(c, `${Math.round(g.demand)} MW`, right, y + 38, p.ink, 12, 'center'); label(c, 'CITY DEMAND', right, y + 54, p.muted, 9, 'center');
        const top = h * .67, bottom = h - 30, chartW = w - 40;
        c.save(); c.beginPath(); c.rect(20, top, chartW, bottom - top); c.clip();
        for (let i = 0; i < 4; i++) { c.globalAlpha = .2; path(c, [[20, top + i * (bottom - top) / 3], [w - 20, top + i * (bottom - top) / 3]], p.muted); c.globalAlpha = 1; }
        const points = index => history.map(v => [w - 20 - (g.time - v[0]) / 30 * chartW, bottom - clamp(v[index], 0, 110) / 110 * (bottom - top)]);
        if (history.length > 1) { path(c, points(1), p.muted, 2); path(c, points(2), status, 2); } c.restore();
        label(c, 'DEMAND', 20, top - 8, p.muted, 9); label(c, 'GENERATION', 85, top - 8, status, 9);
        label(c, `DISPATCH ${Math.round(g.dispatch)} MW`, w - 20, top - 8, p.ink, 9, 'right');
        box(c, 20, h - 16, w - 40, 3, p.mountain, 1); box(c, 20, h - 16, (w - 40) * clamp(g.progress / 32, 0, 1), 3, status, 1);
    }
    function returning(c, w, h, s, p) {
        const t = Number(s.time) || 0; space(c, w, h, p, 20, t);
        const groundY = h * .8; box(c, 0, groundY, w, h - groundY, p.soil, 0); path(c, [[0, groundY], [w, groundY]], p.edge, 3);
        for (let i = 0; i < 14; i++) box(c, i * w / 12 - t * 8 % (w / 12), groundY + 25, 20, 2, p.edge, 0);
        const x = w * .5, y = groundY - 22;
        c.save(); c.translate(x, y); rover(c, p, t); c.restore();
        c.strokeStyle = '#c1dedb'; c.lineWidth = 1; c.beginPath(); c.ellipse(x, y - 64, 58, 29, 0, Math.PI, TAU); c.stroke();
        path(c, [[x - 58, y - 64], [x - 20, y - 13]], '#c1dedb'); path(c, [[x + 58, y - 64], [x + 20, y - 13]], '#c1dedb');
        label(c, 'SURVEY SAVED · CITY POWER STABLE', w / 2, 31, '#e0ece1', w < 430 ? 10 : 13, 'center');
        label(c, 'BACK TO THE ROAD', w / 2, h - 16, p.ink, 11, 'center');
    }
    window.PowerMissionScenes = { draw(ctx, width, height, state, palette, options = {}) {
        if (!ctx || !state || !palette || width <= 0 || height <= 0) return;
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, width, height); ctx.clip();
        if (state.phase === 'orbit') orbit(ctx, width, height, state, palette, options);
        else if (state.phase === 'grid') grid(ctx, width, height, state, palette);
        else if (state.phase === 'return') returning(ctx, width, height, state, palette);
        else flight(ctx, width, height, state, palette, options);
        ctx.restore();
    } };
})();
