(() => {
    'use strict';
    if (window.IRCAProject) return;
    const base = new URL('../demos/irca/', document.currentScript.src);
    const modelPaths = [], models = new Map();
    let pending, reviewFiles, metadata, camPending;

    async function json(name, limit = 4 * 1024 * 1024) {
        const response = await fetch(new URL(name, base), { credentials: 'omit' });
        if (!response.ok) throw new Error('IRCA review data could not load.');
        const bytes = await response.arrayBuffer();
        if (bytes.byteLength > limit) throw new Error('IRCA review data exceeds its display budget.');
        return JSON.parse(new TextDecoder().decode(bytes));
    }
    // A review projection contains geometry and public inspection fields, not an original project file.
    function drawing(tree) {
        let count = 0;
        function node(value, depth) {
            if (++count > 250000 || depth > 64) throw new Error('Invalid IRCA review geometry.');
            if (Array.isArray(value)) return '(' + value.map(item => node(item, depth + 1)).join(' ') + ')';
            if (typeof value === 'string' && /^[^\s()"\\]+$/.test(value)) return value;
            if (value && typeof value.q === 'string' && Object.keys(value).length === 1) return JSON.stringify(value.q);
            throw new Error('Invalid IRCA drawing token.');
        }
        return node(tree, 0) + '\n';
    }
    async function hash(source) {
        const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source));
        return [...new Uint8Array(bytes)].map(value => value.toString(16).padStart(2, '0')).join('');
    }
    function ready() {
        if (!pending) pending = (async () => {
            const data = await json('review.json');
            if (data.schema !== 'irca.review/v1' || data.files?.length !== 2 || !data.metadata) throw new Error('Unsupported IRCA review package.');
            const expected = ['IRCA.kicad_pcb', 'IRCA.kicad_sch'];
            const files = data.files.map((file, index) => {
                if (file.path !== expected[index] || file.tree?.[0] !== (index ? 'kicad_sch' : 'kicad_pcb')) throw new Error('Unlisted IRCA drawing.');
                return { path: file.path, source: drawing(file.tree) };
            });
            const hashes = await Promise.all(files.map(file => hash(file.source)));
            if (hashes[0] !== data.metadata.reviewPcbSha256 || hashes[1] !== data.metadata.reviewSchematicSha256) throw new Error('IRCA review geometry failed its identity check.');
            if (!Array.isArray(data.metadata.models) || data.metadata.models.length > 64 || data.metadata.models.some(path => !/^models\/[a-f0-9]{24}\.glb$/.test(path))) throw new Error('Unlisted IRCA model.');
            modelPaths.splice(0, modelPaths.length, ...data.metadata.models);
            reviewFiles = files; metadata = Object.freeze(data.metadata);
            return metadata;
        })().catch(error => { pending = null; throw error; });
        return pending;
    }
    async function loadAsset(path) {
        await ready();
        if (!modelPaths.includes(path)) throw new Error('Model is outside the IRCA review package.');
        if (!models.has(path)) models.set(path, (async () => {
            const response = await fetch(new URL(path, base), { credentials: 'omit' });
            if (!response.ok) throw new Error('IRCA component model unavailable.');
            const bytes = new Uint8Array(await response.arrayBuffer());
            if (bytes.length > 8 * 1024 * 1024) throw new Error('IRCA model exceeds its display budget.');
            let binary = '';
            for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
            return { base64: btoa(binary) };
        })().catch(error => { models.delete(path); throw error; }));
        return models.get(path);
    }
    const options = input => ({ ...input, loadAsset, assetPaths: modelPaths });
    async function load(viewer, input = {}) {
        await ready();
        return viewer.loadFiles(reviewFiles, { file: metadata.pcbPath, ...input });
    }
    function fabrication() {
        if (!camPending) camPending = json('fabrication.json', 2 * 1024 * 1024).then(data => {
            if (data.schema !== 'irca.fabrication-review/v1' || !Array.isArray(data.files) || data.files.length > 8) throw new Error('Invalid IRCA fabrication review.');
            return data.files.map(file => {
                if (!/^IRCA(?:-[A-Za-z_]+)?\.(?:gtl|gbl|gto|gm1|drl)$/.test(file.path) || !Array.isArray(file.lines) || file.lines.some(line => typeof line !== 'string')) throw new Error('Unlisted IRCA fabrication layer.');
                return { path: file.path, source: file.lines.join('\n') + '\n' };
            });
        }).catch(error => { camPending = null; throw error; });
        return camPending;
    }
    window.IRCAProject = Object.freeze({
        ready, load, fabrication,
        files: async () => { await ready(); return reviewFiles.map(file => ({ ...file })); },
        createViewer: (target, input = {}) => new KiCadWebView.Viewer(target, options(input)),
        createWorkspace: (target, input = {}) => new KiCadWebView.AdvancedKiCadViewer(target, options(input)),
        study: () => json('study-summary.json', 256 * 1024),
        analysis: () => json('analysis.json', 2 * 1024 * 1024)
    });
})();
