const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

function setup() {
    function element() {
        const events={},classes=new Set();
        return {events,hidden:false,disabled:false,dataset:{},style:{},textContent:'',
            addEventListener(type,fn){(events[type]??=[]).push(fn);},
            async emit(type,event={}){for(const fn of events[type]||[])await fn(event);},
            classList:{add:c=>classes.add(c),remove:c=>classes.delete(c),contains:c=>classes.has(c),toggle(c,on){if(on)classes.add(c);else classes.delete(c);}},
            setAttribute(){},removeAttribute(){},append(){},replaceChildren(){},focus(){},
            getBoundingClientRect:()=>({width:640,height:460})};
    }
    const nodes=new Map(),node=selector=>{if(!nodes.has(selector))nodes.set(selector,element());return nodes.get(selector);};
    const modes=['pcb','assembly','schematic','pi'].map(mode=>Object.assign(element(),{dataset:{ircaMode:mode}}));
    const host=Object.assign(element(),{querySelector:node,querySelectorAll:()=>modes,closest:()=>({})});
    const doc=Object.assign(element(),{hidden:false,documentElement:{dataset:{theme:'dark'}},body:{style:{}},querySelector:()=>host,createElement:()=>element(),createTextNode:text=>({textContent:text})});
    const win=Object.assign(element(),{matchMedia:()=>({matches:false,addEventListener(){}})});
    let intersection,disconnects=0,frames=0,carouselDisposals=0,screenDisposals=0,screenExits=0;
    const viewers=[];
    class Viewer {
        constructor(){this.view='3d';this.path='IRCA.kicad_pcb';this.disposed=false;this.draws=0;this.camera={position:[0,0,100],target:[0,0,0],up:[0,1,0]};viewers.push(this);}
        addEventListener(){} setInspectOnSelect(){} setInspectorOpen(){} clearSelection(){}
        async setView(view){this.view=view;}
        getCamera3D(){return this.view==='3d'?this.camera:null;}
        setCamera3D(camera){assert.equal(this.disposed,false);this.camera=camera;this.draws++;}
        setTheme(){assert.equal(this.disposed,false);this.draws++;}
        dispose(){this.disposed=true;}
    }
    class Carousel {addEventListener(){} async show(){} pause(){} dispose(){carouselDisposals++;}}
    win.KiCadWebView={ViewerCarousel:Carousel};
    win.IRCAProject={createViewer:()=>new Viewer(),ready:async()=>({pcbPath:'IRCA.kicad_pcb',schematicPath:'IRCA.kicad_sch',defaultPart:'U1'}),load:async(viewer,options={})=>{viewer.path=options.file||'IRCA.kicad_pcb';viewer.view=options.view||'3d';},study:async()=>({maxVoltageDropMv:40,copperLossW:.04,currentA:1,meshMm:.1,convergenceChangePercent:.01,assumptions:[]})};
    win.IRCAMiniScreen={attach:()=>({getPresentationFrame:()=>({normal:[0,0,1],up:[0,1,0]}),exit(){screenExits++;},dispose(){screenDisposals++;},reframe(){}})};
    const context={window:win,document:doc,navigator:{},KiCadWebView:win.KiCadWebView,IRCAProductCamera:require('../assets/js/irca-showcase-camera.js'),requestAnimationFrame:()=>++frames,cancelAnimationFrame(){},IntersectionObserver:class{constructor(fn){intersection=fn;}observe(){}disconnect(){disconnects++;}}};
    vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../assets/js/irca-demo.js'),'utf8'),context);
    return {win,doc,modes,nodes,viewers,visible:()=>intersection([{isIntersecting:true}]),get frames(){return frames;},get cleanup(){return {disconnects,carouselDisposals,screenDisposals,screenExits};}};
}

test('Back/Forward cache preserves the live viewer across repeated returns and still allows view switching',async()=>{
    const s=setup();await s.nodes.get('.irca-start').emit('click');s.visible();
    const viewer=s.viewers[0],camera=JSON.stringify(viewer.camera);
    for(let trip=0;trip<3;trip++) {
        await s.win.emit('pagehide',{persisted:true});
        assert.equal(viewer.disposed,false);
        const frames=s.frames;
        await s.doc.emit('visibilitychange');assert.equal(s.frames,frames,'Suspended pages do not restart animation');
        const draws=viewer.draws;
        await s.win.emit('pageshow',{persisted:true});
        assert.equal(s.viewers.length,1,'Return reuses the same live viewer');
        assert.ok(viewer.draws>draws,'Restored document repaints');
        assert.equal(JSON.stringify(viewer.camera),camera,'Framing survives navigation');
        assert.ok(s.frames>frames,'Visible rotating preview resumes');
    }
    assert.equal(s.cleanup.screenDisposals,0);assert.equal(s.cleanup.carouselDisposals,0);
    await s.modes[0].emit('click');assert.equal(viewer.view,'pcb');
    await s.win.emit('pagehide',{persisted:true});await s.win.emit('pageshow',{persisted:true});
    assert.equal(viewer.view,'pcb');assert.equal(viewer.disposed,false);
    await s.modes[2].emit('click');assert.equal(viewer.view,'schematic');
    await s.modes[1].emit('click');assert.equal(viewer.view,'3d');
});

test('Discarded documents dispose resources and cannot be resurrected by pageshow',async()=>{
    const s=setup();await s.nodes.get('.irca-start').emit('click');
    await s.win.emit('pagehide',{persisted:false});
    assert.equal(s.viewers[0].disposed,true);
    assert.equal(s.cleanup.disconnects,1);assert.equal(s.cleanup.screenDisposals,1);assert.equal(s.cleanup.carouselDisposals,1);
    await s.win.emit('pageshow',{persisted:true});assert.equal(s.viewers.length,1);
});
