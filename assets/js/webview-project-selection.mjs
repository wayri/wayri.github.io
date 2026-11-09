/* Copyright (c) 2026 wayri. SPDX-License-Identifier: MPL-2.0 */
const MAX_FILES=256,MAX_PARTS=10000,MAX_INSTANCES=2048;
const value=x=>x&&typeof x==='object'&&!Array.isArray(x)?x.quoted:x;
const kind=x=>Array.isArray(x)?value(x[0]):null;
const children=(n,k)=>Array.isArray(n)?n.filter(x=>kind(x)===k):[];
const child=(n,k)=>children(n,k)[0];
const scalar=(n,k)=>value(child(n,k)?.[1]);
const text=(s,max=512)=>typeof s==='string'&&s.length<=max&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(s)?s:null;
const uuid=s=>{
 s=text(s,128);if(!s||! /^[a-z\d_.:-]+$/i.test(s))return null;
 if(/^[\da-f]{8}$/i.test(s))return '00000000-0000-0000-0000-0000'+s.toLowerCase();
 return s.toLowerCase();
};
const nodeUuid=n=>uuid(scalar(n,'uuid'))||uuid(scalar(n,'tstamp'));
const savedUuid=n=>{const modern=scalar(n,'uuid'),legacy=scalar(n,'tstamp');return uuid(modern)?modern:uuid(legacy)?legacy:null;};
const path=s=>typeof s==='string'&&s.length<=500&&!/[\\\u0000-\u001f\u007f?#%]/.test(s)&&!s.startsWith('/')&&!/^[a-z][a-z\d+.-]*:/i.test(s)&&s.split('/').every(p=>p&&p!=='.'&&p!=='..')?s:null;
const instanceSegments=s=>{
 if(typeof s!=='string'||s.length>8192||!s.startsWith('/'))return null;
 const raw=s.split('/').slice(1);if(raw.some(p=>!p))return null;
 const ids=raw.map(uuid);return ids.every(Boolean)?ids:null;
};
const instanceKey=ids=>'/'+ids.join('/');
const property=(n,name)=>text(value(children(n,'property').find(p=>value(p[1])===name)?.[2]));
const reference=n=>property(n,'Reference')||text(value(children(n,'fp_text').find(p=>value(p[1])==='reference')?.[2]),128)||'';
const add=(map,key,item)=>{const list=map.get(key)||[];list.push(item);map.set(key,list);};

/**
 * Build an exact, serializable saved-identity index. parse must be the KiCad
 * S-expression parser. hierarchy is a ProjectTree snapshot with roots/children.
 * No network calls occur. Direct links use saved paths; optional unit aliases
 * require complete native project annotation. Visible Reference and Sheetfile
 * properties are never used as matching keys.
 */
export function buildProjectSelectionIndex({boardPath,boardSource,schematics,hierarchy,projectName},parse){
 if(projectName!==undefined&&text(projectName,128)===null)throw TypeError('Invalid saved project name.');
 if(typeof parse!=='function')throw TypeError('A KiCad source parser is required.');
 if(!path(boardPath)||!/\.kicad_pcb$/i.test(boardPath))throw TypeError('Invalid board path.');
 if(typeof boardSource!=='string'||new TextEncoder().encode(boardSource).length>64*1024*1024)throw RangeError('Board source exceeds its budget.');
 if(!Array.isArray(schematics)||schematics.length>MAX_FILES)throw RangeError('Choose at most256 schematic files.');
 const files=new Map(),asts=new Map();let bytes=new TextEncoder().encode(boardSource).length;
 for(const file of schematics){
  if(!path(file?.path)||!/\.kicad_sch$/i.test(file.path)||typeof file.source!=='string')throw TypeError('Invalid schematic source.');
  const size=new TextEncoder().encode(file.source).length;bytes+=size;
  if(size>8*1024*1024||bytes>96*1024*1024)throw RangeError('Project source exceeds its budget.');
  if(files.has(file.path)){if(files.get(file.path)!==file.source)throw Error('Conflicting sources for '+file.path);continue;}
  files.set(file.path,file.source);const ast=parse(file.source);if(kind(ast)!=='kicad_sch')throw TypeError('Expected a saved schematic.');
  asts.set(file.path,ast);
 }
 const board=parse(boardSource);if(kind(board)!=='kicad_pcb')throw TypeError('Expected a saved PCB.');
 const footprints=children(board,'footprint');if(footprints.length>MAX_PARTS)throw RangeError('Board exceeds10000 parts.');
 if(!hierarchy||!Array.isArray(hierarchy.roots))throw TypeError('A saved hierarchy snapshot is required.');
 const candidates=new Map(),instances=[],symbolInstances=[],placed=[],warnings=[];let symbols=0;
 const warn=s=>{if(warnings.length<64)warnings.push(s);};
 const visit=(node,ancestry,depth,parentAst)=>{
  if(depth>64||instances.length>=MAX_INSTANCES)throw RangeError('Hierarchy exceeds its instance budget.');
  if(!node||typeof node!=='object'||!Array.isArray(node.children))throw TypeError('Invalid hierarchy node.');
  const sheetPath=path(node.path),sheetInstanceId=text(node.id,500),id=uuid(node.uuid);
  if(!sheetPath||!sheetInstanceId||!id){warn('A hierarchy node has no usable saved identity.');return;}
  if(node.status!=='ok'){warn('Hierarchy instance unavailable for '+sheetPath);return;}
  const ast=asts.get(sheetPath);
  if(!ast){warn('Schematic source unavailable for '+sheetPath);return;}
  if(ancestry.length?children(parentAst,'sheet').filter(s=>nodeUuid(s)===id).length!==1:nodeUuid(ast)!==id){
   warn('Hierarchy identity disagrees with saved source for '+sheetPath);return;
  }
  const chain=[...ancestry,id];instances.push({sheetPath,sheetInstanceId,instancePath:instanceKey(chain)});
  if(node.status==='ok'&&asts.has(sheetPath)){
   for(const symbol of children(asts.get(sheetPath),'symbol')){
    if(++symbols>MAX_PARTS)throw RangeError('Hierarchy exceeds10000 placed symbols.');
    const symbolUuid=savedUuid(symbol);if(!symbolUuid)continue;
    symbolInstances.push({symbolUuid,sheetPath,sheetInstanceId});
    const libraryId=text(scalar(symbol,'lib_id')),libraryName=scalar(symbol,'lib_name')||libraryId;
    const definition=children(child(ast,'lib_symbols'),'symbol').find(s=>value(s[1])===libraryName);
    const declaredUnits=[...new Set(children(definition,'symbol').map(s=>Number(/_(\d+)_\d+$/.exec(value(s[1]))?.[1])).filter(n=>Number.isInteger(n)&&n>0&&n<=256))];
    const record={symbolUuid,sheetPath,sheetInstanceId,instancePath:instanceKey([...chain,uuid(symbolUuid)]),reference:reference(symbol),value:property(symbol,'Value')||'',libId:libraryId,footprint:property(symbol,'Footprint')||'',unit:Number(scalar(symbol,'unit')),onBoard:scalar(symbol,'on_board')!=='no',declaredUnits,projectRootUuid:chain[0],symbolNode:symbol};
    placed.push(record);
    // The rooted saved path and the legacy root-omitted spelling are equivalent
    // only for this exact, explicit sheet-instance ancestry.
    add(candidates,record.instancePath,record);
    add(candidates,instanceKey([...chain.slice(1),uuid(symbolUuid)]),record);
   }
  }else warn('Schematic source unavailable for '+sheetPath);
  for(const next of node.children)visit(next,chain,depth+1,ast);
 };
 for(const root of hierarchy.roots)visit(root,[],0);
 const boardIds=new Map();for(const fp of footprints){const id=nodeUuid(fp);if(id)add(boardIds,id,fp);}
 const parts=footprints.map(fp=>{
  const boardUuid=savedUuid(fp),saved=instanceSegments(scalar(fp,'path')),savedPath=saved?instanceKey(saved):null,layer=scalar(fp,'layer');
  const hits=savedPath?candidates.get(savedPath)||[]:[];
  // Deduplicate the same candidate reached through equivalent path spellings,
  // never duplicate placed symbols or conflicting hierarchy instances.
  const unique=[...new Set(hits)],matched=unique.length===1&&boardUuid&&boardIds.get(uuid(boardUuid)).length===1&&['F.Cu','B.Cu'].includes(layer);
  const ambiguous=unique.length>1||Boolean(boardUuid&&boardIds.get(uuid(boardUuid)).length>1);
  const target=unique.length===1?unique[0]:null;
  return {boardUuid,symbolUuid:target?.symbolUuid||saved?.at(-1)||null,reference:reference(fp),value:property(fp,'Value')||text(value(children(fp,'fp_text').find(p=>value(p[1])==='value')?.[2]))||'',layer:['F.Cu','B.Cu'].includes(layer)?layer:null,sheetPath:target?.sheetPath||null,sheetInstanceId:target?.sheetInstanceId||null,instancePath:target?.instancePath||savedPath,status:matched?'matched':ambiguous?'ambiguous':'unmatched'};
 });
 // Two footprints claiming the same saved symbol path are not a unique link.
 const claims=new Map();for(const part of parts)if(part.status==='matched')add(claims,part.instancePath,part);
 for(const list of claims.values())if(list.length>1)for(const part of list)part.status='ambiguous';
 const unitAliases=buildUnitAliases({hierarchy,asts,candidates,placed,parts,warn,projectName});
 return {schema:'wayri.project-selection/v1',boardPath,parts,unitAliases,symbolInstances,stats:{files:files.size,sheetInstances:instances.length,placedSymbols:symbols,boardParts:parts.length,matched:parts.filter(p=>p.status==='matched').length,unmatched:parts.filter(p=>p.status==='unmatched').length,ambiguous:parts.filter(p=>p.status==='ambiguous').length,unitAliases:unitAliases.length},warnings};
}
// Native root or per-symbol project annotation is distinct from visible
// Reference properties. Only complete, exact scoped path metadata is eligible.
function projectUnitMetadata({hierarchy,asts,candidates,placed,warn,projectName}){
 const metadata=new Map();
 if(hierarchy.roots.length!==1)return metadata;
 const root=hierarchy.roots[0],ast=asts.get(root.path),annotations=children(child(ast,'symbol_instances'),'path');
 if(annotations.length){
  if(annotations.length!==placed.length){warn('Incomplete root symbol-instance annotations; unit aliases disabled.');return metadata;}
  for(const annotation of annotations){
   const ids=instanceSegments(value(annotation[1])),hits=ids?[...new Set(candidates.get(instanceKey(ids))||[])]:[];
   if(hits.length!==1||metadata.has(hits[0])){warn('Ambiguous root symbol-instance annotations; unit aliases disabled.');return new Map();}
   metadata.set(hits[0],{reference:text(scalar(annotation,'reference'),128),unit:Number(scalar(annotation,'unit')),footprint:text(scalar(annotation,'footprint')),value:text(scalar(annotation,'value')),path:value(annotation[1]),format:'root-symbol-instances',projectName:null});
  }
  return metadata;
 }
 // Modern project paths must exactly match the active rooted sheet ancestry.
 // Project names come only from saved blocks, never from filenames. An empty
 // saved name is a valid unnamed project only under these same uniqueness guards.
 const projects=new Map(),names=new Set();
 for(const symbol of placed){
  const entries=new Map(),blocks=new Map(),sheetPath=symbol.instancePath.slice(0,symbol.instancePath.lastIndexOf('/'));
  for(const project of children(child(symbol.symbolNode,'instances'),'project')){
   const name=text(value(project[1]),128);if(name===null)continue;
   blocks.set(name,(blocks.get(name)||0)+1);
   for(const entry of children(project,'path')){
    const ids=instanceSegments(value(entry[1]));
    if(ids&&instanceKey(ids)===sheetPath){add(entries,name,entry);names.add(name);}
   }
  }
  projects.set(symbol,{entries,blocks});
 }
 if(!names.size)return metadata;
 if(projectName===undefined&&names.size!==1){warn('Multiple saved projects claim active sheet paths; specify projectName to enable unit aliases.');return metadata;}
 const selected=projectName??[...names][0];
 if(!names.has(selected)){warn('The requested saved project has no active sheet paths; unit aliases disabled.');return metadata;}
 const foreignReferences=new Set();
 for(const symbol of placed){
  const {entries,blocks}=projects.get(symbol),list=entries.get(selected)||[];
  if(!list.length&&projectName!==undefined&&entries.size&&!(blocks.get(selected)>1)){
   // An explicit project selection may exclude symbols proven to belong only
   // to other saved projects at this exact active sheet path.
   for(const [name,foreign] of entries){
    if(foreign.length!==1||blocks.get(name)!==1){warn('Ambiguous foreign project-instance paths; unit aliases disabled.');return new Map();}
    const ref=text(scalar(foreign[0],'reference'),128);if(ref)foreignReferences.add(ref);
   }
   continue;
  }
  if(list.length!==1||blocks.get(selected)!==1){warn('Incomplete or duplicated saved project-instance paths; unit aliases disabled.');return new Map();}
  const entry=list[0];
  metadata.set(symbol,{reference:text(scalar(entry,'reference'),128),unit:Number(scalar(entry,'unit')),footprint:symbol.footprint,value:symbol.value,path:symbol.instancePath,format:'symbol-project-instances',projectName:selected,sourceSheetPath:value(entry[1])});
 }
 metadata.explicitSubset=projectName!==undefined;
 metadata.foreignReferences=foreignReferences;
 if(metadata.size<placed.length)warn('Unit aliases are restricted to the explicitly selected saved project.');
 return metadata;
}
function buildUnitAliases(input){
 const {placed,parts}=input,metadata=projectUnitMetadata(input);
 if(metadata.size!==placed.length&&!metadata.explicitSubset)return [];
 const groups=new Map();
 for(const symbol of placed){
  const annotation=metadata.get(symbol);
  if(annotation?.reference)add(groups,annotation.reference,{symbol,annotation});
 }
 const aliases=[];
 for(const [annotationReference,members] of groups){
  if(members.length<2||!annotationReference||/[?#\s]/.test(annotationReference)||metadata.foreignReferences?.has(annotationReference))continue;
  const first=members[0].symbol,units=new Set(),firstValue=members[0].annotation.value;
  if(!first.libId||!first.footprint)continue;
  const valid=members.every(({symbol:s,annotation:a})=>{
   if(!s.onBoard||s.projectRootUuid!==first.projectRootUuid||s.libId!==first.libId||s.footprint!==first.footprint||a.footprint!==first.footprint||a.value!==firstValue||s.value!==first.value||!Number.isInteger(a.unit)||a.unit!==s.unit||!s.declaredUnits.includes(a.unit)||s.declaredUnits.length<2||units.has(a.unit))return false;
   units.add(a.unit);return true;
  });
  if(!valid)continue;
  const memberPaths=new Set(members.map(m=>m.symbol.instancePath));
  const claimed=parts.filter(p=>memberPaths.has(p.instancePath));
  const anchors=claimed.filter(p=>p.status==='matched');
  if(claimed.length!==1||anchors.length!==1||parts.filter(p=>p.reference===annotationReference).length!==1)continue;
  const primary=anchors[0],primaryMember=members.find(m=>m.symbol.instancePath===primary.instancePath);
  if(primary.reference!==annotationReference)continue;
  for(const {symbol,annotation} of members){
   if(symbol.instancePath===primary.instancePath)continue;
   aliases.push({...primary,symbolUuid:symbol.symbolUuid,sheetPath:symbol.sheetPath,sheetInstanceId:symbol.sheetInstanceId,instancePath:symbol.instancePath,association:'saved-multi-unit-annotation',primarySymbolUuid:primary.symbolUuid,evidence:{projectRootUuid:first.projectRootUuid,annotationReference,libId:first.libId,footprint:first.footprint,unit:annotation.unit,primaryUnit:primaryMember.annotation.unit,primaryInstancePath:primary.instancePath,annotationPath:annotation.path,annotationFormat:annotation.format,projectName:annotation.projectName,memberCount:members.length}});
  }
 }
 return aliases;
}
function identities(item){
 if(typeof item==='string')return [uuid(item)].filter(Boolean);
 if(!item||typeof item!=='object')return [];
 const ids=[item.ownerUuid,item.parent?.uuid,item.parent?.id,typeof item.parent==='string'?item.parent:null,item.part?.uuid,item.part?.id,item.uuid,item.id].map(uuid).filter(Boolean);
 return [...new Set(ids)];
}
const validIndex=index=>index?.schema==='wayri.project-selection/v1'&&Array.isArray(index.parts)&&index.parts.length<=MAX_PARTS&&(index.unitAliases===undefined||Array.isArray(index.unitAliases)&&index.unitAliases.length<=MAX_PARTS);
function resolve(index,item,key,{sheetInstanceId,sheetPath}={}){
 if(!validIndex(index))return null;
 const ids=identities(item);if(!ids.length)return null;
 if(sheetInstanceId!==undefined&&!text(sheetInstanceId,500)||sheetPath!==undefined&&!path(sheetPath))return null;
 if(key==='symbolUuid'){
  if(!Array.isArray(index.symbolInstances)||index.symbolInstances.length>MAX_PARTS)return null;
  const contexts=index.symbolInstances.filter(p=>p&&ids.includes(uuid(p.symbolUuid))&&(sheetInstanceId===undefined||p.sheetInstanceId===sheetInstanceId)&&(sheetPath===undefined||p.sheetPath===sheetPath));
  if(contexts.length!==1)return null;
 }
 const records=key==='symbolUuid'?[...index.parts,...(index.unitAliases||[])]:index.parts;
 const matches=records.filter(p=>p&&ids.includes(uuid(p[key]))&&(sheetInstanceId===undefined||p.sheetInstanceId===sheetInstanceId)&&(sheetPath===undefined||p.sheetPath===sheetPath));
 if(matches.length!==1||matches[0].status!=='matched')return null;
 return matches[0];
}
/** Resolve a part, pad owner or 3D part by saved board UUID; never by reference. */
export function resolvePCBPart(index,item){return resolve(index,item,'boardUuid');}
/** Supply the active hierarchy instance ID for symbols in repeated sheet files. */
export function resolveSchematicPart(index,item,context={}){return resolve(index,item,'symbolUuid',context);}
/**
 * Return the actual native getParts() object, preserving its id/uuid spelling.
 * PCB UUID and schematicUuid must both match the primary indexed pair, with the saved
 * mounting layer. Schematic native file identity is checked when available;
 * the caller remains responsible for the active repeated-sheet instance.
 */
export function nativePartForRecord(index,nativeParts,record,kind){
 if(!validIndex(index)||!['pcb','schematic'].includes(kind)||!Array.isArray(nativeParts)||nativeParts.length>MAX_PARTS||record?.status!=='matched')return null;
 const primary=resolvePCBPart(index,record.boardUuid);
 const registered=[...(index?.parts||[]),...(index?.unitAliases||[])].filter(p=>p?.status==='matched'&&uuid(p.boardUuid)===uuid(record.boardUuid)&&uuid(p.symbolUuid)===uuid(record.symbolUuid)&&p.sheetInstanceId===record.sheetInstanceId&&p.sheetPath===record.sheetPath&&p.instancePath===record.instancePath&&p.layer===record.layer&&p.association===record.association);
 if(!primary||registered.length!==1)return null;
 const known=registered[0];
 if(known.association&&uuid(known.primarySymbolUuid)!==uuid(primary.symbolUuid))return null;
 const wanted=uuid(kind==='pcb'?record.boardUuid:record.symbolUuid);
 const matches=nativeParts.filter(part=>part&&typeof part==='object'&&(uuid(part.uuid)||uuid(part.id))===wanted);
 if(matches.length!==1)return null;
 const part=matches[0];
 if(kind==='pcb'){
  if(uuid(part.schematicUuid)!==uuid(primary.symbolUuid)||part.layer!==primary.layer)return null;
 }else{
  if(part.path!==undefined&&part.path!==known.sheetPath)return null;
  if(typeof part.id==='string'&&part.id.includes('#')&&part.id.slice(0,part.id.lastIndexOf('#'))!==known.sheetPath)return null;
 }
 return part;
}
