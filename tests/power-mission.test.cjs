const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../assets/js/power-runner-engine.js');
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
function launched() {
    const s = E.create();
    Object.assign(s, { x: E.GOAL, phase: 'launch', status: 'briefing' });
    assert.equal(E.launch(s), true);
    return s;
}
function advance(s, seconds, controls = {}, dt = 1 / 60) {
    for (let t = 0; t < seconds && s.status === 'running'; t += dt) E.step(s, controls, dt);
}
function guided(dt = 1 / 60) {
    const s = launched();
    let seconds = 0;
    for (; seconds < 110 && s.phase === 'ascent' && s.status === 'running'; seconds += dt) {
        const f = s.flight;
        E.step(s, { pitch: clamp((Math.round(f.targetPitch) - f.pitch) * .7, -1, 1),
            throttle: clamp((f.targetThrottle - f.throttle) * 3, -1, 1) }, dt);
    }
    assert.equal(s.status, 'running', s.reason);
    assert.equal(s.phase, 'orbit');
    assert.ok(seconds > 60 && seconds < 100, `Flight took ${seconds}s`);
    return s;
}
function photograph(s, id) {
    const target = E.TARGETS.find(t => t.id === id);
    Object.assign(s.orbit, { cameraX: target.x, cameraY: target.y, zoom: 3 });
    advance(s, 1.3);
    return E.photo(s);
}
function grid() {
    const s = guided(); photograph(s, 'solar');
    assert.equal(E.enterGrid(s), true);
    return s;
}

test('launch requires the earned road checkpoint and cannot duplicate a live booster', () => {
    const s = E.create(); assert.equal(s.phase, 'road');
    assert.equal(E.launch(s), false); assert.equal(E.retryLaunch(s), false);
    const a = launched(); advance(a, 1);
    const fuel = a.flight.fuel;
    assert.equal(E.launch(a), false); assert.equal(E.retryLaunch(a), false);
    assert.equal(a.flight.fuel, fuel);
    assert.equal(E.jump(a), false);
});

test('manually tracking guidance establishes a bounded orbit at multiple frame rates', () => {
    for (const dt of [1 / 30, 1 / 60, 1 / 120]) {
        const s = guided(dt), f = s.flight;
        assert.ok(f.periapsis >= 100 && f.apoapsis < 1800);
        assert.ok(f.horizontal > 7 && f.horizontal < 9);
        assert.ok(f.altitude > 100 && f.altitude < 400);
        assert.ok(f.fuel > 0 && f.fuel < 100);
        assert.equal(f.throttle, 0);
        assert.match(E.guidance(s), /camera|landmark/);
    }
});

test('pitch and throttle commands change flight; an exhausted booster cannot refill', () => {
    const s = launched(); advance(s, .4, { pitch: -1, throttle: -1 });
    assert.ok(s.flight.pitch < 90); assert.ok(s.flight.throttle < 1);
    const spent = launched();
    Object.assign(spent.flight, { altitude: 130, vertical: .6, horizontal: 3, burnLeft: .01, fuel: .01 });
    advance(spent, 1);
    assert.equal(spent.flight.burnLeft, 0); assert.equal(spent.flight.fuel, 0);
    assert.equal(E.launch(spent), false);
    assert.equal(E.retryLaunch(spent), false);
});

test('bad atmospheric angle bends the structure; aligned high-speed descent burns up', () => {
    const bend = launched();
    Object.assign(bend.flight, { altitude: 8, vertical: 1, horizontal: .2, pitch: 0 });
    advance(bend, 5);
    assert.equal(bend.status, 'lost'); assert.equal(bend.reason, 'maxq');
    assert.equal(bend.flight.stress, 100);
    const burn = launched();
    Object.assign(burn.flight, { altitude: 8, vertical: -.3, horizontal: 3, pitch: -6, throttle: 0, elapsed: 20 });
    advance(burn, 5);
    assert.equal(burn.status, 'lost'); assert.equal(burn.reason, 'burnup');
    assert.equal(burn.flight.heat, 100);
});

test('excess speed escapes, an unpowered launch falls, and retries return to the earned checkpoint', () => {
    const escape = launched();
    Object.assign(escape.flight, { altitude: 200, horizontal: 11.3, vertical: .5 });
    E.step(escape, {}, 1 / 60);
    assert.equal(escape.reason, 'escape');
    const fall = launched(); fall.flight.throttle = 0;
    advance(fall, 5);
    assert.equal(fall.status, 'lost'); assert.equal(fall.reason, 'ballistic');
    assert.equal(E.retryLaunch(fall), true);
    assert.equal(fall.phase, 'ascent'); assert.equal(fall.status, 'running');
    assert.equal(fall.flight.fuel, 100); assert.equal(fall.flight.elapsed, 0);
    assert.equal(fall.x, E.GOAL);
});

