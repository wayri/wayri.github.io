const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../assets/js/tools_ui.js'), 'utf8');
const registry = JSON.parse(source.match(/const TOOL_REGISTRY = (\[[\s\S]+?\n\]);/)[1]);

function setup() {
    const tools = registry.flatMap(category => category.tools);
    function element() {
        const classes = new Set();
        return {hidden:false,style:{},textContent:'',value:'',attributes:{},
            classList:{add:token=>classes.add(token),remove:token=>classes.delete(token)},
            setAttribute(key,value){this.attributes[key]=value;},
            getAttribute(key){return this.attributes[key];}};
    }
    const cards = tools.map(tool => Object.assign(element(),{attributes:{'data-tool-card':tool.id}}));
    const nodes = {};
    const categories = registry.map((category,index) => {
        const button = element();
        const sidebarItems = category.tools.map(tool => Object.assign(element(),{attributes:{'data-tool-id':tool.id}}));
        nodes[`cat-group-${index}`] = Object.assign(element(),{querySelector:()=>button,querySelectorAll:()=>sidebarItems});
        nodes[`cat-content-${index}`] = element();nodes[`cat-icon-${index}`] = element();
        return {querySelector:()=>cards.find(card=>category.tools.some(tool=>tool.id===card.attributes['data-tool-card'])&&!card.hidden)};
    });
    nodes['tools-search-summary'] = element();nodes['tools-empty-results'] = element();
    nodes['tools-search-input'] = Object.assign(element(),{focused:false,focus(){this.focused=true;}});
    const document = {getElementById:id=>nodes[id],querySelectorAll:selector=>selector==='[data-tool-card]'?cards:categories};
    const code = source.slice(source.indexOf('function filterTools('),source.indexOf('function toggleCategory('));
    const context = {document,TOOL_REGISTRY:registry};vm.createContext(context);vm.runInContext(code,context);
    return {context,cards,categories,nodes,tools};
}

test('search matches topics in descriptions, including multiple words, across sidebar and directory', () => {
    const {context,cards,nodes} = setup();
    context.filterTools('battery temperature');
    assert.deepEqual(cards.filter(card=>!card.hidden).map(card=>card.attributes['data-tool-card']),['tool-battery-suite']);
    assert.equal(nodes['tools-search-summary'].textContent,'1 matching tool.');
    assert.equal(nodes['tools-empty-results'].hidden,true);
    assert.ok(Object.entries(nodes).filter(([key])=>key.startsWith('cat-group')).some(([,group])=>group.style.display==='none'));
});

test('no-result state is actionable and clearing restores every card and search focus', () => {
    const {context,cards,categories,nodes,tools} = setup();
    context.filterTools('no matching engineering topic xyz');
    assert.equal(cards.filter(card=>!card.hidden).length,0);
    assert.ok(categories.every(category=>category.hidden));
    assert.equal(nodes['tools-empty-results'].hidden,false);
    assert.equal(nodes['tools-search-summary'].textContent,'0 matching tools.');
    nodes['tools-search-input'].value='no matching engineering topic xyz';
    context.clearToolSearch();
    assert.equal(cards.filter(card=>!card.hidden).length,tools.length);
    assert.ok(categories.every(category=>!category.hidden));
    assert.equal(nodes['tools-empty-results'].hidden,true);
    assert.equal(nodes['tools-search-input'].value,'');
    assert.equal(nodes['tools-search-input'].focused,true);
});
