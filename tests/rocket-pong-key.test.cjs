const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync(require('node:path').join(__dirname,'../pong.html'),'utf8');
const payload=html.match(/const payload\s*=\s*("[^"]+");/)[1];
const decrypt=html.slice(html.indexOf('function decryptEngine()'),html.lastIndexOf('</script>'));
function attempt(key,timed=false){
    const nodes={},scripts=[];
    for(const id of ['decryption-key','timed-game-mode','auth-error','gate-ui','game-ui'])nodes[id]={value:key,checked:timed,style:{},classList:{remove(){},add(){}}};
    const context={window:{},atob:s=>Buffer.from(s,'base64').toString('binary'),setTimeout(){},document:{getElementById:id=>nodes[id],createElement:()=>({}),body:{appendChild:s=>scripts.push(s)}}};
    vm.runInNewContext(`const payload=${payload};\n${decrypt}\ndecryptEngine();`,context);
    return {scripts,mode:context.window.rocketPongMode,nodes};
}
test('only the exact case-sensitive password unlocks Rocket Pong',()=>{
    for(const key of ['wayri','WAYRI','WaYri','waYRi',' waYri','waYri ','rocketpong','PHYSICAL_LAYER_199X',''])assert.equal(attempt(key).scripts.length,0,key);
    const result=attempt('waYri');assert.equal(result.scripts.length,1);assert.equal(result.mode,'score');
    assert.match(result.scripts[0].textContent,/const canvas/);assert.match(result.scripts[0].textContent,/getElementById/);
    assert.equal(result.nodes['gate-ui'].style.display,'none');
});
test('the three-minute option remains available under the same password',()=>{
    const result=attempt('waYri',true);assert.equal(result.scripts.length,1);assert.equal(result.mode,'timed');
    assert.match(result.scripts[0].textContent,/180/);
});
