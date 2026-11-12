const button=document.querySelector('#bom-load'),status=document.querySelector('#bom-status');
const theme=()=>document.documentElement.dataset.theme==='dark'?'dark':'light';
let board,bom,controller,disposed=false;
button.addEventListener('click',async()=>{
  button.disabled=true;status.textContent='Loading the viewer and saved OLIMEX drawing…';
  try {
    const {Viewer,BOMViewer}=await import('/assets/lib/kicad-webview/releases/0.6.0/kivi-viewer.js');
    if(disposed)return;
    board=new Viewer('#bom-board',{theme:theme(),inspectOnSelect:false});
    bom=new BOMViewer('#bom',{viewer:board,theme:theme()});
    bom.addEventListener('error',event=>{status.textContent=event.detail.message;});
    controller=new AbortController();
    const loaded=await board.load('/assets/demos/public-hardware/olimex-p4-project.json',{view:'pcb',signal:controller.signal});
    if(!disposed && (!loaded || !bom.getBOM()))throw Error('The saved drawing or its BoM could not be opened.');
    if(!disposed)status.textContent='Saved drawing loaded. Search the BoM or switch to Board data.';
  } catch(error) {
    if(!disposed){status.textContent=`Could not open the example: ${error.message}`;bom?.dispose();board?.dispose();bom=board=null;button.disabled=false;}
  }
});
window.addEventListener('themeChanged',()=>{board?.setTheme(theme());bom?.setTheme(theme());});
window.addEventListener('pagehide',()=>{disposed=true;controller?.abort();bom?.dispose();board?.dispose();},{once:true});
