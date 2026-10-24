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
    assert.ok(hit.charge < clear.charge - 13); assert.ok(hit.gap < clear.gap);
    const before = hit.x; E.step(hit, {}, 1 / 60); assert.ok(hit.x - before < 2);
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
test('a clean cruise run can reach the finish across several course seeds', () => {
    for (const seed of [17, 1, 42, 99]) {
        const s = E.create(seed); s.status = 'running';
        for (let frame = 0; frame < 120 * 60 && s.status === 'running'; frame++) {
            if (s.grounded && s.entities.some(e => e.type === 'leak' && !e.used && e.x > s.x && e.x - s.x < 65)) E.jump(s);
            E.step(s, {}, 1 / 60);
        }
        assert.equal(s.status, 'briefing', `seed ${seed}`); assert.equal(s.phase, 'launch'); assert.equal(s.x, E.GOAL); assert.equal(s.leaks, 0); assert.ok(s.charge > 0);
    }
});
