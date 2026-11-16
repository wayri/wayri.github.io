import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {validateGallery,assetURL,requestedCase,fetchGallery,MAX_MANIFEST_BYTES} from '../assets/js/webview-wayricad-gallery.mjs';

const manifestURL='https://example.test/assets/demos/wayricad-results/public-boards/manifest.json';
function manifest(){
    const row={id:'sample-pi',board_id:'public-board',label:'PI native output',kind:'Quick PI',status:'MODELLED',
        result_path:'sample-pi.json',source_path:'../../public-hardware/example.kicad_pcb',
        source_sha256:'a'.repeat(64),source_bytes:44*1024*1024,
        assumptions:['Explicit illustrative load, not a current rating.'],limitations:['No measurement correlation.'],
        summary:{unknown:null,retained_value:0},provenance_path:'provenance.json',
        upstream_url:'https://example.org/design',license:{name:'Hardware terms',url:'https://example.org/license'}};
    return {schema:'wayricad.integration-gallery/v1',boards:[{id:'public-board',name:'Public hardware'}],
        cases:[row,{...structuredClone(row),id:'sample-thermal',label:'Thermal native output',result_path:'thermal.json',kind:'QuickTherm'}]};
}

test('flat manifest resolves exact approved URLs, preserves null/zero summary and unavailable cases',()=>{
    const raw=manifest(),before=structuredClone(raw);
    raw.cases[1].result_path=null;
    const value=validateGallery(raw,manifestURL);
    assert.equal(value.cases[0].sourceURL,'https://example.test/assets/demos/public-hardware/example.kicad_pcb');
    assert.equal(value.cases[0].resultURL,new URL('sample-pi.json',manifestURL).href);
    assert.deepEqual(value.cases[0].summary,{unknown:null,retained_value:0});
    assert.equal(value.cases[1].resultURL,null);
    assert.equal(requestedCase(value,'../other.json'),null);
    assert.equal(requestedCase(value,'sample-pi'),value.cases[0]);
    assert.deepEqual(raw.cases[0],before.cases[0]);
    raw.cases[0].license='CERN-OHL-S-2.0';
    assert.equal(validateGallery(raw,manifestURL).cases[0].license.url,null);
});

test('manifest paths cannot escape, use encoded traversal, cross origin or choose unsupported files',()=>{
    for(const path of ['https://evil.test/board.kicad_pcb','//evil.test/board.kicad_pcb',
        '/assets/demos/public-hardware/board.kicad_pcb','../../../private.kicad_pcb',
        '../../public-hardware-evil/board.kicad_pcb','../../public-hardware/%2e%2e/board.kicad_pcb',
        '..\\..\\public-hardware\\board.kicad_pcb','board.kicad_pcb?token=x','board.kicad_pcb#x']){
        assert.throws(()=>assetURL(path,manifestURL,'source'),path);
    }
    assert.throws(()=>assetURL('../../public-hardware/result.json',manifestURL,'result'));
    assert.throws(()=>assetURL('board.kicad_pcb',manifestURL,'result'));
    assert.throws(()=>assetURL('provenance.html',manifestURL,'provenance'));
});

test('manifest rejects duplicate/unbound/reserved IDs, invalid identities, unbounded data and active links',()=>{
    const mutations=[
        m=>m.cases.push(m.cases[0]),m=>m.boards.push(m.boards[0]),
        m=>m.cases[0].board_id='missing',m=>m.boards[0].id='fixtures',
        m=>m.cases[0].id='quick-pi',m=>m.cases[0].id='../path',
        m=>m.cases[0].source_sha256='bad',m=>m.cases[0].source_bytes=Infinity,
        m=>m.cases[0].source_bytes=65*1024*1024,m=>m.cases[0].source_bytes=0,
        m=>m.cases[0].summary={value:NaN},m=>m.cases[0].assumptions='not an array',
        m=>m.cases[0].upstream_url='javascript:alert(1)',m=>m.cases[0].license.url='data:text/html,test',
        m=>m.cases[0].license.url='https://user:secret@example.org/license'
    ];
    for(const mutate of mutations){const data=manifest();mutate(data);assert.throws(()=>validateGallery(data,manifestURL));}
});

