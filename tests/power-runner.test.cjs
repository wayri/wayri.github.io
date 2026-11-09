const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../assets/js/power-runner-engine.js');
const running = () => Object.assign(E.create(), { status: 'running', nextPack: Infinity, nextLeak: Infinity });
function advance(s, seconds, controls = {}) { for (let i = 0; i < seconds * 60 && s.status === 'running'; i++) E.step(s, controls, 1 / 60); }

test('boost trades charge for distance; eco saves charge but loses ground to tasks', () => {
    const boost = running(), cruise = running(), eco = running();
    advance(boost, 2, { boost: true }); advance(cruise, 2); advance(eco, 2, { eco: true });
    assert.ok(boost.x > cruise.x && cruise.x > eco.x);
    assert.ok(boost.charge < cruise.charge && cruise.charge < eco.charge);
    assert.ok(boost.gap > cruise.gap && cruise.gap > eco.gap);
});
test('a battery pack replenishes charge once, capped at 100%', () => {
    const s = running(); s.charge = 95; s.entities = [{ type: 'pack', x: 2, lift: 28, used: false }];
    E.step(s, {}, 1 / 60); assert.equal(s.charge, 100); assert.equal(s.packs, 1);
    E.step(s, {}, 1 / 60); assert.equal(s.packs, 1); assert.ok(s.charge < 100);
});
test('leaks slow and damage the rover; an airborne rover clears them', () => {
    const hit = running(), clear = running();
    for (const s of [hit, clear]) s.entities = [{ type: 'leak', x: 2, lift: 0, used: false }];
    clear.y = -90; clear.grounded = false;
    E.step(hit, {}, 1 / 60); E.step(clear, {}, 1 / 60);
    assert.equal(hit.leaks, 1); assert.equal(clear.leaks, 0);
    assert.ok(hit.charge < clear.charge - 13);
    advance(hit, .3); advance(clear, .3); assert.ok(hit.speed < clear.speed);
});
test('jump costs charge, cannot repeat in midair, and lands back on terrain', () => {
    const s = running(); assert.equal(E.jump(s), true); assert.equal(s.charge, 97);
    assert.equal(E.jump(s), false); advance(s, 1.5);
    assert.equal(s.grounded, true); assert.equal(s.y, E.ground(s.x));
});
test('empty charge ends the run after a short coast; tasks can catch eco mode', () => {
    const empty = running(); empty.charge = 0; advance(empty, 3);
    assert.equal(empty.status, 'lost'); assert.equal(empty.reason, 'battery');
    const eco = running(); advance(eco, 30, { eco: true });
    assert.equal(eco.status, 'lost'); assert.equal(eco.reason, 'backlog');
});
test('pause freezes charge, distance, and tasks; terminal states stay terminal', () => {
    const s = running(); s.status = 'paused'; const snapshot = JSON.stringify(s);
    E.step(s, { boost: true }, 1 / 60); assert.equal(JSON.stringify(s), snapshot);
    s.status = 'lost'; E.step(s, {}, 1 / 60); assert.equal(s.x, 0);
});
test('a road pilot can clear mixed hazards and brake into the launch ship across course seeds', () => {
    for (const seed of [17, 1, 42, 99, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]) {
        const s = E.create(seed); s.status = 'running';
        for (let frame = 0; frame < 120 * 60 && s.status === 'running'; frame++) {
            if (s.grounded && s.entities.some(e => ['leak', 'crate', 'slick'].includes(e.type) && !e.used && e.x > s.x && e.x - s.x < 65)) E.jump(s);
            const scanner = s.entities.find(e => !e.used && e.type === 'drone' && e.x > s.x && e.x - s.x < 180);
            // Preserve a lead before waiting for a scanner; boost through if the chase is too close to stop.
            E.step(s, { brake: s.x > E.GOAL - 150 || !!(scanner && scanner.active && s.gap>300), boost: s.x<E.GOAL-250 && ((s.gap<500&&s.charge>25)||!!(scanner&&!scanner.active)) }, 1 / 60);
        }
        assert.equal(s.status, 'briefing', `seed ${seed}`); assert.equal(s.phase, 'launch'); assert.equal(s.x, E.GOAL); assert.ok(s.charge > 0);
    }
});

test('scanner timing matters and an airborne rover cannot bypass an active beam', () => {
    const active = running(), dark = running();
    for (const s of [active, dark]) { s.entities = [{ type: 'drone', x: 2, used: false }]; s.grounded = false; s.y = -70; }
    active.time = 1; dark.time = 3;
    E.step(active, {}, 1 / 60); E.step(dark, {}, 1 / 60);
    assert.equal(active.leaks, 1); assert.equal(dark.leaks, 0);
});

test('boost opens actual pursuit separation, distinct tactics activate, and escaped pursuers can find the trail again', () => {
    const s = running(); advance(s, 8, { boost: true });
    assert.ok(s.escaped >= 1); assert.ok(s.chasers.some(c => c.escaped));
    const escaped = s.chasers.find(c => c.escaped), position = escaped.x;
    advance(s, 1); assert.equal(escaped.x, position);
    advance(s, 5); assert.equal(escaped.escaped,false); assert.ok(escaped.x>position);
    const t = running(); t.time = 7; E.step(t, {}, 1 / 60);
    assert.equal(t.chasers[0].state, 'sprint'); assert.ok(t.chasers[0].speed > t.chasers[1].speed);
    t.chasers[2].x = t.x - 100; const charge = t.charge; E.step(t, {}, 1 / 60);
    assert.ok(t.charge < charge - 4);
});

test('hangar collision is speed-sensitive and successful boarding bridges the drive into launch', () => {
    const fast = running(); Object.assign(fast, { x: E.GOAL - 1, speed: 250 });
    E.step(fast, {}, 1 / 60); assert.equal(fast.reason, 'dock-crash');
    const safe = running(); Object.assign(safe, { x: E.GOAL - 1, speed: 30 });
    advance(safe, .1, { brake: true }); assert.equal(safe.phase, 'boarding');
    assert.equal(safe.status, 'running'); advance(safe, 3);
    assert.equal(safe.phase, 'launch'); assert.equal(safe.status, 'briefing');
});

test('overhead gantries punish jumping while solar strips reward grounded slower driving', () => {
    const low = running(), high = running();
    for (const s of [low, high]) s.entities = [{ type: 'gate', x: 2, used: false }];
    high.grounded = false; high.y = -70;
    E.step(low, {}, 1 / 60); E.step(high, {}, 1 / 60);
    assert.equal(low.leaks, 0); assert.equal(high.leaks, 1);
    const slow = running(), fast = running();
    for (const s of [slow, fast]) { s.charge = 50; s.entities = [{ type: 'solar', x: 2, used: false }]; }
    E.step(slow, {}, 1 / 60); E.step(fast, { boost: true }, 1 / 60);
    assert.ok(slow.charge > fast.charge + 6);
});
