import {Viewer,WayriCADResultsViewer} from '/assets/lib/kicad-webview/releases/1.1.0/kivi-viewer.js';
import {fetchGallery,requestedCase} from './webview-wayricad-gallery.mjs';

const $=selector=>document.querySelector(selector);
const host=$('#wayricad-layout'),status=$('#wayricad-status'),choose=$('#wayricad-case'),load=$('#wayricad-load');
const boards=$('#wayricad-board-choice'),view=$('#wayricad-view'),evidence=$('#wayricad-evidence');
const evidenceToggle=$('#wayricad-evidence-toggle'),identity=$('#wayricad-source-identity');
const boardTitle=$('#wayricad-board-title'),catalogueStatus=$('#wayricad-catalogue-status');
const theme=()=>document.documentElement.dataset.theme==='dark'?'dark':'light';
const board=new Viewer('#wayricad-board',{theme:theme(),inspectOnSelect:false});
const results=new WayriCADResultsViewer('#wayricad-results',{theme:theme(),boardViewer:board});
const base=new URL('/assets/demos/wayricad-results/',location.href);
const manifestURL=new URL('public-boards/manifest.json',base).href;
const fixtures=[['quick-pi','Quick PI - copper fields'],['quick-si','Quick SI - route, step & eye'],
    ['quick-therm','QuickTherm - steady field'],['quick-therm-transient','QuickTherm - saved time frames']];
