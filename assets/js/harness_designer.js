// Multipoint Harness Designer & Topological Routing Engine

class HarnessDesigner {
    constructor() {
        this.nodes = [];
        this.wires = [];
        this.bundles = []; 

        this.selectedNodes = new Set();
        this.selectedWires = new Set();

        this.draggingNode = null;
        this.mode = 'select'; // 'select', 'add_wire', 'add_beta'
        this.routingStyle = 'bezier'; // 'bezier' or 'orthogonal'
        
        this.wireStartNode = null;
        
        this.offsetX = 0; this.offsetY = 0;
        this.mouseX = 0; this.mouseY = 0;
        
        this.canvas = null;
        this.ctx = null;
        this.ro = null;
        
        this.awgRes = {
            '4': 0.815, '6': 1.296, '8': 2.06, '10': 3.28, '12': 5.21,
            '14': 8.28, '16': 13.17, '18': 20.9, '20': 33.3, '22': 53.0, '24': 84.2, '26': 133.9
        };
        
        this.raycaster = null;
        this.mouse3D = null;
    }

    init() {
        this.canvas = document.getElementById('harness-canvas');
        if(!this.canvas) return;
        const container = document.getElementById('harness-canvas-container');
        this.ctx = this.canvas.getContext('2d', { alpha: false });
        
        this.ro = new ResizeObserver(entries => {
            for (let entry of entries) {
                this.canvas.width = entry.contentRect.width;
                this.canvas.height = entry.contentRect.height;
                this.draw();
            }
        });
        this.ro.observe(container);
        
        this.nodes = [
            {id: 'J1', type: 'connector', x: 150, y: 200, pins: 6, name: 'Main Power'},
            {id: 'B1', type: 'beta', x: 350, y: 200, name: 'Midpoint Tie'},
            {id: 'J2', type: 'connector', x: 600, y: 100, pins: 4, name: 'Motor A'},
            {id: 'J3', type: 'connector', x: 600, y: 300, pins: 4, name: 'Motor B'}
        ];
        
        this.wires = [
            {id: 'W1', path: ['J1', 'B1', 'J2'], fromPin: 1, toPin: 1, awg: '14', len: 1.5, i: 10, group: 'Power'},
            {id: 'W2', path: ['J1', 'B1', 'J2'], fromPin: 2, toPin: 2, awg: '14', len: 1.5, i: 10, group: 'Power'},
            {id: 'W3', path: ['J1', 'B1', 'J3'], fromPin: 3, toPin: 1, awg: '16', len: 2.0, i: 5, group: null},
        ];

        this.attachEvents();
        this.draw();
    }

