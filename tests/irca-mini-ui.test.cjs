const test = require('node:test');
const assert = require('node:assert/strict');
const { create } = require('../assets/js/irca-mini-ui.js');
const uv = (x, y) => ({ x: x / 320, y: 1 - y / 240 });

test('mini display routes its five site buttons through the supplied navigation callback', () => {
    const visited = [], ui = create({ navigate: path => visited.push(path) });
    for (const [x, y] of [[56, 82], [160, 82], [264, 82], [56, 161], [160, 161]]) ui.press(uv(x, y));
    assert.deepEqual(visited, ['/projects/', '/tools/', '/blog/', '/about/', '/play/']);
});

test('camera opens a local simulated thermal view and back returns without navigating', () => {
    const changes = [], visited = [], ui = create({ navigate: path => visited.push(path), onChange: view => changes.push(view) });
    assert.deepEqual(ui.press(uv(264, 161)), { type: 'view', view: 'thermal' });
    assert.equal(ui.view, 'thermal');
    assert.equal(ui.press(uv(160, 100)), null);
    assert.deepEqual(ui.press(uv(40, 20)), { type: 'view', view: 'home' });
    assert.equal(ui.view, 'home');
    assert.deepEqual(changes, ['thermal', 'home']); assert.deepEqual(visited, []);
});

test('display gaps, invalid touch coordinates and disposed controls do not navigate', () => {
    const visited = [], ui = create({ navigate: path => visited.push(path) });
    for (const point of [null, {}, { x: NaN, y: .5 }, { x: .5, y: Infinity }, { x: -.1, y: .5 }, { x: 1.1, y: .5 }, uv(3, 30), uv(108, 80)]) assert.equal(ui.press(point), null);
    ui.dispose(); assert.equal(ui.press(uv(56, 82)), null); assert.deepEqual(visited, []);
});

test('accessible host controls can select camera or home without generating duplicate changes', () => {
    const changes = [], ui = create({ onChange: view => changes.push(view) });
    assert.equal(ui.show('home'), false);
    assert.equal(ui.show('camera'), true); assert.equal(ui.view, 'thermal');
    assert.equal(ui.show('camera'), false);
    assert.equal(ui.show('home'), true); assert.equal(ui.view, 'home');
    assert.throws(() => ui.show('unknown'), /home or camera/);
    assert.deepEqual(changes, ['thermal', 'home']);
    ui.dispose(); assert.equal(ui.show('camera'), false); assert.equal(ui.view, 'home');
    assert.deepEqual(changes, ['thermal', 'home']);
});
