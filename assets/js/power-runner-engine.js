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
        return { phase: 'road', loop: 0, boosterUsed: false, status: 'ready', x: 0, y: ground(0), vy: 0, grounded: true, charge: 100, gap: 1360, time: 0, speed: 0, drain: 0, mode: 'Cruise', hurt: 0, invulnerable: 0, emptyTime: 0, packs: 0, leaks: 0, notice: '', noticeTime: 0, entities: [], nextPack: 520, nextLeak: 850, seed, reason: '' };
    }
    function random(s) { s.seed = (Math.imul(1664525, s.seed) + 1013904223) >>> 0; return s.seed / 4294967296; }
    function jump(s) {
        if (s.phase !== 'road' || s.status !== 'running' || !s.grounded || s.charge < 3) return false;
        s.vy = -420; s.grounded = false; s.charge -= 3;
        return true;
    }
    function finish(s, reason) { s.status = 'lost'; s.reason = reason; }
    function roadStep(s, controls, dt) {
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
        else if (s.x >= GOAL) { s.x = GOAL; s.phase = 'launch'; s.status = 'briefing'; }
    }

    // Arcade orbital mechanics, using km, km/s and a compressed mission clock.
    const MU = 398600, RADIUS = 6371, THRUST = .075, BURN = 210, FLIGHT_TIME_SCALE = 2.5;
    const TARGETS = Object.freeze([
        { id: 'solar', name: 'Sunflower Solar Fields', kind: 'infra', x: .23, y: .42 },
        { id: 'wind', name: 'Crescent Wind Coast', kind: 'infra', x: .72, y: .31 },
        { id: 'hydro', name: 'Blue Gorge Hydropower', kind: 'infra', x: .61, y: .63 },
        { id: 'city', name: 'Aurora City Grid', kind: 'infra', x: .43, y: .55 },
        { id: 'reef', name: 'Turquoise Reef', kind: 'reef', x: .79, y: .72 },
        { id: 'volcano', name: 'Ember Volcano', kind: 'mountain', x: .14, y: .67 },
        { id: 'delta', name: 'Silver River Delta', kind: 'river', x: .49, y: .29 },
        { id: 'desert', name: 'Golden Dune Sea', kind: 'desert', x: .35, y: .76 },
        { id: 'ice', name: 'Polar Ice Spiral', kind: 'ice', x: .57, y: .12 },
        { id: 'island', name: 'Jade Island Chain', kind: 'island', x: .88, y: .48 },
        { id: 'forest', name: 'Emerald Rainforest', kind: 'forest', x: .31, y: .24 },
        { id: 'crater', name: 'Ancient Impact Basin', kind: 'crater', x: .66, y: .83 }
    ].map(Object.freeze));
    function launch(s) {
        if (s.phase !== 'launch' || s.status !== 'briefing' || s.boosterUsed) return false;
        s.boosterUsed = true; s.phase = 'ascent'; s.status = 'running'; s.reason = '';
        s.flight = { altitude: 0, vertical: 0, horizontal: 0, pitch: 90, targetPitch: 90,
            q: 0, heat: 0, stress: 0, fuel: 100, throttle: 1, targetThrottle: 1,
            elapsed: 0, burnLeft: BURN, apoapsis: 0, periapsis: -RADIUS };
        return true;
    }
    function retryLaunch(s) {
        if (s.phase !== 'ascent' || s.status !== 'lost' || !s.boosterUsed || s.x !== GOAL) return false;
        s.phase = 'launch'; s.status = 'briefing'; s.boosterUsed = false;
        return launch(s);
    }
    function apsides(f) {
        const r = RADIUS + f.altitude, v2 = f.vertical ** 2 + f.horizontal ** 2;
        const energy = v2 / 2 - MU / r, h = r * f.horizontal;
        const eccentricity = Math.sqrt(Math.max(0, 1 + 2 * energy * h * h / (MU * MU)));
        f.periapsis = h * h / (MU * (1 + eccentricity)) - RADIUS;
        f.apoapsis = energy < 0 ? -MU / (2 * energy) * (1 + eccentricity) - RADIUS : Infinity;
        return energy;
    }
    function flightTargets(f) {
        f.targetThrottle = 1;
        if (f.altitude < 24) { f.targetPitch = 90; f.targetThrottle = f.q > 32 ? .35 : 1; return; }
        if (f.altitude < 65) { f.targetPitch = 60; return; }
        if (f.altitude < 110) { f.targetPitch = 35; return; }
        const r = RADIUS + f.altitude;
        const desiredVertical = clamp((190 - f.altitude) * .035, -.2, .7);
        const acceleration = MU / (r * r) - f.horizontal ** 2 / r + (desiredVertical - f.vertical) * .10;
        f.targetPitch = clamp(Math.asin(clamp(acceleration / THRUST, -.95, .95)) * 180 / Math.PI, -45, 75);
    }
    function guidance(s) {
        if (s.phase === 'launch') return 'Launch the one-time booster. Hold a vertical climb through thick air.';
        if (s.phase === 'ascent') {
            const f = s.flight;
            if (f.heat > 65) return 'Heating critical: climb out of dense air and reduce throttle.';
            if (f.stress > 45) return 'Structure bending: point along your velocity and ease throttle.';
            if (!f.burnLeft) return 'Booster spent. Coast and watch your lowest orbital altitude.';
            if (f.altitude < 24) return 'Hold 90 degrees through thick air; ease throttle toward the indicated setting.';
            return `Turn toward ${Math.round(f.targetPitch)} degrees; build sideways speed. Aim for a lowest altitude above 100 km.`;
        }
        if (s.phase === 'orbit') return 'Pan to a landmark, zoom to 3x and steady the camera before taking a photograph.';
        if (s.phase === 'grid') return s.grid.message;
        return 'Reach 1000 m to unlock your orbital booster.';
    }
    function ascentStep(s, c, dt) {
        dt *= FLIGHT_TIME_SCALE;
        const f = s.flight;
        f.elapsed += dt;
        f.pitch = clamp(f.pitch + clamp(Number(c.pitch) || 0, -1, 1) * 24 * dt, -60, 100);
        f.throttle = clamp(f.throttle + clamp(Number(c.throttle) || 0, -1, 1) * .65 * dt, 0, 1);
        const firing = f.burnLeft > 0 ? Math.min(f.throttle, f.burnLeft / dt) : 0;
        f.burnLeft = Math.max(0, f.burnLeft - firing * dt); f.fuel = f.burnLeft / BURN * 100;
        const r = RADIUS + f.altitude, angle = f.pitch * Math.PI / 180;
        const speed = Math.hypot(f.vertical, f.horizontal);
        f.q = 612.5 * Math.exp(-Math.max(0, f.altitude) / 7.2) * speed * speed;
        const drag = f.q * .000025;
        f.vertical += (THRUST * firing * Math.sin(angle) - MU / (r * r) + f.horizontal ** 2 / r - drag * f.vertical / Math.max(speed, .001)) * dt;
        f.horizontal += (THRUST * firing * Math.cos(angle) - f.horizontal * f.vertical / r - drag * f.horizontal / Math.max(speed, .001)) * dt;
        f.altitude += f.vertical * dt;
        const flowAngle = Math.atan2(f.vertical, Math.max(.00001, f.horizontal)) * 180 / Math.PI;
        const incidence = Math.abs(f.pitch - flowAngle);
        f.stress = clamp(f.stress + (Math.max(0, f.q - 10) * Math.max(0, incidence - 12) * .025 - 2) * dt, 0, 100);
        f.heat = clamp(f.heat + (f.q * speed ** 3 * .012 - 1.4) * dt, 0, 100);
        const energy = apsides(f);
        flightTargets(f);
        if (f.stress >= 100) finish(s, 'maxq');
        else if (f.heat >= 100) finish(s, 'burnup');
        else if (energy >= 0 || f.altitude > 3000) finish(s, 'escape');
        else if (f.altitude < -.01 || (f.elapsed > 15 && f.altitude < 75 && f.vertical < -.4) || f.elapsed > 600) finish(s, 'ballistic');
        else if (f.periapsis >= 100 && f.apoapsis < 1800) {
            s.phase = 'orbit'; f.throttle = 0;
            s.orbit = { time: 0, cameraX: .5, cameraY: .5, zoom: 1, photos: [], lastPhoto: null,
                gridOffered: false, steady: 0, motion: 0 };
        }
    }
    function orbitStep(s, c, dt) {
        const o = s.orbit, px = clamp(Number(c.panX) || 0, -1, 1), py = clamp(Number(c.panY) || 0, -1, 1);
        const zoom = clamp(Number(c.zoom) || 0, -1, 1);
        o.time += dt;
        o.cameraX = clamp(o.cameraX + px * .18 / o.zoom * dt, 0, 1);
        o.cameraY = clamp(o.cameraY + py * .18 / o.zoom * dt, 0, 1);
        o.zoom = clamp(o.zoom + zoom * 1.2 * dt, 1, 5);
        o.motion = Math.hypot(px, py) + Math.abs(zoom);
        o.steady = o.motion > .03 ? 0 : Math.min(2, o.steady + dt);
    }
    function photo(s) {
        if (s.phase !== 'orbit' || s.status !== 'running') return null;
        const o = s.orbit;
        const target = TARGETS.reduce((a, b) => Math.hypot(a.x - o.cameraX, a.y - o.cameraY) < Math.hypot(b.x - o.cameraX, b.y - o.cameraY) ? a : b);
        const distance = Math.hypot(target.x - o.cameraX, target.y - o.cameraY);
        const framing = clamp(1 - distance * o.zoom / .22, 0, 1);
        const detail = clamp(1 - Math.abs(o.zoom - 3) / 3, 0, 1);
        const stability = clamp(o.steady / 1.2, 0, 1);
        const score = Math.round(100 * framing * (.45 * detail + .55 * stability));
        const shot = { name: target.name, score, targetId: target.id, infra: target.kind === 'infra', time: o.time };
        o.lastPhoto = shot; o.photos.push(shot);
        if (o.photos.length > 100) o.photos.shift();
        if (shot.infra && score >= 75) o.gridOffered = true;
        return shot;
    }
    function enterGrid(s) {
        if (s.phase !== 'orbit' || s.status !== 'running' || !s.orbit.gridOffered) return false;
        s.phase = 'grid';
        s.grid = { time: 0, demand: 60, renewable: 18, solar: 12, wind: 6, generation: 60, frequency: 50,
            storage: 65, stability: 100, progress: 0, dispatch: 42, targetDispatch: 42, batteryCommand: 0,
            event: 'Normal demand', message: 'Match generation to demand. Store excess power; discharge during shortages.', imbalanceTime: 0 };
        return true;
    }
    function setGrid(s, dispatch, batteryCommand) {
        if (s.phase !== 'grid' || s.status !== 'running') return false;
        if (Number.isFinite(dispatch)) s.grid.dispatch = clamp(dispatch, 0, 100);
        if (Number.isFinite(batteryCommand)) s.grid.batteryCommand = clamp(batteryCommand, -1, 1);
        return true;
    }
    function gridStep(s, c, dt) {
        const g = s.grid; g.time += dt;
        g.dispatch = clamp(g.dispatch + clamp(Number(c.dispatch) || 0, -1, 1) * 18 * dt, 0, 100);
        g.batteryCommand = clamp(g.batteryCommand + clamp(Number(c.battery) || 0, -1, 1) * .8 * dt, -1, 1);
        const surge = g.time >= 12 && g.time < 20 ? 12 : 0;
        g.demand = 60 + 8 * Math.sin(g.time * .35) + surge;
        g.solar = 12 + 4 * Math.sin(g.time * .21);
        g.wind = 6 + 2 * Math.sin(g.time * .21);
        g.renewable = g.solar + g.wind;
        let battery = g.batteryCommand * 18;
        if ((g.storage <= 0 && battery > 0) || (g.storage >= 100 && battery < 0)) battery = 0;
        g.storage = clamp(g.storage - battery * dt * .3, 0, 100);
        g.generation = g.dispatch + g.renewable + battery;
        g.targetDispatch = clamp(g.demand - g.renewable - battery, 0, 100);
        const error = g.generation - g.demand;
        g.frequency += (50 + error * .035 - g.frequency) * Math.min(1, dt * 3);
        g.imbalanceTime = Math.abs(error) > 18 ? g.imbalanceTime + dt : Math.max(0, g.imbalanceTime - dt * 2);
        g.stability = clamp(g.stability + (Math.abs(error) <= 8 ? 3 : -(Math.abs(error) - 8) * .22) * dt, 0, 100);
        if (Math.abs(error) < 9) g.progress = Math.min(32, g.progress + dt);
        g.event = surge ? 'Evening demand surge' : 'Renewables shifting';
        g.message = error < -5 ? 'Shortage: increase dispatch or discharge storage (+).' : error > 5 ? 'Excess: reduce dispatch or charge storage (-).' : 'Balanced: keep tracking demand and renewable output.';
        if (g.stability <= 0 || g.imbalanceTime > 6 || Math.abs(error) > 85) finish(s, 'blackout');
        else if (g.progress >= 32) { s.phase = 'return'; s.status = 'briefing'; }
    }
    function nextLoop(s) {
        if (s.phase !== 'return' || s.status !== 'briefing') return false;
        const fresh = create(s.seed);
        fresh.loop = s.loop + 1;
        fresh.summary = { photos: s.orbit.photos.slice(), stability: s.grid.stability, loops: fresh.loop };
        for (const key of Object.keys(s)) delete s[key];
        Object.assign(s, fresh);
        return s;
    }
    function step(s, controls = {}, dt) {
        if (s.status !== 'running' || !Number.isFinite(dt) || dt <= 0) return;
        dt = Math.min(dt, 1 / 30);
        if (s.phase === 'road') roadStep(s, controls, dt);
        else if (s.phase === 'ascent') ascentStep(s, controls, dt);
        else if (s.phase === 'orbit') orbitStep(s, controls, dt);
        else if (s.phase === 'grid') gridStep(s, controls, dt);
    }
    return { create, step, jump, ground, GOAL, launch, retryLaunch, guidance, TARGETS, photo, enterGrid, setGrid, nextLoop, FLIGHT_TIME_SCALE };

});
