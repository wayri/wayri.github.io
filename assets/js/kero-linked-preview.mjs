import {Viewer,linkViewers} from '/assets/lib/kicad-webview/previews/expanded-vias-6deefae/kivi-viewer.js';
const status=document.querySelector('#status'),buttons=[...document.querySelectorAll('.demo-controls button')];
const viewers=['schematic','layout','assembly'].map(id=>new Viewer('#'+id,{theme:'dark',inspectOnSelect:false}));
for(const viewer of viewers){for(const [name,value] of Object.entries({bg:'#181917',bar:'#21221f',ink:'#f0eee7',muted:'#b5b3a8',border:'#49483f',hover:'#32342c',accent:'#e2c264',active:'#3a3524'}))viewer.root.style.setProperty('--viewer-'+name,value);const style=document.createElement('style');style.textContent=':host([data-theme="dark"]) .viewer-picker select option{background:#21221f;color:#f0eee7}';viewer.surface.append(style);}
let link;try{
 await Promise.all(viewers.map((viewer,i)=>viewer.load('/assets/lib/kicad-webview/previews/expanded-vias-6deefae/demo/project.json',i===0?{file:'decoder.kicad_sch'}:i===2?{view:'3d'}:{})));
 link=linkViewers(viewers);link.addEventListener('link',()=>status.textContent='Selection linked · 3D focuses saved parts; cameras remain independent.');
 link.addEventListener('linkerror',e=>status.textContent=e.detail.error.message);
 buttons.forEach(button=>button.disabled=false);status.textContent='Ready · choose a sheet, part, net or layer.';
 document.querySelector('#part').onclick=()=>{const part=viewers[0].getParts().find(p=>p.reference==='D1');if(part)viewers[0].selectPart(part.id);else status.textContent='D1 is not present on the current sheet; select a saved part directly.';};
 document.querySelector('#net').onclick=()=>viewers[1].selectNet('/VBAT');
 const expand=document.querySelector('#expand');expand.onclick=()=>{const active=expand.getAttribute('aria-pressed')!=='true';expand.setAttribute('aria-pressed',String(active));viewers[2].setExpand(active?85:0);};
 document.querySelector('#clear').onclick=()=>viewers[0].clearSelection();
 document.querySelector('#fit').onclick=()=>viewers.forEach(viewer=>viewer.fit());
 window.keroPreview={viewers,link};
}catch(error){status.textContent='Could not load preview: '+error.message;}
window.addEventListener('pagehide',()=>{link?.dispose();viewers.forEach(viewer=>viewer.dispose());},{once:true});
