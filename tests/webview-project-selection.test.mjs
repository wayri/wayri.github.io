import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildProjectSelectionIndex,resolvePCBPart,resolveSchematicPart} from '../assets/js/webview-project-selection.mjs';
const symbol=(id,ref='R1',unit=1)=>['symbol',['uuid',id],['property','Reference',ref],['property','Value','10k'],['unit',unit]];
const fp=(id,target,ref='R1',layer='F.Cu')=>['footprint','Test:R',['tstamp',id],['path',target],['layer',layer],['fp_text','reference',ref]];
const node=(id,uuid,path,children=[])=>({id,uuid,path,status:'ok',children});
function fixture(parts,leafSymbols=[symbol('sym')]){
 const asts={board:['kicad_pcb',...parts],root:['kicad_sch',['uuid','root'],['sheet',['uuid','a']],['sheet',['uuid','b']],symbol('root-sym','C1')],leaf:['kicad_sch',['uuid','leaf-file'],...leafSymbols]};
 const input={boardPath:'board.kicad_pcb',boardSource:'board',schematics:[{path:'root.kicad_sch',source:'root'},{path:'leaf.kicad_sch',source:'leaf'}],hierarchy:{roots:[node('r','root','root.kicad_sch',[node('r/a','a','leaf.kicad_sch'),node('r/b','b','leaf.kicad_sch')])]}};
 return {input,asts,parse:s=>asts[s],build(){return buildProjectSelectionIndex(input,s=>asts[s]);}};
}
test('rooted and legacy root-omitted paths resolve exact instances despite identical reference labels',()=>{
 const f=fixture([fp('board-a','/root/a/sym'),fp('board-b','/b/sym','R1','B.Cu'),fp('board-root','/root-sym','C1')]),index=f.build();
 assert.equal(index.stats.matched,3);
 assert.equal(resolvePCBPart(index,{uuid:'board-b'}).sheetInstanceId,'r/b');
 assert.equal(resolvePCBPart(index,'board-b').layer,'B.Cu');
 assert.equal(resolveSchematicPart(index,{uuid:'sym'},{sheetInstanceId:'r/a'}).boardUuid,'board-a');
 assert.equal(resolveSchematicPart(index,{uuid:'sym'},{sheetInstanceId:'r/b',sheetPath:'leaf.kicad_sch'}).boardUuid,'board-b');
 assert.equal(resolveSchematicPart(index,{uuid:'sym'}),null);
 assert.equal(resolveSchematicPart(index,{uuid:'sym'},{sheetPath:'leaf.kicad_sch'}),null);
 assert.equal(resolveSchematicPart(index,{uuid:'root-sym'}).boardUuid,'board-root');
 assert.equal(resolvePCBPart(index,{reference:'R1'}),null);
});
test('pad/pin owner shapes resolve peers, while conflicting saved identities never guess',()=>{
 const index=fixture([fp('board-a','/a/sym'),fp('board-b','/b/sym')]).build();
 for(const item of [{uuid:'pad-1',ownerUuid:'board-a'},{uuid:'pad-1',parent:{uuid:'board-a'}},{part:{uuid:'board-a'}},{parent:'board-a'}])
  assert.equal(resolvePCBPart(index,item).boardUuid,'board-a');
 assert.equal(resolvePCBPart(index,{uuid:'board-a',ownerUuid:'board-b'}),null);
 assert.equal(resolveSchematicPart(index,{uuid:'pin-1',part:{uuid:'sym'}},{sheetInstanceId:'r/b'}).boardUuid,'board-b');
 assert.equal(resolvePCBPart(index,{uuid:'pad-1'}),null);
});
test('alternate multiunit UUIDs do not inherit links from their shared reference',()=>{
 const index=fixture([fp('board-a','/a/sym')],[symbol('sym','U1',1),symbol('unit-two','U1',2)]).build();
 assert.equal(resolveSchematicPart(index,'sym',{sheetInstanceId:'r/a'}).boardUuid,'board-a');
 assert.equal(resolveSchematicPart(index,'unit-two',{sheetInstanceId:'r/a'}),null);
 assert.equal(resolveSchematicPart(index,'sym'),null);
 assert.equal(resolveSchematicPart(index,'sym',{sheetInstanceId:'r/b'}),null);
});
test('legacy eight-hex path IDs normalize to their saved padded KiCad UUIDs',()=>{
 const f=fixture([fp('ABCDEF12','/00000001/00000002')],[symbol('00000000-0000-0000-0000-000000000002')]);
 f.asts.root=['kicad_sch',['uuid','root'],['sheet',['uuid','00000000-0000-0000-0000-000000000001']]];
 f.input.hierarchy.roots[0].children=[node('r/a','00000000-0000-0000-0000-000000000001','leaf.kicad_sch')];
 assert.equal(f.build().stats.matched,1);
 assert.equal(f.build().parts[0].boardUuid,'ABCDEF12');
 assert.equal(resolvePCBPart(f.build(),'00000000-0000-0000-0000-0000abcdef12').boardUuid,'ABCDEF12');
});
test('duplicate symbols, board UUIDs and footprint claims are ambiguous',()=>{
 assert.equal(fixture([fp('a','/a/sym')],[symbol('sym'),symbol('sym')]).build().parts[0].status,'ambiguous');
 const duplicate=fixture([fp('a','/a/sym'),fp('b','/a/sym')]).build();
 assert.equal(duplicate.stats.ambiguous,2);assert.equal(resolvePCBPart(duplicate,'a'),null);
 const ids=fixture([fp('same','/a/sym'),fp('same','/b/sym')]).build();
 assert.equal(ids.stats.ambiguous,2);assert.equal(resolvePCBPart(ids,'same'),null);
});
test('missing paths, unavailable instances and stale hierarchy identities remain unresolved',()=>{
 const f=fixture([fp('a','/a/sym')]);f.input.hierarchy.roots[0].children[0].uuid='not-the-saved-sheet';
 assert.equal(f.build().stats.unmatched,1);
 const g=fixture([fp('a','/a/sym')]);g.input.hierarchy.roots[0].children[0].status='missing';
 assert.equal(g.build().stats.unmatched,1);
 assert.equal(fixture([fp('a','/a/not-the-symbol')]).build().stats.unmatched,1);
});
test('duplicate identical file inputs deduplicate; conflicting sources and unsafe or excessive inputs reject',()=>{
 const f=fixture([fp('a','/a/sym')]);f.input.schematics.push({...f.input.schematics[1]});
 assert.equal(f.build().stats.files,2);
 f.input.schematics.push({path:'leaf.kicad_sch',source:'different'});
 assert.throws(()=>f.build(),/Conflicting/);
 const unsafe=fixture([]);unsafe.input.boardPath='../board.kicad_pcb';assert.throws(()=>unsafe.build(),/Invalid/);
 const many=fixture([]);many.input.schematics=Array.from({length:257},()=>({path:'x.kicad_sch',source:'x'}));assert.throws(()=>many.build(),/256/);
 const parts=fixture(Array.from({length:10001},(_,i)=>fp('p'+i,'/a/sym')));assert.throws(()=>parts.build(),/10000/);
});
test('pinned Marble data links real C43 and separates both saved QSFP sheet instances',()=>{
 const data=JSON.parse(fs.readFileSync(new URL('../assets/demos/public-hardware/marble-part-links.json',import.meta.url)));
 assert.equal(data.sourceRevision,'a426777d92c0f22a546d4740b419a3937e0c1f90');
 assert.equal(data.sources.length,26);
 const models=JSON.parse(fs.readFileSync(new URL('../assets/demos/public-hardware/MODEL-PROVENANCE.json',import.meta.url)));
 assert.deepEqual(data.displayBoard,models.examples.find(e=>e.id==='marble').derivedBoard);
 assert.equal(data.schematicCoverage.unlinkedPowerOrFlagSymbols,981);
 assert.equal(data.schematicCoverage.unlinkedMultiUnitSymbols,43);
 assert.equal(data.schematicCoverage.linkedViaSavedUnitAnnotations,43);
 assert.equal(data.schematicCoverage.remainingUnlinkedMultiUnitSymbols,0);
 assert.equal(data.schematicCoverage.otherUnlinkedNonPowerSymbols,3);

 assert.equal(data.sources.find(s=>s.path==='Marble.kicad_pcb').sha256,'482850dbaaef9157e2e98af765a3c0d4d9c9f800daae224a54bf10e0621f52b0');
 assert.deepEqual(data.index.stats,{files:25,sheetInstances:26,placedSymbols:2022,boardParts:1006,matched:995,unmatched:11,ambiguous:0,unitAliases:43});
 const c43=data.index.parts.find(p=>p.reference==='C43');
 assert.equal(c43.symbolUuid,'00000000-0000-0000-0000-00005c9232d4');
 assert.equal(c43.sheetPath,'ETH_PHY.kicad_sch');
 assert.equal(c43.sheetInstanceId,'r0/s3');
 assert.equal(resolveSchematicPart(data.index,{uuid:c43.symbolUuid},{sheetInstanceId:c43.sheetInstanceId}).boardUuid,c43.boardUuid);
 assert.equal(resolvePCBPart(data.index,{uuid:'a-pad',ownerUuid:c43.boardUuid}).symbolUuid,c43.symbolUuid);
 for(const p of data.index.parts.filter(p=>p.status==='matched')){
  assert.equal(resolvePCBPart(data.index,p.boardUuid).symbolUuid,p.symbolUuid);
  assert.equal(resolveSchematicPart(data.index,p.symbolUuid,{sheetInstanceId:p.sheetInstanceId,sheetPath:p.sheetPath}).boardUuid,p.boardUuid);
 }
 assert.equal(data.index.unitAliases.length,43);
 for(const alias of data.index.unitAliases){
  assert.equal(alias.association,'saved-multi-unit-annotation');
  assert.notEqual(alias.evidence.unit,alias.evidence.primaryUnit);
  assert.equal(resolveSchematicPart(data.index,alias.symbolUuid,{sheetInstanceId:alias.sheetInstanceId,sheetPath:alias.sheetPath}).boardUuid,alias.boardUuid);
  assert.equal(resolvePCBPart(data.index,alias.boardUuid).symbolUuid,alias.primarySymbolUuid);
 }
 const repeated=data.index.parts.filter(p=>p.status==='matched'&&p.sheetPath==='QSFP.kicad_sch');
 assert.deepEqual([...new Set(repeated.map(p=>p.sheetInstanceId))].sort(),['r0/s13','r0/s14']);
 for(const p of repeated)assert.equal(resolveSchematicPart(data.index,p.symbolUuid,{sheetInstanceId:p.sheetInstanceId}).boardUuid,p.boardUuid);
 assert.ok(data.index.parts.filter(p=>p.status==='unmatched').every(p=>['G***','REF**'].includes(p.reference)&&p.instancePath===null));
});
test('native compatibility lookup preserves actual IDs and rejects stale or duplicated UUID/path pairs',async()=>{
 const {nativePartForRecord}=await import('../assets/js/webview-project-selection.mjs');
 const index=fixture([fp('ABCDEF12','/a/sym')]).build(),record=index.parts[0];
 const native={uuid:'00000000-0000-0000-0000-0000abcdef12',id:'board.kicad_pcb#00000000-0000-0000-0000-0000abcdef12',schematicUuid:'sym',layer:'F.Cu'};
 assert.equal(nativePartForRecord(index,[native],record,'pcb'),native);
 assert.equal(nativePartForRecord(index,[{...native,schematicUuid:'other-symbol'}],record,'pcb'),null);
 assert.equal(nativePartForRecord(index,[{...native,layer:'B.Cu'}],record,'pcb'),null);
 assert.equal(nativePartForRecord(index,[native,{...native}],record,'pcb'),null);
 assert.equal(nativePartForRecord(index,[native],{...record,symbolUuid:'forged'},'pcb'),null);
 const schematic={uuid:'sym',id:'leaf.kicad_sch#sym'};
 assert.equal(nativePartForRecord(index,[schematic],record,'schematic'),schematic);
 assert.equal(nativePartForRecord(index,[{...schematic,id:'other.kicad_sch#sym'}],record,'schematic'),null);
 assert.equal(nativePartForRecord(index,[{...schematic,path:'other.kicad_sch'}],record,'schematic'),null);
});

