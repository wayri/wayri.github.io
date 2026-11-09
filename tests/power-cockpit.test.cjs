const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const E=require('../assets/js/power-runner-engine.js');
const pad=()=>Object.assign(E.create(),{x:E.GOAL,phase:'launch',status:'briefing'});
function advance(s,seconds,c={}){for(let i=0;i<seconds*60&&s.status==='running';i++)E.step(s,c,1/60);}
function flight(){const s=pad();assert.ok(E.authorizeLaunch(s,'wayri'));assert.ok(E.launch(s));return s;}
test('launch requires wayri at the earned pad and never consumes fuel on rejection',()=>{
    const s=pad();assert.equal(E.launch(s),false);
    assert.equal(E.authorizeLaunch(s,'wrong'),false);assert.equal(E.launch(s),false);
    assert.equal(s.flight,undefined);assert.equal(s.boosterUsed,false);
    assert.equal(E.authorizeLaunch(s,'wayri'),true);assert.equal(E.launch(s),true);
    assert.equal(s.flight.altitude,0);assert.equal(s.flight.onPad,true);
    const road=E.create();assert.equal(E.authorizeLaunch(road,'wayri'),false);
    const unearned=pad();unearned.x=0;assert.equal(E.authorizeLaunch(unearned,'wayri'),false);
});
test('cutting throttle on the countdown holds the vehicle on the actual pad until throttle is raised',()=>{
    const s=flight();advance(s,4,{throttle:-1});
    assert.equal(s.status,'running');assert.equal(s.flight.onPad,true);assert.equal(s.flight.altitude,0);assert.equal(s.flight.fuel,100);
    advance(s,2,{throttle:1});assert.equal(s.flight.onPad,false);assert.ok(s.flight.altitude>0);
});
test('flight director reaches a low bound orbit with reasonable velocity and retains manual failure modes',()=>{
    const s=flight();for(let i=0;i<145*60&&s.phase==='ascent'&&s.status==='running';i++)E.step(s,{assist:true},1/60);
    assert.equal(s.phase,'orbit',s.reason);assert.equal(s.status,'running');
    assert.ok(s.flight.periapsis>=100&&s.flight.apoapsis<400);
    assert.ok(s.flight.horizontal>7.5&&s.flight.horizontal<8.1);
    assert.ok(s.flight.altitude>100&&s.flight.altitude<250);
});
test('rocket pursuers are a delayed surprise and decoys have a real charge cost and cooldown',()=>{
    const s=flight();s.flight.countdown=0;s.flight.onPad=false;
    E.step(s,{assist:true},1/60);assert.equal(s.flight.pursuit.revealed,false);
    Object.assign(s.flight,{altitude:25,vertical:.6,horizontal:1});
    E.step(s,{},1/60);assert.equal(s.flight.pursuit.revealed,true);
    const before=s.flight.pursuit.range,charge=s.charge;
    E.step(s,{decoy:true},1/60);assert.ok(s.flight.pursuit.range>before+15);assert.equal(s.charge,charge-8);
    E.step(s,{decoy:true},1/60);assert.equal(s.charge,charge-8);
});
test('rocket attackers have distinct closing rates, inflict hull damage and can be countered',()=>{
    const s=flight(),f=s.flight,p=f.pursuit;s.time=7;
    Object.assign(f,{countdown:0,onPad:false,altitude:150,vertical:0,horizontal:7,throttle:0});
    p.contacts.forEach(c=>c.range=15);E.step(s,{},1/60);
    assert.ok(p.contacts[0].range<p.contacts[1].range&&p.contacts[1].range<p.contacts[2].range);
    assert.equal(p.contacts[0].state,'LUNGING');
    p.contacts[0].range=1;E.step(s,{},1/60);assert.equal(p.hits,1);assert.equal(p.hull,82);assert.ok(p.flash>0);
    const before=p.contacts.map(c=>c.range);E.step(s,{decoy:true},1/60);p.contacts.forEach((c,i)=>assert.ok(c.range>before[i]+15));
    p.hull=18;p.contacts[0].range=1;E.step(s,{},1/60);assert.equal(s.reason,'intercept');assert.equal(s.status,'lost');
    assert.ok(E.retryLaunch(s));assert.equal(s.flight.pursuit.hull,100);
});
test('2D road exposes every visible hazard and pickup without hidden lane steering',()=>{
    const s=Object.assign(E.create(),{status:'running',nextPack:Infinity,nextLeak:Infinity});
    advance(s,.4,{steer:1});assert.equal(s.lane,0);
    s.entities=[{type:'crate',x:s.x+2,lane:-.65,used:false}];E.step(s,{},1/60);assert.equal(s.leaks,1);
    Object.assign(s,{x:E.GOAL-1,speed:30,lane:.8});advance(s,.1,{brake:true});assert.equal(s.phase,'boarding');
});
test('ground minions consume and revisit real battery depots; world freezes on pause and appears in photographs',()=>{
    const s=Object.assign(E.create(),{status:'running',nextPack:Infinity,nextLeak:Infinity});
    advance(s,10);assert.ok(s.groundWorld.eaten>0);
    s.status='paused';const before=JSON.stringify(s.groundWorld);E.step(s,{},1/30);assert.equal(JSON.stringify(s.groundWorld),before);
    s.status='running';s.phase='orbit';s.orbit={time:0,cameraX:.23,cameraY:.42,zoom:3,steady:2,photos:[]};
    const photo=E.photo(s);assert.ok(photo.raiders>=3);assert.equal(photo.targetId,'solar');
});
test('cockpit and camera scenes render finite coordinates at narrow and desktop widths',()=>{
    const window={PowerRunner:E};vm.runInNewContext(fs.readFileSync(require.resolve('../assets/js/power-cockpit-scenes.js'),'utf8'),{window});
    let calls=0;const check=(...args)=>{for(const a of args)if(typeof a==='number')assert.ok(Number.isFinite(a),String(args));calls++;};
    const c=new Proxy({createLinearGradient:()=>({addColorStop:check}),measureText:t=>({width:t.length*7})},{get:(o,k)=>k in o?o[k]:check,set:(o,k,v)=>(o[k]=v,true)});
    const p={};
    for(const width of [320,900])for(const phase of ['road','boarding','launch','ascent']){
        const s=phase==='ascent'?flight():E.create();s.phase=phase;if(phase==='boarding')s.boarding={progress:.6};
        window.PowerCockpitScenes.draw(c,width,500,s,p,{reducedMotion:true});
    }
    const s=E.create();s.orbit={cameraX:.23,cameraY:.42,zoom:3};window.PowerCockpitScenes.groundActivity(c,900,500,s);
    assert.ok(calls>1000);
});
test('cockpit projection points up on the pad and depresses the visible horizon with altitude',()=>{
    const window={PowerRunner:E};vm.runInNewContext(fs.readFileSync(require.resolve('../assets/js/power-cockpit-scenes.js'),'utf8'),{window});
    const project=window.PowerCockpitScenes.attitude;
    const pad=project(900,600,{pitch:90,altitude:0});
    assert.ok(pad.horizon>600,'the ground must be outside the upward-facing windshield');
    assert.equal(pad.y(90),pad.centre);
    assert.ok(project(900,600,{pitch:90,altitude:30},{yaw:180,pitch:0}).horizon<0,'looking aft during vertical climb points down toward the planet');
    const level=project(900,600,{pitch:0,altitude:0}),orbit=project(900,600,{pitch:0,altitude:180});
    assert.equal(level.horizon,level.centre);assert.ok(orbit.horizon>level.horizon);
    assert.ok(orbit.horizon<600*.76,'the planet limb remains visible when looking horizontally in orbit');
    assert.ok(project(900,600,{pitch:30,altitude:0}).y(40)<pad.centre,'higher elevations are above the nose');
});
test('insertion guidance distinguishes vertical braking, orbital speed build-up and engine cutoff',()=>{
    const s=flight(),f=s.flight;Object.assign(f,{onPad:false,countdown:0,altitude:175,vertical:.3,horizontal:Math.sqrt(398600/6546),periapsis:-90,apoapsis:470});
    let advice=E.flightAdvice(s);assert.match(advice.instruction,/Arrest vertical/);assert.ok(Math.abs(advice.sidewaysDelta)<.001);
    f.horizontal=6;assert.match(E.flightAdvice(s).instruction,/Build sideways/);
    Object.assign(f,{periapsis:110,apoapsis:280});assert.equal(E.flightAdvice(s).orbitSecure,true);assert.match(E.flightAdvice(s).instruction,/Cut off/);
    f.apoapsis=Infinity;assert.equal(E.flightAdvice(s).orbitSecure,false);
    Object.assign(f,{burnLeft:0,periapsis:-100,apoapsis:600});assert.match(E.flightAdvice(s).instruction,/Booster empty/);
});
test('road, cockpit, trajectory and imaging displays render without mutating the mission',()=>{
    const window={PowerRunner:E};for(const name of ['power-cockpit-scenes.js','power-mission-scenes.js'])vm.runInNewContext(fs.readFileSync(require.resolve('../assets/js/'+name),'utf8'),{window});
    let calls=0;const check=(...args)=>{args.forEach(a=>{if(typeof a==='number')assert.ok(Number.isFinite(a));});calls++;};
    const c=new Proxy({createLinearGradient:()=>({addColorStop:check}),measureText:t=>({width:t.length*7})},{get:(o,k)=>k in o?o[k]:check,set:(o,k,v)=>(o[k]=v,true)});
    const p={dark:true,accent:'#d4af37',ink:'#ede8dc',muted:'#9faeaf',sky:'#101923',horizon:'#1c2c34',mountain:'#263a40',soil:'#252d29',edge:'#687b6a'};
    for(const width of [320,1100])for(const s of [E.create(),pad(),flight()])for(const displayMode of ['flight','map']){
        const before=JSON.stringify(s);window.PowerMissionScenes.draw(c,width,600,s,p,{displayMode,look:{yaw:70,pitch:-45},reducedMotion:true});assert.equal(JSON.stringify(s),before);
    }
    assert.ok(calls>1000);
});
test('controller enforces launch access, look-around and mode gating without resetting flight',()=>{
    const ids=[...fs.readFileSync(require.resolve('../_includes/power-runner.html'),'utf8').matchAll(/id="([^"]+)"/g)].map(m=>m[1]);
    const elements=new Map();let state,lastView,lastLook;
    class Element {
        constructor(id=''){this.id=id;this.hidden=false;this.value='';this.style={};this.dataset={};this.handlers={};this.attrs={};this.children=[];this.classList={add(){},remove(){},toggle(){}};}
        addEventListener(n,fn){(this.handlers[n]??=[]).push(fn);}
        fire(n,event={}){for(const fn of this.handlers[n]||[])fn({preventDefault(){},...event});}
        setAttribute(n,v){this.attrs[n]=v;} removeAttribute(n){delete this.attrs[n];}
        querySelector(s){return elements.get(s.slice(1));} querySelectorAll(){return [];}
        replaceChildren(...c){this.children=c;if(this.id==='runner-target')this.value=c[0]?.value||'';}
        append(...c){this.children.push(...c);} focus(){} getBoundingClientRect(){return{width:900,height:500};}
        setPointerCapture(){}
        getContext(){return{setTransform(){},clearRect(){}};}
    }
    for(const id of ids)elements.set(id,new Element(id));
    const document={getElementById:id=>elements.get(id),createElement:()=>new Element(),body:{style:{}},documentElement:{dataset:{theme:'dark'}},addEventListener(){}};
    const engine={...E,create(seed){state=Object.assign(E.create(seed),{x:E.GOAL,phase:'launch',status:'briefing'});return state;}};
    const window={PowerRunner:engine,PowerMissionScenes:{draw(c,w,h,s,p,options){lastView=options.displayMode;lastLook={...options.look};}},matchMedia:()=>({matches:false}),addEventListener(){},devicePixelRatio:1};
    class ResizeObserver{observe(){}}
    class IntersectionObserver{constructor(fn){this.fn=fn;}observe(){this.fn([{isIntersecting:true}]);}}
    vm.runInNewContext(fs.readFileSync(require.resolve('../assets/js/power-runner.js'),'utf8'),{document,window,ResizeObserver,IntersectionObserver,localStorage:{getItem(){return null;},setItem(){}},getComputedStyle:()=>({getPropertyValue:()=> '#d4af37'}),requestAnimationFrame:()=>1,cancelAnimationFrame(){},location:{hash:''}});
    const start=elements.get('runner-start'),input=elements.get('runner-launch-code'),unlock=elements.get('runner-unlock');
    assert.equal(start.disabled,true);assert.equal(elements.get('runner-launch-access').hidden,false);
    start.fire('click');assert.equal(state.phase,'launch');assert.equal(elements.get('runner-overlay').hidden,false);
    input.value='no';unlock.fire('click');assert.equal(start.disabled,true);assert.match(elements.get('runner-unlock-status').textContent,/Incorrect/);
    input.value='wayri';unlock.fire('click');assert.equal(start.disabled,false);assert.equal(input.value,'');
    start.fire('click');assert.equal(state.phase,'ascent');assert.equal(state.flight.altitude,0);assert.equal(elements.get('runner-overlay').hidden,true);
    const before=JSON.stringify(state),map=elements.get('runner-mode-map'),cockpit=elements.get('runner-mode-flight'),imaging=elements.get('runner-mode-imaging'),canvas=elements.get('runner-canvas');
    assert.equal(lastView,'flight');imaging.fire('click');assert.equal(lastView,'flight');
    map.fire('click');assert.equal(lastView,'map');assert.equal(map.attrs['aria-pressed'],'true');assert.equal(JSON.stringify(state),before);
    cockpit.fire('click');assert.equal(lastView,'flight');assert.equal(JSON.stringify(state),before);
    canvas.fire('pointerdown',{pointerId:1,clientX:100,clientY:100});canvas.fire('pointermove',{pointerId:1,clientX:300,clientY:150});
    assert.equal(lastLook.yaw,-36);assert.equal(lastLook.pitch,9);assert.equal(JSON.stringify(state),before,'looking must never steer or burn propellant');
    elements.get('runner-recenter').fire('click');assert.equal(lastLook.yaw,0);assert.equal(lastLook.pitch,0);
    for(let i=0;i<145*60&&state.phase==='ascent';i++)E.step(state,{assist:true},1/60);
    assert.equal(state.phase,'orbit');imaging.fire('click');assert.equal(lastView,'imaging');
    const oldCamera=state.orbit.cameraX;canvas.fire('pointerdown',{pointerId:2,clientX:100,clientY:100});canvas.fire('pointermove',{pointerId:2,clientX:180,clientY:140});
    assert.ok(state.orbit.cameraX<oldCamera);assert.equal(state.orbit.steady,0);
    map.fire('click');assert.equal(lastView,'map');assert.equal(state.phase,'orbit');
});
