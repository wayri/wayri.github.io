const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function setup() {
    const navigations = [], readiness = [], demos = [], focusChanges = [];
    class Demo {
        constructor() { this.active = true; demos.push(this); }
        addDisplay(id, options) { this.options = options; }
        getFace() { return { normal: [0, 0, 1], width: 32, height: 24, center: [0, 0, 2], up: [0, 1, 0] }; }
        drawDisplay() { return true; }
        addEventListener() {}
        dispose() { this.active = false; }
    }
    const context = { URL, Math, document: { baseURI: 'https://wayri.github.io/' }, KiCadWebView: { DemoController: Demo } };
    context.window = context; context.location = { assign: url => navigations.push(String(url)) };
    vm.createContext(context);
    for (const file of ['irca-mini-ui.js', 'irca-screen.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '../assets/js', file), 'utf8'), context);
    const viewer = Object.assign(new EventTarget(), { view: '3d', path: 'IRCA.kicad_pcb', clearSelection() {}, setInspectorOpen() {}, setCamera3D(camera) { this.camera = camera; }, getCamera3D() { return this.camera; }, setDemoInteraction(enabled) { this.demoInteraction = enabled; } });
    const screen = context.IRCAMiniScreen.attach(viewer, { onReady: value => readiness.push(value), onFocusChange: value => focusChanges.push(value), getViewport: () => ({ width: 1000, height: 600 }) });
    return { viewer, screen, demos, readiness, navigations, focusChanges };
}

test('mini screen waits for model readiness and disposes bindings when leaving the scene', () => {
    const { viewer, screen, demos, readiness } = setup();
    assert.equal(demos.length, 0);
    viewer.dispatchEvent(new Event('modelsready'));
    assert.equal(demos.length, 1);
    assert.equal(demos[0].options.anchor.faceSelection, 'outermost');
    assert.equal(demos[0].options.anchor.minFaceAreaMm2, 300);
    assert.equal(readiness.at(-1), true);
    assert.equal(screen.focus(), true);
    assert.ok(viewer.camera.position[2] > viewer.camera.target[2]);
    viewer.view = 'pcb'; viewer.dispatchEvent(new Event('viewchange'));
    assert.equal(demos[0].active, false); assert.equal(readiness.at(-1), false);
    assert.equal(viewer.demoInteraction, false);
    screen.dispose(); viewer.view = '3d'; viewer.dispatchEvent(new Event('modelsready'));
    assert.equal(demos.length, 1);
});

test('focused display locks interaction, fits its screen and restores the original camera on exit', () => {
    const { viewer, screen, focusChanges } = setup();
    const original = { position: [10, 20, 30], target: [0, 0, 0], up: [0, 1, 0] };
    viewer.camera = original; viewer.dispatchEvent(new Event('modelsready'));
    screen.focus();
    assert.equal(viewer.demoInteraction, true);
    assert.deepEqual(focusChanges, [true]);
    assert.equal(viewer.camera.position[2], 2 + 24 * 1.4);
    screen.showCamera();
    assert.deepEqual(focusChanges, [true]);
    screen.exit();
    assert.equal(viewer.demoInteraction, false);
    assert.equal(viewer.camera, original);
    assert.deepEqual(focusChanges, [true, false]);
    screen.exit(); assert.equal(focusChanges.length, 2);
    screen.focus(); viewer.disposed = true;
    viewer.setDemoInteraction = () => { throw new Error('Disposed API must not be called'); };
    viewer.setCamera3D = viewer.setDemoInteraction;
    screen.dispose(); assert.equal(focusChanges.at(-1), false);
});

test('cancelled and dragged display gestures cannot activate site links', () => {
    const { viewer, screen, demos, navigations } = setup();
    viewer.dispatchEvent(new Event('modelsready'));
    const { onPress, onRelease } = demos[0].options;
    const projects = { x: 56 / 320, y: 1 - 82 / 240 };
    onPress({ uv: projects }); onRelease({ uv: projects, cancelled: true });
    onPress({ uv: projects }); onRelease({ uv: { x: .8, y: .2 } });
    assert.equal(navigations.length, 0);
    onPress({ uv: projects }); onRelease({ uv: projects });
    assert.deepEqual(navigations, ['https://wayri.github.io/projects/']);
    screen.dispose();
});
