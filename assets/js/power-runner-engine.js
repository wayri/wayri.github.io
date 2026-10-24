((root, factory) => {
    const engine = factory();
    if (typeof module === 'object' && module.exports) module.exports = engine;
    else root.PowerRunner = engine;
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
    'use strict';
    const GOAL = 8000;
    const ground = x => 24 * Math.sin(x / 180) + 12 * Math.sin(x / 65);
    const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
    function create(seed = 17) {
        return { status: 'ready', x: 0, y: ground(0), vy: 0, grounded: true, charge: 100, gap: 1360, time: 0, speed: 0, drain: 0, mode: 'Cruise', hurt: 0, invulnerable: 0, emptyTime: 0, packs: 0, leaks: 0, notice: '', noticeTime: 0, entities: [], nextPack: 520, nextLeak: 850, seed, reason: '' };
    }
    function random(s) { s.seed = (Math.imul(1664525, s.seed) + 1013904223) >>> 0; return s.seed / 4294967296; }
    function jump(s) {
        if (s.status !== 'running' || !s.grounded || s.charge < 3) return false;
        s.vy = -420; s.grounded = false; s.charge -= 3;
        return true;
    }
    function finish(s, reason) { s.status = 'lost'; s.reason = reason; }
    function step(s, controls, dt) {
        if (s.status !== 'running' || !Number.isFinite(dt) || dt <= 0) return;
        dt = Math.min(dt, 1 / 30);
        s.time += dt;
        s.hurt = Math.max(0, s.hurt - dt);
        s.invulnerable = Math.max(0, s.invulnerable - dt);
        s.noticeTime = Math.max(0, s.noticeTime - dt);
        const boost = !!controls.boost && s.charge > 0;
        const eco = !!controls.eco && !boost;
        s.mode = boost ? 'Boost' : eco ? 'Eco' : 'Cruise';
        const uphill = ground(s.x + 5) < ground(s.x);
        s.speed = (boost ? 235 : eco ? 95 : 155) * (uphill ? .88 : 1.05);
        if (s.hurt > 0) s.speed *= .38;
        s.drain = (boost ? 5.7 : eco ? .7 : 2.5) + (uphill ? .35 : 0);
        s.charge = Math.max(0, s.charge - s.drain * dt);
        if (s.charge === 0) { s.speed = 35; s.emptyTime += dt; }
        else s.emptyTime = 0;
        const travelled = s.speed * dt;
        s.x += travelled;
        // The backlog keeps moving, even while the rover saves power.
        s.gap = clamp(s.gap + travelled - (142 + Math.min(s.time * .6, 42)) * dt, 0, 1840);
        if (s.grounded) s.y = ground(s.x);
        else { s.vy += 1000 * dt; s.y += s.vy * dt; if (s.y >= ground(s.x)) { s.y = ground(s.x); s.vy = 0; s.grounded = true; } }
        while (s.nextPack < s.x + 1400) {
            s.entities.push({ type: 'pack', x: s.nextPack, lift: random(s) > .65 ? 85 : 28, used: false });
            s.nextPack += 900 + random(s) * 230;
        }
        while (s.nextLeak < s.x + 1400) {
            s.entities.push({ type: 'leak', x: s.nextLeak, lift: 0, used: false });
            s.nextLeak += 470 + random(s) * 220;
        }
        for (const item of s.entities) {
            if (item.used || Math.abs(s.x - item.x) > 30) continue;
            if (item.type === 'pack' && Math.abs((s.y - 19) - (ground(item.x) - item.lift)) < 35) {
                item.used = true; s.charge = Math.min(100, s.charge + 22); s.packs++;
                s.notice = '+22% charge'; s.noticeTime = 1.2;
            } else if (item.type === 'leak' && Math.abs(s.x - item.x) < 24 && s.invulnerable === 0 && s.y > ground(item.x) - 28) {
                item.used = true; s.charge = Math.max(0, s.charge - 14); s.gap = Math.max(0, s.gap - 180);
                s.hurt = .7; s.invulnerable = 1.2; s.leaks++; s.notice = 'Energy leak! −14%'; s.noticeTime = 1.2;
            }
        }
        s.entities = s.entities.filter(item => item.x > s.x - 120);
        if (s.gap < 200) finish(s, 'backlog');
        else if (s.emptyTime >= 2) finish(s, 'battery');
        else if (s.x >= GOAL) { s.x = GOAL; s.status = 'won'; }
    }
    return { create, step, jump, ground, GOAL };
});
