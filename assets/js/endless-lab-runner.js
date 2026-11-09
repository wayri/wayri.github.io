(function () {
    'use strict';
    const panel=document.getElementById('power-runner'),engine=window.EndlessLab;
    if(!panel||!engine||!panel.querySelector('#lab-runner-canvas'))return;
    const $=id=>panel.querySelector('#lab-runner-'+id),canvas=$('canvas'),ctx=canvas.getContext('2d');
    if(!ctx)return;
    let state=engine.create(Date.now()),frame=0,lastTime=0,best=0,viewWidth=960,palette={},hudTime=0;
    let visible=true,heldJump=false,heldSlide=false;
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    try{best=Number(localStorage.getItem('lab-runner-endless-best-v1'))||0;}catch(_){/* Scores are optional. */}
    $('best').textContent=best;
    function colors(){const style=getComputedStyle(document.documentElement);palette={bg:style.getPropertyValue('--container-bg').trim(),ink:style.getPropertyValue('--text-color').trim(),muted:style.getPropertyValue('--muted-text').trim(),accent:style.getPropertyValue('--accent-color').trim(),dark:document.documentElement.dataset.theme==='dark'};draw();}
    function resize(){const rect=canvas.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1);canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr);viewWidth=rect.width<600?560:960;draw();}
    function box(x,y,w,h,fill){ctx.fillStyle=fill;ctx.fillRect(x,y,w,h);}
    function line(x1,y1,x2,y2,color,width=1){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();}
    function text(value,x,y,size=14,color=palette.ink){ctx.font=`${size}px ui-monospace,monospace`;ctx.fillStyle=color;ctx.fillText(value,x,y);}
    function draw(){
        if(!canvas.width)return;
        ctx.setTransform(canvas.width/viewWidth,0,0,canvas.height/420,0,0);
        box(0,0,viewWidth,420,palette.bg||'#111');
        const ground=335,theme=Math.floor(state.x/4800)%3,art=['#52b9b0','#d978a8','#a7a057'][state.sketches%3];
        // The same world continues beyond the viewport; only visible marks are drawn.
        const drift=reduced?0:state.x*.18;
        ctx.globalAlpha=.13;
        for(let n=-1;n<Math.ceil(viewWidth/160)+2;n++){
            const x=n*160-(drift%160);
            if(theme===0){line(x,110,x+75,110,palette.accent,2);line(x+75,110,x+100,145,palette.accent,2);line(x+100,145,x+150,145,palette.accent,2);ctx.strokeStyle=palette.accent;ctx.beginPath();ctx.arc(x+18,110,7,0,Math.PI*2);ctx.stroke();}
            else if(theme===1){ctx.strokeStyle=art;ctx.lineWidth=2;ctx.strokeRect(x+12,95,96,110);line(x+28,180,x+86,120,art,2);line(x+20,160,x+104,160,art);}
            else {ctx.strokeStyle=art;ctx.beginPath();ctx.moveTo(x,145);ctx.bezierCurveTo(x+40,70,x+90,220,x+150,125);ctx.stroke();}
        }
        ctx.globalAlpha=1;
        text(['CIRCUIT BENCH','DESIGN STUDIO','PRINT ROOM'][theme],22,35,12,palette.muted);
        text(state.clearTime>0?'CLEAR STRETCH':'THE BACKLOG',22,59,11,state.clearTime>0?art:palette.muted);
        line(0,ground,viewWidth,ground,palette.accent,2);
        const scroll=state.x%58;
        ctx.globalAlpha=.25;
        for(let x=-scroll;x<viewWidth;x+=58){line(x,ground+12,x+22,ground+12,palette.muted);line(x+22,ground+12,x+34,ground+24,palette.muted);}
        ctx.globalAlpha=1;
        // A hand-drawn trace turns into a new palette whenever three ideas connect.
        ctx.strokeStyle=art;ctx.lineWidth=2;ctx.beginPath();
        for(let x=0;x<engine.PLAYER_X;x+=6){const y=ground+35+Math.sin((x+state.x*.45)*.05)*7;if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();
        for(const h of state.hazards){
            if(h.done)continue;
            const x=h.x-state.x;if(x<-100||x>viewWidth+100)continue;
            if(h.kind==='component'){
                box(x,ground-42,h.w,42,palette.ink);box(x+5,ground-35,h.w-10,25,palette.bg);
                for(let pin=4;pin<h.w;pin+=8){line(x+pin,ground-48,x+pin,ground-42,palette.accent,2);line(x+pin,ground,x+pin,ground+5,palette.accent,2);}text('IC',x+12,ground-16,12,palette.accent);
            }else if(h.kind==='banner'){
                line(x-10,ground-145,x+98,ground-145,palette.muted);line(x,ground-145,x,ground-86,palette.muted);line(x+88,ground-145,x+88,ground-86,palette.muted);
                box(x,ground-86,88,59,art);text('DRAFT',x+15,ground-49,16,palette.bg);line(x+8,ground-37,x+80,ground-37,palette.bg);
            }else if(h.kind==='noise'){
                ctx.strokeStyle=palette.dark?'#ee9278':'#a54135';ctx.lineWidth=3;ctx.beginPath();for(let n=0;n<7;n++){const xx=x+n*9,yy=ground-(n%2?64:12);if(n===0)ctx.moveTo(xx,yy);else ctx.lineTo(xx,yy);}ctx.stroke();text('EMI',x+8,ground-77,11,palette.muted);
            }else if(h.kind==='paint'){
                box(x,ground-15,72,15,art);ctx.fillStyle=art;ctx.beginPath();ctx.ellipse(x+35,ground-15,32,7,0,0,Math.PI*2);ctx.fill();text('WET',x+23,ground-25,11,palette.muted);
            }else if(h.kind==='cell'){
                const y=ground-h.y;box(x,y-13,24,26,palette.accent);box(x+8,y-17,8,4,palette.accent);text('+',x+7,y+5,16,palette.bg);
            }else{
                const y=ground-h.y;ctx.fillStyle=art;ctx.beginPath();ctx.moveTo(x+11,y-14);ctx.lineTo(x+24,y);ctx.lineTo(x+11,y+14);ctx.lineTo(x-2,y);ctx.closePath();ctx.fill();text('✦',x+3,y+5,16,palette.bg);
            }
        }
        if(!state.clearTime){
            const x=engine.PLAYER_X-state.gap,y=ground-26;
            if(x>-45){box(x,y,34,26,palette.muted);box(x+4,y-10,26,10,palette.muted);box(x+7,y+5,5,5,palette.bg);box(x+22,y+5,5,5,palette.bg);line(x+5,ground,x-2,ground+4,palette.muted,3);line(x+27,ground,x+33,ground+4,palette.muted,3);text('TODO',x-1,y-17,10,palette.muted);}
        }
        const x=engine.PLAYER_X,y=ground-state.y,h=state.slide&&state.y<1?21:46;
        ctx.globalAlpha=state.hitTime>0&&Math.floor(state.time*12)%2?.4:1;
        box(x,y-h,38,h-6,palette.accent);box(x+24,y-h+8,10,10,palette.bg);box(x+27,y-h+10,3,3,art);
        line(x+4,y-h-5,x+4,y-h,art,2);
        ctx.fillStyle=palette.ink;for(const wx of [x+8,x+30]){ctx.beginPath();ctx.arc(wx,y-5,7,0,Math.PI*2);ctx.fill();line(wx-3,y-5,wx+3,y-5,palette.bg);}
        ctx.globalAlpha=1;
        if(state.pulseTime>0){ctx.strokeStyle=palette.accent;ctx.lineWidth=3;ctx.globalAlpha=state.pulseTime/.48;ctx.beginPath();ctx.arc(x+20,y-25,45+(1-state.pulseTime/.48)*170,-Math.PI/2,Math.PI/2);ctx.stroke();ctx.globalAlpha=1;}
        if(state.mode==='running'&&state.charge<25)text('LOW CHARGE',Math.max(22,viewWidth-155),35,13,palette.dark?'#ee9278':'#a54135');
    }
    function hud(){
        $('distance').textContent=Math.floor(state.x/8).toLocaleString()+' m';$('charge').textContent=Math.ceil(state.charge)+'%';$('ideas').textContent=state.ideas%3+' / 3';
        $('chase').textContent=state.clearTime>0?'Chase escaped':`Chase: ${Math.max(0,Math.round(state.gap/8))} m behind`;
        $('pulse').disabled=state.mode!=='running'||state.charge<16||state.pulseCooldown>0;
        $('status').textContent=state.messageTime>0?state.message:state.mode==='running'?`Score ${engine.score(state)} · ${state.sketches} sketches · ${state.escaped} escapes`:'No finish line. See how far you can carry the next idea.';
    }
    function overlay(title,copy,button){$('overlay-title').textContent=title;$('overlay-copy').textContent=copy;$('start').textContent=button;$('overlay').hidden=false;}
    function clearHeld(){heldJump=false;heldSlide=false;state.slide=false;engine.releaseJump(state);}
    function pause(){if(state.mode!=='running')return;state.mode='paused';cancelAnimationFrame(frame);frame=0;clearHeld();$('pause').textContent='Resume';overlay('Take a breath.','Your run is paused. Resume when you are ready.','Resume run');hud();draw();}
    function resume(){if(state.mode!=='paused')return;state.mode='running';$('overlay').hidden=true;$('pause').textContent='Pause';canvas.focus({preventScroll:true});lastTime=0;frame=requestAnimationFrame(tick);}
    function start(){if(state.mode==='paused'){resume();return;}state=engine.create(Date.now(),$('relaxed').checked);state.mode='running';$('overlay').hidden=true;$('pause').disabled=false;$('pause').textContent='Pause';clearHeld();canvas.focus({preventScroll:true});lastTime=0;cancelAnimationFrame(frame);frame=requestAnimationFrame(tick);hud();}
    function finish(){
        const score=engine.score(state);best=Math.max(best,score);$('best').textContent=best;try{localStorage.setItem('lab-runner-endless-best-v1',String(best));}catch(_){}
        $('pause').disabled=true;clearHeld();overlay(state.message,`${Math.floor(state.x/8).toLocaleString()} m · score ${score} · ${state.sketches} sketches · ${state.escaped} escapes. Another run will have a new arrangement.`,'Run again');hud();
    }
    function tick(now){frame=0;if(state.mode!=='running')return;if(!visible){pause();return;}const dt=lastTime?Math.min(.05,(now-lastTime)/1000):0;lastTime=now;engine.step(state,dt);draw();hudTime+=dt;if(hudTime>.1){hudTime=0;hud();}if(state.mode==='over'){finish();return;}frame=requestAnimationFrame(tick);}
    function jumpDown(){if(!heldJump){heldJump=true;engine.jump(state);}}
    function jumpUp(){heldJump=false;engine.releaseJump(state);}
    function slideDown(){heldSlide=true;state.slide=true;}
    function slideUp(){heldSlide=false;state.slide=false;}
    function bindPointer(button,down,up){button.addEventListener('pointerdown',event=>{if(state.mode!=='running')return;event.preventDefault();canvas.focus({preventScroll:true});button.setPointerCapture(event.pointerId);down();});for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,()=>{if(up)up();});}
    bindPointer($('jump'),jumpDown,jumpUp);bindPointer($('slide'),slideDown,slideUp);bindPointer($('pulse'),()=>engine.pulse(state));
    // A button's keyboard activation has no pointerdown; preserve that path too.
    $('jump').addEventListener('click',event=>{if(event.detail===0)engine.jump(state);});$('pulse').addEventListener('click',event=>{if(event.detail===0)engine.pulse(state);});
    canvas.addEventListener('keydown',event=>{
        if(['Space','ArrowUp','ArrowDown','KeyS','KeyE','KeyP','Escape'].includes(event.code))event.preventDefault();
        if(event.code==='KeyP'||event.code==='Escape'){if(!event.repeat){if(state.mode==='paused')resume();else pause();}return;}
        if(state.mode!=='running')return;
        if(event.code==='Space'||event.code==='ArrowUp')jumpDown();
        if(event.code==='ArrowDown'||event.code==='KeyS')slideDown();
        if(event.code==='KeyE'&&!event.repeat)engine.pulse(state);
    });
    canvas.addEventListener('keyup',event=>{if(event.code==='Space'||event.code==='ArrowUp')jumpUp();if(event.code==='ArrowDown'||event.code==='KeyS')slideUp();});
    canvas.addEventListener('blur',()=>{clearHeld();pause();});
    $('start').addEventListener('click',start);
    // Keep pointer activation from blurring the canvas before Pause can run.
    $('pause').addEventListener('pointerdown',event=>event.preventDefault());
    $('pause').addEventListener('click',()=>state.mode==='paused'?resume():pause());
    document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
    window.addEventListener('blur',pause);window.addEventListener('themeChanged',colors);
    window.addEventListener('pagehide',()=>{cancelAnimationFrame(frame);clearHeld();});
    new ResizeObserver(resize).observe(canvas);new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(!visible)pause();},{threshold:0}).observe(panel);
    colors();resize();hud();
})();
