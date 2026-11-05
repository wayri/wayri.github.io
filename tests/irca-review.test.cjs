const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const root = path.resolve(__dirname, '..');

class Element extends EventTarget {
    constructor(doc) { super(); this.ownerDocument = doc; this.children = []; this.style = {}; this.attributes = {}; }
    append(...nodes) { for (const node of nodes) { node.remove?.(); node.parent = this; this.children.push(node); } }
    replaceChildren(...nodes) { this.children.forEach(node => node.parent = null); this.children = []; this.append(...nodes); }
    remove() { if (this.parent) this.parent.children = this.parent.children.filter(node => node !== this); this.parent = null; }
    setAttribute(key, value) { this.attributes[key] = String(value); }
    getAttribute(key) { return this.attributes[key] ?? null; }
}
function fixture() {
    const document = { baseURI: 'https://site.test/', currentScript: { src: 'https://site.test/assets/js/irca-project.js' } };
    document.createElement = () => new Element(document);
    const tags = new Map();
    const context = { EventTarget, CustomEvent, AbortController, DOMException, TextDecoder, TextEncoder, URL, btoa, crypto: webcrypto, document, HTMLElement: class {}, customElements: { get: name => tags.get(name), define: (name, value) => tags.set(name, value) } };
    context.window = context;
    context.fetch = async url => {
        const pathname = new URL(url).pathname;
        const bytes = fs.readFileSync(path.join(root, pathname));
        return { ok: true, arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) };
    };
    vm.createContext(context);
    vm.runInContext(fs.readFileSync(path.join(root, 'assets/lib/kicad-webview/kicad-webview.min.js'), 'utf8'), context);
    // Parsing and inspection are real; the visual surface alone is replaced for Node.
    context.KiCadOwnedCanvas.mount = () => Object.assign(new EventTarget(), {
        viewport: { camera: { center: { x: 0, y: 0 }, zoom: 1, flipped: false } }, visibleLayers: new Set(),
        setDocument(design) { this.visibleLayers = new Set(design.layers || []); }, setNetHighlight() {}, setNetNames() {}, setInspectionSelection() {}, draw() {}, zoom_to_board() {}, dispose() {}
    });
    vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/irca-project.js'), 'utf8'), context);
    return { context, document, project: context.IRCAProject };
}

test('IRCA review exposes actual layout, individual parts and exact schematic relationships', async () => {
    const { project, document } = fixture();
    const metadata = await project.ready();
    assert.equal(metadata.partCount, 59);
    assert.equal(metadata.modelledPartCount, 50);
    const pcb = project.createViewer(new Element(document));
    const sch = project.createViewer(new Element(document));
    await project.load(pcb); await project.load(sch, { file: metadata.schematicPath });
    assert.equal(pcb.path, 'IRCA.kicad_pcb'); assert.equal(pcb.getParts().length, 59);
    assert.ok(pcb.design.primitives.length > 500, 'the layout must contain real geometry, not a display carrier');
    const symbols = sch.getParts();
    for (const part of pcb.getParts()) assert.equal(symbols.filter(symbol => symbol.uuid === part.schematicUuid).length, 1, part.reference);
    const controller = pcb.getParts().find(part => part.reference === 'U1');
    assert.equal(controller.value, 'ESP32-WROOM-32E');
    assert.equal(pcb.selectPart(controller.id, { locate: false }), true);
    assert.equal(pcb.getSelection().uuid, controller.uuid);
    assert.ok(metadata.models.every(name => fs.existsSync(path.join(root, 'assets/demos/irca', name))));
    const model = await pcb.modelOptions.loadAsset(metadata.models[0]);
    assert.equal(Buffer.from(model.base64, 'base64').subarray(0, 4).toString(), 'glTF');
    await assert.rejects(pcb.modelOptions.loadAsset('../private-model.step'), /outside the IRCA review/);
    pcb.dispose(); sch.dispose();
});

test('all IRCA surfaces share identical source bytes; native fabrication and PI bind to IRCA', async () => {
    const { project } = fixture(); const metadata = await project.ready();
    const first = await project.files(), second = await project.files();
    assert.equal(first[0].source, second[0].source);
    assert.ok(!first[0].source.includes('Display:IRCA_Assembly'));
    const cam = await project.fabrication(); assert.equal(cam.length, 5);
    assert.ok(cam.every(file => file.path.startsWith('IRCA') && file.source.length > 0));
    const field = await project.analysis(); assert.equal(field.board.sha256, metadata.reviewPcbSha256);
    assert.equal(field.board.path, 'IRCA.kicad_pcb');
    assert.equal(field.fields.length, 2);
    const originals = ['assets/demos/irca/IRCA.kicad_pcb', 'assets/demos/irca/IRCA.kicad_sch'];
    originals.forEach(name => assert.equal(fs.existsSync(path.join(root, name)), false));
});
