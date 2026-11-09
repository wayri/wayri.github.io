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
  async function openSheet(node) {
    if (!state || loading || disposed || node.status !== 'ok') return;
    const active=state,ticket=++selectionTicket;
    preview.hidden=false;layout.dataset.preview='true';title.textContent=node.path;
    trail.textContent=rows(active.model).find(row=>row.node.id===node.id)?.names.join(' › ') || node.path;
    choose.value=node.path;sheetStatus.textContent='Opening '+node.path+'…';
    open.hidden=active.kind==='local';
    if (!open.hidden) { const url=new URL('/assets/demos/direct.html',location.origin);url.searchParams.set('example',active.kind);url.searchParams.set('file',node.path);url.searchParams.set('view','schematic');open.href=url.href; }
    try {
      viewer ||= active.kind==='irca' ? project.createViewer('#hierarchy-sheet-viewer',{theme:theme()}) : new api.Viewer('#hierarchy-sheet-viewer',{theme:theme()});
      const options={file:node.path,view:'schematic',signal:pending.signal};
      const ok=active.kind==='marble' ? await viewer.load(manifest,options) : await viewer.loadFiles(active.files,options);
      if (ok && state===active && ticket===selectionTicket) sheetStatus.textContent='Opened '+node.path+'. Pan, zoom or inspect saved symbols. The tree remains available for navigation.';
    } catch(error) { if(state===active&&ticket===selectionTicket&&error.name!=='AbortError')sheetStatus.textContent='Could not open sheet: '+error.message; }
  }
  async function load(kind,input) {
    if(loading||disposed)return;loading=true;pending?.abort();pending=new AbortController();++selectionTicket;
    state=null;viewer?.dispose();viewer=null;tree?.dispose();tree=null;host.replaceChildren();
    preview.hidden=true;layout.dataset.preview='false';choose.replaceChildren();choose.disabled=true;
    [marble,irca,files,...buttons].forEach(control=>control.disabled=true);
    status.textContent=kind==='marble'?'Opening the saved Marble hierarchy…':'Reading saved schematic relationships…';
    try {
      tree=new api.ProjectTree(host,{theme:theme(),onSelect:openSheet});let local;
      if(kind==='marble'){
        const response=await fetch('/assets/demos/public-hardware/marble-hierarchy.json',{credentials:'omit',signal:pending.signal});
        if(!response.ok)throw Error('Hierarchy snapshot could not load.');const text=await response.text();if(new TextEncoder().encode(text).length>256*1024)throw Error('Hierarchy snapshot exceeds its budget.');
        const data=JSON.parse(text);if(data.schema!=='wayri.hierarchy-demo/v1'||data.sourceRevision!=='a426777d92c0f22a546d4740b419a3937e0c1f90'||data.hierarchy?.rootPath!=='Marble.kicad_sch')throw Error('Unexpected hierarchy revision.');tree.setHierarchy(data.hierarchy);
      } else if(kind==='irca') { local=(await project.files()).filter(file=>file.path.endsWith('.kicad_sch'));await tree.loadFiles(local); }
      else {
        if(input.reduce((sum,file)=>sum+file.size,0)>64*1024*1024||input.length>256)throw Error('Choose up to 256 files and 64 MiB total.');
        local=input.length===1&&/\.zip$/i.test(input[0].name)?await api.readZip(new Uint8Array(await input[0].arrayBuffer()),{signal:pending.signal}):input;
        await tree.loadFiles(local,{signal:pending.signal});
      }
      if(disposed)return;const model=tree.getHierarchy();state={kind,model,files:local};
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
  window.addEventListener('themeChanged',()=>{tree?.setTheme(theme());viewer?.setTheme(theme());});
  window.addEventListener('pagehide',()=>{disposed=true;pending?.abort();++selectionTicket;tree?.dispose();viewer?.dispose();state=null;},{once:true});
  load('marble');
})();
