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
    function carrier(c, p, time, throttle = 0, heat = 0, fold = 0, hatch = false) {
        // Local +X is the nose. The same carrier is used at the loading bay and in flight.
        if (throttle > .01) {
            const length = 34 + throttle * 100 + Math.sin(time * 41) * 10;
            path(c, [[-57, -11], [-57 - length, 0], [-57, 11]], '#ec8753', 1, true);
            path(c, [[-57, -6], [-57 - length * .66, 0], [-57, 6]], '#fff0b5', 1, true);
            path(c, [[-57, -2], [-57 - length * .4, 0], [-57, 2]], '#e7fbff', 1, true);
        }
        c.save(); c.rotate(-fold * .4);
        path(c, [[-52, -18], [0, -18], [0, 18], [-52, 18]], '#e5e9df', 1, true);
        c.save(); c.rotate(fold);
        path(c, [[0, -18], [25, -18], [61, 0], [25, 18], [0, 18]], '#e5e9df', 1, true);
        path(c, [[25, -18], [61, 0], [25, 18], [31, 0]], '#8babb6', 1, true);
        box(c, 13, -13, 6, 26, p.accent, 1); c.restore();
        path(c, [[-44, -18], [-62, -37], [-60, -13], [-42, -7]], p.accent, 1, true);
        path(c, [[-44, 18], [-62, 37], [-60, 13], [-42, 7]], p.accent, 1, true);
        box(c, -30, -15, 41, 30, '#1c3646', 4);
        c.save(); c.translate(-6, 0); c.scale(.44, .44); rover(c, p, time, fold); c.restore();
        if (!hatch) { c.globalAlpha = .35; box(c, -28, -13, 37, 26, '#7fced5', 3); c.globalAlpha = 1; }
        box(c, -58, -12, 8, 24, '#48606d', 1);
        if (heat > 15) {
            c.save(); c.globalAlpha = clamp(heat / 120, 0, .8); c.shadowColor = '#ff6c30'; c.shadowBlur = 20;
            path(c, [[-35, -23], [27, -23], [68, 0], [27, 23], [-35, 23]], '#ff9b50', 3); c.restore();
        }
        c.restore();
    }
    function drawRoad(c, w, h, s, p, options = {}) {
        const engine = window.PowerRunner, ground = engine.ground, goal = engine.GOAL;
        const scale = clamp(w / 1400, .45, .9), anchor = w * .42;
        const progress = s.phase === 'boarding' ? clamp((s.boarding || {}).progress || 0, 0, 1) : 0;
        const cam = s.x - anchor / scale, base = h * .76, t = Number(s.time) || 0;
        const sx = x => (x - cam) * scale, sy = x => base + ground(x) * scale;
        const sky = c.createLinearGradient(0, 0, 0, h);
        sky.addColorStop(0, p.dark ? '#101c2b' : '#d9eef7'); sky.addColorStop(1, p.dark ? '#36505a' : '#f0e9d4');
        c.fillStyle = sky; c.fillRect(0, 0, w, h);
        circle(c, w * .79 - Math.sin(s.x / 9000) * 45, h * .19, 27, p.dark ? '#c5d9d1' : '#fff5c9');
        for (let layer = 0; layer < 3; layer++) {
            const pts = [[0, h]];
            for (let x = 0; x <= w + 12; x += 12) { const world = x + cam * (.08 + layer * .1); pts.push([x, h * (.4 + layer * .105) + Math.sin(world / (150 - layer * 25)) * (30 - layer * 4) + Math.sin(world / 53) * 11]); }
            pts.push([w + 12, h]); path(c, pts, [p.horizon, p.mountain, p.edge][layer], 1, true);
        }
        // Landmarks make the journey readable even before the loading gantry comes into view.
        for (let i = Math.floor(cam / 420) - 1; i < (cam + w / scale) / 420 + 1; i++) {
            if (i < 0) continue;
            const x = sx(i * 420), y = h * .62 + Math.sin(i * 1.7) * 10;
            c.save(); c.globalAlpha = .65;
            if (i % 3 === 0) {
                path(c, [[x, y], [x, y - 55]], p.mountain, 3);
                for (let j = 0; j < 3; j++) { const a = t * .65 + j * TAU / 3; path(c, [[x, y - 55], [x + Math.cos(a) * 25, y - 55 + Math.sin(a) * 25]], p.mountain, 3); }
            } else if (i % 3 === 1) {
                for (let j = 0; j < 4; j++) { path(c, [[x + j * 17, y - 8], [x + j * 17 + 12, y - 25], [x + j * 17 + 28, y - 25], [x + j * 17 + 16, y - 8]], '#385f75', 1, true); }
            } else {
                box(c, x, y - 25, 49, 25, p.mountain, 1); box(c, x + 8, y - 47, 8, 22, p.mountain, 1); box(c, x + 28, y - 38, 6, 13, p.mountain, 1);
            } c.restore();
        }
        const terrain = [[-5, h]];
        for (let x = -5; x <= w + 10; x += 5) terrain.push([x, sy(cam + x / scale)]);
        terrain.push([w + 10, h]); path(c, terrain, p.soil, 1, true); path(c, terrain.slice(1, -1), p.edge, 3);
        for (let i = Math.floor(cam / 100); i < (cam + w / scale) / 100; i++) {
            const x = sx(i * 100), y = sy(i * 100); path(c, [[x, y + 13], [x + 15 * scale, y + 13]], p.edge, 2);
        }
        for (const item of s.entities || []) {
            const x = sx(item.x), y = sy(item.x);
            if (item.used || x < -70 || x > w + 70) continue;
            c.save(); c.translate(x, y); c.scale(scale, scale);
            if (item.type === 'pack') {
                c.translate(0, -item.lift + Math.sin(t * 4 + item.x) * 3);
                c.globalAlpha = .16; circle(c, 0, 0, 26, p.accent); c.globalAlpha = 1;
                box(c, -12, -16, 24, 32, p.accent, 4); box(c, -5, -20, 10, 5, p.accent, 1);
                path(c, [[2, -11], [-6, 2], [0, 2], [-2, 12], [7, -2], [1, -2]], p.sky, 1, true);
            } else if (item.type === 'gate') {
                path(c, [[-34, 0], [-34, -103], [34, -103], [34, 0]], '#a4afb0', 5);
                box(c, -34, -103, 68, 29, '#b8614b', 2);
                for (let j = 0; j < 5; j++) path(c, [[-27 + j * 12, -100], [-16 + j * 12, -77]], '#f5ce76', 4);
                label(c, 'STAY LOW', 0, -116, p.ink, 10, 'center');
            } else if (item.type === 'slick') {
                c.fillStyle = '#5192ac'; c.beginPath(); c.ellipse(0, -2, 40, 5, 0, 0, TAU); c.fill();
                path(c, [[-29, -3], [-9, -5], [13, -2], [29, -4]], '#a4d4dc', 2); label(c, 'COOLANT', 0, 20, p.muted, 10, 'center');
            } else if (item.type === 'solar') {
                path(c, [[-44, -2], [-28, -15], [44, -15], [28, -2]], '#367993', 1, true);
                for (let j = 0; j < 6; j++) path(c, [[-32 + j * 12, -13], [-39 + j * 12, -3]], '#9cdde2');
                label(c, 'CHARGE LANE', 0, 22, p.accent, 10, 'center');
            } else if (item.type === 'drone') {
                const hover = -150 + Math.sin(t * 3 + item.x) * 6, active = !!item.active;
                if (active) {
                    c.save(); c.globalAlpha = .22 + Math.sin(t * 18) * .07;
                    path(c, [[-8, hover + 12], [8, hover + 12], [24, 0], [-24, 0]], '#f38a59', 1, true); c.restore();
                    path(c, [[0, hover + 12], [0, -2]], '#f9b67f', 1);
                }
                path(c, [[-24, hover], [24, hover]], '#9baec0', 4);
                circle(c, -24, hover, 10, '#9baec0', true); circle(c, 24, hover, 10, '#9baec0', true);
                box(c, -14, hover - 10, 28, 22, '#294657', 6); circle(c, 0, hover + 6, 4, active ? '#ff9962' : '#93d8ac');
                label(c, active ? 'SCAN · WAIT' : 'CLEAR · GO', 0, hover - 25, active ? '#f0ad7b' : '#8ac9a4', 10, 'center');
            } else if (item.type === 'crate') {
                box(c, -20, -37, 40, 37, '#ae8052', 2);
                path(c, [[-17, -34], [17, -3], [-17, -3], [17, -34]], '#e2bf7e', 3); label(c, 'JUMP', 0, -49, p.ink, 10, 'center');
            } else {
                box(c, -15, -25, 30, 25, '#b8614b', 4);
                const bolt = [[2, -24], [-8, -10], [-1, -10], [-3, -1], [9, -16], [1, -16]]; path(c, bolt, '#ffe0a3', 1, true);
                for (let j = 0; j < 3; j++) { const a = t * 5 + j * 2; path(c, [[Math.sin(a) * 10, -27], [Math.sin(a + 1) * 16, -39], [Math.sin(a + 2) * 19, -44]], '#edb957', 1); }
            } c.restore();
        }
        const shipX = sx(goal), shipGround = sy(goal);
        if (shipX < w + 160 && shipX > -180) {
            box(c, shipX - 18 * scale, shipGround - 177 * scale, 12 * scale, 177 * scale, '#667d87', 1);
            for (let i = 0; i < 5; i++) path(c, [[shipX - 18 * scale, shipGround - i * 34 * scale], [shipX - 6 * scale, shipGround - (i + 1) * 34 * scale]], '#a4bab9', 2);
            c.save(); c.translate(shipX + 33 * scale, shipGround - 75 * scale); c.rotate(-Math.PI / 2); c.scale(1.08 * scale, 1.08 * scale); carrier(c, p, t, 0, 0, 0, true); c.restore();
            path(c, [[shipX - 93 * scale, shipGround], [shipX + 24 * scale, shipGround - 61 * scale]], '#bac9c4', 6 * scale);
            path(c, [[shipX - 93 * scale, shipGround + 4], [shipX + 24 * scale, shipGround - 57 * scale]], p.accent, 2);
            label(c, 'ORBITAL CARRIER', shipX + 10, shipGround - 193 * scale, p.ink, 11, 'center');
            label(c, 'BRAKE · DOCK SLOWLY', clamp(shipX - 60, 100, w - 110), shipGround + 36, p.accent, 11, 'center');
        }
        for (const [i, chaser] of (s.chasers || []).entries()) {
            if (chaser.escaped) continue;
            const rawX = sx(chaser.x), x = clamp(rawX, 18, w + 40), color = ['#d48162', '#76b7ab', '#b69bd3'][i % 3];
            if (rawX < -25) { label(c, `← ${chaser.name} ${Math.round(Math.max(0, s.x - chaser.x) / 8)}m`, 12, 48 + i * 18, color, 10); continue; }
            const bob = Math.abs(Math.sin(t * (chaser.type === 'sprinter' ? 15 : 8) + i)) * 8;
            const y = sy(chaser.x) - bob;
            c.save(); c.translate(x, y); c.scale(scale, scale);
            if (chaser.type === 'jammer') {
                c.translate(0, -35); c.globalAlpha = .25 + .2 * Math.sin(t * 6); circle(c, 0, 0, 28 + Math.sin(t * 4) * 8, color, true); c.globalAlpha = 1;
                path(c, [[-25, -3], [25, -3]], color, 4); circle(c, -24, -3, 9, color, true); circle(c, 24, -3, 9, color, true);
            } else if (chaser.type === 'tracker') {
                for (let leg = 0; leg < 4; leg++) { const lx = -17 + leg * 11; path(c, [[lx, -12], [lx + Math.sin(t * 10 + leg) * 8, 1]], color, 4); }
            } else {
                for (let leg = 0; leg < 2; leg++) path(c, [[leg ? 10 : -10, -12], [Math.sin(t * 17 + leg * Math.PI) * 18, 2]], color, 5);
                if (chaser.state === 'sprint') for (let j = 0; j < 3; j++) path(c, [[-24 - j * 7, -13 - j * 6], [-43 - j * 7, -13 - j * 6]], color, 2);
            }
            box(c, -18, -38, 36, 28, color, 9); path(c, [[-12, -34], [-17, -49], [-3, -38], [10, -38], [17, -47], [14, -30]], color, 1, true);
            for (const eyeX of [-8, 6]) { box(c, eyeX, -30, 8, 9, '#f9f5e8', 2); box(c, eyeX + 4, -27, 3, 5, '#1d2832', 1); }
            label(c, chaser.name.toUpperCase(), 0, -61, color, 10, 'center');
            if (chaser.stun > 0) label(c, '✦ ✦ ✦', 0, -76, '#ffe4a4', 13, 'center'); c.restore();
        }
        let rx = anchor, ry = base + s.y * scale - 19 * scale;
        if (s.phase === 'boarding') { rx += 24 * progress * scale; ry -= progress * 65 * scale; }
        c.save(); c.translate(rx, ry); c.scale(scale, scale);
        if (s.grounded && !progress) c.rotate(Math.atan2(ground(s.x + 8) - ground(s.x - 8), 16) * .55);
        if (s.invulnerable > 0 && Math.floor(t * 15) % 2) c.globalAlpha = .45;
        if (s.mode === 'Boost' && s.status === 'running') {
            path(c, [[-38, -5], [-75 - Math.sin(t * 40) * 12, 0], [-38, 5]], p.accent, 1, true);
            for (let i = 0; i < 4; i++) path(c, [[-75 - (t * 200 + i * 27) % 120, 8 + i * 3], [-90 - (t * 200 + i * 27) % 120, 8 + i * 3]], p.accent, 1);
        }
        if (s.reason === 'dock-crash' && s.status === 'lost') {
            const ft = options.failureTime || 0; c.rotate(ft * 3);
            for (let i = 0; i < 18; i++) { const a = i * 2.4, r = 12 + ft * (40 + i * 6); circle(c, Math.cos(a) * r, Math.sin(a) * r, Math.max(1, 7 - ft * 3), i % 2 ? '#ffb665' : '#d76a48'); }
        }
        rover(c, p, s.x / 9); c.restore();
        if (s.mode === 'Brake' && s.grounded && s.speed > 20) for (let i = 0; i < 6; i++) { const age = (t * 5 + i / 6) % 1; c.globalAlpha = (1 - age) * .3; circle(c, rx - 20 - age * 70, ry + 12 - age * 12, 4 + age * 14, p.muted); } c.globalAlpha = 1;
        if (s.noticeTime > 0) label(c, s.notice, clamp(rx, 110, w - 110), ry - 66, s.notice.startsWith('+') ? p.accent : '#e6a077', w < 480 ? 10 : 12, 'center');
        label(c, 'POWER ROAD', 14, 23, p.ink, 12); label(c, `${Math.round(s.speed / 8)} m/s`, w - 14, 23, p.ink, 13, 'right');
        const journeyW = Math.min(240, w * .42), journeyX = (w - journeyW) / 2;
        box(c, journeyX, 17, journeyW, 3, p.mountain, 1); box(c, journeyX, 17, journeyW * clamp(s.x / goal, 0, 1), 3, p.accent, 1);
        label(c, s.phase === 'boarding' ? 'ROVER SECURED · BOARDING CARRIER' : s.roadStage === 'approach' ? 'SPACEPORT APPROACH · BRAKE BEFORE THE RAMP' : 'JUMP CRATES · STAY LOW UNDER GATES · FIND CHARGE', w / 2, h - 17, p.ink, w < 500 ? 8 : 11, 'center');
    }
    function space(c, w, h, p, altitude, time) {
        const blend = clamp(altitude / 100, 0, 1), sky = c.createLinearGradient(0, 0, 0, h);
        sky.addColorStop(0, `rgb(${Math.round(41*(1-blend)+3*blend)},${Math.round(71*(1-blend)+10*blend)},${Math.round(96*(1-blend)+22*blend)})`);
        sky.addColorStop(1, `rgb(${Math.round(67*(1-blend)+10*blend)},${Math.round(127*(1-blend)+25*blend)},${Math.round(155*(1-blend)+43*blend)})`);
        c.fillStyle = sky; c.fillRect(0, 0, w, h);
        c.globalAlpha = clamp((altitude - 45) / 50, 0, 1);
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
        const scale = clamp(w / 700, .75, 1.3), rise = clamp(f.altitude / 2, 0, 1);
        const x = w * .47, y = (h * .81 - 62 * scale) * (1 - rise) + h * .45 * rise;
        const atmospheric = clamp(1 - f.altitude / 95, 0, 1), q = Math.max(0, f.q || 0);
        // Clouds, contrails and airflow accelerate past the craft instead of becoming a static sky.
        c.save(); c.globalAlpha = atmospheric * .38;
        for (let i = 0; i < 18; i++) {
            const cloudX = (i * 157.3 - (f.downrange || 0) * 4) % (w + 220) - 80;
            const cloudY = ((i * 83 + f.altitude * 8) % (h + 180)) - 90;
            c.fillStyle = '#d8e8e7'; c.beginPath(); c.ellipse(cloudX, cloudY, 38 + i % 4 * 16, 8 + i % 3 * 4, -.1, 0, TAU); c.fill();
        }
        c.restore();
        if (f.altitude < 3) {
            const yGround = h * .81 + f.altitude * 36;
            box(c, 0, yGround, w, h, p.soil, 0); path(c, [[0, yGround], [w, yGround]], p.edge, 3);
            box(c, x - 85, yGround - 170, 11, 170, '#6c8390', 1);
            for (let i = 0; i < 5; i++) path(c, [[x - 85, yGround - i * 34], [x - 74, yGround - (i + 1) * 34]], '#a0b6bb', 2);
            if (f.throttle > 0 && f.countdown <= 0) for (let i = 0; i < 14; i++) {
                const age = (t * 1.5 + i / 14) % 1;
                c.save(); c.globalAlpha = (1 - age) * .35; c.fillStyle = '#d5d9ce'; c.beginPath(); c.ellipse(x + Math.sin(i * 17) * age * 160, yGround - age * 16, 10 + age * 45, 6 + age * 15, 0, 0, TAU); c.fill(); c.restore();
            }
        }
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
        if (!options.reducedMotion && !failed && q > 12) c.translate(Math.sin(t * 83) * Math.min(4, q / 18), Math.cos(t * 71) * Math.min(3, q / 22));
        c.scale(scale * (escape ? Math.max(.08, Math.exp(-ft * .37)) : 1), scale * (escape ? Math.max(.08, Math.exp(-ft * .37)) : 1));
        c.rotate(-f.pitch * rad + (failed && reason === 'ballistic' ? ft * .6 : 0));
        if (!failed && atmospheric > .01 && (f.mach || 0) > .85) {
            c.save(); c.globalAlpha = atmospheric * .6;
            const cone = clamp(70 / Math.max(1, f.mach || 1), 12, 60);
            path(c, [[-100, -cone], [68, 0], [-100, cone]], '#c6eeef', 2);
            if (q > 25) { c.globalAlpha = atmospheric * .24; c.fillStyle = '#d8f3ed'; c.beginPath(); c.ellipse(-22, 0, 14, 41, 0, 0, TAU); c.fill(); }
            c.restore();
        }
        if (failed && (reason === 'burnup' || reason === 'ballistic')) {
            for (let i = 0; i < 16; i++) {
                const spread = reason === 'burnup' ? Math.min(85, ft * 32) : 8;
                const px = Math.sin(i * 21) * spread, py = Math.cos(i * 17) * spread;
                path(c, [[px - 5, py - 2], [px - 55 - Math.sin(t * 12 + i) * 18, py], [px - 5, py + 3]], i % 2 ? '#ef8851' : '#fcd785', 1, true);
                box(c, px, py, 5, 4, p.ink, 1);
            }
        }
        if (!(failed && reason === 'burnup' && ft > .8)) carrier(c, p, t, !failed && !(f.countdown > 0) && f.burnLeft > 0 ? f.throttle : 0, f.heat || 0, failed && reason === 'maxq' ? clamp(ft / 1.5, 0, 1) * 1.8 : 0);
        c.restore();
        const meterW = Math.min(170, w * .29), meterX = 15, meterY = h - 93;
        for (const [i, item] of [['Q / 50 kPa', q / 50, '#8fc7de'], ['HEAT', (f.heat || 0) / 100, '#e5915e'], ['STRUCTURE', (f.stress || 0) / 100, '#c8a2d6']].entries()) {
            label(c, item[0], meterX, meterY + i * 21, '#e3ece6', 8);
            box(c, meterX + 72, meterY - 7 + i * 21, meterW - 72, 6, '#36535f', 1);
            box(c, meterX + 72, meterY - 7 + i * 21, (meterW - 72) * clamp(item[1], 0, 1), 6, item[2], 1);
        }
        if (s.phase === 'launch' || f.countdown > 0) {
            label(c, s.phase === 'launch' ? 'CARRIER LOADED' : String(Math.ceil(f.countdown)), w * .5, h * .2, '#f5e3ad', s.phase === 'launch' ? 20 : 46, 'center');
            label(c, 'UP / DOWN: PITCH  ·  LEFT / RIGHT: THROTTLE', w * .5, h * .2 + 25, '#cddfdf', w < 480 ? 8 : 10, 'center');
        }
        if (w > 520) orbitalInset(c, w - 103, h - 100, 65, f, p, false);
        const caption = failed ? ({ maxq: 'STRUCTURAL FAILURE · MAX Q', burnup: 'THERMAL BREAKUP', escape: 'SIGNAL LOST · ESCAPE TRAJECTORY', ballistic: 'BALLISTIC REENTRY' }[reason] || 'MISSION LOST') : s.phase === 'launch' ? 'BOOSTER ARMED · READY FOR ASCENT' : f.burnLeft > 0 ? 'POWERED ASCENT' : 'COASTING · BOOSTER SPENT';
        label(c, caption, w / 2, h - 19, failed ? '#ffc08a' : '#dbe9e8', w < 430 ? 10 : 12, 'center');
        window.PowerCockpitScenes?.guidanceHUD(c,w,h,s);
        if(f.pursuit?.revealed)window.PowerCockpitScenes?.rearView(c,w,h,s,true);
    }
    function orbitalInset(c, x, y, radius, f, p, inOrbit) {
        c.save(); box(c, x - radius - 17, y - radius - 17, radius * 2 + 34, radius * 2 + 40, '#0c2230', 5);
        circle(c, x, y, radius * .56, '#326478'); circle(c, x, y, radius * .58, '#7db6bd', true);
        const peri = Math.max(0, f.periapsis || 0), apo = Number.isFinite(f.apoapsis) ? Math.max(0, f.apoapsis) : 8000;
        const eccentricity = clamp((apo - peri) / (12742 + apo + peri), 0, .8);
        const a = radius * .8, b = a * Math.sqrt(1 - eccentricity * eccentricity);
        c.save(); c.setLineDash([3, 4]); c.strokeStyle = peri >= 100 ? '#8cd8ac' : '#d4af69'; c.lineWidth = 1.3;
        c.beginPath(); c.ellipse(x - eccentricity * a, y, a, b, -.35, 0, TAU); c.stroke(); c.restore();
        const angle = Number(f.orbitalAngle) || -.85;
        const ox = Math.cos(angle) * a - eccentricity * a, oy = Math.sin(angle) * b;
        circle(c, x + ox, y + oy, 3, p.accent); path(c, [[x, y], [x + ox, y + oy]], '#75979f');
        label(c, inOrbit ? 'ORBIT / GROUND TRACK' : 'TRAJECTORY', x, y + radius + 15, '#c5d9d9', 8, 'center'); c.restore();
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
    function orbitNavigation(c, w, h, s, p) {
        const o = s.orbit, f = s.flight || {}, track = o.track || {};
        c.fillStyle = '#07141f'; c.fillRect(0, 0, w, h);
        for (let i = 0; i < 100; i++) circle(c, (i * 173.27) % w, (i * 79.31) % h, i % 11 ? .65 : 1.2, '#a8c4cf');
        const cx = w * .5, cy = h * .49, points = o.trajectory || [];
        const extent = Math.max(6800, ...points.map(v => Math.hypot(v.x, v.y)));
        const k = Math.min(w * .34, h * .36) / extent, radius = 6371 * k;
        c.save(); c.shadowColor = '#5cb3d5'; c.shadowBlur = 20; circle(c, cx, cy, radius + 2, '#74bfd3'); c.shadowBlur = 0;
        circle(c, cx, cy, radius, '#275f79'); c.beginPath(); c.arc(cx, cy, radius, 0, TAU); c.clip();
        c.translate(cx, cy); c.scale(radius, radius);
        island(c, -.31, -.12, .33, .59, 3, '#648765'); island(c, .38, .21, .42, .28, 9, '#91a078'); island(c, .25, -.72, .5, .17, 2, '#d5dfd1');
        for (let i = 0; i < 13; i++) {
            c.globalAlpha = .55; c.fillStyle = '#d1e5dd'; c.beginPath(); c.ellipse(Math.sin(i * 2.9 + o.time * .004) * .8, Math.cos(i * 2.1) * .8, .25, .035, -.4, 0, TAU); c.fill();
        }
        c.globalAlpha = .45; c.fillStyle = '#07141f'; c.beginPath(); c.ellipse(.57, 0, .55, 1.1, -.16, 0, TAU); c.fill(); c.restore();
        if (points.length) {
            c.save(); c.strokeStyle = '#91d6b0'; c.lineWidth = 1.5; c.setLineDash([5, 5]); c.beginPath();
            points.forEach((v, i) => i ? c.lineTo(cx + v.x * k, cy - v.y * k) : c.moveTo(cx + v.x * k, cy - v.y * k)); c.stroke(); c.restore();
        }
        if (o.craft) {
            const craft = o.craft, x = cx + craft.x * k, y = cy - craft.y * k;
            path(c, [[cx, cy], [x, y]], '#5e8c9c');
            c.save(); c.translate(x, y); c.rotate(-Math.atan2(craft.vy, craft.vx)); c.scale(.35, .35); carrier(c, p, o.time); c.restore();
            circle(c, x, y, 22, '#c6e4dc', true);
            label(c, 'CARRIER / ROVER ABOARD', clamp(x, 96, w - 96), y < cy ? y - 34 : y + 41, '#e9dfb3', w < 480 ? 8 : 10, 'center');
        }
        label(c, 'ORBIT ACHIEVED', 18, 27, '#addeb6', 14);
        label(c, 'TWO-BODY COAST · MISSION CLOCK 45×', 18, 46, '#8eaebc', 9);
        label(c, `${Math.round(track.altitude || f.altitude || 0)} km ALTITUDE`, w - 18, 27, '#e0eae6', 11, 'right');
        label(c, `${(track.speed || Math.hypot(f.vertical || 0, f.horizontal || 0)).toFixed(2)} km/s`, w - 18, 46, '#92bfd2', 11, 'right');
        const py = h - 65;
        label(c, `PERIAPSIS ${Math.round(f.periapsis || 0)} km`, w * .25, py, '#b7d8bc', w < 480 ? 9 : 11, 'center');
        label(c, `APOAPSIS ${Math.round(f.apoapsis || 0)} km`, w * .75, py, '#b7d8bc', w < 480 ? 9 : 11, 'center');
        label(c, 'OPEN THE SATELLITE CAMERA TO BEGIN YOUR SURVEY', w / 2, h - 25, '#e7dfb1', w < 480 ? 8 : 11, 'center');
    }
    function orbit(c, w, h, s, p, options) {
        if (!options.cameraActive) { orbitNavigation(c, w, h, s, p); return; }
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
        window.PowerCockpitScenes?.groundActivity(c,w,h,s);
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
        // A small navigation view is separate from the steerable survey camera.
        // Its polyline and vehicle position come from the propagated two-body state.
        if (w > 500 && o.craft && Array.isArray(o.trajectory)) {
            const size = Math.min(136, h * .29), cx = w - size / 2 - 18, cy = size / 2 + 42;
            box(c, cx - size / 2 - 6, cy - size / 2 - 6, size + 12, size + 39, '#102f40', 4);
            const extent = Math.max(6600, ...o.trajectory.map(v => Math.hypot(v.x, v.y))), k = (size / 2 - 5) / extent;
            circle(c, cx, cy, 6371 * k, '#356575'); circle(c, cx, cy, 6471 * k, '#6bb8c7', true);
            c.save(); c.strokeStyle = '#9bdcb4'; c.lineWidth = 1.2; c.beginPath();
            o.trajectory.forEach((v, i) => i ? c.lineTo(cx + v.x * k, cy - v.y * k) : c.moveTo(cx + v.x * k, cy - v.y * k)); c.stroke(); c.restore();
            circle(c, cx + o.craft.x * k, cy - o.craft.y * k, 3, p.accent);
            label(c, 'LIVE ORBIT', cx, cy + size / 2 + 12, '#d6e8df', 9, 'center');
            label(c, `${Math.round((o.track || {}).altitude || 0)}km · ${((o.track || {}).speed || 0).toFixed(2)}km/s`, cx, cy + size / 2 + 25, '#a8cbd0', 8, 'center');
        }
        // Faint moving scan lines and a camera readout retain the feeling of a satellite pass.
        c.save(); c.globalAlpha = .14; path(c, [[0, (o.time * 17) % h], [w, (o.time * 17) % h]], '#d0eae1'); c.restore();
        if (selected) {
            const distance = Math.hypot(selected.x - o.cameraX, selected.y - o.cameraY);
            const centred = distance * z < .045, stable = (o.steady || 0) >= 1.2;
            label(c, `${centred ? '● FRAMED' : '○ ALIGN TARGET'}  /  ${Math.abs(z - 3) < .4 ? 'DETAIL READY' : 'ZOOM ≈ 3×'}  /  ${stable ? 'STEADY' : 'SETTLING'}`, w / 2, h - 38, centred && stable ? '#aff0be' : '#e9e1ad', w < 500 ? 8 : 10, 'center');
        }
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
        if(window.PowerCockpitScenes && !options.cameraActive && options.displayMode!=='map' && ['launch','ascent','orbit'].includes(state.phase)) {
            window.PowerCockpitScenes.draw(ctx,width,height,state,palette,options);ctx.restore();return;
        }
        if(['launch','ascent'].includes(state.phase)&&options.displayMode==='map'){
            const f=Object.assign({altitude:0,vertical:0,horizontal:0,periapsis:-6371,apoapsis:0},state.flight);
            ctx.fillStyle='#07141f';ctx.fillRect(0,0,width,height);
            orbitalInset(ctx,width*.35,height*.49,Math.min(width*.24,height*.31),f,palette,false);
            label(ctx,'TRAJECTORY / LIVE OSCULATING ORBIT',18,27,'#e3d6a2',width<500?10:14);
            label(ctx,'Blue: planet · dashed: predicted path · minimum safe altitude: 100 km',18,height-25,'#b4ccd4',width<700?8:11);
            window.PowerCockpitScenes?.guidanceHUD(ctx,width,height,state);ctx.restore();return;
        }
        if (state.phase === 'road' || state.phase === 'boarding') drawRoad(ctx, width, height, state, palette, options);
        else if (state.phase === 'orbit') orbit(ctx, width, height, state, palette, options);
        else if (state.phase === 'grid') grid(ctx, width, height, state, palette);
        else if (state.phase === 'return') returning(ctx, width, height, state, palette);
        else flight(ctx, width, height, state, palette, options);
        ctx.restore();
    }, drawRoad };
})();
