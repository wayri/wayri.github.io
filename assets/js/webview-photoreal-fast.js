/* Copyright (c) 2026 wayri. SPDX-License-Identifier: MPL-2.0 */
(() => {
  const mount=document.querySelector('#photo-viewer'),status=document.querySelector('#photo-status');
  const board=document.querySelector('#photo-board'),quality=document.querySelector('#photo-quality');
  const buttons=[...document.querySelectorAll('.photo-controls button')];
  const initial=new URLSearchParams(location.search).get('board');if(['irca','olimex'].includes(initial))board.value=initial;
  let viewer=null,request=0,abort=null,disposed=false;
  const theme=()=>document.documentElement.dataset.theme==='dark'?'dark':'light';
  function renderQuality(){if(!viewer||viewer.view!=='3d')return;const actual=viewer.setRenderQuality(quality.value);quality.value=actual;status.textContent=(board.value==='irca'?'IRCA':'OLIMEX')+' · '+(actual==='photoreal-fast'?'Photoreal Fast':actual==='presentation'?'Presentation':'Standard')+' · drag to orbit; right-drag to pan; click to inspect.';}
  async function load(){
    const id=++request;abort?.abort();abort=new AbortController();viewer?.dispose();viewer=null;
    const selected=board.value;status.textContent='Opening '+selected.toUpperCase()+' and its supplied models…';quality.disabled=true;buttons.forEach(b=>b.disabled=true);
    try{
      const opts={theme:theme()};
      const next=selected==='irca'?IRCAProject.createViewer(mount,opts):new KiCadWebView.Viewer(mount,opts);viewer=next;
      if(selected==='irca')await IRCAProject.load(next,{view:'3d',signal:abort.signal});
      else await next.load('/assets/demos/public-hardware/olimex-p4-project.json',{view:'3d',signal:abort.signal});
      if(disposed||id!==request)return;
      next.setCamera3D('isometric');renderQuality();
      next.addEventListener('viewchange',()=>{if(viewer===next&&next.view==='3d')renderQuality();});
      quality.disabled=false;buttons.forEach(b=>b.disabled=false);
      const url=new URL(location.href);url.searchParams.set('board',selected);history.replaceState(null,'',url);
    }catch(error){if(id===request&&!disposed&&error.name!=='AbortError')status.textContent='Could not open this board: '+error.message;}
  }
  board.addEventListener('change',()=>void load());quality.addEventListener('change',renderQuality);
  document.querySelector('#photo-iso').onclick=()=>viewer?.setCamera3D('isometric');
  document.querySelector('#photo-bottom').onclick=()=>viewer?.setCamera3D('bottom');
  document.querySelector('#photo-fit').onclick=()=>viewer?.fit();
  document.querySelector('#photo-stats').onclick=()=>{document.querySelector('#photo-stats-output').textContent=JSON.stringify(viewer?.getRenderStats()||{status:'No loaded 3D view'},null,2);};
  const observer=new MutationObserver(()=>viewer?.setTheme(theme()));observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  addEventListener('pagehide',()=>{disposed=true;++request;abort?.abort();viewer?.dispose();observer.disconnect();},{once:true});
  void load();
})();
