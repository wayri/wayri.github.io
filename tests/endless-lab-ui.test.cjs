const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const engine=require('../assets/js/endless-lab-engine.js');
function setup(width=960){
    function target(){const listeners={};return {listeners,hidden:false,checked:false,disabled:false,textContent:'',addEventListener(name,fn){(listeners[name]??=[]).push(fn);},emit(name,event={}){for(const fn of listeners[name]||[])fn(event);}};}
    const nodes={};for(const id of ['canvas','best','distance','charge','ideas','chase','pulse','status','overlay-title','overlay-copy','start','overlay','pause','relaxed','jump','slide'])nodes[id]=Object.assign(target(),{setPointerCapture(){}});
    const canvas=nodes.canvas;
    canvas.getContext=()=>new Proxy({},{get:(obj,key)=>key in obj?obj[key]:()=>{},set:(obj,key,value)=>(obj[key]=value,true)});
    canvas.getBoundingClientRect=()=>({width,height:420});canvas.focus=()=>{};canvas.setPointerCapture=()=>{};
    const panel={querySelector:selector=>nodes[selector.replace('#lab-runner-','')]};
    const document=Object.assign(target(),{documentElement:{dataset:{theme:'dark'}},hidden:false,getElementById:()=>panel});
    let state,raf;const window=Object.assign(target(),{EndlessLab:{...engine,create(...args){state=engine.create(...args);return state;}},matchMedia:()=>({matches:false}),devicePixelRatio:1});
    const context={window,document,localStorage:{getItem:()=>null,setItem(){}},getComputedStyle:()=>({getPropertyValue:()=>'#111'}),requestAnimationFrame:fn=>(raf=fn,1),cancelAnimationFrame:()=>{raf=null;},ResizeObserver:class{observe(){}},IntersectionObserver:class{observe(){}}};
    vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../assets/js/endless-lab-runner.js'),'utf8'),context);
    return {nodes,canvas,window,document,get state(){return state;},tick(time){const fn=raf;raf=null;if(fn)fn(time);}};
}
test('start, keyboard controls, pause and resume keep the run state',()=>{
    const ui=setup();ui.nodes.start.emit('click');assert.equal(ui.state.mode,'running');assert.equal(ui.nodes.overlay.hidden,true);
    ui.tick(10);ui.tick(60);assert.ok(ui.state.x>0);
    ui.canvas.emit('keydown',{code:'Space',preventDefault(){}});assert.ok(ui.state.vy>0);
    ui.canvas.emit('keyup',{code:'Space'});assert.equal(ui.state.vy,320);
    ui.canvas.emit('keydown',{code:'ArrowDown',preventDefault(){}});assert.equal(ui.state.slide,true);
    ui.canvas.emit('keyup',{code:'ArrowDown'});assert.equal(ui.state.slide,false);
    let prevented=false;ui.nodes.pause.emit('pointerdown',{preventDefault(){prevented=true;}});assert.equal(prevented,true);
    ui.nodes.pause.emit('click');assert.equal(ui.state.mode,'paused');const distance=ui.state.x;
    ui.tick(100);assert.equal(ui.state.x,distance);ui.nodes.start.emit('click');assert.equal(ui.state.mode,'running');assert.equal(ui.state.x,distance);
    ui.canvas.emit('blur');assert.equal(ui.state.mode,'paused');
});
test('mobile touch controls release holds on cancellation and hidden pages pause',()=>{
    const ui=setup(360);ui.nodes.relaxed.checked=true;ui.nodes.start.emit('click');assert.equal(ui.state.relaxed,true);
    ui.nodes.slide.emit('pointerdown',{pointerId:1,preventDefault(){}});assert.equal(ui.state.slide,true);
    ui.nodes.slide.emit('pointercancel');assert.equal(ui.state.slide,false);
    ui.nodes.pulse.emit('pointerdown',{pointerId:2,preventDefault(){}});assert.equal(ui.state.charge,84);
    ui.document.hidden=true;ui.document.emit('visibilitychange');assert.equal(ui.state.mode,'paused');
});