    attachEvents() {
        this.canvas.addEventListener('mousedown', e => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', e => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this.onMouseUp());
        this.canvas.addEventListener('mouseleave', () => this.onMouseUp());
        
        document.addEventListener('keydown', e => {
            if(document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'SELECT') return;
            if(e.key === 'Delete' || e.key === 'Backspace') {
                this.deleteSelected();
            }
            if(e.key === 'Escape') {
                this.cancelAction();
            }
        });
    }

    // ---------- Rendering ----------
    
    draw() {
        if(!this.ctx) return;
        const ctx = this.ctx;
        
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg-color').trim() || '#111';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for(let i=0; i<this.canvas.width; i+=20) { ctx.moveTo(i,0); ctx.lineTo(i,this.canvas.height); }
        for(let i=0; i<this.canvas.height; i+=20) { ctx.moveTo(0,i); ctx.lineTo(this.canvas.width,i); }
        ctx.stroke();

        this.drawWires();
        this.drawNodes();

        if (this.mode === 'add_wire' && this.wireStartNode) {
            ctx.beginPath();
            let p1 = this.getNodePos(this.wireStartNode);
            ctx.moveTo(p1.x, p1.y);
            this.routePath(ctx, p1.x, p1.y, this.mouseX, this.mouseY, this.routingStyle);
            ctx.strokeStyle = '#0ea5e9';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }

    routePath(ctx, x1, y1, x2, y2, style, offset = 0) {
        let dx = x2 - x1;
        let dy = y2 - y1;
        let len = Math.hypot(dx, dy) || 1;
        let nx = -dy / len;
        let ny = dx / len;
        
        let ox1 = x1 + nx * offset;
        let oy1 = y1 + ny * offset;
        let ox2 = x2 + nx * offset;
        let oy2 = y2 + ny * offset;

        ctx.moveTo(ox1, oy1);
        
        if(style === 'orthogonal') {
            const midX = (ox1 + ox2)/2;
            ctx.lineTo(midX, oy1);
            ctx.lineTo(midX, oy2);
            ctx.lineTo(ox2, oy2);
        } else {
            const cp1x = ox1 + Math.abs(ox2 - ox1)/2 + (oy1 < oy2 ? 20 : -20);
            const cp2x = ox2 - Math.abs(ox2 - ox1)/2 - (oy1 < oy2 ? 20 : -20);
            ctx.bezierCurveTo(cp1x, oy1, cp2x, oy2, ox2, oy2);
        }
    }

    drawWires() {
        // Find segments between nodes
        const segments = {}; 
        
        for (let w of this.wires) {
            if(!w.path || w.path.length < 2) continue;
            for(let i=0; i<w.path.length - 1; i++) {
                let n1 = w.path[i];
                let n2 = w.path[i+1];
                let key = [n1, n2].sort().join('-');
                if(!segments[key]) segments[key] = [];
                segments[key].push(w);
            }
        }

        const ctx = this.ctx;
        
        // Draw each segment bundle hull
        for (let key in segments) {
            let sWires = segments[key];
            let n1 = this.nodes.find(n => n.id === key.split('-')[0]);
            let n2 = this.nodes.find(n => n.id === key.split('-')[1]);
            if(!n1 || !n2) continue;

            let p1 = this.getNodePos(n1);
            let p2 = this.getNodePos(n2);
            
            const isSelected = sWires.some(w => this.selectedWires.has(w));
            
            // Draw thick translucent path for multiple wires (bundle)
            if(sWires.length > 1) {
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                this.routePath(ctx, p1.x, p1.y, p2.x, p2.y, this.routingStyle);
                ctx.lineWidth = Math.min(sWires.length * 4 + 6, 25);
                ctx.lineCap = 'round';
                ctx.strokeStyle = isSelected ? 'rgba(212, 175, 55, 0.4)' : 'rgba(255, 255, 255, 0.1)';
                ctx.stroke();
            }

            // Draw individual wires within the segment
            let offsetStep = sWires.length > 1 ? 6 : 0;
            let startOffset = -(sWires.length-1)*offsetStep/2;
            
            sWires.forEach((w, idx) => {
                let color = '#ccc';
                if (w.awg <= 12) color = '#ef4444'; 
                else if (w.awg <= 16) color = '#eab308'; 
                else if (w.awg <= 20) color = '#3b82f6';
                
                let wOffset = startOffset + (idx*offsetStep);
                ctx.beginPath();
                this.routePath(ctx, p1.x, p1.y, p2.x, p2.y, this.routingStyle, wOffset);
                
                ctx.lineWidth = this.selectedWires.has(w) ? 3 : 1.5;
                ctx.strokeStyle = this.selectedWires.has(w) ? '#D4AF37' : color;
                ctx.stroke();
            });
            
            // Label segment if it contains multiple wires
            if(sWires.length > 1) {
                const midX = (p1.x + p2.x)/2;
                const midY = (p1.y + p2.y)/2;
                ctx.fillStyle = '#111';
                ctx.fillRect(midX - 10, midY - 6, 20, 12);
                ctx.fillStyle = '#D4AF37';
                ctx.font = '10px monospace';
                ctx.fillText(sWires.length, midX - 4, midY + 3);
            }
        }
    }

    drawNodes() {
        const ctx = this.ctx;
        this.nodes.forEach(n => {
            const isSelected = this.selectedNodes.has(n);
            
            if (n.type === 'connector') {
                let w = 80, h = 40 + (n.pins * 15);
                ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--container-bg').trim() || '#222';
                ctx.fillRect(n.x, n.y, w, h);
                ctx.lineWidth = isSelected ? 3 : 2;
                ctx.strokeStyle = isSelected ? '#D4AF37' : (getComputedStyle(document.body).getPropertyValue('--border-color').trim() || '#555');
                ctx.strokeRect(n.x, n.y, w, h);
                
                ctx.fillStyle = isSelected ? '#D4AF37' : ctx.strokeStyle;
                ctx.fillRect(n.x, n.y, w, 20);
                
                ctx.fillStyle = '#000';
                ctx.font = 'bold 10px monospace';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'alphabetic';
                ctx.fillText(n.id, n.x + 5, n.y + 14);
                
                ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text-color').trim() || '#ddd';
                ctx.fillText(n.name, n.x + 5, n.y + 35);
                
                for (let i=1; i<=n.pins; i++) {
                    let py = n.y + 30 + (i * 15);
                    ctx.fillStyle = '#444';
                    ctx.fillRect(n.x + w - 8, py - 4, 8, 8); 
                    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--muted-text').trim() || '#888';
                    ctx.fillText(`P${i}`, n.x + w - 25, py + 3);
                }
            } else if (n.type === 'beta') {
                ctx.beginPath();
                ctx.arc(n.x, n.y, 12, 0, Math.PI * 2);
                ctx.fillStyle = '#333';
                ctx.fill();
                ctx.lineWidth = isSelected ? 3 : 2;
                ctx.strokeStyle = isSelected ? '#D4AF37' : '#0ea5e9';
                ctx.stroke();
                ctx.fillStyle = '#0ea5e9';
                ctx.font = '10px monospace';
                ctx.fillText('B', n.x - 3, n.y + 3);
            }
        });
    }

    // ---------- Interactions ----------
    
    getNodePos(node) {
        if(node.type === 'beta') return {x: node.x, y: node.y};
        return {x: node.x + 80, y: node.y + 20}; // roughly middle right side
    }

    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    onMouseDown(e) {
        const {x, y} = this.getMousePos(e);
        this.mouseX = x; this.mouseY = y;

        let clickedNode = this.nodes.find(n => {
            if(n.type === 'connector') {
                return (x >= n.x && x <= n.x+80 && y >= n.y && y <= n.y + 40 + (n.pins*15));
            } else {
                return Math.hypot(n.x - x, n.y - y) < 15;
            }
        });
        
        let clickedWire = null;
        if (!clickedNode && this.mode === 'select') {
            // Precise hit detection for wires considering their perpendicular offsets
            const hitCtx = this.canvas.getContext('2d');
            
            // Build segments map to match draw order and offsets
            const segments = {}; 
            for (let w of this.wires) {
                if(!w.path || w.path.length < 2) continue;
                for(let i=0; i<w.path.length - 1; i++) {
                    let key = [w.path[i], w.path[i+1]].sort().join('-');
                    if(!segments[key]) segments[key] = [];
                    segments[key].push(w);
                }
            }

            for (let key in segments) {
                let sWires = segments[key];
                let offsetStep = sWires.length > 1 ? 6 : 0;
                let startOffset = -(sWires.length-1)*offsetStep/2;

                for (let idx = 0; idx < sWires.length; idx++) {
                    let w = sWires[idx];
                    let wOffset = startOffset + (idx*offsetStep);
                    
                    for(let i=0; i<w.path.length - 1; i++) {
                        let n1 = this.nodes.find(n => n.id === w.path[i]);
                        let n2 = this.nodes.find(n => n.id === w.path[i+1]);
                        if(!n1 || !n2) continue;
                        let p1 = this.getNodePos(n1);
                        let p2 = this.getNodePos(n2);
                        hitCtx.beginPath();
                        this.routePath(hitCtx, p1.x, p1.y, p2.x, p2.y, this.routingStyle, wOffset);
                        hitCtx.lineWidth = 10; // hit area
                        if (hitCtx.isPointInStroke(x, y)) {
                            clickedWire = w;
                            break;
                        }
                    }
                    if (clickedWire) break;
                }
                if (clickedWire) break;
            }
        }

        if (this.mode === 'add_wire') {
            if (clickedNode) {
                if (!this.wireStartNode) {
                    this.wireStartNode = clickedNode;
                } else if (this.wireStartNode.id !== clickedNode.id) {
                    this.wires.push({
                        id: 'W' + (this.wires.length + 1),
                        path: [this.wireStartNode.id, clickedNode.id],
                        fromPin: 1, toPin: 1,
                        awg: '18', len: 1.0, i: 1, group: null
                    });
                    this.mode = 'select';
                    this.wireStartNode = null;
                    this.updateUIState();
                }
            }
        } else if (this.mode === 'add_beta') {
            this.nodes.push({id: 'B' + (this.nodes.length + 1), type: 'beta', x: x, y: y, name: 'Beta Point'});
            this.mode = 'select';
            this.updateUIState();
        } else {
            // Select Mode
            if (!e.shiftKey) {
                if(clickedNode && !this.selectedNodes.has(clickedNode)) {
                    this.selectedNodes.clear();
                    this.selectedWires.clear();
                } else if (clickedWire && !this.selectedWires.has(clickedWire)) {
                    this.selectedNodes.clear();
                    this.selectedWires.clear();
                } else if (!clickedNode && !clickedWire) {
                    this.selectedNodes.clear();
                    this.selectedWires.clear();
                }
            }

            if (clickedNode) {
                this.selectedNodes.add(clickedNode);
                this.draggingNode = clickedNode;
                this.offsetX = x - clickedNode.x;
                this.offsetY = y - clickedNode.y;
            } else if (clickedWire) {
                this.selectedWires.add(clickedWire);
            }
            this.updatePropsPanel();
        }
        this.draw();
    }

    onMouseMove(e) {
        const {x, y} = this.getMousePos(e);
        this.mouseX = x; this.mouseY = y;

        if (this.draggingNode) {
            this.draggingNode.x = x - this.offsetX;
            this.draggingNode.y = y - this.offsetY;
            this.draw();
        } else if (this.mode === 'add_wire' && this.wireStartNode) {
            this.draw();
        }
    }

    onMouseUp() {
        this.draggingNode = null;
    }

    // ---------- Actions ----------

    cancelAction() {
        this.mode = 'select';
        this.wireStartNode = null;
        this.updateUIState();
        this.draw();
    }

    toggleAddWireMode() {
        this.mode = this.mode === 'add_wire' ? 'select' : 'add_wire';
        this.wireStartNode = null;
        this.updateUIState();
    }

    toggleAddBetaMode() {
        this.mode = this.mode === 'add_beta' ? 'select' : 'add_beta';
        this.updateUIState();
    }

    addNode() {
        let nId = 'J' + (this.nodes.length + 1);
        this.nodes.push({id: nId, type: 'connector', x: 200, y: 200, pins: 4, name: 'Connector'});
        this.draw();
    }
    
    toggleRoutingStyle() {
        this.routingStyle = this.routingStyle === 'bezier' ? 'orthogonal' : 'bezier';
        this.draw();
    }

    deleteSelected() {
        if(this.selectedNodes.size > 0) {
            let toRemove = Array.from(this.selectedNodes).map(n => n.id);
            this.nodes = this.nodes.filter(n => !toRemove.includes(n.id));
            
            // Removing a node removes it from paths. If a wire path is < 2, delete wire.
            this.wires.forEach(w => {
                w.path = w.path.filter(p => !toRemove.includes(p));
            });
            this.wires = this.wires.filter(w => w.path.length >= 2);
            
            this.selectedNodes.clear();
        }
        if(this.selectedWires.size > 0) {
            let toRemove = Array.from(this.selectedWires).map(w => w.id);
            this.wires = this.wires.filter(w => !toRemove.includes(w.id));
            this.selectedWires.clear();
        }
        this.updatePropsPanel();
        this.draw();
    }

    updateUIState() {
        const routeBtn = document.getElementById('btn-route-wire');
        const betaBtn = document.getElementById('btn-route-beta');
        if(routeBtn) {
            routeBtn.className = this.mode === 'add_wire' ? 'px-2 py-1 bg-red-500 text-white text-xs font-bold rounded' : 'px-2 py-1 bg-themeAccent text-themeBg text-xs font-bold hover:opacity-80 rounded';
            routeBtn.innerText = this.mode === 'add_wire' ? 'Cancel Route' : 'Route Wire';
        }
        if(betaBtn) {
            betaBtn.className = this.mode === 'add_beta' ? 'px-2 py-1 bg-red-500 text-white text-xs font-bold rounded' : 'px-2 py-1 border border-themeBg text-themeBg text-xs font-bold hover:bg-themeBg hover:text-themeText rounded';
            betaBtn.innerText = this.mode === 'add_beta' ? 'Cancel' : 'Add Beta Point';
        }
    }

    updatePropsPanel() {
        const info = document.getElementById('harness-selection-info');
        const cont = document.getElementById('harness-props-content');
        if(!info || !cont) return;

        if (this.selectedNodes.size === 1) {
            let n = Array.from(this.selectedNodes)[0];
            let metaStr = Object.keys(n.metadata || {}).map(k => `${k}: ${n.metadata[k]}`).join('\n');
            info.innerText = `${n.type === 'beta' ? 'Beta' : 'Connector'}: ${n.id}`;
            cont.innerHTML = `
                <div class="flex flex-col gap-2">
                    <label>ID: <input type="text" class="w-full bg-themeBg border border-themeBorder p-1" value="${n.id}" onchange="window.HarnessApp.updateProp('node', '${n.id}', 'id', this.value)"></label>
                    <label>Name: <input type="text" class="w-full bg-themeBg border border-themeBorder p-1" value="${n.name || ''}" onchange="window.HarnessApp.updateProp('node', '${n.id}', 'name', this.value)"></label>
                    <label>Parent Group: <input type="text" class="w-full bg-themeBg border border-themeBorder p-1" value="${n.parentGroup || ''}" placeholder="e.g. Dashboard" onchange="window.HarnessApp.updateProp('node', '${n.id}', 'parentGroup', this.value)"></label>
                    ${n.type === 'connector' ? `
                    <div class="grid grid-cols-2 gap-2">
                        <label>Pins: <input type="number" class="w-full bg-themeBg border border-themeBorder p-1" value="${n.pins}" min="1" onchange="window.HarnessApp.updateProp('node', '${n.id}', 'pins', this.value)"></label>
                        <label>Orientation: <select class="w-full bg-themeBg border border-themeBorder p-1" onchange="window.HarnessApp.updateProp('node', '${n.id}', 'orientation', this.value)">
                            <option value="N" ${n.orientation==='N'?'selected':''}>North</option>
                            <option value="S" ${n.orientation==='S'?'selected':''}>South</option>
                            <option value="E" ${n.orientation==='E'?'selected':''}>East</option>
                            <option value="W" ${n.orientation==='W'?'selected':''}>West</option>
                        </select></label>
                    </div>` : ''}
                    <label>Metadata (Key: Value): <textarea class="w-full bg-themeBg border border-themeBorder p-1 h-20 text-[10px]" placeholder="PartNumber: 12345&#10;Manufacturer: TE" onchange="window.HarnessApp.updateProp('node', '${n.id}', 'metadata', this.value)">${metaStr}</textarea></label>
                </div>
            `;
        } else if (this.selectedWires.size === 1) {
            let id = Array.from(this.selectedWires)[0];
            let w = this.wires.find(x => x.id === id);
            let metaStr = w && w.metadata ? Object.keys(w.metadata).map(k => `${k}: ${w.metadata[k]}`).join('\n') : '';
            info.innerText = `Wire: ${w ? w.id : id}`;
            cont.innerHTML = `
                <div class="flex flex-col gap-2">
                    <label>ID: <input type="text" class="w-full bg-themeBg border border-themeBorder p-1" value="${w.id}" onchange="window.HarnessApp.updateProp('wire', '${w.id}', 'id', this.value)"></label>
                    <label>Group / Bundle: <input type="text" class="w-full bg-themeBg border border-themeBorder p-1" value="${w.group || ''}" placeholder="e.g. 12V_PWR" onchange="window.HarnessApp.updateProp('wire', '${w.id}', 'group', this.value)"></label>
                    <div class="grid grid-cols-2 gap-2">
                        <label>From Pin: <input type="number" class="w-full bg-themeBg border border-themeBorder p-1" value="${w.fromPin || 1}" min="1" onchange="window.HarnessApp.updateProp('wire', '${w.id}', 'fromPin', this.value)"></label>
                        <label>To Pin: <input type="number" class="w-full bg-themeBg border border-themeBorder p-1" value="${w.toPin || 1}" min="1" onchange="window.HarnessApp.updateProp('wire', '${w.id}', 'toPin', this.value)"></label>
                        <label>AWG: <input type="number" class="w-full bg-themeBg border border-themeBorder p-1" value="${w.awg}" onchange="window.HarnessApp.updateProp('wire', '${w.id}', 'awg', this.value)"></label>
                        <label>Length (m): <input type="number" class="w-full bg-themeBg border border-themeBorder p-1" value="${w.len}" step="0.1" onchange="window.HarnessApp.updateProp('wire', '${w.id}', 'len', this.value)"></label>
                        <label class="col-span-2">Current (A): <input type="number" class="w-full bg-themeBg border border-themeBorder p-1" value="${w.i}" step="0.1" onchange="window.HarnessApp.updateProp('wire', '${w.id}', 'i', this.value)"></label>
                    </div>
                    <label>Metadata: <textarea class="w-full bg-themeBg border border-themeBorder p-1 h-20 text-[10px]" placeholder="Color: Red&#10;Type: PTFE" onchange="window.HarnessApp.updateProp('wire', '${w.id}', 'metadata', this.value)">${metaStr}</textarea></label>
                </div>
            `;
        } else if (this.selectedWires.size > 1) {
            info.innerText = `${this.selectedWires.size} Wires`;
            cont.innerHTML = `
                <div class="flex flex-col gap-2">
                    <label>Set Group for All: <input type="text" class="w-full bg-themeBg border border-themeBorder p-1" placeholder="e.g. 12V_PWR" onchange="window.HarnessApp.bulkUpdateWires('group', this.value)"></label>
                    <label>Set AWG for All: <input type="number" class="w-full bg-themeBg border border-themeBorder p-1" onchange="window.HarnessApp.bulkUpdateWires('awg', this.value)"></label>
                </div>
            `;
        } else {
            info.innerText = `Overview`;
            
            let html = `<div class="flex flex-col gap-4">`;
            
            // Connectors & Betas
            html += `<div><h4 class="font-bold border-b border-themeBorder/20 pb-1 mb-2 text-themeAccent">All Nodes</h4>`;
            if(this.nodes.length === 0) html += `<div class="text-themeMuted text-center py-2">No nodes</div>`;
            else {
                html += `<div class="max-h-32 overflow-y-auto space-y-1 pr-1">`;
                this.nodes.forEach(n => {
                    html += `<div class="flex justify-between items-center bg-themeBg p-1 border border-themeBorder/30 cursor-pointer hover:border-themeAccent" onclick="window.HarnessApp.selectNode('${n.id}')">
                                <span><i class="fa-solid ${n.type==='connector'?'fa-plug':'fa-location-crosshairs'} text-[10px] mr-1 text-themeMuted"></i> <strong>${n.id}</strong> ${n.name?' - '+n.name:''}</span>
                                <span class="text-[9px] text-themeMuted">${n.parentGroup || ''}</span>
                             </div>`;
                });
                html += `</div>`;
            }
            html += `</div>`;

            // Wires
            html += `<div><h4 class="font-bold border-b border-themeBorder/20 pb-1 mb-2 text-themeAccent">All Wires</h4>`;
            if(this.wires.length === 0) html += `<div class="text-themeMuted text-center py-2">No wires</div>`;
            else {
                html += `<div class="max-h-32 overflow-y-auto space-y-1 pr-1">`;
                this.wires.forEach(w => {
                    html += `<div class="flex justify-between items-center bg-themeBg p-1 border border-themeBorder/30 cursor-pointer hover:border-themeAccent" onclick="window.HarnessApp.selectWire('${w.id}')">
                                <span><i class="fa-solid fa-wave-square text-[10px] mr-1 text-themeMuted"></i> <strong>${w.id}</strong></span>
                                <span class="text-[9px] text-themeMuted">${w.group || 'No Bundle'} | ${w.awg} AWG</span>
                             </div>`;
                });
                html += `</div>`;
            }
            html += `</div></div>`;

            cont.innerHTML = html;
        }
    }

    selectNode(id) {
        this.selectedNodes.clear();
        this.selectedWires.clear();
        let n = this.nodes.find(x => x.id === id);
        if(n) this.selectedNodes.add(n);
        this.updatePropsPanel();
        this.draw();
    }

    selectWire(id) {
        this.selectedNodes.clear();
        this.selectedWires.clear();
        let w = this.wires.find(x => x.id === id);
        if(w) this.selectedWires.add(w);
        this.updatePropsPanel();
        this.draw();
    }

    updateProp(type, id, prop, val) {
        let item = type === 'node' ? this.nodes.find(x => x.id === id) : this.wires.find(x => x.id === id);
        if(item) {
            if(prop === 'pins' || prop === 'awg' || prop === 'fromPin' || prop === 'toPin') item[prop] = parseInt(val) || item[prop];
            else if(prop === 'len' || prop === 'i') item[prop] = parseFloat(val) || item[prop];
            else if(prop === 'metadata') {
                item.metadata = {};
                val.split('\\n').forEach(line => {
                    let parts = line.split(':');
                    if(parts.length >= 2) item.metadata[parts[0].trim()] = parts.slice(1).join(':').trim();
                });
            }
            else item[prop] = val;
            this.draw();
        }
    }

    bulkUpdateWires(prop, val) {
        this.selectedWires.forEach(w => {
            if(prop === 'awg') w.awg = parseInt(val) || w.awg;
            else w[prop] = val;
        });
        this.draw();
    }

    // ---------- Exports ----------

    showTable() {
        const tbody = document.querySelector('#harness-table tbody');
        if(!tbody) return;
        tbody.innerHTML = '';
        
        let groups = {};
        for(let w of this.wires) {
            if(w.group) {
                if(!groups[w.group]) groups[w.group] = [];
                groups[w.group].push(w);
            }
        }
        
        for (let w of this.wires) {
            let r = (this.awgRes[w.awg] || 0) * (w.len / 1000);
            
            let effectiveI = w.i;
            if(w.group && groups[w.group].length > 0) {
                // Split current among wires in the group
                effectiveI = w.i / groups[w.group].length;
            }
            
            let vdrop = effectiveI * r;

            let pathStr = w.path.join(' &rarr; ');
            let tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="p-2 border-r border-themeBorder/20 text-themeAccent font-bold">${w.id} ${w.group ? `<span class="bg-blue-600 text-white text-[9px] px-1 rounded ml-1">${w.group}</span>` : ''}</td>
                <td class="p-2">${w.path[0]} (Pin ${w.fromPin || 1})</td>
                <td class="p-2">${w.path[w.path.length-1]} (Pin ${w.toPin || 1})</td>
                <td class="p-2">${w.awg}</td>
                <td class="p-2">${w.len.toFixed(2)}</td>
                <td class="p-2 text-red-500">${effectiveI.toFixed(2)} ${w.group ? `<span class="text-[9px] text-themeMuted">(Split)</span>` : ''}</td>
                <td class="p-2 text-themeMuted">${r.toFixed(4)}</td>
                <td class="p-2 font-bold ${vdrop>0.5?'text-red-500':''}">${vdrop.toFixed(3)}</td>
            `;
            tbody.appendChild(tr);
        }

        document.getElementById('harness-table-modal').classList.remove('hidden');
        document.getElementById('harness-table-modal').classList.add('flex');
    }
    downloadCSV() {
        let csv = "Wire ID,From Node,From Pin,To Node,To Pin,Routing Path,AWG,Length (m),Current (A),R (ohms),V-Drop (V)\n";
        for (let w of this.wires) {
            let r = (this.awgRes[w.awg] || 0) * (w.len / 1000);
            let vdrop = w.i * r;
            csv += `${w.id},${w.path[0]},${w.fromPin || 1},${w.path[w.path.length-1]},${w.toPin || 1},"${w.path.join(' -> ')}",${w.awg},${w.len.toFixed(2)},${w.i.toFixed(2)},${r.toFixed(4)},${vdrop.toFixed(3)}\n`;
        }
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'harness_netlist.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    downloadHTMLReport() {
        let html = `<!DOCTYPE html>
<html>
<head>
<title>Harness BoM Report</title>
<style>
body { font-family: sans-serif; padding: 20px; background: #f4f4f4; }
.container { background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
h1, h2 { color: #333; }
table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 30px; }
th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
th { background: #eee; }
</style>
</head>
<body>
<div class="container">
<h1>Harness Bill of Materials & Netlist</h1>

<h2>Connectors & Endpoints</h2>
<table>
<tr><th>ID</th><th>Name</th><th>Pins</th></tr>`;
        
        let connectors = this.nodes.filter(n => n.type === 'connector');
        for(let c of connectors) {
            html += `<tr><td>${c.id}</td><td>${c.name || ''}</td><td>${c.pins}</td></tr>`;
        }
        
        html += `</table>

<h2>Beta Points (Routing Nodes)</h2>
<table>
<tr><th>ID</th><th>Name</th></tr>`;
        let betas = this.nodes.filter(n => n.type === 'beta');
        for(let b of betas) {
            html += `<tr><td>${b.id}</td><td>${b.name || ''}</td></tr>`;
        }

        html += `</table>

<h2>Wire Netlist & Properties</h2>
<table>
<tr><th>Wire ID</th><th>From</th><th>To</th><th>Routing Path</th><th>AWG</th><th>Length (m)</th><th>Current (A)</th><th>Resistance (&Omega;)</th><th>Voltage Drop (V)</th><th>Metadata</th></tr>`;

        let totalLen = 0;
        let wireGroupsAgg = {};
        
        let groups = {};
        for(let w of this.wires) {
            if(w.group) {
                if(!groups[w.group]) groups[w.group] = [];
                groups[w.group].push(w);
            }
        }

        for (let w of this.wires) {
            let r = (this.awgRes[w.awg] || 0) * (w.len / 1000);
            let effectiveI = w.i;
            if(w.group && groups[w.group].length > 0) {
                effectiveI = w.i / groups[w.group].length;
            }
            let vdrop = effectiveI * r;
            let meta = Object.keys(w.metadata || {}).map(k => `<b>${k}:</b> ${w.metadata[k]}`).join('<br>');
            
            html += `<tr>
                <td>${w.id} ${w.group ? `(Grp: ${w.group})` : ''}</td>
                <td>${w.path[0]} (Pin ${w.fromPin || 1})</td>
                <td>${w.path[w.path.length-1]} (Pin ${w.toPin || 1})</td>
                <td>${w.path.join(' &rarr; ')}</td>
                <td>${w.awg}</td>
                <td>${w.len.toFixed(2)}</td>
                <td>${effectiveI.toFixed(2)}</td>
                <td>${r.toFixed(4)}</td>
                <td>${vdrop.toFixed(3)}</td>
                <td>${meta}</td>
            </tr>`;
            
            totalLen += w.len;
            if(!wireGroupsAgg[w.awg]) wireGroupsAgg[w.awg] = 0;
            wireGroupsAgg[w.awg] += w.len;
        }

        html += `</table>

<h2>Summary</h2>
<ul>
    <li>Total Wires: ${this.wires.length}</li>
    <li>Total Connectors: ${connectors.length}</li>
    <li>Total Wire Length: ${totalLen.toFixed(2)} m</li>
</ul>

<h3>Length by AWG</h3>
<ul>`;
        for(let awg in wireGroupsAgg) {
            html += `<li>AWG ${awg}: ${wireGroupsAgg[awg].toFixed(2)} m</li>`;
        }

        html += `</ul>
</div>
</body>
</html>`;

        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'harness_report.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // ---------- 3D Rendering (Three.js) ----------
    
    show3D() {
        document.getElementById('harness-3d-modal').classList.remove('hidden');
        document.getElementById('harness-3d-modal').classList.add('flex');
        
        if (!this.threeScene) {
            this.init3D();
        } else {
            this.update3D();
        }
    }
    
    init3D() {
        const container = document.getElementById('harness-3d-container');
        if (!container || !window.THREE) return;
        
        let width = container.clientWidth;
        let height = container.clientHeight;
        
        this.threeScene = new THREE.Scene();
        this.threeScene.background = new THREE.Color(0x111111);
        
        this.threeCamera = new THREE.PerspectiveCamera(45, width / height, 1, 10000);
        this.threeCamera.position.set(this.canvas.width / 2, this.canvas.height / 2, 800);
        
        this.threeRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.threeRenderer.setSize(width, height);
        container.appendChild(this.threeRenderer.domElement);
        
        // Setup OrbitControls if available
        if (THREE.OrbitControls) {
            this.controls = new THREE.OrbitControls(this.threeCamera, this.threeRenderer.domElement);
            this.controls.target.set(this.canvas.width / 2, this.canvas.height / 2, 0);
            this.controls.update();
        }
        
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.threeScene.add(ambientLight);
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(0, 0, 1000);
        this.threeScene.add(dirLight);
        
        this.harnessGroup = new THREE.Group();
        this.threeScene.add(this.harnessGroup);
        
        this.bgMesh = null;
        
        const ro3d = new ResizeObserver(entries => {
            for (let entry of entries) {
                if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
                    this.threeCamera.aspect = entry.contentRect.width / entry.contentRect.height;
                    this.threeCamera.updateProjectionMatrix();
                    this.threeRenderer.setSize(entry.contentRect.width, entry.contentRect.height);
                }
            }
        });
        ro3d.observe(container);
        
        this.update3D();
        
        container.addEventListener('pointermove', (e) => {
            const rect = container.getBoundingClientRect();
            this.mouse3D.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse3D.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            
            this.raycaster.setFromCamera(this.mouse3D, this.threeCamera);
            let targets = this.harnessGroup.children.filter(c => c !== this.bgMesh);
            const intersects = this.raycaster.intersectObjects(targets);
            
            let tooltip = document.getElementById('harness-3d-tooltip');
            if(intersects.length > 0) {
                let hit = intersects[0].object;
                if(hit.userData && hit.userData.info) {
                    tooltip.innerHTML = hit.userData.info;
                    tooltip.style.left = (e.clientX - rect.left + 15) + 'px';
                    tooltip.style.top = (e.clientY - rect.top + 15) + 'px';
                    tooltip.classList.remove('hidden');
                } else {
                    tooltip.classList.add('hidden');
                }
            } else {
                tooltip.classList.add('hidden');
            }
        });
        
        const animate = () => {
            requestAnimationFrame(animate);
            if (this.controls) this.controls.update();
            this.threeRenderer.render(this.threeScene, this.threeCamera);
        };
        animate();
    }
    
    update3D() {
        if (!this.harnessGroup) return;
        
        // Clear old geometry but keep background
        for(let i = this.harnessGroup.children.length - 1; i >= 0; i--) {
            let child = this.harnessGroup.children[i];
            if (child !== this.bgMesh) {
                this.harnessGroup.remove(child);
            }
        }
        
        const connectorGeo = new THREE.BoxGeometry(80, 40, 20);
        const connectorMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.2, roughness: 0.8 });
        
        const betaGeo = new THREE.SphereGeometry(12, 16, 16);
        const betaMat = new THREE.MeshStandardMaterial({ color: 0x0ea5e9, metalness: 0.5, roughness: 0.5 });
        
        // Draw Nodes
        this.nodes.forEach(n => {
            let mesh;
            if (n.type === 'connector') {
                mesh = new THREE.Mesh(connectorGeo, connectorMat);
                // Center offset for 3D vs 2D top-left
                mesh.position.set(n.x + 40, this.canvas.height - (n.y + 20), 10);
                mesh.userData = { info: `Connector: ${n.id}\nName: ${n.name||''}\nPins: ${n.pins}` };
            } else {
                mesh = new THREE.Mesh(betaGeo, betaMat);
                mesh.position.set(n.x, this.canvas.height - n.y, 10);
                mesh.userData = { info: `Beta: ${n.id}\nName: ${n.name||''}` };
            }
            this.harnessGroup.add(mesh);
        });
        
        // Draw Wires
        const wireMat = new THREE.LineBasicMaterial({ color: 0xD4AF37, linewidth: 2 });
        this.wires.forEach(w => {
            if(!w.path || w.path.length < 2) return;
            
            const points = [];
            for (let i = 0; i < w.path.length; i++) {
                let node = this.nodes.find(x => x.id === w.path[i]);
                if (node) {
                    let pos = this.getNodePos(node);
                    points.push(new THREE.Vector3(pos.x, this.canvas.height - pos.y, 10));
                }
            }
            
            // Generate Spline for Bezier or Straight for Ortho
            if (this.routingStyle === 'bezier' && points.length > 2) {
                const curve = new THREE.CatmullRomCurve3(points);
                const smoothPoints = curve.getPoints(50);
                const geo = new THREE.BufferGeometry().setFromPoints(smoothPoints);
                const line = new THREE.Line(geo, wireMat);
                line.userData = { info: `Wire: ${w.id}\nGrp: ${w.group||'N/A'}\nLen: ${w.len}m\nI: ${w.i}A` };
                this.harnessGroup.add(line);
            } else {
                const geo = new THREE.BufferGeometry().setFromPoints(points);
                const line = new THREE.Line(geo, wireMat);
                line.userData = { info: `Wire: ${w.id}\nGrp: ${w.group||'N/A'}\nLen: ${w.len}m\nI: ${w.i}A` };
                this.harnessGroup.add(line);
            }
        });
    }
    
    load3DBackground(input) {
        if (!input.files || !input.files[0]) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = () => {
                if (this.bgMesh) {
                    this.harnessGroup.remove(this.bgMesh);
                }
                const texture = new THREE.Texture(img);
                texture.needsUpdate = true;
                
                // Match aspect ratio
                let aspect = img.width / img.height;
                let w = this.canvas.width;
                let h = w / aspect;
                
                const geo = new THREE.PlaneGeometry(w, h);
                const mat = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, transparent: true, opacity: 0.5 });
                this.bgMesh = new THREE.Mesh(geo, mat);
                
                this.updateBg();
                this.harnessGroup.add(this.bgMesh);
                document.getElementById('bg-controls').classList.remove('hidden');
                document.getElementById('bg-controls').classList.add('flex');
            };
        };
        reader.readAsDataURL(input.files[0]);
    }

    updateBg() {
        if(!this.bgMesh) return;
        let scale = parseFloat(document.getElementById('bg-scale').value);
        let x = parseFloat(document.getElementById('bg-x').value);
        let y = parseFloat(document.getElementById('bg-y').value);
        let rot = parseFloat(document.getElementById('bg-rot').value);
        
        this.bgMesh.scale.set(scale, scale, 1);
        this.bgMesh.position.set(this.canvas.width/2 + x, this.canvas.height/2 + y, -10);
        this.bgMesh.rotation.z = THREE.MathUtils.degToRad(rot);
    }
}

window.HarnessApp = new HarnessDesigner();

