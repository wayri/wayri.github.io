const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const engine=require('../assets/js/battery-analysis.js');
const base=path.resolve(__dirname,'..');
const catalog=JSON.parse(fs.readFileSync(path.join(base,'assets/data/battery-presets.json'),'utf8'));
const references=JSON.parse(fs.readFileSync(path.join(base,'assets/data/battery-discharge-references.json'),'utf8'));
function fixture(){
 const html=fs.readFileSync(path.join(base,'assets/tools_html/battery-suite.html'),'utf8');
 function node(){let value='';return {get value(){return value;},set value(v){value=String(v);},textContent:'',innerHTML:'',disabled:false,children:[],dataset:{},listeners:{},click(){},addEventListener(name,fn){this.listeners[name]=fn;},appendChild(child){this.children.push(child);},replaceChildren(){this.children=[];this.textContent='';this.innerHTML='';},querySelector(){return node();},getBoundingClientRect(){return {left:0,width:800};}};}
 const nodes=new Map();for(const [,tag,id,attrs]of html.matchAll(/<(\w+)[^>]*\bid="([^"]+)"([^>]*)>/g)){const n=node();n.value=attrs.match(/value="([^"]*)"/)?.[1]||'';if(tag==='textarea')n.value=html.match(new RegExp('<textarea[^>]*id="'+id+'"[^>]*>([\\s\\S]*?)<\\/textarea>'))[1];nodes.set(id,n);}
 nodes.get('ba-channel').value='voltage';
 const panel=node();panel.querySelector=s=>nodes.get(s.slice(1));
 const document={createElement:()=>node()};
 let downloaded;
 const context=vm.createContext({document,BatteryAnalysis:engine,Blob,URL:{createObjectURL(blob){downloaded=blob;return 'blob:test';},revokeObjectURL(){}},setTimeout(){},fetch:async url=>({ok:true,json:async()=>url.includes('discharge-references')?references:catalog}),console});context.window=context;
 vm.runInContext(fs.readFileSync(path.join(base,'assets/js/battery-analysis-ui.js'),'utf8'),context);
 context.BatteryAnalysisUI.mount(panel);
 return {nodes,context,panel,get downloaded(){return downloaded;},click:id=>nodes.get('ba-'+id).listeners.click(),change:id=>nodes.get('ba-'+id).listeners.change()};
}
test('Battery UI mounts the actual fragment, calculates and filters the source catalog',async()=>{
 const f=fixture();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(f.nodes.get('ba-error').textContent,'');assert.match(f.nodes.get('ba-summary').innerHTML,/Useful energy delivered/);
 f.nodes.get('ba-brand').value='Duracell';f.change('brand');
 assert.ok(f.nodes.get('ba-preset').children.length>1);
 for(const option of f.nodes.get('ba-preset').children.slice(1))assert.ok(catalog.profiles.find(p=>p.id===option.value).brand==='Duracell');
 const before=f.nodes.get('ba-preset').children.length;f.context.BatteryAnalysisUI.mount(f.panel);assert.equal(f.nodes.get('ba-preset').children.length,before);
});
test('Battery UI does not carry illustrative OCV/R into a manufacturer reference',async()=>{
 const f=fixture();await new Promise(resolve=>setImmediate(resolve));
 f.nodes.get('ba-preset').value=catalog.profiles[0].id;f.change('preset');
 assert.equal(f.nodes.get('ba-resistance').value,'');assert.equal(f.nodes.get('ba-ocv').value,'');assert.equal(f.nodes.get('ba-temp-curve').value,'');
 f.click('run');assert.ok(f.nodes.get('ba-error').textContent.length>0);assert.equal(f.nodes.get('ba-export').disabled,true);
});
test('Loaded-reference adoption uses stated CC conditions and reproduces graph capacity',async()=>{
 const f=fixture();await new Promise(resolve=>setImmediate(resolve));const ref=references.references[0];
 f.nodes.get('ba-discharge-reference').value=ref.id;f.click('adopt-discharge');
 assert.equal(f.nodes.get('ba-error').textContent,'');
 assert.equal(Number(f.nodes.get('ba-capacity').value),ref.points.at(-1).dischargedAh);
 assert.equal(f.nodes.get('ba-loads').value,`3600,current,${ref.conditions.currentA},${ref.conditions.tempC}`);
 assert.match(f.nodes.get('ba-provenance').value,/not measured relaxed OCV/);
 assert.ok(f.nodes.get('ba-summary').innerHTML.includes('24 hours'));
});
test('Temperature scenarios are explicit, invalid schedules clear old results, plot switch preserves calculation',async()=>{
 const f=fixture();await new Promise(resolve=>setImmediate(resolve));f.nodes.get('ba-channel').value='temperatureC';f.change('channel');
 assert.ok(f.nodes.get('ba-plot').innerHTML.includes('Battery temperature'));
 f.click('cold-example');f.click('run');assert.equal(f.nodes.get('ba-error').textContent,'');assert.match(f.nodes.get('ba-model-status').textContent,/explicit assumptions/);
 f.nodes.get('ba-loads').value='3600,current,-1';f.click('run');assert.ok(f.nodes.get('ba-error').textContent.length>0);assert.equal(f.nodes.get('ba-export').disabled,true);
});
test('Catalog and references preserve evidence boundaries and raw read conditions',()=>{
 assert.ok(catalog.profiles.length>=30);
 for(const brand of ['Duracell','Panasonic','Nippo'])assert.ok(catalog.profiles.some(p=>p.brand.includes(brand)));
 for(const p of catalog.profiles){assert.equal(p.ocv,null);assert.equal(p.resistanceOhm,null);assert.equal(p.temperature,null);assert.ok(p.sources.length>0);for(const source of p.sources)assert.match(source.url,/^https:\/\//);}
 for(const ref of references.references){assert.ok(ref.conditions.currentA>0);assert.ok(ref.points.length>=2);assert.equal(ref.points[0].dischargedAh,0);for(let i=1;i<ref.points.length;i++){assert.ok(ref.points[i].dischargedAh>ref.points[i-1].dischargedAh);assert.ok(ref.points[i].voltage<=ref.points[i-1].voltage);}assert.ok(ref.uncertainty);}
});

test('Reference provenance clears on a new manufacturer and invalidates after manual model edits',async()=>{
 const f=fixture();await new Promise(resolve=>setImmediate(resolve));
 f.nodes.get('ba-discharge-reference').value=references.references[0].id;f.click('adopt-discharge');
 f.nodes.get('ba-resistance').value='1';f.panel.listeners.input({target:{id:'ba-resistance'}});f.click('run');f.click('export');
 const modified=JSON.parse(await f.downloaded.text());assert.equal(modified.curveFitState,'user-modified-starting-point');assert.match(modified.modelStatus,/User-modified/);
 f.nodes.get('ba-preset').value=catalog.profiles[0].id;f.change('preset');f.nodes.get('ba-capacity').value='2.4';f.click('ideal');f.click('run');
 assert.equal(f.nodes.get('ba-error').textContent,'');f.click('export');const ideal=JSON.parse(await f.downloaded.text());assert.equal(ideal.loadedCurveStartingPoint,null);assert.equal(ideal.curveFitState,'none');
});

test('Ideal starter supports the existing schedule temperature as an explicit neutral-temperature model',async()=>{
 const f=fixture();await new Promise(resolve=>setImmediate(resolve));
 const preset=catalog.profiles.find(p=>p.id==='energizer-e91');f.nodes.get('ba-preset').value=preset.id;f.change('preset');
 f.nodes.get('ba-capacity').value='2.4';f.click('ideal');f.click('run');assert.equal(f.nodes.get('ba-error').textContent,'');assert.match(f.nodes.get('ba-model-status').textContent,/no modeled voltage knee or temperature effect/);
});

test('Alkaline temperature references are not silently applied to the illustrative Li-ion model',async()=>{
 const f=fixture();await new Promise(resolve=>setImmediate(resolve));f.nodes.get('ba-temp-reference').value=catalog.temperatureReferences[0].id;f.click('adopt-temperature');
 assert.match(f.nodes.get('ba-error').textContent,/AA alkaline/);assert.equal(f.nodes.get('ba-capacity').value,'3');
 f.nodes.get('ba-discharge-reference').value=references.references[0].id;f.click('adopt-discharge');f.nodes.get('ba-temp-reference').value=catalog.temperatureReferences[0].id;f.click('adopt-temperature');
 assert.match(f.nodes.get('ba-model-status').textContent,/Mixed-evidence/);assert.equal(f.nodes.get('ba-preset').value,'');
});
