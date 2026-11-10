(() => {
  'use strict';
  const host = document.querySelector('#drawing');
  if (!host) return;
  const query = new URLSearchParams(location.search), project = window.IRCAProject;
  const status = document.querySelector('#demo-status'), choose = document.querySelector('#demo-example');
  const launch = document.querySelector('#demo-load'), details = document.querySelector('#demo-credit');
  const theme = () => query.get('theme') || (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
  const tools = document.querySelector('#demo-view-controls'), layers = document.querySelector('#demo-layers');
  const toolButtons = tools ? [...tools.querySelectorAll('button')] : [];
  let viewer;
  const examples = {
    irca: {name:'IRCA', credit:'Approved IRCA review geometry and display models by Yawar Badri. Original editable CAD and model sources are not offered as downloads.'},
    olimex: {name:'OLIMEX ESP32-P4-DevKit Rev.D1', url:'/assets/demos/public-hardware/olimex-p4-project.json', credit:'OLIMEX Ltd and upstream contributors · hardware CERN-OHL-S-2.0; software GPLv3; documentation CC BY-SA 4.0. Pinned 26705d3. Missing models and unsupported drawing features remain labelled.', source:'https://github.com/OLIMEX/ESP32-P4-DevKit/blob/26705d36407a07324348927dfd30fbf4ffc1d94c/README.md'},
    marble: {name:'BerkeleyLab Marble', url:'/assets/demos/public-hardware/marble-project.json', credit:'© 2019–2023 The Regents of the University of California, through LBNL; Michal Gaska / WUT, Larry Doolittle / LBNL and upstream contributors · hardware CERN-OHL v1.2. Pinned a426777. PCB and all saved schematic sheets. Board download approximately 44 MB; drawings and model assets load on request. Model coverage and adaptation are recorded in the provenance.', source:'https://github.com/BerkeleyLab/Marble/blob/a426777d92c0f22a546d4740b419a3937e0c1f90/README.md'}
  };
  function credit(example) {
    details.replaceChildren(document.createTextNode(example.credit));
    if (example.source) { const link = document.createElement('a'); link.href = example.source; link.textContent = ' Source, license and full credits ↗'; details.appendChild(link); }
  }
  async function load() {
    if (launch) launch.disabled = true;
    toolButtons.forEach(button => button.disabled = true); layers?.replaceChildren();
    try {
      viewer?.dispose(); viewer = null;
      const source = query.get('src'), provider = query.get('provider') || 'kicad';
      if (!['kicad','altium'].includes(provider)) throw Error('Choose the kicad or altium provider.');
      const name = choose?.value || query.get('example') || 'irca';
      const example = examples[name];
      if (!source && !example) throw Error('Choose IRCA, OLIMEX or Marble.');
      const knownSource = source && Object.values(examples).find(item => item.url && new URL(source,location.href).href === new URL(item.url,location.href).href);
      credit(knownSource || (source ? {credit:'Visitor-supplied design URL. Check its source license and access permissions. Cross-origin sources must permit CORS. The viewer does not upload this design.'} : example));
      status.textContent = 'Loading ' + (source ? 'the supplied design' : example.name) + '…';
      const workspace = query.get('workspace') === 'true';
      const options = {theme:theme(),inspectOnSelect:query.get('inspectOnSelect') === 'true'};
      if (!source && name === 'irca') {
        viewer = workspace ? project.createWorkspace(host,{...options,layout:'single'}) : project.createViewer(host,options);
        viewer.addEventListener('ready',()=>layers?.replaceChildren());
        await project.load(viewer,{view:query.get('view') || '3d',file:query.get('file') || undefined});
      } else {
        const api = await import('https://wayri.github.io/assets/lib/kicad-webview/releases/0.2.1/kivi-viewer.js');
        if (provider === 'altium' && !source) throw Error('Supply an approved public Altium source URL. This beta uses an external online provider.');
        viewer = provider === 'altium' ? new api.AltiumViewer(host) : workspace ? new api.AdvancedKiCadViewer(host,{...options,layout:'single'}) : new api.KiCadViewer(host,options);
        viewer.addEventListener('ready',()=>layers?.replaceChildren());
        await viewer.load(source || example.url,{view:query.get('view') || 'pcb',file:query.get('file') || undefined,ref:query.get('ref') || undefined});
      }
      if (workspace && innerWidth < 600) viewer.setNavigatorOpen(false);
      toolButtons.forEach(button => button.disabled = provider === 'altium');
      status.textContent = (source ? 'Supplied design' : example.name) + ' loaded. Drag to navigate; use Fit and the view controls to reset.';
    } catch (error) { status.textContent = 'Could not open design: ' + error.message; }
    finally { if (launch) launch.disabled = false; }
  }
  tools?.addEventListener('click',async event => {
    const button = event.target.closest('button[data-view-action]'); if (!button || !viewer) return;
    const target = viewer.getActiveViewer?.() || viewer, action = button.dataset.viewAction;
    button.disabled = true;
    try {
      if (action === 'fit') target.fit();
      else if (action === 'inspect') target.setInspectorOpen(true);
      else if (action === 'layers') {
        if (layers.childElementCount) layers.replaceChildren();
        else {
          const available = target.getLayers();
          if (!available.length) throw Error('Open a PCB drawing to select its saved layers.');
          const selected = new Set(available);
          for (const layer of available) {
            const label = document.createElement('label'), input = document.createElement('input'); input.type = 'checkbox'; input.checked = true;
            input.addEventListener('change',()=>{ if(input.checked)selected.add(layer);else selected.delete(layer);target.setLayers([...selected]); });
            label.append(input,document.createTextNode(layer));layers.append(label);
          }
        }
      } else {
        const extension = action === 'schematic' ? '.kicad_sch' : '.kicad_pcb';
        const files = target.getFiles(), pcb = files.find(file => file.path.endsWith('.kicad_pcb'));
        const entry = files.find(file => file.path === pcb?.path.replace(/\.kicad_pcb$/,extension)) || files.find(file => file.path.endsWith(extension));
        if (!entry) throw Error('This project does not list a '+extension+' drawing.');
        await target.openFile(entry.path,{view:action}); layers.replaceChildren();
      }
    } catch(error) { status.textContent = error.message; }
    finally { button.disabled = false; }
  });
  choose?.addEventListener('change',()=>{const link=document.querySelector('#project-mode');if(link){const url=new URL(location.href);url.searchParams.set('workspace','true');url.searchParams.set('example',choose.value);link.href=url.href;}});
  let initialObserver=null, initialPending=true;
  function startInitialLoad() {
    if (!initialPending) return;
    initialPending=false; initialObserver?.disconnect(); initialObserver=null;
    load();
  }
  launch?.addEventListener('click',()=>{
    if (initialPending) startInitialLoad(); else load();
  });
  if (choose && examples[query.get('example')]) choose.value = query.get('example');
  const projectMode = document.querySelector('#project-mode');
  if (projectMode) { const url = new URL(location.href); url.searchParams.set('workspace','true'); projectMode.href = url.href; }
  window.addEventListener('themeChanged',()=>{ if (!query.has('theme')) viewer?.setTheme?.(theme()); });
  window.addEventListener('pagehide',()=>{initialPending=false;initialObserver?.disconnect();initialObserver=null;viewer?.dispose();},{once:true});
  if (typeof IntersectionObserver === 'function') {
    status.textContent = 'The design will load when the viewer is near the screen.';
    try {
      initialObserver = new IntersectionObserver(entries=>{if(entries.some(entry=>entry.target===host && entry.isIntersecting)) startInitialLoad();},{rootMargin:'200px'});
      initialObserver.observe(host);
    } catch { initialObserver?.disconnect(); initialObserver=null; startInitialLoad(); }
  } else startInitialLoad();
})();
