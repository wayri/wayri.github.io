import {fidelitySource,fidelityCapabilities} from './webview-fidelity-source.mjs';
const host=document.querySelector('#fidelity-viewer');
if(host){
  const status=document.querySelector('#fidelity-status'),source=document.querySelector('#fidelity-source'),mode=document.querySelector('#fidelity-mode'),name=document.querySelector('#fidelity-org');
  const api=window.KiCadWebView,capabilities=fidelityCapabilities(api),abort=new AbortController();
  let viewer,ticket=0,disposed=false;
  const notes=document.querySelector('#fidelity-availability');
  notes.textContent=capabilities.advanced?'The loaded SDK exposes the 0.7 API. Try variables, numeric expressions and horizontal tables.':'This page is serving the published 0.6 SDK. Saved graphics, text and overbars run now; the prepared 0.7 variable, expression and table example is available as source below. Its live mode enables when a supporting SDK is released.';
  document.querySelector('#fidelity-advanced').disabled=!capabilities.advanced;
  async function render(){
    if(disposed||!api?.Viewer)return;const current=++ticket;
    const advanced=mode.value==='advanced'&&capabilities.advanced,content=fidelitySource({advanced});source.textContent=content;
    status.textContent='Preparing format sample…';
    try{
      viewer??=new api.Viewer(host,{theme:document.documentElement.dataset.theme==='dark'?'dark':'light',inspectOnSelect:false});
      const loaded=await viewer.loadSource(content,{path:'drawing-fidelity.kicad_sch',textVariables:{ORG:name.value.slice(0,80)||'Wayri'},signal:abort.signal});
      if(loaded&&current===ticket&&!disposed)status.textContent=advanced?'Rendered project text and table; numeric expression evaluates to 12. Inspect rendering notes for limits.':'Rendered saved graphics and text. This generated formatting sample is not a circuit or hardware validation.';
    }catch(error){if(current===ticket&&!disposed)status.textContent=error.message;}
  }
  document.querySelector('#fidelity-render').addEventListener('click',render);
  document.querySelector('#fidelity-fit').addEventListener('click',()=>viewer?.fit());
  document.querySelector('#fidelity-preview-source').textContent=fidelitySource({advanced:true});
  mode.addEventListener('change',render);
  const themeObserver=new MutationObserver(()=>viewer?.setTheme(document.documentElement.dataset.theme==='dark'?'dark':'light'));
  themeObserver.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  window.addEventListener('pagehide',()=>{disposed=true;++ticket;abort.abort();themeObserver.disconnect();viewer?.dispose();},{once:true});
  render();
}