test('manifest fetch is bounded, status checked and receives its lifetime signal',async()=>{
    const abort=new AbortController();let seen;
    const value=await fetchGallery(manifestURL,{signal:abort.signal,fetchImpl:async(url,options)=>{
        seen=[url,options.signal];return new Response(JSON.stringify(manifest()));
    }});
    assert.equal(value.cases.length,2);assert.deepEqual(seen,[manifestURL,abort.signal]);
    await assert.rejects(fetchGallery(manifestURL,{fetchImpl:async()=>new Response('',{status:404})}),/unavailable/);
    await assert.rejects(fetchGallery(manifestURL,{fetchImpl:async()=>new Response('{}',{
        headers:{'content-length':String(MAX_MANIFEST_BYTES+1)}})}),/512 KiB/);
    let cancelled=false;
    const body=new ReadableStream({start(controller){controller.enqueue(new Uint8Array(MAX_MANIFEST_BYTES+1));},cancel(){cancelled=true;}});
    await assert.rejects(fetchGallery(manifestURL,{fetchImpl:async()=>new Response(body)}),/512 KiB/);
    assert.equal(cancelled,true);
});

class Element{
    constructor(tag='div'){this.tag=tag;this.children=[];this.listeners={};this.selectedIndex=-1;this._value='';this.textContent='';this.disabled=false;this.hidden=false;this.files=[];}
    append(child){this.children.push(child);if(this.tag==='select'&&this.selectedIndex<0)this.selectedIndex=0;}
    replaceChildren(...children){this.children=[];this.selectedIndex=-1;for(const child of children)this.append(child);}
    setAttribute(name,value){this[name]=value;}
    addEventListener(name,callback){this.listeners[name]=callback;}
    dispatch(name){return this.listeners[name]?.({target:this});}
    get options(){return this.children;}
    get value(){return this.tag==='select'?this.options[this.selectedIndex]?.value||'':this._value;}
    set value(value){if(this.tag==='select')this.selectedIndex=this.options.findIndex(option=>option.value===value);else this._value=value;}
    set innerHTML(value){throw Error('Metadata must not be inserted as HTML: '+value);}
}
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const uiSource=readFileSync(new URL('../assets/js/webview-wayricad-results.mjs',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'');
function harness(search='',{pendingBoards=false}={}){
    const ids=['wayricad-layout','wayricad-status','wayricad-case','wayricad-load','wayricad-board-choice',
        'wayricad-view','wayricad-evidence','wayricad-board-title','wayricad-catalogue-status',
        'wayricad-pcb-file','wayricad-result-file','wayricad-clear','wayricad-evidence-toggle','wayricad-source-identity'];
    const elements=Object.fromEntries(ids.map(id=>[id,new Element(['wayricad-case','wayricad-board-choice','wayricad-view'].includes(id)?'select':'div')]));
    function add(id,value){const option=new Element('option');option.value=value;elements[id].append(option);}
    add('wayricad-board-choice','fixtures');
    for(const id of ['quick-pi','quick-si','quick-therm','quick-therm-transient'])add('wayricad-case',id);
    elements['wayricad-case'].selectedIndex=3;
    add('wayricad-view','pcb');add('wayricad-view','3d');elements['wayricad-view'].selectedIndex=1;
    const calls={board:[],result:[],files:[],local:[],overlay:[],views:[],clear:0,dispose:0,fetch:[]};
    const waits=[],events={},intersections=[],catalogue=deferred();
    class Viewer{
        load(url,options){calls.board.push({url,options});if(!pendingBoards)return Promise.resolve();const wait=deferred();waits.push(wait);return wait.promise;}
        loadFiles(files){calls.files.push(files);return Promise.resolve();}
        setView(value){calls.views.push(value);}
        setTheme(){}
        dispose(){calls.dispose++;}
    }
    class Results{
        loadURL(url){calls.result.push(url);return Promise.resolve();}
        load(value){calls.local.push(value);return Promise.resolve();}
        clear(){calls.clear++;}
        setBoardOverlay(value){calls.overlay.push(value);}
        getSourceState(){return 'matching';}
        setTheme(){}
        dispose(){calls.dispose++;}
    }
    vm.runInNewContext(uiSource,{
        Viewer,WayriCADResultsViewer:Results,URL,URLSearchParams,AbortController,
        location:{href:'https://example.test/assets/demos/wayricad-results.html'+search,search},
        document:{querySelector:selector=>elements[selector.slice(1)],createElement:tag=>new Element(tag),documentElement:{dataset:{theme:'dark'}}},
        window:{addEventListener:(name,callback)=>{events[name]=callback;}},
        IntersectionObserver:class{constructor(callback){intersections.push(callback);}observe(){}disconnect(){}},
        fetchGallery:(url,options)=>{calls.fetch.push({url,signal:options.signal});return catalogue.promise;},
        requestedCase
    });
    return {elements,calls,waits,events,intersections,catalogue};
}
function allText(element){return [element.textContent,...element.children.map(allText)].join(' ');}

test('public deep link only selects a validated manifest case; no 44 MiB board auto-download',async()=>{
    const h=harness('?case=sample-pi');
    assert.equal(h.calls.board.length,0);assert.equal(h.elements['wayricad-load'].disabled,true);
    h.catalogue.resolve(validateGallery(manifest(),manifestURL));await flush();
    assert.equal(h.elements['wayricad-case'].value,'sample-pi');
    assert.equal(h.calls.board.length,0);assert.equal(h.calls.result.length,0);
    assert.match(h.elements['wayricad-load'].textContent,/44.00 MiB/);
    assert.match(h.elements['wayricad-source-identity'].textContent,/a{64}/);
    assert.match(allText(h.elements['wayricad-evidence']),/MODELLED/);
    assert.match(allText(h.elements['wayricad-evidence']),/Hardware terms/);
    h.elements['wayricad-load'].dispatch('click');await flush();
    assert.equal(h.calls.board.length,1);assert.equal(h.calls.result.length,1);
    assert.equal(h.calls.board[0].url,'https://example.test/assets/demos/public-hardware/example.kicad_pcb');
    assert.match(h.calls.result[0],/sample-pi.json$/);
    h.elements['wayricad-view'].value='pcb';h.elements['wayricad-view'].dispatch('change');
    assert.deepEqual(h.calls.views,['pcb']);
});

test('unknown case query cannot become a URL; fixtures remain separately available',async()=>{
    const h=harness('?case=https://evil.test/result.json');
    h.catalogue.resolve(validateGallery(manifest(),manifestURL));await flush();
    assert.equal(h.calls.board.length,0);assert.equal(h.calls.result.length,0);
    assert.match(h.elements['wayricad-status'].textContent,/Unknown case ID/);
    assert.equal(h.elements['wayricad-case'].options.length,4);
});

test('legacy synthetic lazy-load remains fixed-path and clear prevents automatic reload',async()=>{
    const h=harness();
    h.intersections[0]([{isIntersecting:true}]);await flush();
    assert.match(h.calls.board[0].url,/\/example.kicad_pcb$/);
    assert.match(h.calls.result[0],/quick-therm-transient.pocket-kivi.json$/);
    h.elements['wayricad-clear'].dispatch('click');
    h.intersections[0]([{isIntersecting:true}]);await flush();
    assert.equal(h.calls.board.length,1);
    h.catalogue.resolve(validateGallery(manifest(),manifestURL));await flush();
});

test('selection aborts stale loads and stale completion cannot enable a newer loading action',async()=>{
    const h=harness('?gallery=public',{pendingBoards:true});
    h.catalogue.resolve(validateGallery(manifest(),manifestURL));await flush();
    h.elements['wayricad-load'].dispatch('click');
    h.elements['wayricad-case'].value='sample-thermal';h.elements['wayricad-case'].dispatch('change');
    assert.equal(h.calls.board[0].options.signal.aborted,true);
    h.elements['wayricad-load'].dispatch('click');
    h.waits[0].resolve();await flush();
    assert.equal(h.calls.result.length,0);assert.equal(h.elements['wayricad-load'].disabled,true);
    h.waits[1].resolve();await flush();
    assert.equal(h.calls.result.length,1);assert.match(h.calls.result[0],/thermal.json$/);
    assert.equal(h.elements['wayricad-load'].disabled,false);
});

test('local results never fetch embedded source paths and late catalogue cannot replace local mode',async()=>{
    const h=harness('?case=sample-pi'),input=h.elements['wayricad-result-file'];
    input.files=[{size:100,name:'local.json',text:async()=>'{"source_path":"https://evil.test/board.kicad_pcb"}'}];
    input.dispatch('change');await flush();
    h.catalogue.resolve(validateGallery(manifest(),manifestURL));await flush();
    assert.equal(h.calls.board.length,0);assert.equal(h.calls.local.length,1);
    assert.equal(h.elements['wayricad-board-choice'].value,'fixtures');
    assert.match(allText(h.elements['wayricad-evidence']),/Local file/);
});

test('pagehide aborts catalogue/load and lifetime guard ignores late completion',async()=>{
    const h=harness('?case=sample-pi');h.events.pagehide();
    assert.equal(h.calls.fetch[0].signal.aborted,true);assert.equal(h.calls.dispose,2);
    h.catalogue.resolve(validateGallery(manifest(),manifestURL));await flush();
    assert.equal(h.elements['wayricad-board-choice'].options.length,1);
    const second=harness('?gallery=public',{pendingBoards:true});
    second.catalogue.resolve(validateGallery(manifest(),manifestURL));await flush();
    second.elements['wayricad-load'].dispatch('click');second.events.pagehide();
    assert.equal(second.calls.board[0].options.signal.aborted,true);
    second.waits[0].resolve();await flush();assert.equal(second.calls.result.length,0);
});

test('unavailable retained result is explicit and cannot start a board download',async()=>{
    const raw=manifest();raw.cases[0].result_path=null;
    const h=harness('?case=sample-pi');h.catalogue.resolve(validateGallery(raw,manifestURL));await flush();
    assert.equal(h.elements['wayricad-load'].disabled,true);
    assert.match(h.elements['wayricad-status'].textContent,/No retained result/);
    h.elements['wayricad-load'].dispatch('click');await flush();assert.equal(h.calls.board.length,0);
});

test('all three product pages link the public gallery and maintained guide without host-parity claims',()=>{
    for(const file of ['wayricad.html','kicad-online.html','kicad-webview.html']){
        const source=readFileSync(new URL('../'+file,import.meta.url),'utf8');
        assert.match(source,/wayricad-results\.html' \| relative_url }}\?gallery=public/);
        assert.match(source,/kicad-webview\/docs\/wayricad-results\//);
    }
    const demo=readFileSync(new URL('../assets/demos/wayricad-results.html',import.meta.url),'utf8');
    assert.match(demo,/<noscript>/);
    assert.match(demo,/id="wayricad-board-choice"/);
    assert.match(demo,/id="wayricad-view"/);
    const guide=readFileSync(new URL('../kicad-webview-docs/wayricad-results.md',import.meta.url),'utf8');
    assert.match(guide,/case-specific saved PCB/);
    assert.match(guide,/differ from the raw/);
    assert.match(guide,/result_path/);
});