const query=new URLSearchParams(location.search),queryCase=query.get('case');
const publicIntent=query.get('gallery')==='public'||Boolean(queryCase&&!fixtures.some(([id])=>id===queryCase));
const manifestController=new AbortController();
let gallery={boards:[],cases:[]},generation=0,controller,observer,started=publicIntent,disposed=false,userTouched=false;
function stop(){controller?.abort();return ++generation;}
function selectedPublicCase(){return boards.value==='fixtures'?null:requestedCase(gallery,choose.value);}
function option(select,value,label){const item=document.createElement('option');item.value=value;item.textContent=label;select.append(item);}
function element(tag,text,parent){const item=document.createElement(tag);item.textContent=text;parent.append(item);return item;}
function link(parent,label,url){const anchor=element('a',label,parent);anchor.href=url;anchor.rel='noopener noreferrer';return anchor;}
function list(parent,title,items){
    element('h3',title,parent);const ul=document.createElement('ul');parent.append(ul);
    for(const item of items)element('li',item,ul);
    if(!items.length)element('li','None declared in the manifest.',ul);
}
function showEvidence(row){
    evidence.replaceChildren();
    identity.hidden=!row;
    if(!row){
        evidenceToggle.textContent='Generated fixture evidence and provenance';
        element('h2','Generated fixture',evidence);
        element('p','Small retained producer examples, not measured hardware or a production design.',evidence);
        link(evidence,'Fixture provenance',new URL('provenance.json',base).href);
        return;
    }
    identity.textContent='Manifest PCB SHA-256: '+row.source_sha256;
    evidenceToggle.textContent=row.kind+' / '+row.status+' - assumptions, license and provenance';
    element('h2',gallery.boards.find(item=>item.id===row.board_id).name+' - '+row.label,evidence);
    const dl=document.createElement('dl');evidence.append(dl);
    for(const [label,value] of [['Case / kind',row.id+' / '+row.kind],['Producer status',row.status],
        ['PCB download',(row.source_bytes/(1024*1024)).toFixed(2)+' MiB ('+row.source_bytes+' bytes)'],
        ['Manifest source SHA-256',row.source_sha256],['License',row.license.name]]){
        element('dt',label,dl);element('dd',value,dl);
    }
    element('p','The hash identifies the case-specific saved PCB, which may be a native copy. An upstream URL does not establish byte identity. Matching loaded bytes are checked separately by the viewer. Retained simulation output is not a measurement or a current rating.',evidence);
    const links=document.createElement('nav');links.setAttribute('aria-label','Case provenance and downloads');evidence.append(links);
    link(links,'Producer provenance',row.provenanceURL);link(links,'Upstream board',row.upstreamURL);
    if(row.license.url)link(links,'Hardware license',row.license.url);
    const source=link(links,'Download exact PCB ('+(row.source_bytes/(1024*1024)).toFixed(2)+' MiB)',row.sourceURL);source.download='';
    if(row.resultURL)link(links,'Retained result JSON',row.resultURL);
    if(row.summary!==null){
        element('h3','Retained summary',evidence);
        element('pre',typeof row.summary==='string'?row.summary:JSON.stringify(row.summary,null,2),evidence);
    }
    list(evidence,'Assumptions',row.assumptions);list(evidence,'Limitations',row.limitations);
    if(row.kind==='quick-therm')element('p','This retained example displays these steady temperature maps independently in 2D. The saved layer/Z metadata is not yet used for PCB placement or standalone 3D; a matching source hash is not a placement guarantee.',evidence);
}
function selectionChanged(){
    stop();started=true;observer?.disconnect();results.clear();
    boardTitle.textContent='PCB view - load selected case to replace the previous board';
    const row=selectedPublicCase();showEvidence(row);
    load.disabled=boards.value!=='fixtures'&&(!row||!row.resultURL);
    load.textContent=row?'Load case + PCB ('+(row.source_bytes/(1024*1024)).toFixed(2)+' MiB)':'Load saved example';
    status.textContent=row?(row.resultURL?'Not loaded - explicit Load downloads the selected result and exact PCB.':'No retained result is available for this case; review its status and provenance.'):'Not loaded - choose Load saved example.';
}
function selectBoard(caseId){
    choose.replaceChildren();
    if(boards.value==='fixtures')for(const [id,label] of fixtures)option(choose,id,label);
    else for(const row of gallery.cases.filter(item=>item.board_id===boards.value))option(choose,row.id,row.label+' - '+row.status);
    if(caseId&&Array.from(choose.options).some(item=>item.value===caseId))choose.value=caseId;
    selectionChanged();
}
async function example(){
    const row=selectedPublicCase(),name=choose.value;
    if(boards.value!=='fixtures'&&(!row||!row.resultURL))return;
    if(!row&&!fixtures.some(([id])=>id===name))return;
    const ticket=stop();started=true;observer?.disconnect();controller=new AbortController();
    const signal=controller.signal;load.disabled=true;results.clear();
    status.textContent='Opening the retained result and its exact PCB...';
    try{
        // Only fixed fixture URLs or validated manifest paths can reach loaders.
        const source=row?.sourceURL||new URL(name==='quick-si'?'si-channel.kicad_pcb':'example.kicad_pcb',base).href;
        const result=row?.resultURL||new URL(name+'.pocket-kivi.json',base).href;
        await board.load(source,{signal,view:view.value});
        if(disposed||ticket!==generation)return;
        boardTitle.textContent='PCB view - '+(row?gallery.boards.find(b=>b.id===row.board_id).name:'generated fixture');
        await results.loadURL(result,{signal});
        if(disposed||ticket!==generation)return;
        results.setBoardOverlay(true);
        status.textContent='Retained '+(row?row.status+' result':'generated fixture')+' loaded - '+results.getSourceState()+' PCB association - no solver executed.';
    }catch(error){
        if(!disposed&&ticket===generation&&error.name!=='AbortError')status.textContent=error.message;
    }finally{if(!disposed&&ticket===generation)load.disabled=false;}
}
async function localFile(event,kind){
    const file=event.target.files?.[0];if(!file)return;
    userTouched=true;
    const ticket=stop();started=true;observer?.disconnect();
    try{
        if(file.size>64*1024*1024)throw Error('Choose a file at most 64 MiB.');
        if(kind==='pcb')await board.loadFiles([file],{view:view.value});
        else{
            const text=await file.text();if(disposed||ticket!==generation)return;
            await results.load(text,{path:file.name});
            if(disposed||ticket!==generation)return;
            results.setBoardOverlay(true);
        }
        if(!disposed&&ticket===generation){
            evidence.replaceChildren();element('h2','Local file',evidence);
            element('p','Local files stay in this browser; source paths inside results are not fetched.',evidence);
            if(kind==='pcb')boardTitle.textContent='PCB view - '+file.name;
            status.textContent='Local file opened - '+results.getSourceState()+' PCB association - no upload.';
        }
    }catch(error){if(!disposed&&ticket===generation)status.textContent=error.message;}
    finally{event.target.value='';if(!disposed&&ticket===generation)load.disabled=false;}
}
load.addEventListener('click',()=>{userTouched=true;void example();});
choose.addEventListener('change',()=>{userTouched=true;selectionChanged();});
boards.addEventListener('change',()=>{userTouched=true;selectBoard();});
view.addEventListener('change',()=>{
    if(!disposed)Promise.resolve(board.setView(view.value)).catch(error=>{if(!disposed)status.textContent=error.message;});
});
$('#wayricad-pcb-file').addEventListener('change',event=>void localFile(event,'pcb'));
$('#wayricad-result-file').addEventListener('change',event=>void localFile(event,'result'));
$('#wayricad-clear').addEventListener('click',()=>{
    stop();started=true;observer?.disconnect();results.clear();
    userTouched=true;
    status.textContent='Saved results cleared.';load.disabled=Boolean(selectedPublicCase()&&!selectedPublicCase().resultURL);
});
window.addEventListener('themeChanged',()=>{if(!disposed){board.setTheme(theme());results.setTheme(theme());}});
window.addEventListener('pagehide',()=>{
    disposed=true;stop();manifestController.abort();observer?.disconnect();results.dispose();board.dispose();
},{once:true});
showEvidence(null);
if(fixtures.some(([id])=>id===queryCase))choose.value=queryCase;
void fetchGallery(manifestURL,{signal:manifestController.signal}).then(value=>{
    if(disposed)return;gallery=value;
    for(const item of gallery.boards)if(gallery.cases.some(row=>row.board_id===item.id))option(boards,item.id,item.name);
    catalogueStatus.textContent=gallery.cases.length+' public-board cases listed. Board/result files load only after an explicit click.';
    if(userTouched)return;
    const requested=requestedCase(gallery,queryCase);
    if(requested){boards.value=requested.board_id;selectBoard(requested.id);}
    else if(queryCase&&!fixtures.some(([id])=>id===queryCase)){
        load.disabled=false;
        status.textContent='Unknown case ID; choose a case from the catalogue. No URL was loaded.';
    }else if(query.get('gallery')==='public'&&boards.options.length>1){boards.selectedIndex=1;selectBoard();}
    else if(publicIntent)load.disabled=false;
}).catch(error=>{
    if(!disposed&&error.name!=='AbortError'){
        catalogueStatus.textContent=error.message;
        if(!userTouched)load.disabled=false;
    }
});
if(publicIntent){load.disabled=true;status.textContent='Resolving the public-board catalogue; no PCB or result download has started.';}
// Large public boards never enter this automatic fixture-only path.
if(!publicIntent){
    if(typeof IntersectionObserver==='function'){
        observer=new IntersectionObserver(entries=>{
            if(!started&&boards.value==='fixtures'&&entries.some(entry=>entry.isIntersecting))void example();
        },{rootMargin:'200px'});observer.observe(host);
    }else void example();
}

