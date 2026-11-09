const {test}=require('node:test');
const assert=require('node:assert/strict');
const engine=require('../assets/js/endless-lab-engine.js');

function running(){const s=engine.create(42);s.mode='running';return s;}
function obstacle(s,kind,extra={}){const h={kind,x:s.x+engine.PLAYER_X+8,w:42,done:false,...extra};s.hazards.push(h);return h;}

test('the course continues beyond the previous finish line and generates deterministically',()=>{
    const a=running(),b=running();a.x=b.x=8001;
    engine.step(a,.05);engine.step(b,.05);
    assert.equal(a.mode,'running');assert.ok(a.x>8001);assert.deepEqual(a,b);
    assert.ok(a.hazards.some(h=>h.x>a.x+engine.WIDTH));
    assert.ok(a.hazards.every(h=>h.x-a.x>-150));
    a.x=800001;engine.step(a,.05);assert.equal(a.mode,'running');
});
test('jump clearance and sliding are different actions',()=>{
    const standing=running();obstacle(standing,'banner');engine.step(standing,0);assert.equal(standing.charge,70);
    const sliding=running();sliding.slide=true;obstacle(sliding,'banner');engine.step(sliding,0);assert.equal(sliding.charge,100);
    const airborne=running();airborne.y=90;obstacle(airborne,'component');engine.step(airborne,0);assert.equal(airborne.charge,100);
    const ground=running();ground.slide=true;obstacle(ground,'component');engine.step(ground,0);assert.equal(ground.charge,70);
});
test('a pulse consumes charge, clears noise, and cannot clear solid obstacles',()=>{
    const s=running(),noise=obstacle(s,'noise'),solid=obstacle(s,'component');
    assert.equal(engine.pulse(s),true);assert.equal(s.charge,84);assert.equal(noise.done,true);assert.equal(solid.done,false);
    assert.equal(engine.pulse(s),false);assert.equal(s.charge,84);
    s.pulseCooldown=0;s.charge=15;assert.equal(engine.pulse(s),false);
});
test('batteries refill charge and completed sketches reward collecting ideas',()=>{
    const s=running();s.charge=50;obstacle(s,'cell',{y:17});engine.step(s,0);assert.equal(s.charge,68);
    const before=s.gap;s.y=65;
    for(let i=0;i<3;i++){obstacle(s,'idea',{y:80});engine.step(s,0);}
    assert.equal(s.ideas,3);assert.equal(s.sketches,1);assert.equal(s.charge,82);assert.ok(s.gap>before);
});
test('the chase responds to speed, hits, and escapes',()=>{
    const s=running(),initial=s.gap;engine.step(s,.05);assert.ok(s.gap>initial);
    const before=s.gap;obstacle(s,'component');engine.step(s,0);assert.ok(s.gap<before);
    s.hitTime=0;s.hazards=[];s.gap=286;engine.step(s,.05);assert.equal(s.escaped,1);assert.ok(s.clearTime>0);
    s.lastSpawn=1e9;s.charge=100;
    for(let i=0;i<225;i++)engine.step(s,.05);
    assert.equal(s.clearTime,0);assert.ok(s.gap>0);assert.equal(s.mode,'running');
});
test('short hops, pause, game over, and invalid steps behave consistently',()=>{
    const s=running();assert.equal(engine.jump(s),true);engine.releaseJump(s);assert.equal(s.vy,320);
    engine.step(s,.01);assert.equal(engine.jump(s),false);
    s.mode='paused';const x=s.x;engine.step(s,1);assert.equal(s.x,x);
    s.mode='running';assert.throws(()=>engine.step(s,NaN),RangeError);assert.throws(()=>engine.step(s,-1),RangeError);
    s.charge=0;engine.step(s,0);assert.equal(s.mode,'over');
});
