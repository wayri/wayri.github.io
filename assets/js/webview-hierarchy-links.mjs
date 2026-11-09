/* Copyright (c) 2026 wayri. SPDX-License-Identifier: MPL-2.0 */
import {resolvePCBPart,resolveSchematicPart,nativePartForRecord} from './webview-project-selection.mjs';

/** Host navigation around the library's independent, read-only viewer instances. */
export class HierarchyViewLinks {
  constructor({api,index,pcb,assembly,getSheet,navigate,onStatus=()=>{}}) {
    this.index=index;this.pcb=pcb;this.assembly=assembly;this.getSheet=getSheet;
    this.navigate=navigate;this.onStatus=onStatus;this.enabled=true;this.disposed=false;this.muted=0;this.ticket=0;
    this.boardGroup=api.linkViewers([pcb,assembly]);
    this.peerListeners=[pcb,assembly].map(viewer=>{
      const listener=event=>this.peerSelection(viewer,event);
      viewer.addEventListener('select',listener);return()=>viewer.removeEventListener('select',listener);
    });
    this.setSchematic(getSheet()?.viewer);
  }
  atomic(action) {
    this.muted++;this.boardGroup.setEnabled(false);
    try{return action();}finally{this.muted--;if(!this.disposed)this.boardGroup.setEnabled(this.enabled);}
  }
  setSchematic(viewer) {
    if(this.sheetViewer===viewer)return;
    if(this.sheetViewer)this.sheetViewer.removeEventListener('select',this.sheetListener);
    this.sheetViewer=viewer||null;
    if(viewer){this.sheetListener=event=>this.sheetSelection(viewer,event);viewer.addEventListener('select',this.sheetListener);}
  }
  currentEvent(viewer,event) {
    if(this.disposed||!this.enabled||this.muted||!event.detail||!Object.hasOwn(event.detail,'item'))return false;
    return (event.detail.path===undefined||event.detail.path===viewer.path)&&(event.detail.view===undefined||event.detail.view===viewer.view);
  }
  peerSelection(source,event) {
    if(!this.currentEvent(source,event))return;
    if(event.detail.item===null){if(this.remounts&&source===this.assembly)return;this.clearSelection();return;}
    const item=source.getSelection()||event.detail.item,record=resolvePCBPart(this.index,item);
    if(record)this.focusRecord(record,{source,item});
    else {this.cancel();this.atomic(()=>this.sheetViewer?.clearSelection());this.onStatus('PCB/3D object selection stays local to the board when no unique saved component link exists.');}
  }
  sheetSelection(source,event) {
    if(!this.currentEvent(source,event))return;
    if(event.detail.item===null){this.clearSelection();return;}
    const context=this.getSheet();if(!context||context.viewer!==source||source.path!==context.node.path)return;
    const item=source.getSelection()||event.detail.item;
    const record=resolveSchematicPart(this.index,item,{sheetInstanceId:context.node.id,sheetPath:context.node.path});
    if(record)this.focusRecord(record,{source,item});
    else {this.cancel();this.atomic(()=>{this.pcb.clearSelection();this.assembly.clearSelection();});this.onStatus('This selection has no unique saved PCB counterpart. No component was guessed from its reference.');}
  }
  cancel(){++this.ticket;this.pending?.abort();this.pending=null;this.pendingKey=null;}
  clearSelection(){this.cancel();if(this.disposed)return;this.atomic(()=>{this.pcb.clearSelection();this.assembly.clearSelection();this.sheetViewer?.clearSelection();});this.onStatus('Selection cleared in all linked views.');}
  setEnabled(value){if(this.disposed)return;this.enabled=Boolean(value);this.cancel();this.boardGroup.setEnabled(this.enabled);this.onStatus(this.enabled?'Cross-selection enabled. Selecting a part also frames its mounting side in 3D.':'Cross-selection paused; the viewers remain independently interactive.');}
  focusRecord(record,{source,item}={}) {
    if(this.disposed||!this.enabled||!record||!(this.index.parts.includes(record)||(this.index.unitAliases||[]).includes(record)))return Promise.resolve(false);
    const key=record.boardUuid+'|'+record.sheetInstanceId+'|'+record.symbolUuid+'|'+(item?.uuid||record.boardUuid);
    if(this.pendingKey===key)return this.operation;
    this.cancel();const ticket=this.ticket,controller=new AbortController();this.pending=controller;this.pendingKey=key;
    const valid=()=>!this.disposed&&this.enabled&&ticket===this.ticket&&!controller.signal.aborted;
    this.operation=(async()=>{
      try {
        await Promise.resolve();if(!valid())return false;
        let context=this.getSheet();
        if(!context||context.node.id!==record.sheetInstanceId||context.viewer.path!==record.sheetPath){
          this.onStatus('Opening '+record.sheetPath+' for '+record.reference+'…');
          await this.navigate(record,{signal:controller.signal});context=this.getSheet();
        }
        if(!valid())return false;
        if(!context||context.node.id!==record.sheetInstanceId||context.viewer.path!==record.sheetPath)throw Error('The saved sheet instance could not be opened.');
        this.setSchematic(context.viewer);
        if(this.assembly.view!=='3d'){this.remounts=(this.remounts||0)+1;try{await this.assembly.setView('3d',{signal:controller.signal});}finally{this.remounts--;}}
        if(!valid())return false;
        const pcbPart=nativePartForRecord(this.index,this.pcb.getParts(),record,'pcb');
        const modelPart=nativePartForRecord(this.index,this.assembly.getParts(),record,'pcb');
        const symbol=nativePartForRecord(this.index,context.viewer.getParts(),record,'schematic');
        if(!pcbPart||!modelPart||!symbol)throw Error('The loaded source does not contain a unique saved counterpart.');
        this.atomic(()=>{
          const preservePad=(source===this.pcb||source===this.assembly)&&['pad','pin'].includes(item?.type||item?.kind)&&item.uuid;
          const pcbOK=preservePad&&this.pcb.selectObject(item.uuid,{locate:false})||this.pcb.selectPart(pcbPart.id,{locate:false});
          const modelOK=preservePad&&this.assembly.selectObject(item.uuid,{locate:true})||this.assembly.selectPart(modelPart.id,{locate:true});
          const symbolOK=context.viewer.selectPart(symbol.id,{locate:source!==context.viewer});
          if(!pcbOK||!modelOK||!symbolOK)throw Error('A saved counterpart has no selectable rendered geometry in one of the views.');
        });
        const camera=this.assembly.getCamera3D(),side=record.layer==='B.Cu'?-1:1;
        const facing=camera&&(camera.position[2]-camera.target[2])*side>0;
        this.onStatus('Linked '+record.reference+' · '+record.sheetPath+' · '+(facing?'3D facing the '+(side<0?'back':'front')+' mounting side.':'3D selected; framing is unavailable for this geometry.'));
        return true;
      } catch(error) {if(valid()&&error.name!=='AbortError')this.onStatus('Cross-selection: '+error.message);return false;}
      finally{if(ticket===this.ticket){this.pending=null;this.pendingKey=null;}}
    })();
    return this.operation;
  }
  dispose(){if(this.disposed)return;this.cancel();this.disposed=true;this.enabled=false;this.setSchematic(null);this.peerListeners.forEach(stop=>stop());this.peerListeners=[];this.boardGroup.dispose();this.index=null;}
}
