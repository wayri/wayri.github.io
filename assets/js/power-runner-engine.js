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
        return { phase: 'road', roadStage: 'chase', loop: 0, boosterUsed: false, status: 'ready', x: 0, y: ground(0), vy: 0, grounded: true, charge: 100, gap: 420, time: 0, speed: 120, drain: 0, mode: 'Cruise', hurt: 0, invulnerable: 0, emptyTime: 0, packs: 0, leaks: 0, escaped: 0, combo: 0, notice: '', noticeTime: 0, entities: [], nextPack: 460, nextLeak: 900, seed, reason: '',
            chasers: [
                { id: 'bugs', name: 'BUGS', type: 'sprinter', x: -520, speed: 120, state: 'pursuing', escaped: false, stun: 0 },
                { id: 'review', name: 'REVIEW', type: 'tracker', x: -420, speed: 148, state: 'pursuing', escaped: false, stun: 0 },
                { id: 'mail', name: 'MAIL', type: 'jammer', x: -690, speed: 142, state: 'pursuing', escaped: false, stun: 0, pulse: 0 }
            ] };
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
        const brake = !!controls.brake;
        const boost = !!controls.boost && !brake && s.charge > 0;
        const eco = !!controls.eco && !boost && !brake;
        s.roadStage = s.x >= GOAL - 1000 ? 'approach' : 'chase';
        s.mode = brake ? 'Brake' : boost ? 'Boost' : eco ? 'Eco' : 'Cruise';
        const uphill = ground(s.x + 5) < ground(s.x);
        let targetSpeed = (brake ? 25 : boost ? 310 : eco ? 115 : 175) * (uphill ? .9 : 1.02);
        if (s.hurt > 0) targetSpeed *= .35;
        const acceleration = brake ? 260 : boost ? 160 : 100;
        s.speed += clamp(targetSpeed - s.speed, -acceleration * dt, acceleration * dt);
        s.drain = (brake ? .25 : boost ? 5.3 : eco ? .6 : 1.55) + (uphill ? .25 : 0);
        s.charge = Math.max(0, s.charge - s.drain * dt);
        if (s.charge === 0) { s.speed = 35; s.emptyTime += dt; }
        else s.emptyTime = 0;
        const travelled = s.speed * dt;
        const previousX = s.x;
        s.x += travelled;
        // Pursuers occupy world positions: accelerating really opens a gap.
        // Their different tactics are readable and all can be permanently escaped.
        for (const chaser of s.chasers) {
            if (chaser.escaped) continue;
            chaser.stun = Math.max(0, chaser.stun - dt);
            const burst = chaser.type === 'sprinter' && s.time % 14 > 9;
            chaser.state = chaser.stun > 0 ? 'stunned' : burst ? 'sprint' : 'pursuing';
            chaser.speed = chaser.stun > 0 ? 35 : chaser.type === 'sprinter' ? (burst ? 270 : 124) : chaser.type === 'tracker' ? 151 : 141;
            // The launch perimeter has a security fence; arrive with a real lead.
            chaser.x = Math.min(GOAL - 640, chaser.x + chaser.speed * dt);
            const separation = s.x - chaser.x;
            if (separation > 1150) {
                chaser.escaped = true; chaser.state = 'escaped'; s.escaped++;
                s.notice = `${chaser.name} lost your trail!`; s.noticeTime = 2;
            }
            if (chaser.type === 'jammer') {
                chaser.pulse = Math.max(0, chaser.pulse - dt);
                if (separation < 270 && chaser.pulse === 0) {
                    s.charge = Math.max(0, s.charge - 5); chaser.pulse = 7;
                    s.notice = 'MAIL jam: −5% · pull away'; s.noticeTime = 1.6;
                }
            }
        }
        const active = s.chasers.filter(chaser => !chaser.escaped);
        s.gap = active.length ? Math.min(...active.map(chaser => s.x - chaser.x)) : 2200;
        if (s.grounded) s.y = ground(s.x);
        else { s.vy += 1000 * dt; s.y += s.vy * dt; if (s.y >= ground(s.x)) { s.y = ground(s.x); s.vy = 0; s.grounded = true; } }
        while (s.nextPack < s.x + 1400) {
            s.entities.push({ type: 'pack', x: s.nextPack, lift: random(s) > .65 ? 85 : 28, used: false });
            s.nextPack += 660 + random(s) * 260;
        }
        while (s.nextLeak < s.x + 1400) {
            const types = ['leak', 'crate', 'slick', 'gate', 'solar', 'drone'];
            if (s.nextLeak < GOAL - 1100) s.entities.push({ type: types[Math.floor(random(s) * types.length)], x: s.nextLeak, lift: 0, used: false });
            s.nextLeak += 410 + random(s) * 300;
        }
        for (const item of s.entities) {
            if (item.used) continue;
            if (item.type === 'drone') item.active = Math.sin(s.time * 1.8 + item.x * .01) > .25;
            const nearby = item.x >= previousX - 30 && item.x <= s.x + 30;
            if (nearby && item.type === 'pack' && Math.abs((s.y - 19) - (ground(item.x) - item.lift)) < 35) {
                item.used = true; s.charge = Math.min(100, s.charge + 20); s.packs++; s.combo++;
                s.notice = '+20% charge'; s.noticeTime = 1.2;
            } else if (nearby && item.type !== 'pack' && item.x >= previousX - 24 && item.x <= s.x + 24) {
                const low = s.y > ground(item.x) - 30;
                if (item.type === 'solar' && low) {
                    item.used = true; s.charge = Math.min(100, s.charge + (boost ? 5 : 12));
                    s.notice = boost ? '+5% · solar strip rushed' : '+12% · solar strip'; s.noticeTime = 1.4;
                } else if (s.invulnerable === 0 && (item.type === 'drone' ? item.active : item.type === 'gate' ? !low : low)) {
                    item.used = true; s.charge = Math.max(0, s.charge - (item.type === 'slick' ? 3 : item.type === 'crate' ? 10 : 14));
                    s.hurt = item.type === 'slick' ? 1.6 : .8; s.invulnerable = 1.1; s.leaks++; s.combo = 0;
                    s.notice = { slick: 'Coolant spill! Grip lost', crate: 'Cargo collision!', gate: 'Low gantry! Stay on the ground', leak: 'Arc fault! −14%', drone: 'Scanner lock! Time the dark interval' }[item.type]; s.noticeTime = 1.6;
                }
            }
            // Clear an obstacle cleanly and it slows any pursuer on the same road.
            if (!item.used && item.type !== 'pack' && item.type !== 'solar' && s.x > item.x + 26) {
                item.used = true; s.combo++;
                for (const chaser of s.chasers) if (!chaser.escaped && chaser.x < item.x) chaser.stun = Math.max(chaser.stun, item.type === 'gate' ? 1 : 2);
                s.notice = `Clean pass ×${s.combo} · pursuers delayed`; s.noticeTime = 1.1;
            }
        }
        s.entities = s.entities.filter(item => item.x > s.x - 120);
        if (s.gap < 28) finish(s, 'backlog');
        else if (s.emptyTime >= 2) finish(s, 'battery');
        else if (s.x >= GOAL) {
            s.x = GOAL;
            if (s.speed > 72 || !s.grounded) finish(s, 'dock-crash');
            else { s.phase = 'boarding'; s.boarding = { elapsed: 0, progress: 0 }; s.mode = 'Docked'; }
        }
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
            q: 0, maxQ: 0, mach: 0, incidence: 0, heat: 0, stress: 0, fuel: 100, throttle: .75, targetThrottle: 1,
            countdown: 3, downrange: 0, orbitalAngle: 0, elapsed: 0, burnLeft: BURN, apoapsis: 0, periapsis: -RADIUS };
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
        if (s.phase === 'boarding') return 'Docking clamps engaged. Rover boarding the launch vehicle.';
        if (s.phase === 'launch') return 'Launch the one-time booster. Hold a vertical climb through thick air.';
        if (s.phase === 'ascent') {
            const f = s.flight;
            if (f.countdown > 0) return `Ignition in ${Math.ceil(f.countdown)}. Set throttle above 20%; hold 90° for liftoff.`;
            if (f.heat > 65) return 'Heating critical: climb out of dense air and reduce throttle.';
            if (f.stress > 45) return 'Structure bending: point along your velocity and ease throttle.';
            if (!f.burnLeft) return 'Booster spent. Coast and watch your lowest orbital altitude.';
            if (f.altitude < 24) return 'Hold 90 degrees through thick air; ease throttle toward the indicated setting.';
            return `Turn toward ${Math.round(f.targetPitch)} degrees; build sideways speed. Aim for a lowest altitude above 100 km.`;
        }
        if (s.phase === 'orbit') return 'A bound orbit is established. Track altitude and velocity; pan to a landmark, zoom to 3x and steady the camera for a photograph.';
        if (s.phase === 'grid') return s.grid.message;
        if (s.roadStage === 'approach') return `Launch hangar ahead: hold Brake (←). Enter below 9 m/s, wheels on the road. Current speed ${(s.speed / 8).toFixed(1)} m/s.`;
        const incoming = s.entities.find(item => !item.used && item.type !== 'pack' && item.x > s.x && item.x - s.x < 420);
        if (incoming) return { gate: 'Low gantry ahead: stay on the ground. Jumping here hits the beam.', solar: 'Solar charging strip ahead: stay grounded and slow down for more charge.', crate: 'Cargo crates ahead: jump them to delay the pursuers.', slick: 'Coolant spill ahead: jump it or lose grip.', leak: 'Arc fault ahead: jump the sparking cable.', drone: 'Patrol scanner ahead: brake to time its dark interval, then boost through. Jumping will not dodge the scan.' }[incoming.type];
        return 'BUGS sprints; REVIEW tracks steadily; MAIL drains charge nearby. Boost to lose them, clear hazards to delay them. Brake before the launch hangar.';
    }
    function ascentStep(s, c, dt) {
        s.time += dt;
        dt *= FLIGHT_TIME_SCALE;
        const f = s.flight;
        if (f.countdown > 0) {
            f.countdown = Math.max(0, f.countdown - dt / FLIGHT_TIME_SCALE);
            f.throttle = clamp(f.throttle + clamp(Number(c.throttle) || 0, -1, 1) * .65 * dt, 0, 1);
            return;
        }
        f.elapsed += dt;
        f.pitch = clamp(f.pitch + clamp(Number(c.pitch) || 0, -1, 1) * 24 * dt, -60, 100);
        f.throttle = clamp(f.throttle + clamp(Number(c.throttle) || 0, -1, 1) * .65 * dt, 0, 1);
        const firing = f.burnLeft > 0 ? Math.min(f.throttle, f.burnLeft / dt) : 0;
        f.burnLeft = Math.max(0, f.burnLeft - firing * dt); f.fuel = f.burnLeft / BURN * 100;
        const r = RADIUS + f.altitude, angle = f.pitch * Math.PI / 180;
        const speed = Math.hypot(f.vertical, f.horizontal);
        f.q = 612.5 * Math.exp(-Math.max(0, f.altitude) / 7.2) * speed * speed;
        f.maxQ = Math.max(f.maxQ, f.q); f.mach = speed / .32;
        const drag = f.q * .000025;
        f.vertical += (THRUST * firing * Math.sin(angle) - MU / (r * r) + f.horizontal ** 2 / r - drag * f.vertical / Math.max(speed, .001)) * dt;
        f.horizontal += (THRUST * firing * Math.cos(angle) - f.horizontal * f.vertical / r - drag * f.horizontal / Math.max(speed, .001)) * dt;
        f.altitude += f.vertical * dt;
        f.downrange += f.horizontal * dt; f.orbitalAngle += f.horizontal / r * dt;
        const flowAngle = Math.atan2(f.vertical, Math.max(.00001, f.horizontal)) * 180 / Math.PI;
        const incidence = Math.abs(f.pitch - flowAngle);
        f.incidence = incidence;
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
                gridOffered: false, steady: 0, motion: 0,
                craft: { x: RADIUS + f.altitude, y: 0, vx: f.vertical, vy: f.horizontal },
                track: { angle: 0, altitude: f.altitude, speed: Math.hypot(f.vertical, f.horizontal), period: 0, progress: 0 }, trajectory: [] };
        }
    }
    function orbitStep(s, c, dt) {
        const o = s.orbit, px = clamp(Number(c.panX) || 0, -1, 1), py = clamp(Number(c.panY) || 0, -1, 1);
        const zoom = clamp(Number(c.zoom) || 0, -1, 1);
        o.time += dt;
        // Velocity-Verlet propagation under central gravity, in km and km/s.
        // The mission clock is accelerated; photography controls remain real-time.
        const craft = o.craft, orbitalDt = dt * 45;
        if (craft) {
            const r0 = Math.hypot(craft.x, craft.y), a0 = -MU / r0 ** 3;
            craft.x += craft.vx * orbitalDt + .5 * a0 * craft.x * orbitalDt ** 2;
            craft.y += craft.vy * orbitalDt + .5 * a0 * craft.y * orbitalDt ** 2;
            const r1 = Math.hypot(craft.x, craft.y), a1 = -MU / r1 ** 3;
            // Reconstruct the old position for the trapezoidal acceleration.
            const oldX = (craft.x - craft.vx * orbitalDt) / (1 + .5 * a0 * orbitalDt ** 2);
            const oldY = (craft.y - craft.vy * orbitalDt) / (1 + .5 * a0 * orbitalDt ** 2);
            craft.vx += .5 * (a0 * oldX + a1 * craft.x) * orbitalDt;
            craft.vy += .5 * (a0 * oldY + a1 * craft.y) * orbitalDt;
            const radial = (craft.x * craft.vx + craft.y * craft.vy) / r1;
            const tangential = (craft.x * craft.vy - craft.y * craft.vx) / r1;
            Object.assign(s.flight, { altitude: r1 - RADIUS, vertical: radial, horizontal: tangential });
            const energy = apsides(s.flight), semiMajor = energy < 0 ? -MU / (2 * energy) : Infinity;
            const angle = Math.atan2(craft.y, craft.x);
            Object.assign(o.track, { angle, altitude: r1 - RADIUS, speed: Math.hypot(craft.vx, craft.vy), period: 2 * Math.PI * Math.sqrt(semiMajor ** 3 / MU), progress: o.time * 45 });
            if (r1 < RADIUS + 75) { finish(s, 'burnup'); return; }
            if (energy >= 0) { finish(s, 'escape'); return; }
            if (!o.trajectory.length || Math.floor(o.time * 2) !== Math.floor((o.time - dt) * 2)) {
                const f = s.flight, h = r1 * tangential, eccentricity = Math.sqrt(Math.max(0, 1 + 2 * energy * h * h / MU ** 2));
                const eX = ((craft.vy * h) / MU - craft.x / r1), eY = ((-craft.vx * h) / MU - craft.y / r1), rotation = Math.atan2(eY, eX);
                o.trajectory = Array.from({ length: 97 }, (_, i) => { const theta = i / 96 * Math.PI * 2, radius = h * h / MU / (1 + eccentricity * Math.cos(theta)); return { x: radius * Math.cos(theta + rotation), y: radius * Math.sin(theta + rotation) }; });
            }
        }
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
        else if (s.phase === 'boarding') {
            s.time += dt; s.boarding.elapsed += dt; s.boarding.progress = clamp(s.boarding.elapsed / 2.8, 0, 1);
            if (s.boarding.progress >= 1) { s.phase = 'launch'; s.status = 'briefing'; }
        }
        else if (s.phase === 'ascent') ascentStep(s, controls, dt);
        else if (s.phase === 'orbit') orbitStep(s, controls, dt);
        else if (s.phase === 'grid') gridStep(s, controls, dt);
    }
    return { create, step, jump, ground, GOAL, launch, retryLaunch, guidance, TARGETS, photo, enterGrid, setGrid, nextLoop, FLIGHT_TIME_SCALE };

});