test('all mission phases pause without changing any state or accepting mission actions', () => {
    const ascent = launched(), orbit = guided(), power = grid();
    for (const s of [ascent, orbit, power]) {
        s.status = 'paused'; const before = JSON.stringify(s);
        E.step(s, { pitch: -1, throttle: -1, panX: 1, zoom: 1, dispatch: 1, battery: -1 }, 1 / 60);
        assert.equal(E.photo(s), null); assert.equal(E.enterGrid(s), false);
        assert.equal(E.setGrid(s, 0, 1), false);
        assert.equal(JSON.stringify(s), before);
    }
});

test('camera movement and zoom are bounded; clear photos require centered, steady framing', () => {
    const s = guided();
    assert.ok(E.TARGETS.length >= 10);
    for (const t of E.TARGETS) assert.ok(t.x >= 0 && t.x <= 1 && t.y >= 0 && t.y <= 1);
    advance(s, 20, { panX: -1, panY: 1, zoom: 1 });
    assert.equal(s.orbit.cameraX, 0); assert.equal(s.orbit.cameraY, 1); assert.equal(s.orbit.zoom, 5);
    const blurred = E.photo(s); assert.ok(blurred.score < 75);
    const target = E.TARGETS.find(t => t.id === 'reef');
    Object.assign(s.orbit, { cameraX: target.x, cameraY: target.y, zoom: 3 });
    const moving = E.photo(s);
    const clear = photograph(s, 'reef');
    assert.equal(clear.targetId, 'reef'); assert.equal(clear.infra, false);
    assert.ok(clear.score >= 95 && clear.score > moving.score);
    assert.equal(s.orbit.gridOffered, false);
    s.orbit.cameraX += .1;
    assert.ok(E.photo(s).score < clear.score);
});

test('grid interaction requires a well-captured infrastructure photo; ignoring the offer preserves orbit', () => {
    const s = guided(); assert.equal(E.enterGrid(s), false);
    photograph(s, 'reef'); assert.equal(E.enterGrid(s), false);
    const shot = photograph(s, 'solar');
    assert.ok(shot.score >= 75 && shot.infra);
    assert.equal(s.orbit.gridOffered, true);
    advance(s, 2, { panX: 1 });
    assert.equal(s.phase, 'orbit'); assert.ok(s.orbit.photos.length >= 2);
    assert.equal(E.enterGrid(s), true); assert.equal(s.phase, 'grid');
    assert.equal(E.enterGrid(s), false);
});

test('dispatch tracking handles changing demand and completes the balancing mission', () => {
    const s = grid(); let minDemand = Infinity, maxDemand = 0;
    for (let i = 0; i < 40 * 60 && s.status === 'running'; i++) {
        E.setGrid(s, s.grid.targetDispatch, 0);
        E.step(s, {}, 1 / 60);
        minDemand = Math.min(minDemand, s.grid.demand); maxDemand = Math.max(maxDemand, s.grid.demand);
    }
    assert.equal(s.phase, 'return'); assert.equal(s.status, 'briefing');
    assert.ok(s.grid.progress >= 32); assert.ok(s.grid.stability > 80);
    assert.ok(maxDemand - minDemand > 10);
    assert.ok(Math.abs(s.grid.frequency - 50) < .2);
    assert.equal(s.grid.renewable, s.grid.solar + s.grid.wind);
});

test('prolonged mismatch causes blackout and storage obeys physical capacity limits', () => {
    const blackout = grid(); E.setGrid(blackout, 0, 0); advance(blackout, 10);
    assert.equal(blackout.status, 'lost'); assert.equal(blackout.reason, 'blackout');
    const battery = grid(); E.setGrid(battery, -100, 9);
    assert.equal(battery.grid.dispatch, 0); assert.equal(battery.grid.batteryCommand, 1);
    battery.grid.storage = 0; E.step(battery, {}, 1 / 60);
    assert.equal(battery.grid.storage, 0);
    assert.equal(battery.grid.generation, battery.grid.renewable);
    battery.grid.storage = 100; E.setGrid(battery, 50, -1); E.step(battery, {}, 1 / 60);
    assert.equal(battery.grid.storage, 100);
    assert.equal(battery.grid.generation, battery.grid.dispatch + battery.grid.renewable);
});

test('completed balancing loops to a fresh road with a new booster allocation and photo summary', () => {
    const s = grid(); assert.equal(E.nextLoop(s), false);
    for (let i = 0; i < 40 * 60 && s.status === 'running'; i++) {
        E.setGrid(s, s.grid.targetDispatch, 0); E.step(s, {}, 1 / 60);
    }
    assert.equal(E.nextLoop(s), s);
    assert.equal(s.phase, 'road'); assert.equal(s.status, 'ready'); assert.equal(s.loop, 1);
    assert.equal(s.boosterUsed, false); assert.equal(s.x, 0); assert.equal(s.charge, 100);
    assert.equal(s.flight, undefined); assert.equal(s.grid, undefined);
    assert.ok(s.summary.photos.some(p => p.targetId === 'solar'));
    assert.equal(E.launch(s), false);
});
