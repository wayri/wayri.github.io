(() => {
    'use strict';
    const panel = document.getElementById('power-runner');
    if (!panel || !window.PowerRunner) return;
    const engine = window.PowerRunner;
    const canvas = panel.querySelector('#runner-canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const overlay = panel.querySelector('#runner-overlay');
    const start = panel.querySelector('#runner-start');
    const pauseButton = panel.querySelector('#runner-pause');
    const title = panel.querySelector('#runner-overlay-title');
    const copy = panel.querySelector('#runner-overlay-copy');
    const overline = panel.querySelector('#runner-overline');
    const announcement = panel.querySelector('#runner-announcement');
    const charge = panel.querySelector('#runner-charge');
    const chargeText = panel.querySelector('#runner-charge-text');
    const distance = panel.querySelector('#runner-distance');
    const gap = panel.querySelector('#runner-gap');
    const mode = panel.querySelector('#runner-mode');
    const bestText = panel.querySelector('#runner-best');
    const controls = { boost: false, eco: false };
    let state = engine.create(), width = 800, height = 360, visible = false, frame = 0, lastTime = 0, accumulator = 0, hudTime = 0;
    let best = 0, palette, particles = [];
    try { best = Math.max(0, Math.min(1000, Number(localStorage.getItem('power-runner-best-v1')) || 0)); } catch (error) { /* Optional score storage. */ }
    bestText.textContent = `${Math.floor(best)} m`;

    function colors() {
        const css = getComputedStyle(panel);
        const dark = document.documentElement.dataset.theme === 'dark';
        palette = { dark, accent: css.getPropertyValue('--accent-color').trim() || '#d4af37', ink: dark ? '#ede8dc' : '#253543', muted: dark ? '#9faeaf' : '#536b78', sky: dark ? '#101923' : '#edf5fb', horizon: dark ? '#1c2c34' : '#d9e7ec', mountain: dark ? '#263a40' : '#b8d0d7', soil: dark ? '#252d29' : '#e4e4d1', edge: dark ? '#687b6a' : '#6b8268' };
        draw();
    }
    function resize() {
        const box = canvas.getBoundingClientRect();
        width = Math.max(1, box.width); height = Math.max(1, box.height);
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        if (palette) draw();
    }
    const playerX = () => Math.min(width * .47, 260);
    const base = () => height * .74;
    const camera = () => state.x - playerX();
    function box(x, y, w, h, radius, color) {
        ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(x, y, w, h, radius); ctx.fill();
    }
    function text(value, x, y, color, size = 12, align = 'left') {
        ctx.fillStyle = color; ctx.font = `${size}px 'Courier New', monospace`; ctx.textAlign = align; ctx.fillText(value, x, y);
    }
    function terrain() {
        const cam = camera();
        ctx.fillStyle = palette.sky; ctx.fillRect(0, 0, width, height);
        // A quiet, parallax landscape behind the much busier little rover.
        for (let layer = 0; layer < 2; layer++) {
            ctx.beginPath(); ctx.moveTo(0, height);
            for (let x = 0; x <= width + 10; x += 10) {
                const world = x + cam * (.12 + layer * .09);
                ctx.lineTo(x, height * (.48 + layer * .09) + Math.sin(world / 140) * 27 + Math.sin(world / 63) * 13);
            }
            ctx.lineTo(width, height); ctx.closePath(); ctx.fillStyle = layer ? palette.mountain : palette.horizon; ctx.fill();
        }
        ctx.globalAlpha = .5;
        for (let i = 0; i < 9; i++) {
            const x = ((i * 131 - cam * .15) % (width + 130) + width + 130) % (width + 130);
            ctx.fillStyle = palette.muted; ctx.fillRect(x, 30 + (i * 47) % Math.max(50, height * .28), 2, 2);
        }
        ctx.globalAlpha = 1;
        ctx.beginPath(); ctx.moveTo(-10, height);
        for (let x = -10; x <= width + 10; x += 5) ctx.lineTo(x, base() + engine.ground(x + cam));
        ctx.lineTo(width + 10, height); ctx.closePath(); ctx.fillStyle = palette.soil; ctx.fill();
        ctx.beginPath();
        for (let x = -10; x <= width + 10; x += 5) { const y = base() + engine.ground(x + cam); if (x === -10) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
        ctx.strokeStyle = palette.edge; ctx.lineWidth = 3; ctx.stroke();
        for (let i = Math.floor(cam / 110); i < (cam + width) / 110; i++) {
            const x = i * 110 - cam, y = base() + engine.ground(i * 110);
            ctx.globalAlpha = .3; ctx.fillStyle = palette.edge; ctx.fillRect(x, y + 16, 16, 2); ctx.globalAlpha = 1;
        }
        const finishX = engine.GOAL - cam;
        if (finishX < width + 70) {
            const y = base() + engine.ground(engine.GOAL);
            ctx.fillStyle = palette.ink; ctx.fillRect(finishX, y - 110, 3, 110);
            for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) box(finishX + 3 + c * 9, y - 110 + r * 9, 9, 9, 0, (r + c) % 2 ? palette.ink : palette.accent);
            text('DELIVERY', finishX, y - 121, palette.ink, 11, 'center');
        }
    }
    function battery(item) {
        const x = item.x - camera(), y = base() + engine.ground(item.x) - item.lift + Math.sin(state.time * 4 + item.x) * 3;
        ctx.save(); ctx.translate(x, y);
        ctx.globalAlpha = .16; box(-22, -24, 44, 46, 12, palette.accent); ctx.globalAlpha = 1;
        box(-12, -16, 24, 32, 4, palette.accent); box(-5, -20, 10, 5, 1, palette.accent);
        ctx.fillStyle = palette.sky; ctx.beginPath(); ctx.moveTo(2, -11); ctx.lineTo(-6, 2); ctx.lineTo(0, 2); ctx.lineTo(-2, 12); ctx.lineTo(7, -2); ctx.lineTo(1, -2); ctx.closePath(); ctx.fill();
        ctx.restore();
    }
    function leak(item) {
        const x = item.x - camera(), y = base() + engine.ground(item.x);
        box(x - 15, y - 25, 30, 25, 4, '#bb654f');
        ctx.fillStyle = '#f9dfb1'; ctx.beginPath(); ctx.moveTo(x - 8, y - 8); ctx.lineTo(x, y - 22); ctx.lineTo(x + 8, y - 8); ctx.closePath(); ctx.fill();
        text('!', x, y - 10, '#493128', 11, 'center'); text('LEAK', x, y + 17, palette.muted, 10, 'center');
    }
    function monsters() {
        const chase = 15 + Math.max(0, state.gap - 200) / 1640 * 115;
        const names = ['MAIL', 'BUGS', 'REVIEW'], colors = ['#a78bca', '#d18261', '#5caaa0'];
        for (let i = 2; i >= 0; i--) {
            const x = playerX() - chase - i * 34, world = x + camera();
            const y = base() + engine.ground(world) - Math.abs(Math.sin(state.time * 10 + i)) * 7;
            ctx.save(); ctx.translate(x, y);
            ctx.fillStyle = colors[i]; ctx.beginPath(); ctx.moveTo(-12, -21); ctx.lineTo(-16, -38); ctx.lineTo(-3, -30); ctx.lineTo(7, -30); ctx.lineTo(17, -36); ctx.lineTo(13, -16); ctx.closePath(); ctx.fill();
            box(-14, -30, 28, 26, 8, colors[i]);
            box(-10, -8, 7, 9 + Math.sin(state.time * 12 + i) * 3, 2, colors[i]); box(5, -8, 7, 9 - Math.sin(state.time * 12 + i) * 3, 2, colors[i]);
            box(-7, -23, 7, 8, 2, '#faf4e8'); box(3, -23, 7, 8, 2, '#faf4e8');
            box(-3, -21, 3, 4, 1, '#25202f'); box(7, -21, 3, 4, 1, '#25202f');
            text(names[i], 0, -46 - (i % 2) * 10, colors[i], 9, 'center');
            ctx.restore();
        }
    }
    function rover() {
        const x = playerX(), y = base() + state.y;
        ctx.save(); ctx.translate(x, y);
        if (state.grounded) ctx.rotate(Math.atan2(engine.ground(state.x + 8) - engine.ground(state.x - 8), 16) * .55);
        if (state.invulnerable > 0 && Math.floor(state.time * 15) % 2) ctx.globalAlpha = .45;
        if (controls.boost && state.status === 'running' && state.charge > 0) {
            ctx.fillStyle = palette.accent; ctx.beginPath(); ctx.moveTo(-22, -23); ctx.lineTo(-40 - Math.sin(state.time * 40) * 8, -16); ctx.lineTo(-22, -10); ctx.closePath(); ctx.fill();
        }
        box(-23, -33, 44, 26, 6, palette.ink); box(20, -26, 5, 12, 1, palette.ink);
        for (let i = 0; i < 4; i++) box(-18 + i * 9, -28, 6, 16, 1, state.charge > i * 25 ? palette.accent : palette.mountain);
        box(8, -43, 13, 12, 4, palette.ink); box(15, -40, 4, 4, 1, palette.accent);
        for (const wheelX of [-15, 15]) {
            ctx.fillStyle = '#1b2428'; ctx.beginPath(); ctx.arc(wheelX, -5, 9, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = palette.accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(wheelX, -5, 5, 0, Math.PI * 2); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(wheelX, -5); ctx.lineTo(wheelX + Math.cos(state.x / 9) * 5, -5 + Math.sin(state.x / 9) * 5); ctx.stroke();
        }
        ctx.restore();
    }
    function draw() {
        if (!palette) return;
        ctx.clearRect(0, 0, width, height); terrain();
        for (const item of state.entities) if (!item.used && item.x - camera() > -40 && item.x - camera() < width + 40) item.type === 'pack' ? battery(item) : leak(item);
        monsters(); rover();
        for (const p of particles) { ctx.globalAlpha = Math.max(0, p.life); box(p.x - camera(), base() + p.y, 3, 3, 0, p.color); }
        ctx.globalAlpha = 1;
        if (state.noticeTime > 0) text(state.notice, playerX(), base() + state.y - 70, state.notice.startsWith('+') ? palette.accent : '#d18261', 12, 'center');
        text('← THE BACKLOG', 16, height - 18, palette.muted, 10);
        text('DELIVER AT 1,000 m →', width - 16, height - 18, palette.muted, 10, 'right');
        if (state.charge < 25 && state.status === 'running') text('LOW CHARGE', width - 16, 26, '#d18261', 12, 'right');
    }
    function updateHud() {
        charge.value = state.charge; chargeText.textContent = `${Math.ceil(state.charge)}%`;
        distance.textContent = String(Math.min(1000, Math.floor(state.x / 8)));
        gap.textContent = `${Math.max(0, Math.floor((state.gap - 200) / 8))} m`;
        mode.textContent = `${state.mode} · ${state.drain.toFixed(1)}%/s`;
    }
    function clearControls() {
        controls.boost = false; controls.eco = false;
        panel.querySelectorAll('.is-held').forEach(button => button.classList.remove('is-held'));
    }
    function showOverlay(kind) {
        overlay.hidden = false;
        if (kind === 'paused') { overline.textContent = 'Take a breather'; title.textContent = 'Run paused.'; copy.textContent = 'Your charge and the backlog are frozen. Resume when you are ready.'; start.innerHTML = '<i class="fa-solid fa-play" aria-hidden="true"></i> Resume run'; }
        else {
            const won = state.status === 'won';
            overline.textContent = won ? 'Delivery complete' : 'The backlog wins this round';
            title.textContent = won ? 'Made it. Still charged.' : state.reason === 'battery' ? 'Battery empty.' : 'Caught by your tasks.';
            copy.textContent = `${Math.floor(state.x / 8)} m · ${state.packs} battery packs · ${state.leaks} energy leaks. ${won ? 'A little energy management goes a long way.' : 'Jump leaks, boost for space, and use Eco in short bursts.'}`;
            start.innerHTML = '<i class="fa-solid fa-rotate-right" aria-hidden="true"></i> Run again';
            best = Math.max(best, Math.floor(state.x / 8)); bestText.textContent = `${best} m`;
            try { localStorage.setItem('power-runner-best-v1', String(best)); } catch (error) { /* Optional score storage. */ }
        }
        announcement.textContent = `${title.textContent} ${copy.textContent}`;
        pauseButton.disabled = kind !== 'paused'; pauseButton.innerHTML = '<i class="fa-solid fa-play" aria-hidden="true"></i> Resume';
    }
    function pause() {
        if (state.status !== 'running') return;
        state.status = 'paused'; clearControls(); cancelAnimationFrame(frame); frame = 0; showOverlay('paused'); draw();
    }
    function play() {
        if (state.status !== 'paused') { state = engine.create(); particles = []; }
        state.status = 'running'; overlay.hidden = true; clearControls(); lastTime = 0; accumulator = 0;
        pauseButton.disabled = false; pauseButton.innerHTML = '<i class="fa-solid fa-pause" aria-hidden="true"></i> Pause';
        announcement.textContent = 'Run started. Jump energy leaks and collect batteries.';
        canvas.focus({ preventScroll: true }); updateHud(); visible = true;
        if (!frame) frame = requestAnimationFrame(tick);
    }
    function sparks(color) {
        for (let i = 0; i < 12; i++) particles.push({ x: state.x, y: state.y - 20, vx: (Math.random() - .5) * 140, vy: -Math.random() * 140, life: 1, color });
    }
    function tick(time) {
        frame = 0;
        if (state.status !== 'running' || !visible) return;
        if (!lastTime) lastTime = time;
        const delta = Math.min((time - lastTime) / 1000, .1); lastTime = time; accumulator += delta; hudTime += delta;
        while (accumulator >= 1 / 60 && state.status === 'running') {
            const packs = state.packs, leaks = state.leaks;
            engine.step(state, controls, 1 / 60);
            if (state.packs > packs) sparks(palette.accent);
            if (state.leaks > leaks) sparks('#d18261');
            for (const p of particles) { p.x += p.vx / 60; p.y += p.vy / 60; p.vy += 160 / 60; p.life -= 1 / 45; }
            particles = particles.filter(p => p.life > 0); accumulator -= 1 / 60;
        }
        draw();
        if (hudTime > .12 || state.status !== 'running') { updateHud(); hudTime = 0; }
        if (state.status !== 'running') { clearControls(); showOverlay('finished'); }
        else frame = requestAnimationFrame(tick);
    }
    function hold(id, action) {
        const button = panel.querySelector(id);
        const release = () => { controls[action] = false; button.classList.remove('is-held'); };
        button.addEventListener('pointerdown', event => {
            if (state.status !== 'running' || (event.pointerType === 'mouse' && event.button !== 0)) return;
            event.preventDefault(); button.setPointerCapture(event.pointerId); controls[action] = true; button.classList.add('is-held');
        });
        ['pointerup', 'pointercancel', 'lostpointercapture', 'blur'].forEach(name => button.addEventListener(name, release));
        button.addEventListener('keydown', event => { if ((event.code === 'Space' || event.code === 'Enter') && state.status === 'running') { event.preventDefault(); controls[action] = true; button.classList.add('is-held'); } });
        button.addEventListener('keyup', release);
    }
    hold('#runner-eco', 'eco'); hold('#runner-boost', 'boost');
    const jumpButton = panel.querySelector('#runner-jump');
    jumpButton.addEventListener('pointerdown', event => event.preventDefault());
    jumpButton.addEventListener('click', () => engine.jump(state));
    start.addEventListener('click', play);
    pauseButton.addEventListener('click', () => state.status === 'paused' ? play() : pause());
    canvas.addEventListener('keydown', event => {
        if (!['Space', 'ArrowUp', 'ArrowRight', 'ArrowDown', 'KeyP', 'Escape', 'Enter'].includes(event.code)) return;
        event.preventDefault();
        if (event.repeat) return;
        if (event.code === 'KeyP' || event.code === 'Escape') { if (state.status === 'running') pause(); else if (state.status === 'paused') play(); }
        else if (event.code === 'Enter' && state.status !== 'running') play();
        else if (event.code === 'Space' || event.code === 'ArrowUp') engine.jump(state);
        else if (event.code === 'ArrowRight') controls.boost = true;
        else if (event.code === 'ArrowDown') controls.eco = true;
    });
    canvas.addEventListener('keyup', event => { if (event.code === 'ArrowRight') controls.boost = false; if (event.code === 'ArrowDown') controls.eco = false; });
    canvas.addEventListener('blur', clearControls);
    window.addEventListener('blur', () => { clearControls(); pause(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
    window.addEventListener('themeChanged', colors);
    new ResizeObserver(resize).observe(canvas);
    new IntersectionObserver(entries => { visible = entries[0].isIntersecting; if (!visible) pause(); }, { threshold: .15 }).observe(canvas);
    window.addEventListener('load', () => {
        if (location.hash === '#power-runner') panel.scrollIntoView({ behavior: 'instant', block: 'start' });
    }, { once: true });
    colors(); resize(); updateHud();
})();
