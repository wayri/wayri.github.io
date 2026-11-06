(function (root, factory) {
    'use strict';
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.IRCAMiniUI = api;
})(typeof window === 'object' ? window : globalThis, function () {
    'use strict';
    const WIDTH = 320, HEIGHT = 240;
    const tiles = [
        { label: 'Projects', icon: 'board', path: '/projects/' },
        { label: 'Tools', icon: 'tools', path: '/tools/' },
        { label: 'Blog', icon: 'notes', path: '/blog/' },
        { label: 'About', icon: 'person', path: '/about/' },
        { label: 'Play', icon: 'play', path: '/play/' },
        { label: 'Camera', icon: 'camera', view: 'thermal' }
    ].map((tile, index) => Object.freeze({ ...tile, x: 8 + index % 3 * 104, y: 47 + Math.floor(index / 3) * 79, width: 96, height: 70 }));
    const back = Object.freeze({ x: 7, y: 7, width: 78, height: 28 });
    const inside = (point, box) => point.x >= box.x && point.x <= box.x + box.width && point.y >= box.y && point.y <= box.y + box.height;
    function icon(ctx, kind, x, y) {
        ctx.save(); ctx.translate(x, y); ctx.lineWidth = 2; ctx.strokeStyle = '#dfbf48'; ctx.fillStyle = '#dfbf48';
        ctx.beginPath();
        if (kind === 'camera') {
            ctx.rect(-15, -9, 30, 20); ctx.rect(-7, -14, 13, 5); ctx.stroke();
            ctx.beginPath(); ctx.arc(0, 1, 6, 0, Math.PI * 2); ctx.stroke();
        } else if (kind === 'board') {
            ctx.rect(-13, -12, 26, 25); ctx.stroke(); ctx.strokeRect(-5, -5, 10, 10);
            for (const value of [-8, 0, 8]) { ctx.beginPath(); ctx.moveTo(-18, value); ctx.lineTo(-13, value); ctx.moveTo(13, value); ctx.lineTo(18, value); ctx.stroke(); }
        } else if (kind === 'tools') {
            ctx.moveTo(-12, 12); ctx.lineTo(9, -9); ctx.moveTo(-11, -10); ctx.lineTo(11, 12); ctx.stroke();
            ctx.strokeRect(-15, -13, 7, 7); ctx.beginPath(); ctx.arc(11, -11, 5, 0, Math.PI * 2); ctx.stroke();
        } else if (kind === 'notes') {
            ctx.rect(-11, -14, 23, 29); ctx.stroke();
            for (const y of [-6, 1, 8]) { ctx.beginPath(); ctx.moveTo(-5, y); ctx.lineTo(6, y); ctx.stroke(); }
        } else if (kind === 'person') {
            ctx.arc(0, -7, 6, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 14, 12, Math.PI, 0); ctx.stroke();
        } else {
            ctx.moveTo(-7, -13); ctx.lineTo(13, 0); ctx.lineTo(-7, 13); ctx.closePath(); ctx.fill();
        }
        ctx.restore();
    }
    function heatColor(value) {
        const stops = [[5, 8, 31], [46, 12, 95], [140, 24, 107], [230, 56, 61], [255, 157, 55], [255, 244, 158]];
        const t = Math.max(0, Math.min(1, value)) * (stops.length - 1), index = Math.min(stops.length - 2, Math.floor(t)), mix = t - index;
        return 'rgb(' + stops[index].map((n, channel) => Math.round(n + (stops[index + 1][channel] - n) * mix)).join(',') + ')';
    }
    function thermal(ctx) {
        // An invented scene of a PCB and warm cup; this is presentation artwork.
        for (let row = 0; row < 74; row++) for (let column = 0; column < 152; column++) {
            const x = column / 151, y = row / 73;
            const board = x > .1 && x < .66 && y > .14 && y < .87;
            const cupRadius = Math.hypot((x - .82) * 1.1, (y - .44) * .65);
            const cup = cupRadius < .13;
            const chip = x > .29 && x < .46 && y > .33 && y < .65;
            const hotspot = Math.exp(-((x - .37) ** 2 / .008 + (y - .5) ** 2 / .03));
            let heat = .07 + .02 * Math.sin(column * .17 + row * .1) + .012 * Math.cos(column * 1.17 - row * .93);
            if (board) heat += .19 + .08 * Math.sin(x * 12) ** 2;
            heat += .52 * hotspot;
            if (chip) heat += .12;
            if (cup) heat = .68 + .22 * (1 - cupRadius / .13);
            if (cupRadius > .13 && cupRadius < .15 || x > .938 && x < .978 && y > .34 && y < .55) heat += .4;
            ctx.fillStyle = heatColor(heat); ctx.fillRect(8 + column * 2, 49 + row * 2, 2, 2);
        }
        ctx.strokeStyle = '#ffffffa0'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(112, 112); ctx.lineTo(128, 112); ctx.moveTo(120, 104); ctx.lineTo(120, 120); ctx.stroke();
        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'left'; ctx.fillText('DEMO', 17, 63);
        for (let x = 0; x < 190; x++) { ctx.fillStyle = heatColor(x / 189); ctx.fillRect(65 + x, 206, 1, 5); }
        ctx.fillStyle = '#8da0ad'; ctx.font = '8px monospace'; ctx.fillText('COOL', 8, 212); ctx.textAlign = 'right'; ctx.fillText('WARM', 312, 212);
    }
    function create(options = {}) {
        let view = 'home', disposed = false;
        const navigate = typeof options.navigate === 'function' ? options.navigate : () => {};
        const onChange = typeof options.onChange === 'function' ? options.onChange : () => {};
        function show(next) {
            if (disposed) return false;
            if (!['home', 'camera'].includes(next)) throw new TypeError('Choose home or camera for the mini display.');
            const target = next === 'camera' ? 'thermal' : 'home';
            if (view === target) return false;
            view = target; onChange(view); return true;
        }
        function draw(ctx, canvas) {
            if (disposed) return;
            ctx.save(); ctx.scale(canvas.width / WIDTH, canvas.height / HEIGHT);
            ctx.fillStyle = '#091117'; ctx.fillRect(0, 0, WIDTH, HEIGHT);
            ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
            if (view === 'home') {
                ctx.fillStyle = '#dfbf48'; ctx.font = 'bold 17px sans-serif'; ctx.fillText('WAYRI / LAB', 9, 24);
                ctx.fillStyle = '#8da0ad'; ctx.font = '9px monospace'; ctx.textAlign = 'right'; ctx.fillText('TAP TO EXPLORE', 311, 23);
                for (const tile of tiles) {
                    ctx.fillStyle = '#14212a'; ctx.fillRect(tile.x, tile.y, tile.width, tile.height);
                    ctx.strokeStyle = '#314451'; ctx.lineWidth = 1; ctx.strokeRect(tile.x + .5, tile.y + .5, tile.width - 1, tile.height - 1);
                    icon(ctx, tile.icon, tile.x + tile.width / 2, tile.y + 26);
                    ctx.fillStyle = '#edf2f4'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(tile.label, tile.x + tile.width / 2, tile.y + 58);
                }
                ctx.fillStyle = '#8da0ad'; ctx.font = '9px monospace'; ctx.textAlign = 'center'; ctx.fillText('HARDWARE / SOFTWARE / NOTES', WIDTH / 2, 229);
            } else {
                ctx.fillStyle = '#192832'; ctx.fillRect(back.x, back.y, back.width, back.height);
                ctx.fillStyle = '#dfbf48'; ctx.font = 'bold 12px sans-serif'; ctx.fillText('<  Back', 16, 26);
                ctx.fillStyle = '#edf2f4'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'right'; ctx.fillText('THERMAL CAMERA', 311, 25);
                thermal(ctx);
                ctx.fillStyle = '#dfbf48'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center'; ctx.fillText('SIMULATED THERMAL / NO CAMERA FEED', WIDTH / 2, 230);
            }
            ctx.restore();
        }
        function press(uv) {
            if (disposed || !uv || !Number.isFinite(uv.x) || !Number.isFinite(uv.y) || uv.x < 0 || uv.x > 1 || uv.y < 0 || uv.y > 1) return null;
            const point = { x: uv.x * WIDTH, y: (1 - uv.y) * HEIGHT };
            if (view === 'thermal') {
                if (!inside(point, back)) return null;
                show('home'); return { type: 'view', view };
            }
            const tile = tiles.find(item => inside(point, item));
            if (!tile) return null;
            if (tile.view) { show('camera'); return { type: 'view', view }; }
            navigate(tile.path); return { type: 'navigate', path: tile.path };
        }
        return Object.freeze({ draw, press, show, get view() { return view; }, dispose() { disposed = true; } });
    }
    return Object.freeze({ create });
});
