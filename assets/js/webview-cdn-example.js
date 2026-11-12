/* Copyright (c) 2026 wayri. SPDX-License-Identifier: MPL-2.0 */
window.startWebViewCDNExample = async function(Viewer,version) {
  'use strict';
  const project='https://wayri.github.io/assets/demos/public-hardware/olimex-p4-project.json';
  const status=document.querySelector('#demo-status'),buttons=[...document.querySelectorAll('[data-cdn-view]')],fit=document.querySelector('#cdn-fit'),appearance=document.querySelector('#cdn-appearance');
  const theme=()=>document.documentElement.dataset.theme==='dark'?'dark':'light';
  const viewer=new Viewer('#drawing',{theme:theme(),inspectOnSelect:false});let disposed=false;
  async function open(view) {
    buttons.forEach(button=>button.disabled=true);fit.disabled=true;appearance.disabled=true;status.textContent='Opening OLIMEX '+view+'…';
    try {
      const file='ESP32-P4-DevKit_Rev_D1.'+(view==='schematic'?'kicad_sch':'kicad_pcb');
      if(await viewer.load(project,{view,file}))status.textContent='OLIMEX '+view+' loaded'+(version?' · KiCad WebView '+version:'')+' · read only.';
    } catch(error) {if(!disposed)status.textContent='Could not open design: '+error.message;}
    finally{if(!disposed){buttons.forEach(button=>button.disabled=false);fit.disabled=false;appearance.disabled=viewer.view!=='3d';if(!appearance.disabled)appearance.value=viewer.getAppearance();}}
  }
  viewer.addEventListener('error',event=>{if(!disposed)status.textContent=event.detail.message;});
  buttons.forEach(button=>button.addEventListener('click',()=>open(button.dataset.cdnView)));
  fit.addEventListener('click',()=>viewer.fit());
  appearance.addEventListener('change',()=>{try{appearance.value=viewer.setAppearance(appearance.value);}catch(error){status.textContent=error.message;}});
  viewer.addEventListener('viewchange',()=>{appearance.disabled=viewer.view!=='3d';if(!appearance.disabled)appearance.value=viewer.getAppearance();});
  window.addEventListener('themeChanged',()=>viewer.setTheme(theme()));
  window.addEventListener('pagehide',()=>{disposed=true;viewer.dispose();},{once:true});
  await open('pcb');
};
