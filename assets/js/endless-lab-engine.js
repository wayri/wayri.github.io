(function (host, factory) {
    'use strict';
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else host.EndlessLab = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';
    const WIDTH = 960, PLAYER_X = 180;
    function create(seed = 1, relaxed = false) {
        return { mode:'ready', seed:seed >>> 0 || 1, relaxed:!!relaxed, x:0, time:0, y:0, vy:0,
            slide:false, charge:100, gap:145, escaped:0, clearTime:0, hitTime:0, pulseTime:0,
            pulseCooldown:0, ideas:0, sketches:0, bonus:0, pickups:0, hazards:[], lastSpawn:560,
            message:'', messageTime:0, events:[], speed:0 };
    }
    function random(s) {s.seed = (Math.imul(1664525,s.seed)+1013904223)>>>0;return s.seed/4294967296;}
    function jump(s) {
        if(s.mode!=='running'||s.y>0.5||s.slide)return false;
        s.vy=710;s.charge=Math.max(0,s.charge-.5);s.events.push('jump');return true;
    }
    function releaseJump(s) {if(s.vy>320)s.vy=320;}
    function pulse(s) {
        if(s.mode!=='running'||s.pulseCooldown>0||s.charge<16)return false;
        s.charge-=16;s.pulseTime=.48;s.pulseCooldown=1.25;
        let count=0;
        for(const h of s.hazards)if(h.kind==='noise'&&!h.done&&h.x-s.x>PLAYER_X-35&&h.x-s.x<PLAYER_X+245){h.done=true;count++;}
        if(count){s.bonus+=40*count;s.gap+=12*count;s.message='Noise cleared · +40';s.messageTime=1.5;}
        s.events.push('pulse');return true;
    }
    function spawn(s) {
        const spacing=440+random(s)*170;
        s.lastSpawn+=spacing;
        const kinds=['component','banner','noise','paint'];
        const kind=kinds[Math.floor(random(s)*kinds.length)];
        s.hazards.push({kind,x:s.lastSpawn,w:kind==='banner'?88:kind==='paint'?72:kind==='noise'?54:42,done:false});
        if(random(s)<.75)s.hazards.push({kind:'cell',x:s.lastSpawn+130,w:24,y:random(s)<.35?76:17,done:false});
        if(random(s)<.6)s.hazards.push({kind:'idea',x:s.lastSpawn-95,w:22,y:65+random(s)*30,done:false});
    }
    function step(s, seconds) {
        if(s.mode!=='running')return s;
        if(!Number.isFinite(seconds)||seconds<0)throw new RangeError('Use a finite nonnegative time step.');
        const dt=Math.min(.05,seconds);s.events=[];s.time+=dt;
        s.hitTime=Math.max(0,s.hitTime-dt);s.pulseTime=Math.max(0,s.pulseTime-dt);
        s.pulseCooldown=Math.max(0,s.pulseCooldown-dt);s.messageTime=Math.max(0,s.messageTime-dt);
        const base=(s.relaxed?220:270)+Math.min(s.relaxed?95:160,s.time*1.15);
        s.speed=base*(s.hitTime>.45?.57:1);s.x+=s.speed*dt;
        s.charge=Math.max(0,s.charge-dt*(s.relaxed?.85:1.25));
        if(s.y>0||s.vy>0){s.vy-=dt*(s.slide&&s.vy<0?3500:1950);s.y=Math.max(0,s.y+s.vy*dt);if(s.y===0)s.vy=0;}
        if(s.clearTime>0){s.clearTime=Math.max(0,s.clearTime-dt);if(s.clearTime===0){s.gap=165;s.message='A new task picked up your trail';s.messageTime=2;}}
        else {
            const dash=(s.time%9)>7.7;
            const chaseSpeed=base*(dash?1.13:.97);
            s.gap+=dt*(s.speed-chaseSpeed);
            if(s.gap>=285){s.clearTime=11;s.escaped++;s.bonus+=150;s.charge=Math.min(100,s.charge+8);s.message='Clear stretch · chase escaped';s.messageTime=2.5;}
        }
        while(s.lastSpawn-s.x<WIDTH+450)spawn(s);
        const top=s.y+(s.slide&&s.y<1?21:46),bottom=s.y;
        for(const h of s.hazards){
            if(h.done)continue;
            const screenX=h.x-s.x;
            const overlap=screenX<PLAYER_X+32&&screenX+h.w>PLAYER_X+4;
            if(h.kind==='cell'||h.kind==='idea'){
                if(overlap&&top>h.y-13&&bottom<h.y+13){
                    h.done=true;
                    if(h.kind==='cell'){s.charge=Math.min(100,s.charge+18);s.gap+=7;s.pickups++;s.events.push('charge');}
                    else {s.ideas++;s.bonus+=25;s.events.push('idea');if(s.ideas%3===0){s.sketches++;s.bonus+=100;s.gap+=32;s.charge=Math.min(100,s.charge+14);s.message='Sketch complete · new palette';s.messageTime=2;}}
                }
                continue;
            }
            const collision=overlap&&(h.kind==='banner'?top>27&&bottom<86:bottom<(h.kind==='noise'?68:h.kind==='paint'?19:42));
            if(collision&&s.hitTime<=0){
                h.done=true;
                if(h.kind==='noise'&&s.pulseTime>0){s.bonus+=40;s.gap+=12;s.events.push('pulse');}
                else {s.charge=Math.max(0,s.charge-(s.relaxed?22:30));s.gap-=s.relaxed?42:62;s.hitTime=1.1;s.message=h.kind==='banner'?'Slide under the sketch banners':h.kind==='noise'?'Jump or pulse through the noise':'Jump over the work on the bench';s.messageTime=2;s.events.push('hit');}
            }
            if(screenX+h.w<PLAYER_X&&!h.done){h.done=true;s.bonus+=8;s.gap+=3;}
        }
        s.hazards=s.hazards.filter(h=>h.x-s.x>-150);
        if(s.charge<=0||(!s.clearTime&&s.gap<=0)){s.mode='over';s.message=s.charge<=0?'Out of charge':'The backlog caught up';s.messageTime=10;s.events.push('over');}
        return s;
    }
    const score=s=>Math.floor(s.x/8)+s.bonus;
    return {create,jump,releaseJump,pulse,step,score,WIDTH,PLAYER_X};
});
