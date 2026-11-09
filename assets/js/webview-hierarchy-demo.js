(() => {
  'use strict';
  const host = document.querySelector('#hierarchy-board');
  if (!host || !window.KiCadWebView || !window.IRCAProject) return;
  const api = window.KiCadWebView, project = window.IRCAProject;
  const status = document.querySelector('#hierarchy-status'), sheetStatus = document.querySelector('#hierarchy-sheet-status');
  const marble = document.querySelector('#hierarchy-marble'), irca = document.querySelector('#hierarchy-start');
  const files = document.querySelector('#hierarchy-files'), choose = document.querySelector('#hierarchy-sheet');
  const preview = document.querySelector('#hierarchy-preview'), layout = document.querySelector('#hierarchy-layout');
  const title = document.querySelector('#hierarchy-sheet-title'), trail = document.querySelector('#hierarchy-trail');
  const open = document.querySelector('#hierarchy-open');
  const buttons = ['hierarchy-expand','hierarchy-collapse','hierarchy-export'].map(id=>document.getElementById(id));
  const manifest = '/assets/demos/public-hardware/marble-project.json';
  const theme = () => document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  let tree, viewer, state, pending, selectionTicket = 0, loading = false, disposed = false;
  const rows = model => { const result=[];const walk=(node,parents)=>{const names=[...parents,node.name||node.file];result.push({node,names});node.children.forEach(child=>walk(child,names));};model.roots.forEach(node=>walk(node,[]));return result; };
  const linkedStart=document.querySelector('#hierarchy-link-start'),linkedToggle=document.querySelector('#hierarchy-link-toggle');
  const linkedViews=document.querySelector('#hierarchy-linked-views'),linkedStatus=document.querySelector('#hierarchy-link-status');
  const boardChoice=document.querySelector('#hierarchy-board-file'),boardChoiceLabel=document.querySelector('#hierarchy-board-choice');
  const partControls=document.querySelector('#hierarchy-part-controls'),partSearch=document.querySelector('#hierarchy-part-search'),partResults=document.querySelector('#hierarchy-part-results');
  const fitLinked=document.querySelector('#hierarchy-link-fit'),clearLinked=document.querySelector('#hierarchy-link-clear');
  const frontPart=document.querySelector('#hierarchy-part-front'),backPart=document.querySelector('#hierarchy-part-back');
  let linkSession=null,treeSync=false;
  const filePath=file=>file.path||file.webkitRelativePath||file.name;
  async function textSource(file) {
    if(typeof file.source==='string')return file.source;
    if(file.bytes instanceof Uint8Array||file.bytes instanceof ArrayBuffer)return new TextDecoder('utf-8',{fatal:true}).decode(file.bytes);
    return file.text();
  }
  function closeLinked() {
    const previous=linkSession;linkSession=null;
    previous?.abort.abort();previous?.linker?.dispose();previous?.pcb?.dispose();previous?.assembly?.dispose();
    if(!linkedStart)return;
    linkedViews.hidden=true;partControls.hidden=true;partResults.replaceChildren();
    [linkedToggle,fitLinked,clearLinked,frontPart,backPart,partSearch].forEach(control=>control.disabled=true);
    linkedStart.textContent='Link PCB and 3D';linkedStart.disabled=false;boardChoice.disabled=false;
    linkedStatus.textContent='Load the board on request. Component links use saved project identities; 3D turns to the selected part’s mounting side.';
  }
  function configureLinked(active) {
    if(!linkedStart)return;
    const boards=active.kind==='marble'?[{path:'Marble.kicad_pcb'}]:active.files.filter(file=>/\.kicad_pcb$/i.test(filePath(file)));
    boardChoice.replaceChildren();
    if(boards.length!==1){const option=document.createElement('option');option.value='';option.textContent='Choose a PCB';boardChoice.append(option);}
    for(const file of boards){const option=document.createElement('option');option.value=filePath(file);option.textContent=filePath(file);boardChoice.append(option);}
    boardChoiceLabel.hidden=boards.length<2;linkedStart.disabled=boards.length===0||!boardChoice.value;
    linkedStatus.textContent=boards.length?(active.kind==='marble'?'Marble’s board is approximately 44 MB and loads only on request. Missing custom models remain labelled stand-ins.':'Load the PCB and 3D assembly on request. Selection uses saved component relationships.'):'Include a matching PCB with your local schematics or ZIP to enable linked board views.';
  }
  function renderPartResults() {
    if(!linkSession?.linker)return;
    const session=linkSession,query=partSearch.value.trim().toLowerCase().slice(0,200);
    const candidates=session.index.parts.filter(part=>part.status==='matched'&&(!query||[part.reference,part.value,part.sheetPath].join(' ').toLowerCase().includes(query)));
    partResults.replaceChildren();
    document.querySelector('#hierarchy-part-count').textContent=candidates.length+' linked components'+(candidates.length>16?' · showing first 16':'');
    for(const part of candidates.slice(0,16)){
      const button=document.createElement('button');button.type='button';button.textContent=part.reference+' · '+part.value+' · '+part.sheetPath;button.disabled=!session.linker.enabled;
      button.addEventListener('click',()=>session.linker.focusRecord(part));partResults.append(button);
    }
    frontPart.disabled=!session.linker.enabled||!session.index.parts.some(part=>part.status==='matched'&&part.layer==='F.Cu');
    backPart.disabled=!session.linker.enabled||!session.index.parts.some(part=>part.status==='matched'&&part.layer==='B.Cu');
  }
  async function enableLinked() {
    if(linkSession){closeLinked();configureLinked(state);return;}
    if(!state||loading||!boardChoice.value)return;
    const active=state;linkedStart.disabled=true;boardChoice.disabled=true;
    linkedStatus.textContent='Loading the PCB, linked 3D view and saved component relationships…';linkedViews.hidden=false;
    const session={abort:new AbortController()};linkSession=session;
    linkedStart.disabled=false;linkedStart.textContent='Cancel linked load';
    try {
      const [{HierarchyViewLinks},selection,linkedAPI]=await Promise.all([import('./webview-hierarchy-links.mjs'),import('./webview-project-selection.mjs'),import('/assets/lib/kicad-webview/releases/0.1.0-beta.2/kivi-viewer.js')]);
      if(linkSession!==session||state!==active||disposed)return;
      const create=mount=>active.kind==='irca'?project.createViewer(mount,{theme:theme(),inspectOnSelect:false},linkedAPI.Viewer):new linkedAPI.Viewer(mount,{theme:theme(),inspectOnSelect:false});
      session.pcb=create('#hierarchy-pcb-viewer');session.assembly=create('#hierarchy-3d-viewer');
      if(active.kind==='marble'){
        const [projectResponse,indexResponse]=await Promise.all([fetch(manifest,{credentials:'omit',signal:session.abort.signal}),fetch('/assets/demos/public-hardware/marble-part-links.json',{credentials:'omit',signal:session.abort.signal})]);
        if(!projectResponse.ok||!indexResponse.ok)throw Error('Public project link metadata could not load.');
        const listed=await projectResponse.json(),data=await indexResponse.json();
        if(data.index?.schema!=='wayri.project-selection/v1'||data.index.boardPath!=='Marble.kicad_pcb'||!Array.isArray(data.index.parts)||data.index.parts.length>10000)throw Error('Unexpected saved component index.');
        session.index=data.index;
        const boardProject={entry:'Marble.kicad_pcb',files:listed.files.filter(file=>file.path.endsWith('.kicad_pcb')||/\.(glb|wrl)$/i.test(file.path))};
        await session.pcb.load(boardProject,{view:'pcb',signal:session.abort.signal});
        const captured=await linkedAPI.captureViewState([session.pcb]);
        if(captured.views[0].sha256!==data.displayBoard?.sha256)throw Error('PCB source does not match its component link index.');
        await session.assembly.load(boardProject,{view:'3d',signal:session.abort.signal});
      } else {
        const board=active.files.find(file=>filePath(file)===boardChoice.value);
        const sources=await Promise.all(active.files.filter(file=>/\.kicad_sch$/i.test(filePath(file))).map(async file=>({path:filePath(file),source:await textSource(file)})));
        session.index=selection.buildProjectSelectionIndex({boardPath:filePath(board),boardSource:await textSource(board),schematics:sources,hierarchy:active.model,...(active.kind==='irca'?{projectName:''}:{})},window.KiCadDesignDiff.parse);
        const boardFiles=active.files.filter(file=>file===board||/\.(glb|wrl)$/i.test(filePath(file)));
        await session.pcb.loadFiles(boardFiles,{view:'pcb',file:filePath(board),signal:session.abort.signal});
        await session.assembly.loadFiles(boardFiles,{view:'3d',file:filePath(board),signal:session.abort.signal});
      }
      if(linkSession!==session||state!==active||disposed)return;
      session.linker=new HierarchyViewLinks({api:linkedAPI,index:session.index,pcb:session.pcb,assembly:session.assembly,
        getSheet:()=>state===active&&viewer&&active.sheetNode?{viewer,node:active.sheetNode}:null,
        navigate:async(record,options)=>{
          if(state!==active)throw Error('Project changed.');
          const node=rows(active.model).find(row=>row.node.id===record.sheetInstanceId&&row.node.path===record.sheetPath)?.node;
          if(!node)throw Error('The saved sheet instance is not in this hierarchy.');
          tree.expandAll();treeSync=true;try{tree.select(node.id);}finally{treeSync=false;}
          return openSheet(node,{linked:true,signal:options.signal});
        },onStatus:message=>{if(linkSession===session)linkedStatus.textContent=message;}});
      linkedToggle.disabled=false;linkedToggle.checked=true;fitLinked.disabled=clearLinked.disabled=partSearch.disabled=false;
      partControls.hidden=false;partSearch.value='';renderPartResults();
      linkedStart.textContent='Unload PCB and 3D';
      linkedStatus.textContent='Linked views ready · '+session.index.stats.matched+' saved PCB components. Select or search a part in any view to highlight its peers and frame 3D.';
    } catch(error) {
      if(linkSession===session){closeLinked();configureLinked(active);if(error.name!=='AbortError')linkedStatus.textContent='Could not enable linked views: '+error.message;}
    } finally {if(linkSession===session&&state===active)linkedStart.disabled=false;}
  }
  linkedStart?.addEventListener('click',enableLinked);
  boardChoice?.addEventListener('change',()=>{linkedStart.disabled=!boardChoice.value;});
  linkedToggle?.addEventListener('change',()=>{linkSession?.linker?.setEnabled(linkedToggle.checked);renderPartResults();});
  partSearch?.addEventListener('input',renderPartResults);
  frontPart?.addEventListener('click',()=>{const record=linkSession?.index.parts.find(part=>part.status==='matched'&&part.layer==='F.Cu');if(record)linkSession.linker.focusRecord(record);});
  backPart?.addEventListener('click',()=>{const record=linkSession?.index.parts.find(part=>part.status==='matched'&&part.layer==='B.Cu');if(record)linkSession.linker.focusRecord(record);});
  fitLinked?.addEventListener('click',()=>{linkSession?.pcb.fit();linkSession?.assembly.fit();});
  clearLinked?.addEventListener('click',()=>linkSession?.linker?.clearSelection());

  async function openSheet(node,{linked=false,signal}={}) {
    if (!state || loading || disposed || node.status !== 'ok') return;
    const active=state,ticket=++selectionTicket;
    if(!linked)linkSession?.linker?.clearSelection();
    linkSession?.linker?.setSchematic(null);
    preview.hidden=false;layout.dataset.preview='true';title.textContent=node.path;
    trail.textContent=rows(active.model).find(row=>row.node.id===node.id)?.names.join(' › ') || node.path;
    choose.value=node.path;sheetStatus.textContent='Opening '+node.path+'…';
    open.hidden=active.kind==='local';
    if (!open.hidden) { const url=new URL('/assets/demos/direct.html',location.origin);url.searchParams.set('example',active.kind);url.searchParams.set('file',node.path);url.searchParams.set('view','schematic');open.href=url.href; }
    try {
      viewer ||= active.kind==='irca' ? project.createViewer('#hierarchy-sheet-viewer',{theme:theme(),inspectOnSelect:false}) : new api.Viewer('#hierarchy-sheet-viewer',{theme:theme(),inspectOnSelect:false});
      const options={file:node.path,view:'schematic',signal:signal||pending.signal};
      const selected=active.kind==='marble'?{entry:node.path,files:[{path:node.path,url:'https://raw.githubusercontent.com/BerkeleyLab/Marble/a426777d92c0f22a546d4740b419a3937e0c1f90/design/'+node.path.split('/').map(encodeURIComponent).join('/')}]}:null;
      const ok=selected?await viewer.load(selected,options):await viewer.loadFiles(active.files.filter(file=>filePath(file)===node.path),options);
      if (ok && state===active && ticket===selectionTicket) { active.sheetNode=node;linkSession?.linker?.setSchematic(viewer);sheetStatus.textContent='Opened '+node.path+'. Pan, zoom or inspect saved symbols. The tree remains available for navigation.';return viewer; }
    } catch(error) { if(state===active&&ticket===selectionTicket&&error.name!=='AbortError')sheetStatus.textContent='Could not open sheet: '+error.message; }
  }
  async function load(kind,input) {
    if(loading||disposed)return;loading=true;pending?.abort();pending=new AbortController();++selectionTicket;
    closeLinked();if(linkedStart)linkedStart.disabled=true;state=null;viewer?.dispose();viewer=null;tree?.dispose();tree=null;host.replaceChildren();
    preview.hidden=true;layout.dataset.preview='false';choose.replaceChildren();choose.disabled=true;
    [marble,irca,files,...buttons].forEach(control=>control.disabled=true);
    status.textContent=kind==='marble'?'Opening the saved Marble hierarchy…':'Reading saved schematic relationships…';
    try {
      tree=new api.ProjectTree(host,{theme:theme(),onSelect:node=>treeSync?undefined:openSheet(node)});let local;
      if(kind==='marble'){
        const response=await fetch('/assets/demos/public-hardware/marble-hierarchy.json',{credentials:'omit',signal:pending.signal});
        if(!response.ok)throw Error('Hierarchy snapshot could not load.');const text=await response.text();if(new TextEncoder().encode(text).length>256*1024)throw Error('Hierarchy snapshot exceeds its budget.');
        const data=JSON.parse(text);if(data.schema!=='wayri.hierarchy-demo/v1'||data.sourceRevision!=='a426777d92c0f22a546d4740b419a3937e0c1f90'||data.hierarchy?.rootPath!=='Marble.kicad_sch')throw Error('Unexpected hierarchy revision.');tree.setHierarchy(data.hierarchy);
      } else if(kind==='irca') { local=await project.files();await tree.loadFiles(local); }
      else {
        if(input.reduce((sum,file)=>sum+file.size,0)>64*1024*1024||input.length>256)throw Error('Choose up to 256 files and 64 MiB total.');
        local=input.length===1&&/\.zip$/i.test(input[0].name)?await api.readZip(new Uint8Array(await input[0].arrayBuffer()),{signal:pending.signal}):input;
        await tree.loadFiles(local,{signal:pending.signal});
      }
      if(disposed)return;const model=tree.getHierarchy();state={kind,model,files:local};configureLinked(state);
      const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='Choose a saved schematic sheet';choose.append(placeholder);
      for(const file of model.files){const option=document.createElement('option');option.value=file.path;option.textContent=file.path;choose.append(option);}
      choose.disabled=false;buttons.forEach(control=>control.disabled=false);
      marble.setAttribute('aria-pressed',String(kind==='marble'));irca.setAttribute('aria-pressed',String(kind==='irca'));
      status.textContent=(kind==='marble'?'Marble · ':kind==='irca'?'IRCA · ':'Local project · ')+model.stats.files+(model.stats.files===1?' schematic file · ':' schematic files · ')+model.stats.instances+(model.stats.instances===1?' sheet instance. ':' sheet instances. ')+'Select any available root or subsheet to open it below.';
    } catch(error){if(error.name!=='AbortError')status.textContent='Could not read hierarchy: '+error.message;}
    finally{loading=false;if(!disposed)[marble,irca,files].forEach(control=>control.disabled=false);}
  }
  marble.addEventListener('click',()=>load('marble'));irca.addEventListener('click',()=>load('irca'));
  files.addEventListener('change',()=>{if(files.files.length)load('local',[...files.files]);files.value='';});
  choose.addEventListener('change',()=>{const node=state&&rows(state.model).find(row=>row.node.path===choose.value&&row.node.status==='ok')?.node;if(node){tree.expandAll();tree.select(node.id);}});
  buttons[0].addEventListener('click',()=>tree?.expandAll());buttons[1].addEventListener('click',()=>tree?.collapseAll());
  buttons[2].addEventListener('click',()=>{if(!tree)return;const url=URL.createObjectURL(new Blob([tree.toSVG()],{type:'image/svg+xml'})),link=document.createElement('a');link.href=url;link.download='schematic-hierarchy.svg';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
  document.querySelector('#hierarchy-fit').addEventListener('click',()=>viewer?.fit());
  window.addEventListener('themeChanged',()=>{tree?.setTheme(theme());viewer?.setTheme(theme());linkSession?.pcb?.setTheme(theme());linkSession?.assembly?.setTheme(theme());});
  window.addEventListener('pagehide',()=>{disposed=true;pending?.abort();++selectionTicket;closeLinked();tree?.dispose();viewer?.dispose();state=null;},{once:true});
  load('marble');
})();
