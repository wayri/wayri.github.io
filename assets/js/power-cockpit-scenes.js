(() => {
    'use strict';
    const TAU=Math.PI*2, clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
    const colors=['#e18b65','#70cbb4','#b493e4'];
    function text(c,t,x,y,color='#cce6df',size=12,align='left') { c.fillStyle=color;c.font=`${size}px 'Courier New', monospace`;c.textAlign=align;c.fillText(t,x,y); }
    function poly(c,points,color,line=false) { c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();c.fillStyle=color;c.strokeStyle=color;line?c.stroke():c.fill(); }
    function rect(c,x,y,w,h,color) { c.fillStyle=color;c.fillRect(x,y,w,h); }
    function monster(c,x,y,size,kind,time,eating=false) {
        c.save();c.translate(x,y);c.scale(size/24,size/24);
        rect(c,-11,-22,22,17,colors[kind%3]);
        poly(c,[[-11,-19],[-15,-28],[-3,-22],[7,-22],[15,-28],[11,-17]],colors[kind%3]);
        rect(c,-7,-18,5,5,'#eef8df');rect(c,3,-18,5,5,'#eef8df');
        rect(c,-4,-17,2,3,'#141e2a');rect(c,6,-17,2,3,'#141e2a');
        rect(c,-8,-5,5,5+Math.sin(time*9)*2,colors[kind%3]);rect(c,4,-5,5,5-Math.sin(time*9)*2,colors[kind%3]);
        if(eating){rect(c,-4,-10,8,3,'#17202d');text(c,'+ ⚡',0,-34,'#ffe685',10,'center');}
        c.restore();
    }
    function battery(c,x,y,k,charge=4) { rect(c,x-9*k,y-15*k,18*k,25*k,'#e5bf44');rect(c,x-4*k,y-19*k,8*k,4*k,'#e5bf44');for(let i=0;i<charge;i++)rect(c,x-5*k,y+5*k-i*5*k,10*k,3*k,'#22302c'); }
    function interceptor(c,x,y,size,kind,t) {
        c.save();c.translate(x,y);c.scale(size/40,size/40);
        poly(c,[[0,-31],[-10,-6],[-11,16],[-25,24],[-18,0],[-8,-13]],colors[kind]);
        poly(c,[[0,-31],[10,-6],[11,16],[25,24],[18,0],[8,-13]],colors[kind]);
        rect(c,-5,-8,10,13,'#152c37');rect(c,-3,-5,2,3,'#f4de8a');rect(c,1,-5,2,3,'#f4de8a');
        poly(c,[[-6,18],[0,36+Math.sin(t*18)*5],[6,18]],'#efaa62');c.restore();
    }
    function mirror(c,w,h,s,flight=false) {
        const mw=Math.min(230,w*.36),mx=(w-mw)/2,my=12;
        rect(c,mx-3,my-3,mw+6,73,'#67838b');rect(c,mx,my,mw,67,'#102329');
        text(c,flight?'REAR RADAR / OPTICAL':'REAR VIEW',mx+7,my+13,'#8faeae',8);
        const chasers=s.chasers||[];
        chasers.forEach((ch,i)=>{
            const contact=flight?s.flight.pursuit.contacts?.[i]:null;
            const range=flight?(contact?.range??s.flight.pursuit.range+(i*3)):Math.max(1,(s.x-ch.x)/8);
            if(!flight&&ch.escaped){text(c,`${ch.name}: LOST`,mx+8,my+28+i*11,colors[i],8);return;}
            const size=flight?clamp(32-range*.5,9,28):clamp(44-range*.25,10,34);
            const x=mx+mw*(.22+i*.28),y=my+58;
            if(flight){interceptor(c,x,y-10,size*.65,i,s.time);text(c,`${range.toFixed(0)}k`,x,y-32,colors[i],9,'center');if(range<8){c.strokeStyle='#f4946a';c.beginPath();c.arc(x,y-size/2,size*.7,0,TAU);c.stroke();}}
            else monster(c,x,y,size,i,s.time);
        });
    }
    function dial(c,x,y,r,value,max,label,readout,color='#dbbf58') {
        c.strokeStyle='#41565c';c.lineWidth=3;c.beginPath();c.arc(x,y,r,Math.PI*.75,Math.PI*2.25);c.stroke();
        const a=Math.PI*.75+clamp(value/max,0,1)*Math.PI*1.5;
        c.strokeStyle=color;c.beginPath();c.moveTo(x,y);c.lineTo(x+Math.cos(a)*r*.8,y+Math.sin(a)*r*.8);c.stroke();
        text(c,label,x,y-r-8,'#7bada6',9,'center');text(c,readout,x,y+r*.7,'#e8ede0',r*.4,'center');
    }
    function frame(c,w,h,s,flight=false) {
        const panelY=h*.76;
        poly(c,[[0,0],[w*.05,0],[w*.12,h*.76],[0,h]],'#1b2e34');
        poly(c,[[w,0],[w*.95,0],[w*.88,h*.76],[w,h]],'#1b2e34');
        poly(c,[[0,h],[w*.12,panelY],[w*.88,panelY],[w,h]],'#101d25');
        c.strokeStyle='#456065';c.lineWidth=2;c.beginPath();c.moveTo(w*.12,panelY);c.lineTo(w*.88,panelY);c.stroke();
        const r=Math.min(40,w*.075,h*.075),dy=h*.87;
        if(!flight){
            dial(c,w*.22,dy,r,s.speed/8,40,'SPEED',`${Math.round(s.speed/8)}m/s`);
            dial(c,w*.42,dy,r,s.charge,100,'CHARGE',`${Math.ceil(s.charge)}%`);
            text(c,`${Math.floor(s.x/8)} / 1000 m`,w*.62,dy-12,'#e4cb72',w<500?10:14,'center');
            text(c,s.roadStage==='approach'?'CENTRE + BRAKE':'A / D · STEER',w*.62,dy+12,'#9bc6b9',9,'center');
        }else{
            const f=s.flight||{fuel:100,altitude:0,vertical:0,horizontal:0,pitch:90,throttle:0};
            dial(c,w*.2,dy,r,f.fuel,100,'PROPELLANT',`${Math.ceil(f.fuel)}%`);
            dial(c,w*.4,dy,r,f.throttle*100,100,'THROTTLE',`${Math.round(f.throttle*100)}%`);
            text(c,`${f.altitude.toFixed(1)} km`,w*.62,dy-15,'#e4cb72',w<500?12:17,'center');
            text(c,`${Math.hypot(f.vertical,f.horizontal).toFixed(2)} km/s`,w*.62,dy+4,'#a9d6c7',11,'center');
            text(c,`PITCH ${Math.round(f.pitch)}°`,w*.62,dy+21,'#8aaab0',9,'center');
        }
        // Fixed scan lines give the cockpit a CRT texture without flashing.
        c.save();c.globalAlpha=.08;for(let y=0;y<h;y+=4)rect(c,0,y,w,1,'#000');c.restore();
        if(s.status==='lost'){c.save();c.globalAlpha=.35;rect(c,0,0,w,h,'#8b2d21');c.restore();text(c,'VEHICLE LOST',w/2,h*.38,'#ffd490',22,'center');}
    }
    function road(c,w,h,s,p,options) {
        const sky=c.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#142638');sky.addColorStop(1,'#587371');c.fillStyle=sky;c.fillRect(0,0,w,h);
        const jump=Math.max(0,window.PowerRunner.ground(s.x)-s.y),horizon=h*.36+Math.min(35,jump*.12);
        for(let layer=0;layer<2;layer++){
            const pts=[[0,horizon+60]];for(let x=0;x<=w+12;x+=12)pts.push([x,horizon-18+layer*28+Math.sin((x+s.x*(.05+layer*.1))/110)*25]);pts.push([w,horizon+90]);poly(c,pts,layer?'#354f50':'#263e48');
        }
        rect(c,0,horizon+40,w,h,'#34443a');
        const project=z=>{const k=180/(z+180);return {x:w*.5-s.lane*w*.25*k+Math.sin((s.x+z)/850)*w*.08*(1-k),y:horizon+(h*.82-horizon)*k,half:w*.48*k,k};};
        for(let i=78;i>=0;i--){const z=i*18,a=project(z),b=project(z+18),stripe=Math.floor((s.x+z)/90)%2;
            poly(c,[[a.x-a.half,a.y],[b.x-b.half,b.y],[b.x+b.half,b.y],[a.x+a.half,a.y]],stripe?'#333b3d':'#303739');
            for(const side of [-1,1])poly(c,[[a.x+side*a.half,a.y],[b.x+side*b.half,b.y],[b.x+side*b.half*1.06,b.y],[a.x+side*a.half*1.06,a.y]],stripe?'#d4bd73':'#525956');
            if(stripe)for(const lane of [-.33,.33])poly(c,[[a.x+a.half*lane-2*a.k,a.y],[b.x+b.half*lane-2*b.k,b.y],[b.x+b.half*lane+2*b.k,b.y],[a.x+a.half*lane+2*a.k,a.y]],'#b7bba4');
        }
        const items=(s.entities||[]).filter(e=>!e.used&&e.x>s.x-20&&e.x<s.x+1400).sort((a,b)=>b.x-a.x);
        for(const item of items){const a=project(Math.max(0,item.x-s.x)),x=a.x+(item.lane||0)*a.half*.8,y=a.y,k=a.k*2.6;
            if(item.type==='pack')battery(c,x,y-20*k,k);
            else if(item.type==='gate'){rect(c,x-38*k,y-100*k,6*k,100*k,'#819c97');rect(c,x+32*k,y-100*k,6*k,100*k,'#819c97');rect(c,x-38*k,y-100*k,76*k,18*k,'#ce9d51');}
            else if(item.type==='drone'){const dy=y-95*k;rect(c,x-20*k,dy,40*k,10*k,'#849bab');if(item.active){c.save();c.globalAlpha=.25;poly(c,[[x,dy],[x-25*k,y],[x+25*k,y]],'#ff8b5a');c.restore();} }
            else if(item.type==='slick'||item.type==='solar'){poly(c,[[x-30*k,y],[x-20*k,y-14*k],[x+30*k,y-14*k],[x+40*k,y]],item.type==='solar'?'#3f9ba0':'#659ebc');}
            else {rect(c,x-17*k,y-30*k,34*k,30*k,item.type==='crate'?'#ae8258':'#b45e43');text(c,item.type==='crate'?'×':'⚡',x,y-8*k,'#ffeab6',15*k,'center');}
        }
        const remaining=window.PowerRunner.GOAL-s.x;
        if(remaining<1350){const a=project(Math.max(0,remaining));const rw=100*a.k,rh=190*a.k;
            rect(c,a.x-rw,a.y-rh,rw*2,rh,'#172c37');rect(c,a.x-rw-8*a.k,a.y-rh-10*a.k,rw*2+16*a.k,12*a.k,'#a7bbae');
            rect(c,a.x-rw*.7,a.y-rh*.8,rw*1.4,rh*.8,'#080f17');text(c,'CARGO BAY',a.x,a.y-rh-20*a.k,'#dfc25e',Math.max(8,14*a.k),'center');
        }
        mirror(c,w,h,s);
        if(s.phase==='boarding'){c.save();c.globalAlpha=clamp(s.boarding.progress*.8,0,.8);rect(c,0,0,w,h,'#050b11');c.restore();text(c,'ROVER SECURED / TRANSFERRING TO LAUNCH COCKPIT',w/2,h*.48,'#ecd279',w<500?9:13,'center');}
        frame(c,w,h,s);
        if(s.status==='lost'&&s.reason==='dock-crash') {
            const age=options.failureTime||0;
            c.save();c.globalAlpha=Math.max(0,.8-age*.35);
            for(let i=0;i<24;i++){const a=i*2.4,r=35+age*(80+i*9);rect(c,w*.5+Math.cos(a)*r,h*.45+Math.sin(a)*r,4+i%4,4+i%4,i%2?'#ffbe62':'#ed6f42');}
            c.restore();text(c,'CARGO BAY IMPACT',w/2,h*.5,'#ffd08a',18,'center');
        }
        text(c,s.roadStage==='approach'?'SPACEPORT · CENTRE THE ROVER AND BRAKE':'POWER RUNNER / COCKPIT',w*.1,h*.13,'#c3d9c8',w<500?9:12);
        if(s.noticeTime>0)text(c,s.notice,w/2,h*.68,'#f0cf78',w<500?9:12,'center');
    }
    // Pitch is elevation above the local horizontal, not an offset from screen-up.
    function attitude(w,h,f,look={}) {
        const altitude=Math.max(0,f.altitude||0),centre=h*.39,pixelsPerDegree=h*.7/70;
        const dip=Math.acos(6371/(6371+altitude))*180/Math.PI;
        const pitch=(f.pitch??90)+(look.pitch||0),body=(f.pitch??90)*Math.PI/180,yaw=(look.yaw||0)*Math.PI/180,tilt=(look.pitch||0)*Math.PI/180;
        const elevation=Math.asin(clamp(Math.sin(body)*Math.cos(yaw)*Math.cos(tilt)+Math.cos(body)*Math.sin(tilt),-1,1))*180/Math.PI;
        return {centre,pixelsPerDegree,noseX:w*.5-(look.yaw||0)*w/110,
            horizon:centre+(elevation+dip)*pixelsPerDegree,y:angle=>centre+(pitch-angle)*pixelsPerDegree};
    }
    function attitudeInstrument(c,w,h,f) {
        const x=w*.8,y=h*.87,r=Math.min(35,w*.065,h*.065);
        c.save();c.beginPath();c.arc(x,y,r,0,TAU);c.clip();
        rect(c,x-r,y-r,r*2,r*2,'#32647b');
        const localHorizon=y+clamp(f.pitch/90,-1.5,1.5)*r*2;
        rect(c,x-r,localHorizon,r*2,r*4,'#8b6943');
        c.strokeStyle='#dfebd9';c.lineWidth=1;c.beginPath();c.moveTo(x-r,localHorizon);c.lineTo(x+r,localHorizon);c.stroke();
        for(let angle=-90;angle<=90;angle+=30){const ly=y+(f.pitch-angle)/90*r*2;if(Math.abs(ly-y)<r-3)text(c,String(angle),x,ly,'#cee3d9',8,'center');}
        c.restore();c.strokeStyle='#91b9bd';c.lineWidth=2;c.beginPath();c.arc(x,y,r,0,TAU);c.stroke();
        c.strokeStyle='#f5da81';c.beginPath();c.moveTo(x-r*.7,y);c.lineTo(x-5,y);c.lineTo(x,y+4);c.lineTo(x+5,y);c.lineTo(x+r*.7,y);c.stroke();
        text(c,'ATTITUDE',x,y-r-8,'#a5c9c0',9,'center');
    }
    function guidanceHUD(c,w,h,s) {
        const f=s.flight||{},advice=window.PowerRunner.flightAdvice(s),circular=advice.circularSpeed,delta=advice.sidewaysDelta;
        const peri=f.periapsis??-6371,apo=f.apoapsis??0,instruction=advice.instruction.toUpperCase();
        const small=w<850, x=small?w*.12:w*.62,y=small?h*.59:h*.23,fs=small?9:12;
        const width=small?w*.76:w*.26;
        c.save();c.globalAlpha=.83;rect(c,x-8,y-15,width+16,small?65:122,'#091c27');c.restore();
        text(c,'ORBIT INSERTION / PE ≥100 km',x,y,'#e9d28a',fs);
        const ap=Number.isFinite(apo)?`${Math.round(apo)} km`:'ESCAPE';
        text(c,`PE ${Math.round(peri)} km  /  AP ${ap}`,x,y+17,peri>=100?'#a0e1b1':'#efb48d',fs);
        text(c,`SIDE ${(f.horizontal||0).toFixed(2)} / ${circular.toFixed(2)} km/s`,x,y+32,'#a4d4e8',fs);
        if(!small){text(c,`ΔV SIDE ${delta.toFixed(2)} km/s`,x,y+48,'#a4d4e8',fs);text(c,`VERT ${(f.vertical||0).toFixed(2)} km/s`,x,y+64,'#b8d0c8',fs);text(c,`PITCH ${Math.round(f.pitch??90)}° → ${Math.round(f.targetPitch??90)}°`,x,y+80,'#9cddb5',fs);text(c,`THROTTLE → ${Math.round((f.targetThrottle||0)*100)}%`,x,y+96,'#9cddb5',fs);}
        text(c,instruction,w/2,small?h*.56:h*.64,'#e9d28a',small?9:13,'center');
    }
    function skyFlight(c,w,h,s,options) {
        const f=s.flight||{altitude:0,pitch:90,targetPitch:90,targetThrottle:.4,fuel:100,vertical:0,horizontal:0,throttle:0,countdown:0,q:0,heat:0,stage:'Pad',onPad:true};
        const altitude=Math.max(0,f.altitude),blend=clamp(altitude/100,0,1),t=s.time||0,look=options.look||{};
        const sky=c.createLinearGradient(0,0,0,h);sky.addColorStop(0,`rgb(${Math.round(41*(1-blend))},${Math.round(86*(1-blend))},${Math.round(118*(1-blend)+15)})`);sky.addColorStop(1,`rgb(${Math.round(128*(1-blend)+3*blend)},${Math.round(173*(1-blend)+10*blend)},${Math.round(182*(1-blend)+22*blend)})`);c.fillStyle=sky;c.fillRect(0,0,w,h);
        c.save();c.globalAlpha=clamp((altitude-45)/50,0,1);for(let i=0;i<85;i++)rect(c,((i*149.7-(look.yaw||0)*w/110)%w+w)%w,((i*61.3+(look.pitch||0)*h/70)%(h*.7)+h*.7)%(h*.7),i%8?1:2,1,'#e0f0ec');c.restore();
        const a=attitude(w,h,f,look),horizon=a.horizon,noseX=clamp(a.noseX,w*.13,w*.87);
        c.save();if(!options.reducedMotion&&f.q>12)c.translate(Math.sin(t*79)*Math.min(3,f.q/20),Math.cos(t*71)*2);
        if(horizon<h){
            const r=w*(2.8-clamp(altitude/500,0,1)*1.4);
            c.save();c.beginPath();c.arc(w*.5,horizon+r,r,0,TAU);c.clip();rect(c,0,0,w,h,altitude<2?'#526054':'#234d60');
            // Surface detail is clipped to the planet, including when pitched toward nadir.
            for(let i=0;i<7;i++){
                const x=((i*239-(f.downrange||0)*.3-(look.yaw||0)*w/110)%(w+340)+w+340)%(w+340)-170,y=horizon+h*.15+(i%3)*h*.25;
                poly(c,[[x,y],[x+60,y-35],[x+135,y-13],[x+190,y+27],[x+130,y+62],[x+30,y+78],[x-25,y+20]],i%2?'#668369':'#4d776a');
            }
            if(f.pitch< -45){for(let i=0;i<5;i++){const x=(i*283+(f.downrange||0)*.2)%w,y=h*.15+(i%3)*h*.22;poly(c,[[x,y],[x+75,y-19],[x+160,y+30],[x+90,y+80],[x-30,y+40]],'#668369');}}
            c.restore();c.beginPath();c.arc(w*.5,horizon+r,r,0,TAU);c.strokeStyle='#73cfdd';c.lineWidth=4;c.stroke();
        }
        // Looking up from the pad: gantry tips slide down the edges as the rocket climbs.
        if(altitude<1.5)for(let side of [-1,1]){const x=w*.5+side*w*.41,base=h*.82+altitude*h*.8,top=base-h*.7;rect(c,x,top,8,h*.7,'#749393');for(let j=0;j<7;j++)rect(c,x-8,base-j*h*.1,24,3,'#afc3b7');}
        c.save();c.globalAlpha=clamp(1-altitude/25,0,1)*.55;for(let i=0;i<14;i++){const x=((i*137-(f.downrange||0)*5-(look.yaw||0)*w/110)%(w+150)+w+150)%(w+150)-75,y=((i*93+altitude*90+(look.pitch||0)*h/70)%(h+100))-50;c.fillStyle='#d6e7e1';c.beginPath();c.ellipse(x,y,35+i%4*18,6+i%3*5,0,0,TAU);c.fill();}c.restore();
        c.restore();
        text(c,`LOOK ${Math.round(look.yaw||0)}° / ${Math.round(look.pitch||0)}° · DRAG / R CENTRE`,w*.1,h*.29,'#b3d2ce',w<500?7:11);
        if(Math.abs(look.yaw||0)>90&&f.pursuit?.revealed){
            const rear=(look.yaw>0?180:-180)-(look.yaw||0);
            for(const [i,contact] of (f.pursuit.contacts||[]).entries()){
                const x=w*.5+(rear+(i-1)*15)*w/100,y=h*.4+(look.pitch||0)*h/90;
                if(x<w*.08||x>w*.92)continue;
                interceptor(c,x,y,clamp(90-contact.range*1.5,18,75),i,t);text(c,`${contact.name} / ${contact.range.toFixed(1)} km`,x,y-65,colors[i],11,'center');
            }
        }
        const forward=Math.abs(look.yaw||0)<65&&Math.abs(look.pitch||0)<45;
        if(forward){
        // Ladder lines represent local elevation; the 0° line is the actual horizon.
        for(let angle=-180;angle<=180;angle+=10){const y=a.y(angle);if(y<h*.22||y>h*.55)continue;const span=angle===0?85:angle%30===0?44:28;c.strokeStyle=angle===0?'#dce6c2':'#8bbab4';c.lineWidth=angle===0?2:1;c.setLineDash(angle<0?[4,4]:[]);c.beginPath();c.moveTo(noseX-span,y);c.lineTo(noseX-13,y);c.moveTo(noseX+13,y);c.lineTo(noseX+span,y);c.stroke();c.setLineDash([]);text(c,`${angle}°`,noseX+span+6,y+3,'#c5e1d3',10);}
        const markerY=clamp(a.y(f.targetPitch??90),h*.2,h*.53);
        const ny=clamp(a.y(f.pitch),h*.22,h*.54),error=(f.targetPitch??90)-f.pitch;
        c.strokeStyle='#8de1b4';c.lineWidth=3;c.strokeRect(noseX-52,markerY-25,104,50);
        text(c,s.phase==='orbit'?'ORBITAL COAST':`${error>3?'↑ PITCH UP':error< -3?'↓ PITCH DOWN':'ALIGNED'} ${Math.round(Math.abs(error))}°`,noseX,markerY-34,'#a5f4bf',w<500?11:16,'center');
        c.strokeStyle='#e9d696';c.beginPath();c.moveTo(noseX-35,ny);c.lineTo(noseX-10,ny);c.lineTo(noseX,ny+7);c.lineTo(noseX+10,ny);c.lineTo(noseX+35,ny);c.stroke();text(c,'NOSE',noseX+40,ny+14,'#e9d696',10);
        if(Math.hypot(f.vertical,f.horizontal)>.01){const flow=Math.atan2(f.vertical,f.horizontal)*180/Math.PI,fy=clamp(a.y(flow),h*.2,h*.53);c.strokeStyle='#79cdf3';c.beginPath();c.arc(w*.5,fy,7,0,TAU);c.moveTo(w*.5-14,fy);c.lineTo(w*.5-7,fy);c.moveTo(w*.5+7,fy);c.lineTo(w*.5+14,fy);c.stroke();}
        }else text(c,'LOOKING AWAY · R RETURNS TO FLIGHT GUIDANCE',w/2,h*.53,'#f3d68a',w<500?9:14,'center');
        poly(c,[[w*.43,h*.76],[w*.5,h*.69],[w*.57,h*.76]],'#48636b');
        text(c,'↑ / ↓ PITCH · ← / → THROTTLE',w/2,h*.17,'#9bd5b4',w<500?8:11,'center');
        text(c,'GREEN: DIRECTOR · BLUE: VELOCITY',w/2,h*.145,'#9bbdb9',w<500?7:9,'center');
        if(a.horizon>h*.76)text(c,`HORIZON ↓ ${Math.round(f.pitch)}° BELOW NOSE`,w*.1,h*.25,'#b4d7d2',w<500?7:10);
        text(c,f.stage||'PAD / CLAMPS ENGAGED',w*.1,h*.12,'#e2d18e',w<500?9:12);
        if(f.countdown>0||s.phase==='launch'){text(c,s.phase==='launch'?'LAUNCH ACCESS LOCKED':String(Math.ceil(f.countdown)),w/2,h*.43,'#f1d273',s.phase==='launch'?18:48,'center');text(c,'PAD ALTITUDE 0 m / CLAMPS ENGAGED',w/2,h*.55,'#c4ddd2',10,'center');}
        if(f.heat>10){c.save();c.globalAlpha=f.heat/180;c.strokeStyle='#ff6f3f';c.lineWidth=20;c.strokeRect(8,8,w-16,h*.75);c.restore();}
        if(f.mach>1&&altitude<50){c.save();c.globalAlpha=.2;c.strokeStyle='#cce5df';c.lineWidth=2;c.beginPath();c.ellipse(w/2,h*.4,w*.42,h*.3,0,0,TAU);c.stroke();c.restore();}
        if(f.pursuit?.revealed){mirror(c,w,h,s,true);text(c,`${f.pursuit.evaded?'PURSUIT EVADED':f.pursuit.range<8?'⚠ ATTACK INBOUND · X DECOY':'PURSUIT ACTIVE'} · ${f.pursuit.range.toFixed(1)} km · HULL ${f.pursuit.hull??100}%`,w/2,h*.73,'#f0a77a',w<500?8:13,'center');}
        guidanceHUD(c,w,h,s);
        frame(c,w,h,s,true);
        attitudeInstrument(c,w,h,f);
        if(f.pursuit?.flash>0){c.save();c.globalAlpha=f.pursuit.flash*.6;c.strokeStyle='#ff7656';c.lineWidth=16;c.strokeRect(8,8,w-16,h*.75);c.restore();text(c,'IMPACT · RELEASE DECOY (X)',w/2,h*.5,'#ffbf91',w<500?13:22,'center');}
        if((f.stress||0)>35){
            c.save();c.globalAlpha=clamp((f.stress-35)/65,0,1);c.strokeStyle='#d6d9b7';c.lineWidth=2;
            c.beginPath();c.moveTo(w*.82,h*.1);c.lineTo(w*.65,h*.28);c.lineTo(w*.72,h*.38);c.lineTo(w*.53,h*.55);c.moveTo(w*.65,h*.28);c.lineTo(w*.45,h*.2);c.lineTo(w*.34,h*.32);c.stroke();c.restore();
            text(c,'STRUCTURAL LOAD / WINDOW FRACTURE',w/2,h*.62,'#f6b179',w<500?9:12,'center');
        }
        text(c,`Q ${(f.q||0).toFixed(1)} kPa · HEAT ${Math.round(f.heat||0)}%`,w*.1,h*.70,'#a8c0b5',w<500?7:9);
    }
    function groundActivity(c,w,h,s) {
        const o=s.orbit,world=s.groundWorld;if(!o||!world)return;
        const sx=x=>(x-o.cameraX)*w*o.zoom+w/2,sy=y=>(y-o.cameraY)*h*o.zoom+h/2,k=clamp(o.zoom*.55,.6,2.5);
        for(const b of world.batteries){const x=sx(b.x),y=sy(b.y);if(x< -50||x>w+50||y< -60||y>h+60)continue;battery(c,x+20*k,y+10*k,k,b.charge);}
        world.minions.forEach((m,i)=>{const x=sx(m.x),y=sy(m.y);if(x< -50||x>w+50||y< -60||y>h+60)return;monster(c,x,y,(m.boss?22:11)*k,m.kind,world.time,m.eating);if(m.boss)text(c,['BUGS','REVIEW','MAIL'][m.kind],x,y-32*k,colors[m.kind],9,'center');});
        text(c,`GROUND ACTIVITY / ${world.eaten} BATTERIES EATEN`,14,h-60,'#f1d17f',w<500?8:10);
    }
    window.PowerCockpitScenes={draw(c,w,h,s,p,options={}){c.save();c.imageSmoothingEnabled=false;if(['road','boarding'].includes(s.phase))road(c,w,h,s,p,options);else skyFlight(c,w,h,s,options);c.restore();},groundActivity,attitude,guidanceHUD,rearView:mirror};
})();
