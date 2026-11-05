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
    const distance = panel.querySelector('#runner-metric');
    const $ = id => panel.querySelector('#runner-' + id);
    const gap = panel.querySelector('#runner-gap');
    const mode = panel.querySelector('#runner-mode');
    const bestText = panel.querySelector('#runner-best');
    const controls = {}, held = new Map();
    let failureTime=0, flash=0, photos=[], currentPhase='road', cameraActive=false;
    const newRun = () => engine.create(Math.floor(Math.random()*0x100000000));
    let state = newRun(), width = 800, height = 360, visible = false, frame = 0, lastTime = 0, accumulator = 0, hudTime = 0;
    let best = 0, palette;
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
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    function draw() {
        if (!palette) return;
        ctx.clearRect(0, 0, width, height);
        window.PowerMissionScenes.draw(ctx,width,height,state,palette,{
            failureTime, selectedTarget:$('target').value, flash,
            reducedMotion:reducedMotion.matches, controls, cameraActive
        });
    }

    const fmt=(n,d=1)=>Number.isFinite(n)?n.toFixed(d):'escape';
    function say(v){if($('guidance').textContent!==v)$('guidance').textContent=v;}
    function labels(...v){['charge','metric','gap','mode'].forEach((k,i)=>$(k+'-label').textContent=v[i]);}
    function updateHud(){
        $('loops').textContent=state.loop;
        if(['road','boarding'].includes(state.phase)){
            labels('Charge','Distance','Backlog gap','Power mode');charge.value=state.charge;chargeText.textContent=`${Math.ceil(state.charge)}%`;
            distance.textContent=`${Math.min(1000,Math.floor(state.x/8))} / 1,000 m`;gap.textContent=state.chasers.every(c=>c.escaped)?'Clear':`${Math.max(0,Math.floor(state.gap/8))} m`;mode.textContent=`${state.mode} · ${state.drain.toFixed(1)}%/s`;say(engine.guidance(state));
            $('speed').textContent=`${fmt(state.speed/8,1)} m/s`;
            $('road-detail').textContent=state.roadStage==='approach'?'Approach: brake before entering the cargo bay.':`${state.packs} packs · ${state.escaped||0} escapes`;
            $('pursuers').replaceChildren(...(state.chasers||[]).map(c=>{const li=document.createElement('li');li.textContent=`${c.name||c.id}: ${c.escaped?'escaped':`${Math.max(0,Math.floor((state.x-c.x)/8))} m`}`;return li;}));
        }else if(['ascent','launch'].includes(state.phase)){
            labels('Booster fuel','Altitude','Pitch → target','Throttle → target');
            const f=state.flight||{fuel:100,altitude:0,q:0,pitch:90,targetPitch:90,throttle:1,targetThrottle:1,horizontal:0,vertical:0,periapsis:-6371,apoapsis:0,burnLeft:210,heat:0,stress:0};
            charge.value=f.fuel;chargeText.textContent=`${Math.ceil(f.fuel)}%`;distance.textContent=`${fmt(f.altitude)} km`;gap.textContent=`${fmt(f.pitch,0)}° → ${fmt(f.targetPitch,0)}°`;mode.textContent=`${fmt(f.throttle*100,0)}% → ${fmt(f.targetThrottle*100,0)}%`;
            $('horizontal').textContent=`${fmt(f.horizontal,2)} km/s`;$('vertical').textContent=`${fmt(f.vertical,2)} km/s`;$('periapsis').textContent=`${fmt(f.periapsis,0)} km`;$('apoapsis').textContent=`${fmt(f.apoapsis,0)} km`;$('burn').textContent=`${fmt(f.burnLeft,0)} s firing`;$('structure').textContent=`${fmt(f.heat,0)}% / ${fmt(f.stress,0)}%`;say(`${engine.guidance(state)} Dynamic pressure: ${fmt(f.q)} kPa.`);
        }else if(state.phase==='orbit'){
            const o=state.orbit,t=engine.TARGETS.find(t=>t.id===$('target').value),dx=t.x-o.cameraX,dy=t.y-o.cameraY;
            const f=state.flight;
            if(f){$('horizontal').textContent=`${fmt(f.horizontal,2)} km/s`;$('vertical').textContent=`${fmt(f.vertical,2)} km/s`;$('periapsis').textContent=`${fmt(f.periapsis,0)} km`;$('apoapsis').textContent=`${fmt(f.apoapsis,0)} km`;$('burn').textContent='Coasting';$('structure').textContent=`${fmt(f.altitude,0)} km altitude`;}
            labels('Rover charge','Camera zoom','Camera steadiness','Photographs');charge.value=state.charge;chargeText.textContent=`${Math.ceil(state.charge)}%`;distance.textContent=`${fmt(o.zoom)}×`;gap.textContent=`${Math.min(100,Math.round(o.steady/1.2*100))}%`;mode.textContent=o.photos.length;
            if(cameraActive)say(`${t.name}: ${Math.abs(dx)<.015&&Math.abs(dy)<.015?'centred':`${dx<-.015?'← ':dx>.015?'→ ':''}${dy<-.015?'↑':dy>.015?'↓':''}`}. Zoom near 3× and hold still before photographing.`);
            else {distance.textContent=`${fmt(o.track.altitude,0)} km`;gap.textContent=`${fmt(o.track.speed,2)} km/s`;mode.textContent=`${fmt(o.track.period/60,1)} min`;labels('Rover charge','Altitude','Orbital speed','Period · clock ×45');say('Orbit established. The spacecraft is coasting under gravity. Open the satellite camera to frame a landmark and take a picture.');}
        }else if(['grid','return'].includes(state.phase)){
            const g=state.grid;labels('Storage','Grid frequency','Demand','Supply / balanced time');charge.value=g.storage;chargeText.textContent=`${fmt(g.storage,0)}%`;distance.textContent=`${fmt(g.frequency,2)} Hz`;gap.textContent=`${fmt(g.demand)} MW`;mode.textContent=`${fmt(g.generation)} MW · ${fmt(g.progress,0)}/32 s`;
            $('dispatch').value=g.dispatch;$('storage').value=g.batteryCommand;$('dispatch-value').textContent=`${fmt(g.dispatch)} MW`;$('storage-value').textContent=`${fmt(g.batteryCommand*18)} MW`;
            $('grid-detail').textContent=`${g.event} · Solar ${fmt(g.solar)} MW · Wind ${fmt(g.wind)} MW · Dispatch target ${fmt(g.targetDispatch)} MW. Keep mismatch within 9 MW for 32 balanced seconds.`;say(state.phase==='return'?'Grid restored. Return to the road when ready.':engine.guidance(state));
        }
    }
    const help={boarding:'Cargo secured. The ramp closes before launch control is handed over to you.',road:'Space / ↑ jumps, → boosts, ↓ saves charge, ← brakes. Jump crates and faults; stay low under gantries. Time scanner beams and brake into the ship cargo bay.',launch:'One finite booster. Climb vertically, then follow the pitch guide. Throttle back near max-Q.',ascent:'↑ / ↓ steer pitch. → / ← adjust throttle. Follow the target pitch and throttle. Build sideways speed; lowest altitude must clear 100 km. Too steep: escape. Too shallow: re-entry.',orbit:'Open the satellite camera for photographs. Arrows pan, + / − zoom, Space photographs. Select a target for directions; aim for 3× zoom and a steady camera.',grid:'Match supply to demand. ← / → adjust generation; ↑ discharges storage and ↓ charges it. Watch 50 Hz and preserve battery energy.',return:'Grid restored. Your rover is coming home with its photographs.'};
    function clearControls(){held.clear();for(const k of Object.keys(controls))delete controls[k];panel.querySelectorAll('.is-held').forEach(b=>b.classList.remove('is-held'));}
    function syncPhase(){
        if(state.phase==='orbit'&&currentPhase!=='orbit')setCamera(false);
        clearControls();currentPhase=state.phase;
        ['road','flight','orbit','grid'].forEach(g=>$(g+'-controls').hidden=g==='flight'?!['launch','ascent'].includes(state.phase):state.phase!==g);
        $('road-readings').hidden=!['road','boarding'].includes(state.phase);
        $('flight-readings').hidden=!['launch','ascent','orbit'].includes(state.phase);$('grid-offer').hidden=true;
        panel.querySelectorAll('.runner-stages li').forEach(li=>{if(li.dataset.phase===(state.phase==='boarding'?'road':state.phase==='launch'?'ascent':state.phase==='return'?'grid':state.phase))li.setAttribute('aria-current','step');else li.removeAttribute('aria-current');});
        $('help').textContent=`${help[state.phase]} Click the canvas for keys. P pauses. All models use simplified arcade rules, not engineering predictions.`;announcement.textContent=help[state.phase];updateHud();
    }
    function setHeld(source,action,value){
        if(value===null)held.delete(source);else held.set(source,{action,value});
        for(const k of Object.keys(controls))delete controls[k];
        for(const {action:a,value:v} of held.values())controls[a]=typeof v==='boolean'?v:(controls[a]||0)+v;
    }
    function saveBest(){best=Math.max(best,Math.min(1000,Math.floor(state.x/8)));bestText.textContent=`${best} m`;try{localStorage.setItem('power-runner-best-v1',String(best));}catch(_){/* Optional storage. */}}
    function showOverlay(kind){
        overlay.hidden=false;$('reset').hidden=state.phase==='road'||kind==='paused';
        if(kind==='paused'){overline.textContent='Mission on hold';title.textContent='Paused.';copy.textContent='Your mission is frozen. Resume when ready.';start.textContent='Resume';}
        else if(state.phase==='launch'){overline.textContent='1,000 m · Booster unlocked';title.textContent='The road ends. Your orbit begins.';copy.textContent='Ignite one long, finite booster. Hold 90° in thick air, then follow the pitch and throttle guides. Bad angles at max-Q fold the rover; a low trajectory burns up; too much energy escapes the planet.';start.textContent='Ignite booster';}
        else if(state.phase==='return'){overline.textContent='Circuit complete';title.textContent='Lights on. Wheels down.';copy.textContent=`You balanced the grid and brought home ${state.orbit.photos.length} photograph${state.orbit.photos.length===1?'':'s'}. The backlog has, unfortunately, survived. Ready for another loop?`;start.textContent='Start next loop';}
        else{
            const failures={'dock-crash':['Cargo-bay collision.','Brake before the boarding ramp. Enter slowly, on your wheels; the ship is a checkpoint once you dock safely.'],maxq:['Folded at max-Q.','The airflow bent your rover in half. Keep the early climb vertical and ease throttle when pressure rises.'],burnup:['Atmospheric burnup.','Too fast in thick air. Climb before turning hard and watch heat.'],ballistic:['Back into the atmosphere.','Your lowest orbital altitude stayed below the atmosphere. Build sideways speed after climbing.'],escape:['Lost to space.','Too much energy. Turn toward the horizon and cut throttle once your lowest altitude clears 100 km.'],blackout:['The island went dark.','Supply and demand drifted too far apart. Follow the dispatch target and use storage for short surges.'],battery:['Battery empty.','Collect packs, time your jumps, and save boost for breaking away from pursuers.']};
            const f=failures[state.reason]||['The backlog caught you.','Each pursuer has a different rhythm. Boost out of a sprint, use obstacles to break contact, and watch the nearest gap.'];overline.textContent='Another attempt?';title.textContent=f[0];copy.textContent=f[1];start.textContent=state.phase==='ascent'?'Retry from launchpad':state.phase==='grid'?'Retry island grid':'Run again';
        }
        announcement.textContent=`${title.textContent} ${copy.textContent}`;saveBest();pauseButton.disabled=kind!=='paused';pauseButton.textContent=kind==='paused'?'Resume':'Pause';
    }
    function pause(){if(state.status!=='running')return;state.status='paused';clearControls();cancelAnimationFrame(frame);frame=0;showOverlay('paused');draw();}
    function play(){
        if(state.status==='paused')state.status='running';
        else if(state.phase==='launch')engine.launch(state);
        else if(state.phase==='return'){engine.nextLoop(state);state.status='running';}
        else if(state.status==='lost'&&state.phase==='ascent')engine.retryLaunch(state);
        else if(state.status==='lost'&&state.phase==='grid'){state.phase='orbit';state.status='running';engine.enterGrid(state);}
        else{const loop=state.loop;state=newRun();state.loop=loop;state.status='running';}
        failureTime=0;overlay.hidden=true;clearControls();syncPhase();lastTime=0;accumulator=0;pauseButton.disabled=false;pauseButton.textContent='Pause';canvas.focus({preventScroll:true});visible=true;if(!frame)frame=requestAnimationFrame(tick);
    }
    function tick(time){
        frame=0;if(!visible)return;if(!lastTime)lastTime=time;const delta=Math.min((time-lastTime)/1000,.1);lastTime=time;hudTime+=delta;flash=Math.max(0,flash-delta);
        if(state.status==='lost'){failureTime+=delta;draw();if(failureTime>=1.7)showOverlay('lost');else frame=requestAnimationFrame(tick);return;}
        if(state.status!=='running')return;accumulator+=delta;
        while(accumulator>=1/60&&state.status==='running'){
            engine.step(state,controls,1/60);accumulator-=1/60;if(state.phase!==currentPhase)syncPhase();
        }
        draw();if(hudTime>.1||state.status!=='running'){updateHud();hudTime=0;}
        if(state.status==='briefing'){clearControls();showOverlay('briefing');}else if(state.status==='lost'){clearControls();failureTime=0;saveBest();frame=requestAnimationFrame(tick);}else frame=requestAnimationFrame(tick);
    }
    function hold(id,action,value){
        const b=$(id),source='button-'+id;const release=()=>{setHeld(source,action,null);b.classList.remove('is-held');};
        b.addEventListener('pointerdown',e=>{if(state.status!=='running'||(e.pointerType==='mouse'&&e.button!==0))return;e.preventDefault();b.setPointerCapture(e.pointerId);setHeld(source,action,value);b.classList.add('is-held');});
        ['pointerup','pointercancel','lostpointercapture','blur'].forEach(n=>b.addEventListener(n,release));b.addEventListener('keydown',e=>{if(['Space','Enter'].includes(e.code)&&state.status==='running'){e.preventDefault();setHeld(source,action,value);b.classList.add('is-held');}});b.addEventListener('keyup',release);
    }
    [['brake','brake',true],['eco','eco',true],['boost','boost',true],['pitch-down','pitch',-1],['pitch-up','pitch',1],['throttle-down','throttle',-1],['throttle-up','throttle',1],['pan-left','panX',-1],['pan-right','panX',1],['pan-up','panY',-1],['pan-down','panY',1],['zoom-out','zoom',-1],['zoom-in','zoom',1]].forEach(args=>hold(...args));
    function capture(){
        if(state.phase!=='orbit'||state.status!=='running'||!cameraActive)return;draw();const image=canvas.toDataURL('image/jpeg',.85),shot=engine.photo(state);if(!shot)return;
        const a=document.createElement('a');a.href=image;a.download=`orbit-${shot.targetId}-${Date.now()}.jpg`;const img=document.createElement('img');img.src=image;img.alt=`${shot.name}, quality ${shot.score}%`;a.append(img);const caption=document.createElement('span');caption.textContent=`${shot.name} · ${shot.score}%`;a.append(caption);$('photos').prepend(a);photos.unshift(a);if(photos.length>8)photos.pop().remove();$('photo-album').hidden=false;$('photo-count').textContent=photos.length;
        $('photo-feedback').textContent=`${shot.name}: ${shot.score}% quality.${shot.score<75?' Centre the target, zoom to 3× and wait for steadiness.':' Sharp capture.'}`;$('grid-offer').hidden=!(shot.infra&&shot.score>=75);flash=.18;updateHud();draw();
    }
    $('jump').addEventListener('click',()=>engine.jump(state));$('jump').addEventListener('pointerdown',e=>e.preventDefault());$('capture').addEventListener('click',capture);$('capture').addEventListener('pointerdown',e=>e.preventDefault());
    function setCamera(value){cameraActive=value;$('camera-panel').hidden=!value;$('camera-toggle').setAttribute('aria-pressed',String(value));$('camera-toggle').textContent=value?'Return to orbit view':'Open satellite camera';clearControls();}
    $('camera-toggle').addEventListener('click',()=>{setCamera(!cameraActive);draw();canvas.focus({preventScroll:true});});
    $('target').replaceChildren(...engine.TARGETS.map(t=>{const o=document.createElement('option');o.value=t.id;o.textContent=`${t.name}${t.kind==='infra'?' · electrical':''}`;return o;}));$('target').addEventListener('change',()=>{updateHud();draw();});
    $('grid-yes').addEventListener('click',()=>{if(engine.enterGrid(state)){syncPhase();canvas.focus({preventScroll:true});}});$('grid-no').addEventListener('click',()=>{$('grid-offer').hidden=true;});
    ['dispatch','storage'].forEach(id=>$(id).addEventListener('input',()=>{engine.setGrid(state,Number($('dispatch').value),Number($('storage').value));updateHud();}));
    start.addEventListener('click',play);$('reset').addEventListener('click',()=>{state=newRun();play();});pauseButton.addEventListener('click',()=>state.status==='paused'?play():pause());
    function keyAction(code){
        if(state.phase==='road')return{ArrowRight:['boost',true],ArrowDown:['eco',true],ArrowLeft:['brake',true]}[code];
        if(state.phase==='ascent')return{ArrowUp:['pitch',1],ArrowDown:['pitch',-1],ArrowLeft:['throttle',-1],ArrowRight:['throttle',1]}[code];
        if(state.phase==='orbit'&&cameraActive)return{ArrowLeft:['panX',-1],ArrowRight:['panX',1],ArrowUp:['panY',-1],ArrowDown:['panY',1],Equal:['zoom',1],NumpadAdd:['zoom',1],Minus:['zoom',-1],NumpadSubtract:['zoom',-1]}[code];
        if(state.phase==='grid')return{ArrowLeft:['dispatch',-1],ArrowRight:['dispatch',1],ArrowUp:['battery',1],ArrowDown:['battery',-1]}[code];
    }
    canvas.addEventListener('keydown',e=>{const a=keyAction(e.code);if(!a&&!['Space','ArrowUp','KeyP','Escape','Enter'].includes(e.code))return;e.preventDefault();if(a&&state.status==='running')setHeld(e.code,...a);if(e.repeat)return;if(['KeyP','Escape'].includes(e.code)){if(state.status==='running')pause();else if(state.status==='paused')play();}else if(e.code==='Enter'&&state.status!=='running')play();else if(state.status==='running'&&['Space','ArrowUp'].includes(e.code)&&state.phase==='road')engine.jump(state);else if(e.code==='Space'&&state.phase==='orbit')capture();});
    canvas.addEventListener('keyup',e=>setHeld(e.code,'',null));canvas.addEventListener('blur',clearControls);window.addEventListener('blur',()=>{clearControls();pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});window.addEventListener('themeChanged',colors);new ResizeObserver(resize).observe(canvas);new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(!visible)pause();},{threshold:0}).observe(panel);window.addEventListener('load',()=>{if(location.hash==='#power-runner')panel.scrollIntoView({behavior:'instant',block:'start'});},{once:true});
    let expanded=false,previousOverflow='';
    function expand(value){
        expanded=value;
        if(value){previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';}
        else document.body.style.overflow=previousOverflow;
        panel.classList.toggle('is-expanded',value);
        $('expand').setAttribute('aria-pressed',String(value));
        $('expand').textContent=value?'Close expanded view':'Expand game';
        resize();
    }
    $('expand').addEventListener('click',()=>expand(!expanded));
    document.addEventListener('keydown',e=>{if(e.code==='Escape'&&expanded){expand(false);pause();}});
    colors();resize();syncPhase();if(state.status==='briefing')showOverlay('briefing');
})();