function annotatedFixture(){
 const f=fixture([fp('board-a','/a/sym','U1'),fp('board-b','/b/sym','U2')],[symbol('sym','WRONG DISPLAY',1),symbol('second','WRONG DISPLAY',2)]);
 const library=['symbol','Test:Chip',['symbol','Chip_1_1'],['symbol','Chip_2_1']];
 f.asts.leaf.splice(2,0,['lib_symbols',library]);
 for(const s of f.asts.leaf.filter(n=>n[0]==='symbol')){
  s.push(['lib_id','Test:Chip'],['property','Footprint','Test:Pkg'],['on_board','yes']);
 }
 const annotation=(p,ref,unit,footprint='Test:Pkg')=>['path',p,['reference',ref],['unit',unit],['value','10k'],['footprint',footprint]];
 f.annotation=annotation;
 f.metadata=['symbol_instances',annotation('/root-sym','C1',1,'')];
 for(const [sheet,ref] of [['a','U1'],['b','U2']])
  f.metadata.push(annotation('/'+sheet+'/sym',ref,1),annotation('/'+sheet+'/second',ref,2));
 f.asts.root.push(f.metadata);
 return f;
}
test('complete native project annotation links alternate units in repeated sheets without using displayed references',async()=>{
 const {nativePartForRecord}=await import('../assets/js/webview-project-selection.mjs');
 const index=annotatedFixture().build();assert.equal(index.unitAliases.length,2);
 const alias=resolveSchematicPart(index,'second',{sheetInstanceId:'r/a'});
 assert.equal(alias.boardUuid,'board-a');assert.equal(alias.primarySymbolUuid,'sym');
 assert.equal(alias.association,'saved-multi-unit-annotation');
 assert.equal(resolveSchematicPart(index,'second',{sheetInstanceId:'r/b'}).boardUuid,'board-b');
 assert.equal(resolveSchematicPart(index,'second'),null);
 assert.equal(resolvePCBPart(index,'board-a').symbolUuid,'sym');
 const pcb={uuid:'board-a',schematicUuid:'sym',layer:'F.Cu'};
 assert.equal(nativePartForRecord(index,[pcb],alias,'pcb'),pcb);
 assert.equal(nativePartForRecord(index,[{...pcb,schematicUuid:'second'}],alias,'pcb'),null);
 const native={uuid:'second',id:'leaf.kicad_sch#second'};
 assert.equal(nativePartForRecord(index,[native],alias,'schematic'),native);
});
test('native unit aliases reject conflicting libraries, footprints, annotation, units and board participation',()=>{
 const leafSymbols=f=>f.asts.leaf.filter(n=>n[0]==='symbol');
 const field=(n,k)=>n.find(c=>Array.isArray(c)&&c[0]===k);
 const mutations=[
  f=>{field(leafSymbols(f)[1],'lib_id')[1]='Different:Chip';},
  f=>{leafSymbols(f)[1].find(c=>c[0]==='property'&&c[1]==='Footprint')[2]='Other:Pkg';},
  f=>{field(leafSymbols(f)[1],'on_board')[1]='no';},
  f=>{field(leafSymbols(f)[1],'unit')[1]=1;for(const a of f.metadata.slice(1).filter(a=>a[1].endsWith('/second')))field(a,'unit')[1]=1;},
  f=>{f.metadata.pop();},
  f=>{f.metadata.push(f.metadata[1]);},
  f=>{f.metadata[1][1]='/foreign/sym';},
  f=>{for(const a of f.metadata.slice(1).filter(a=>a[1].endsWith('/second')))field(a,'unit')[1]=99;},
  f=>{for(const a of f.metadata.slice(1).filter(a=>a[1].endsWith('/second')))field(a,'footprint')[1]='Conflicting:Pkg';},
 ];
 for(const mutate of mutations){const f=annotatedFixture();mutate(f);assert.equal(f.build().unitAliases.length,0);}
 const duplicate=annotatedFixture();duplicate.asts.board.push(fp('another','/a/second','U1'));
 const aliases=duplicate.build().unitAliases;assert.equal(aliases.length,1);assert.equal(aliases[0].sheetInstanceId,'r/b');
});
function modernFixture(){
 const f=annotatedFixture();f.asts.root=f.asts.root.filter(n=>n!==f.metadata);
 f.asts.root.find(n=>n[0]==='symbol').push(['instances',['project','SavedActive',['path','/root',['reference','C1'],['unit',1]]]]);
 for(const s of f.asts.leaf.filter(n=>n[0]==='symbol')){
  const unit=s.find(n=>Array.isArray(n)&&n[0]==='unit')[1];
  s.push(['instances',['project','SavedActive',['path','/root/a',['reference','U1'],['unit',unit]],['path','/root/b',['reference','U2'],['unit',unit]]]]);
 }
 return f;
}
test('modern project-instance paths use the unique saved project and exact rooted sheet ancestry',()=>{
 const f=modernFixture(),index=f.build();assert.equal(index.unitAliases.length,2);
 assert.equal(index.unitAliases[0].evidence.projectName,'SavedActive');
 assert.equal(index.unitAliases[0].evidence.annotationFormat,'symbol-project-instances');
 const symbol=f.asts.leaf.find(n=>n[0]==='symbol'),instances=symbol.find(n=>Array.isArray(n)&&n[0]==='instances');
 instances.push(['project','Foreign',['path','/foreign-root/a',['reference','U1'],['unit',1]]]);
 assert.equal(f.build().unitAliases.length,2);
 instances[2][2][1]='/root/a';
 assert.equal(f.build().unitAliases.length,0);
 f.input.projectName='SavedActive';assert.equal(f.build().unitAliases.length,2);
 f.input.projectName='Absent';assert.equal(f.build().unitAliases.length,0);
});
test('modern missing paths, duplicate paths or duplicate project blocks cannot create unit aliases',()=>{
 const mutations=[
  project=>{project.pop();},
  project=>{project.push(project[2]);},
 ];
 for(const mutate of mutations){
  const f=modernFixture(),symbol=f.asts.leaf.find(n=>n[0]==='symbol'),instances=symbol.find(n=>Array.isArray(n)&&n[0]==='instances');
  mutate(instances[1]);assert.equal(f.build().unitAliases.length,0);
 }
 const f=modernFixture(),symbol=f.asts.leaf.find(n=>n[0]==='symbol'),instances=symbol.find(n=>Array.isArray(n)&&n[0]==='instances');
 instances.push(['project','SavedActive',['path','/root/a',['reference','U1'],['unit',1]]]);
 assert.equal(f.build().unitAliases.length,0);
});
test('approved IRCA review reconstruction links LM358 U7 units1 and3 to its explicit unit2 PCB anchor',async()=>{
 const {createHash}=await import('node:crypto'),data=JSON.parse(fs.readFileSync(new URL('../assets/demos/irca/review.json',import.meta.url)));
 function drawing(tree){
  let count=0;
  const render=(x,depth)=>{
   assert.ok(++count<=250000&&depth<=64);
   if(Array.isArray(x))return '('+x.map(y=>render(y,depth+1)).join(' ')+')';
   if(typeof x==='string'&&/^[^\s()"\\]+$/.test(x))return x;
   if(x&&typeof x.q==='string'&&Object.keys(x).length===1)return JSON.stringify(x.q);
   throw Error('Invalid approved review token');
  };
  return render(tree,0)+'\n';
 }
 const toAST=x=>Array.isArray(x)?x.map(toAST):x&&typeof x.q==='string'?{quoted:x.q}:x;
 const files=data.files.map(f=>({path:f.path,source:drawing(f.tree),ast:toAST(f.tree)}));
 for(const [i,file]of files.entries())assert.equal(createHash('sha256').update(file.source).digest('hex'),data.metadata[i?'reviewSchematicSha256':'reviewPcbSha256']);
 const rootToken=files[1].ast.find(n=>Array.isArray(n)&&n[0]==='uuid')[1],rootUuid=rootToken?.quoted||rootToken;
 const hierarchy={roots:[node('r0',rootUuid,'IRCA.kicad_sch')]};
 const input={boardPath:files[0].path,boardSource:files[0].source,schematics:[files[1]],hierarchy},parse=source=>files.find(f=>f.source===source).ast;
 assert.equal(buildProjectSelectionIndex(input,parse).unitAliases.length,0);
 const index=buildProjectSelectionIndex({...input,projectName:''},parse);
 assert.equal(index.stats.matched,59);assert.equal(index.unitAliases.length,2);
 const aliases=index.unitAliases.filter(p=>p.reference==='U7');assert.equal(aliases.length,2);
 assert.deepEqual(aliases.map(p=>p.symbolUuid).sort(),['78df2e38-9c7c-5773-b350-2c8620543156','bc307562-8fae-590f-81b1-09b0100079e3']);
 assert.ok(aliases.every(p=>p.primarySymbolUuid==='9bb11d73-2d15-5052-9002-458eef8fff12'));

 assert.deepEqual(aliases.map(a=>a.evidence.unit).sort(),[1,3]);
 for(const alias of aliases){
  assert.equal(alias.evidence.primaryUnit,2);assert.equal(alias.evidence.annotationFormat,'symbol-project-instances');
  assert.equal(alias.evidence.projectName,'');
  assert.equal(resolveSchematicPart(index,alias.symbolUuid,{sheetInstanceId:'r0'}).boardUuid,alias.boardUuid);
  assert.equal(resolvePCBPart(index,alias.boardUuid).symbolUuid,alias.primarySymbolUuid);
 }
});

test('an explicit empty saved project name is unique under exact rooted paths, while another claimant requires explicit choice',()=>{
 const f=modernFixture();
 for(const ast of [f.asts.root,f.asts.leaf])for(const symbol of ast.filter(n=>n[0]==='symbol'))
  symbol.find(n=>Array.isArray(n)&&n[0]==='instances')[1][1]='';
 assert.equal(f.build().unitAliases.length,2);
 const symbol=f.asts.leaf.find(n=>n[0]==='symbol'),instances=symbol.find(n=>Array.isArray(n)&&n[0]==='instances');
 instances.push(['project','Other',['path','/root/a',['reference','U1'],['unit',1]]]);
 assert.equal(f.build().unitAliases.length,0);
 f.input.projectName='';assert.equal(f.build().unitAliases.length,2);
});

test('explicit modern project subsets need exact foreign evidence and reject colliding foreign annotation references',()=>{
 const f=modernFixture();
 const foreign=symbol('foreign-part','IGNORED');
 foreign.push(['lib_id','Test:Other'],['property','Footprint','Other:Pkg'],['on_board','yes'],['instances',['project','Other',['path','/root',['reference','J9'],['unit',1]]]]);
 f.asts.root.push(foreign);
 assert.equal(f.build().unitAliases.length,0);
 f.input.projectName='SavedActive';assert.equal(f.build().unitAliases.length,2);
 const project=foreign.find(n=>n[0]==='instances')[1];
 project[2].find(n=>Array.isArray(n)&&n[0]==='reference')[1]='U1';
 const aliases=f.build().unitAliases;assert.equal(aliases.length,1);assert.equal(aliases[0].boardUuid,'board-b');
 project[2][1]='/foreign-root';
 assert.equal(f.build().unitAliases.length,0);
});
