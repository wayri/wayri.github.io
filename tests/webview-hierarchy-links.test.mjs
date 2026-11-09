import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {HierarchyViewLinks} from '../assets/js/webview-hierarchy-links.mjs';
const {index}=JSON.parse(fs.readFileSync(new URL('../assets/demos/public-hardware/marble-part-links.json',import.meta.url)));
const primary=index.parts.filter(p=>p.status==='matched');
const boardParts=()=>primary.map(p=>({id:index.boardPath+'#'+p.boardUuid,uuid:p.boardUuid,schematicUuid:p.symbolUuid,layer:p.layer}));
const defer=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
const flush=()=>new Promise(resolve=>setImmediate(resolve));
class Viewer extends EventTarget {
 constructor(path,view,parts){super();this.path=path;this.view=view;this.parts=parts;this.calls=[];this.selection=null;this.objects=new Map();this.listeners=new Set();this.camera={position:[2,3,40],target:[2,3,0]};}
 addEventListener(type,callback,...rest){super.addEventListener(type,callback,...rest);if(type==='select')this.listeners.add(callback);}
 removeEventListener(type,callback,...rest){super.removeEventListener(type,callback,...rest);if(type==='select')this.listeners.delete(callback);}
 emit(item,{path=this.path,view=this.view}={}){this.selection=item;const event=new Event('select');Object.defineProperty(event,'detail',{value:{item,path,view}});this.dispatchEvent(event);}
 getSelection(){return this.selection;}
 getParts(){return this.parts;}
 getCamera3D(){return this.view==='3d'?this.camera:null;}
 async setView(view,{signal}={}){this.calls.push({method:'setView',view});if(this.viewGate)await this.viewGate.promise;if(signal?.aborted)throw new DOMException('Cancelled','AbortError');this.view=view;return true;}
 locate(part,locate){if(locate)this.camera={position:[0,0,part.layer==='B.Cu'?-30:30],target:[0,0,0]};}
 selectPart(id,{locate=false}={}){this.calls.push({method:'selectPart',id,locate});const p=this.parts.find(p=>p.id===id||p.uuid===id);if(!p)return false;this.locate(p,locate);this.emit({uuid:p.uuid,kind:'part'});return true;}
 selectObject(id,{locate=false}={}){this.calls.push({method:'selectObject',id,locate});const owner=this.objects.get(id),p=this.parts.find(p=>p.uuid===owner);if(!p)return false;this.locate(p,locate);this.emit({uuid:id,ownerUuid:owner,kind:'pad'});return true;}
 clearSelection(){this.calls.push({method:'clearSelection'});this.emit(null);}
}
function harness({initial=primary[0],deferred=false,assemblyView='3d'}={}){
 const pcb=new Viewer(index.boardPath,'pcb',boardParts()),assembly=new Viewer(index.boardPath,assemblyView,boardParts()),statuses=[],navigation=[],gates=[];
 const makeSheet=record=>{
  const symbols=[...new Set(index.symbolInstances.filter(p=>p.sheetPath===record.sheetPath).map(p=>p.symbolUuid))].map(uuid=>({id:record.sheetPath+'#'+uuid,uuid,schematicUuid:'',layer:''}));
  return {node:{id:record.sheetInstanceId,path:record.sheetPath},viewer:new Viewer(record.sheetPath,'schematic',symbols)};
 };
 let context=initial?makeSheet(initial):null;
 const group={enabled:true,disposed:false,setEnabled(v){this.enabled=v;},dispose(){this.disposed=true;}};
 const api={linkViewers(viewers){assert.deepEqual(viewers,[pcb,assembly]);return group;}};
 const navigate=async(record,{signal})=>{
  navigation.push(record);
  if(deferred){const gate=defer();gates.push({record,signal,...gate});await gate.promise;}
  if(signal.aborted)throw new DOMException('Cancelled','AbortError');
  context=makeSheet(record);return context.viewer;
 };
 const links=new HierarchyViewLinks({api,index,pcb,assembly,getSheet:()=>context,navigate,onStatus:s=>statuses.push(s)});
 return {links,pcb,assembly,group,statuses,navigation,gates,get sheet(){return context;},makeSheet};
}
test('every registered native multi-unit alias selects its physical PCB and focuses assembly, keeping source schematic camera',async()=>{
 assert.equal(index.unitAliases.length,43);
 for(const record of index.unitAliases){
  const h=harness({initial:record}),camera=structuredClone(h.sheet.viewer.camera);
  h.sheet.viewer.emit({uuid:'a-pin',ownerUuid:record.symbolUuid,kind:'pin'});
  assert.equal(await h.links.operation,true);
  assert.equal(h.pcb.calls.find(c=>c.method==='selectPart').id,index.boardPath+'#'+record.boardUuid);
  assert.equal(h.pcb.calls.find(c=>c.method==='selectPart').locate,false);
  assert.equal(h.assembly.calls.find(c=>c.method==='selectPart').locate,true);
  assert.deepEqual(h.sheet.viewer.camera,camera);
  assert.equal(h.sheet.viewer.calls.find(c=>c.method==='selectPart').locate,false);
  h.links.dispose();
 }
});
test('PCB selection navigates to the exact primary hierarchy sheet and frames its saved mounting side',async()=>{
 const record=primary.find(p=>p.layer==='B.Cu'&&p.sheetInstanceId!==primary[0].sheetInstanceId),h=harness();
 h.pcb.emit({uuid:record.boardUuid,kind:'part'});
 assert.equal(await h.links.operation,true);
 assert.equal(h.sheet.node.id,record.sheetInstanceId);
 assert.equal(h.sheet.viewer.selection.uuid,record.symbolUuid);
 assert.ok(h.assembly.camera.position[2]<0);
 assert.equal(h.sheet.viewer.calls.find(c=>c.method==='selectPart').locate,true);
 h.links.dispose();
});
test('PCB selections distinguish the same symbol UUID in both repeated QSFP instances',async()=>{
 const a=primary.find(p=>p.sheetInstanceId==='r0/s13'),b=primary.find(p=>p.sheetInstanceId==='r0/s14'&&p.symbolUuid===a.symbolUuid),h=harness();
 assert.ok(a&&b);
 for(const record of [b,a]){
  h.pcb.emit({uuid:record.boardUuid,kind:'part'});assert.equal(await h.links.operation,true);
  assert.equal(h.sheet.node.id,record.sheetInstanceId);assert.equal(h.sheet.viewer.path,'QSFP.kicad_sch');
 }
 h.links.dispose();
});
test('rapid selection is last-wins even when earlier navigation completes last',async()=>{
 const a=primary.find(p=>p.sheetInstanceId!==primary[0].sheetInstanceId),b=primary.find(p=>p.sheetInstanceId!==a.sheetInstanceId&&p.sheetInstanceId!==primary[0].sheetInstanceId),h=harness({deferred:true});
 const first=h.links.focusRecord(a);await flush();assert.equal(h.gates.length,1);
 const second=h.links.focusRecord(b);await flush();assert.equal(h.gates.length,2);assert.equal(h.gates[0].signal.aborted,true);
 h.gates[1].resolve();assert.equal(await second,true);
 h.gates[0].resolve();assert.equal(await first,false);
 assert.equal(h.sheet.node.id,b.sheetInstanceId);assert.equal(h.assembly.selection.uuid,b.boardUuid);
 assert.equal(h.pcb.calls.filter(c=>c.method==='selectPart').length,1);
 h.links.dispose();
});
test('clear, toggle-off and dispose cancel pending navigation without late selection',async()=>{
 for(const action of ['clear','disable','dispose']){
  const record=primary.find(p=>p.sheetInstanceId!==primary[0].sheetInstanceId),h=harness({deferred:true}),operation=h.links.focusRecord(record);
  await flush();assert.equal(h.gates.length,1);
  if(action==='clear')h.links.clearSelection();else if(action==='disable')h.links.setEnabled(false);else h.links.dispose();
  assert.equal(h.gates[0].signal.aborted,true);h.gates[0].resolve();assert.equal(await operation,false);
  assert.equal(h.pcb.calls.filter(c=>c.method==='selectPart').length,0);
  assert.equal(h.assembly.calls.filter(c=>c.method==='selectPart').length,0);
  if(action==='clear')assert.equal(h.pcb.selection,null);
  if(action==='disable')assert.equal(h.group.enabled,false);
  if(action==='dispose'){assert.equal(h.group.disposed,true);assert.equal(h.pcb.listeners.size,0);assert.equal(h.assembly.listeners.size,0);assert.equal(h.sheet.viewer.listeners.size,0);}
  h.links.dispose();
 }
});
test('selection restores 3D while preserving the manually positioned PCB and source schematic cameras',async()=>{
 const record=primary.find(p=>p.layer==='B.Cu'),h=harness({initial:record,assemblyView:'pcb'});
 h.pcb.camera={position:[17,19,90],target:[17,19,0]};h.sheet.viewer.camera={position:[22,23,80],target:[22,23,0]};
 const pcbCamera=structuredClone(h.pcb.camera),sheetCamera=structuredClone(h.sheet.viewer.camera);
 h.sheet.viewer.emit({uuid:record.symbolUuid,kind:'part'});
 assert.equal(await h.links.operation,true);
 assert.equal(h.assembly.view,'3d');assert.equal(h.assembly.calls.find(c=>c.method==='setView').view,'3d');
 assert.deepEqual(h.pcb.camera,pcbCamera);assert.deepEqual(h.sheet.viewer.camera,sheetCamera);assert.ok(h.assembly.camera.position[2]<0);
 h.links.dispose();
});
test('clearing during asynchronous 3D restore prevents later geometry selection',async()=>{
 const record=primary[0],h=harness({initial:record,assemblyView:'pcb'});h.assembly.viewGate=defer();
 const operation=h.links.focusRecord(record);await flush();
 assert.equal(h.assembly.calls.filter(c=>c.method==='setView').length,1);h.links.clearSelection();h.assembly.viewGate.resolve();
 assert.equal(await operation,false);assert.equal(h.pcb.calls.filter(c=>c.method==='selectPart').length,0);
 h.links.dispose();
});
test('PCB pad owners preserve exact pad selection in board peers and locate the assembly',async()=>{
 const record=primary[0],h=harness({initial:record});h.pcb.objects.set('pad-saved-uuid',record.boardUuid);h.assembly.objects.set('pad-saved-uuid',record.boardUuid);
 h.pcb.emit({uuid:'pad-saved-uuid',ownerUuid:record.boardUuid,kind:'pad'});
 assert.equal(await h.links.operation,true);
 assert.deepEqual(h.pcb.calls.find(c=>c.method==='selectObject'),{method:'selectObject',id:'pad-saved-uuid',locate:false});
 assert.deepEqual(h.assembly.calls.find(c=>c.method==='selectObject'),{method:'selectObject',id:'pad-saved-uuid',locate:true});
 assert.equal(h.sheet.viewer.selection.uuid,record.symbolUuid);h.links.dispose();
});
test('stale source events and mismatched loaded PCB-to-symbol identities never select peers',async()=>{
 const record=primary[0],h=harness({initial:record});
 h.pcb.emit({uuid:record.boardUuid},{path:'different.kicad_pcb'});await flush();assert.equal(h.links.operation,undefined);
 h.assembly.parts=h.assembly.parts.map(p=>p.uuid===record.boardUuid?{...p,schematicUuid:'different-symbol'}:p);
 assert.equal(await h.links.focusRecord(record),false);
 assert.equal(h.pcb.calls.filter(c=>c.method==='selectPart').length,0);assert.match(h.statuses.at(-1),/loaded source/);h.links.dispose();
});
