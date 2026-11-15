const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../assets/js/project-gallery.js'),'utf8');
const captures=require('../_data/kicad_online_gallery.json').slides;

function setup(reducedMotion=false) {
    const element=(dataset={})=>({dataset,hidden:false,attributes:{},events:{},textContent:'',
        addEventListener(name,handler){this.events[name]=handler},setAttribute(name,value){this.attributes[name]=value},click(){this.events.click()}});
    const slides=[element({label:captures[0].title,galleryGroup:captures[0].group}),element({label:'Release highlights',galleryGroup:'release',galleryDuration:'12000'}),
        ...captures.slice(1).map(slide=>element({label:slide.title,galleryGroup:slide.group})),element({label:'Sources',galleryGroup:'details'})];
    const previous=element(),next=element(),toggle=element(),status=element();
    const topics=['latest','release','design','3d','bom','review','details'].map(group=>element({galleryTopic:group}));
    const gallery=element();gallery.hasAttribute=name=>name==='data-gallery-autoplay';gallery.contains=value=>value===toggle;
    gallery.querySelectorAll=selector=>selector==='[data-gallery-slide]'?slides:topics;
    gallery.querySelector=selector=>({'[data-gallery-previous]':previous,'[data-gallery-next]':next,'[data-gallery-status]':status,'[data-gallery-toggle]':toggle}[selector]);
    const timers=new Map(),windowEvents={};let timerId=0,observer;
    const document={hidden:false,events:{},querySelectorAll:()=>[gallery],addEventListener(name,handler){this.events[name]=handler}};
    const motion={matches:reducedMotion,addEventListener(name,handler){this.change=handler}};
    class IntersectionObserver {constructor(callback){observer=callback}observe(){}}
    const window={matchMedia:()=>motion,setTimeout:(fn,delay)=>{timers.set(++timerId,{fn,delay});return timerId},clearTimeout:id=>timers.delete(id),
        addEventListener:(name,handler)=>windowEvents[name]=handler,IntersectionObserver};
    vm.runInNewContext(source,{document,window,IntersectionObserver});
    return {slides,previous,next,toggle,status,topics,gallery,timers,document,motion,windowEvents,visibility:value=>observer([{isIntersecting:value}])};
}

test('every real capture and release/source panel is reachable through one presentation',()=>{
    const ui=setup(true);assert.equal(ui.slides.length,captures.length+2);
    const seen=new Set();
    for(let i=0;i<ui.slides.length;i++){
        assert.equal(ui.slides.filter(slide=>!slide.hidden).length,1);
        seen.add(ui.slides.find(slide=>!slide.hidden).dataset.label);ui.next.click();
    }
    assert.equal(seen.size,ui.slides.length);
    assert.equal(ui.slides[0].hidden,false);
    assert.ok(seen.has('Sources')&&seen.has('Release highlights'));
});

test('topic and keyboard navigation pause playback and retain independent selection',()=>{
    const ui=setup();assert.equal(ui.timers.size,1);
    const topic=ui.topics.find(button=>button.dataset.galleryTopic==='review');topic.click();
    assert.equal(ui.slides.find(slide=>!slide.hidden).dataset.galleryGroup,'review');
    assert.equal(topic.attributes['aria-pressed'],'true');assert.equal(ui.timers.size,0);
    assert.equal(ui.toggle.textContent,'Play slideshow');
    let prevented=false;ui.gallery.events.keydown({key:'ArrowRight',preventDefault(){prevented=true}});
    assert.equal(prevented,true);assert.equal(ui.timers.size,0);
    ui.gallery.events.mouseleave();ui.gallery.events.focusout({relatedTarget:null});
    assert.equal(ui.timers.size,0,'leaving the gallery must not restart manually paused playback');
});

test('autoplay respects reduced motion, viewport/document visibility and text-panel reading time',()=>{
    const reduced=setup(true);assert.equal(reduced.timers.size,0);
    const ui=setup();ui.visibility(false);assert.equal(ui.timers.size,0);
    ui.visibility(true);assert.equal(ui.timers.size,1);
    ui.document.hidden=true;ui.document.events.visibilitychange();assert.equal(ui.timers.size,0);
    ui.document.hidden=false;ui.document.events.visibilitychange();assert.equal(ui.timers.size,1);
    ui.next.click();ui.toggle.click();assert.equal([...ui.timers.values()][0].delay,12000);
    ui.windowEvents.pagehide();assert.equal(ui.timers.size,0);ui.windowEvents.pageshow();assert.equal(ui.timers.size,1);
});
