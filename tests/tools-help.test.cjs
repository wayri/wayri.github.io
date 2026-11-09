const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {guides} = require('../assets/js/tools-help.js');

test('Every published tool has a specific usage guide, example, result explanation and scope', () => {
    const root = path.resolve(__dirname, '..');
    const source = fs.readFileSync(path.join(root, 'assets/js/tools_ui.js'), 'utf8');
    const registry = JSON.parse(source.match(/const TOOL_REGISTRY = (\[[\s\S]+?\n\]);/)[1]);
    const ids = registry.flatMap(category => category.tools.map(tool => tool.id)).sort();
    assert.deepEqual(Object.keys(guides).sort(), ids);
    for (const id of ids) {
        assert.ok(guides[id].steps.length >= 3, id + ' needs a usable workflow');
        for (const text of [...guides[id].steps, guides[id].example, guides[id].readout, guides[id].limit]) {
            assert.equal(typeof text, 'string', id);
            assert.ok(text.trim().length > 20, id + ' has missing guidance');
        }
    }
    const page = fs.readFileSync(path.join(root, 'tools.html'), 'utf8');
    assert.match(page, /<script src="[^"\n]*tools-help\.js/);
    assert.ok(source.indexOf('ToolsHelp.mount(mainArea, toolId)') > source.indexOf('mainArea.innerHTML = html'));
});
