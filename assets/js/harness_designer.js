// Multipoint Wire Harness Designer & Industrial Routing Engine
// Comprehensive topological multi-connector wiring, pinout snapping, DRC, and BOM generation

class HarnessDesigner {
    constructor() {
        this.nodes = [];
        this.wires = [];
        this.bundles = []; 

        this.selectedNodes = new Set();
        this.selectedWires = new Set();

        this.draggingNode = null;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.nodeOrigX = 0;
        this.nodeOrigY = 0;

        this.mode = 'select'; // 'select', 'add_wire', 'add_beta', 'add_connector'
        this.routingStyle = 'bezier'; // 'bezier' or 'orthogonal'
        
        this.wireStartNode = null;
        this.wireStartPin = 1;
        this.hoveredPin = null;
        
        this.mouseX = 0; 
        this.mouseY = 0;
        
        this.canvas = null;
        this.ctx = null;
        this.ro = null;
        
        // Standard AWG Copper Resistance (ohms / 1000m at 20°C) and Max Chassis Ampacity (A)
        this.awgSpecs = {
            '10': { r_km: 3.28, amp: 55, dia_mm: 2.588, weight_g_m: 46.7 },
            '12': { r_km: 5.21, amp: 41, dia_mm: 2.053, weight_g_m: 29.4 },
            '14': { r_km: 8.28, amp: 32, dia_mm: 1.628, weight_g_m: 18.5 },
            '16': { r_km: 13.17, amp: 22, dia_mm: 1.291, weight_g_m: 11.6 },
            '18': { r_km: 20.9, amp: 16, dia_mm: 1.024, weight_g_m: 7.3 },
            '20': { r_km: 33.3, amp: 11, dia_mm: 0.812, weight_g_m: 4.6 },
            '22': { r_km: 53.0, amp: 7.0, dia_mm: 0.644, weight_g_m: 2.9 },
            '24': { r_km: 84.2, amp: 3.5, dia_mm: 0.511, weight_g_m: 1.8 },
            '26': { r_km: 133.9, amp: 2.2, dia_mm: 0.405, weight_g_m: 1.1 }
        };

        this.colorPalette = [
            { name: 'Red', hex: '#ef4444', text: 'white' },
            { name: 'Black', hex: '#1e293b', text: 'white' },
            { name: 'Blue', hex: '#3b82f6', text: 'white' },
            { name: 'Green', hex: '#22c55e', text: 'black' },
            { name: 'Yellow', hex: '#eab308', text: 'black' },
            { name: 'White', hex: '#f8fafc', text: 'black' },
            { name: 'Orange', hex: '#f97316', text: 'white' },
            { name: 'Violet', hex: '#a855f7', text: 'white' },
            { name: 'Brown', hex: '#854d0e', text: 'white' },
            { name: 'Gray', hex: '#64748b', text: 'white' }
        ];
    }

    init() {
        this.canvas = document.getElementById('harness-canvas');
        if(!this.canvas) return;
        const container = document.getElementById('harness-canvas-container');
        this.ctx = this.canvas.getContext('2d');
        
        if (this.ro) this.ro.disconnect();
        this.ro = new ResizeObserver(entries => {
            for (let entry of entries) {
                const dpr = window.devicePixelRatio || 1;
                const w = entry.contentRect.width || 800;
                const h = entry.contentRect.height || 500;
                this.canvas.width = w * dpr;
                this.canvas.height = h * dpr;
                this.canvasWidth = w;
                this.canvasHeight = h;
                this.ctx.scale(dpr, dpr);
                this.draw();
            }
        });
        if (container) this.ro.observe(container);
        
        // Initial Realistic Multi-Connector Dataset
        if (this.nodes.length === 0) {
            this.loadPreset('quadcopter');
        }

        this.attachEvents();
        this.draw();
        this.updatePropertiesPanel();
        this.runDRC();
    }

    loadPreset(name) {
        this.selectedNodes.clear();
        this.selectedWires.clear();

        if (name === 'quadcopter') {
            this.nodes = [
                {id: 'J1', type: 'connector', x: 80, y: 180, pins: 6, name: 'Power Distribution', partNo: 'XT60 / Molex Micro-Fit 6P'},
                {id: 'B1', type: 'beta', x: 280, y: 220, name: 'Main Harness Junction'},
                {id: 'J2', type: 'connector', x: 500, y: 80, pins: 3, name: 'ESC Front-Left', partNo: 'JST-GH 3P'},
                {id: 'J3', type: 'connector', x: 500, y: 200, pins: 3, name: 'ESC Front-Right', partNo: 'JST-GH 3P'},
                {id: 'J4', type: 'connector', x: 500, y: 320, pins: 4, name: 'Flight Controller telemetry', partNo: 'JST-SH 4P'}
            ];
            this.wires = [
                {id: 'NET_VBAT_1', signal: 'VBAT_24V', color: '#ef4444', path: ['J1', 'B1', 'J2'], fromPin: 1, toPin: 1, awg: '14', len: 0.65, i: 15.0, shielded: false},
                {id: 'NET_GND_1', signal: 'PWR_GND', color: '#1e293b', path: ['J1', 'B1', 'J2'], fromPin: 2, toPin: 2, awg: '14', len: 0.65, i: 15.0, shielded: false},
                {id: 'NET_PWM_1', signal: 'PWM_ESC_FL', color: '#3b82f6', path: ['J1', 'B1', 'J2'], fromPin: 3, toPin: 3, awg: '22', len: 0.65, i: 0.2, shielded: false},
                {id: 'NET_VBAT_2', signal: 'VBAT_24V', color: '#ef4444', path: ['J1', 'B1', 'J3'], fromPin: 1, toPin: 1, awg: '14', len: 0.70, i: 15.0, shielded: false},
                {id: 'NET_GND_2', signal: 'PWR_GND', color: '#1e293b', path: ['J1', 'B1', 'J3'], fromPin: 2, toPin: 2, awg: '14', len: 0.70, i: 15.0, shielded: false},
                {id: 'NET_PWM_2', signal: 'PWM_ESC_FR', color: '#eab308', path: ['J1', 'B1', 'J3'], fromPin: 4, toPin: 3, awg: '22', len: 0.70, i: 0.2, shielded: false},
                {id: 'NET_CAN_H', signal: 'CAN_HIGH', color: '#22c55e', path: ['J1', 'B1', 'J4'], fromPin: 5, toPin: 1, awg: '24', len: 0.85, i: 0.05, shielded: true},
                {id: 'NET_CAN_L', signal: 'CAN_LOW', color: '#f8fafc', path: ['J1', 'B1', 'J4'], fromPin: 6, toPin: 2, awg: '24', len: 0.85, i: 0.05, shielded: true}
            ];
        } else if (name === 'automotive') {
            this.nodes = [
                {id: 'ECU', type: 'connector', x: 80, y: 150, pins: 8, name: 'Engine Control Unit (ECU)', partNo: 'Deutsch DTM 8P'},
                {id: 'SPLICE_1', type: 'beta', x: 300, y: 200, name: 'Engine Bay Splice'},
                {id: 'TPS', type: 'connector', x: 520, y: 100, pins: 3, name: 'Throttle Position Sensor', partNo: 'Ampseal 16 3P'},
                {id: 'MAP', type: 'connector', x: 520, y: 220, pins: 3, name: 'Manifold Pressure (MAP)', partNo: 'Ampseal 16 3P'},
                {id: 'O2', type: 'connector', x: 520, y: 340, pins: 4, name: 'Wideband Lambda Sensor', partNo: 'Bosch 4P'}
            ];
            this.wires = [
                {id: 'W_5V_REF', signal: '+5V_SENS_REF', color: '#ef4444', path: ['ECU', 'SPLICE_1', 'TPS'], fromPin: 1, toPin: 1, awg: '20', len: 1.2, i: 0.1, shielded: false},
                {id: 'W_SENS_GND', signal: 'SENSOR_GND', color: '#1e293b', path: ['ECU', 'SPLICE_1', 'TPS'], fromPin: 2, toPin: 2, awg: '20', len: 1.2, i: 0.1, shielded: false},
                {id: 'W_TPS_SIG', signal: 'TPS_SIGNAL', color: '#3b82f6', path: ['ECU', 'SPLICE_1', 'TPS'], fromPin: 3, toPin: 3, awg: '22', len: 1.2, i: 0.02, shielded: false},
                {id: 'W_MAP_SIG', signal: 'MAP_SIGNAL', color: '#eab308', path: ['ECU', 'SPLICE_1', 'MAP'], fromPin: 4, toPin: 3, awg: '22', len: 1.4, i: 0.02, shielded: false},
                {id: 'W_O2_HEATER', signal: 'LAMBDA_HEAT+', color: '#f97316', path: ['ECU', 'SPLICE_1', 'O2'], fromPin: 7, toPin: 1, awg: '16', len: 1.8, i: 4.5, shielded: false},
                {id: 'W_O2_HTRGND', signal: 'LAMBDA_HEAT-', color: '#1e293b', path: ['ECU', 'SPLICE_1', 'O2'], fromPin: 8, toPin: 2, awg: '16', len: 1.8, i: 4.5, shielded: false}
            ];
        }

        this.draw();
        this.updatePropertiesPanel();
        this.runDRC();
    }

    attachEvents() {
        if (!this.canvas) return;
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

    // ---------- Rendering Engine ----------
    
    draw() {
        if(!this.ctx) return;
        const ctx = this.ctx;
        const w = this.canvasWidth || 800;
        const h = this.canvasHeight || 500;
        
        // Background
        ctx.fillStyle = '#0a0f1d';
        ctx.fillRect(0, 0, w, h);
        
        // Engineering Grid
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for(let i=0; i<w; i+=25) { ctx.moveTo(i,0); ctx.lineTo(i,h); }
        for(let i=0; i<h; i+=25) { ctx.moveTo(0,i); ctx.lineTo(w,i); }
        ctx.stroke();

        this.drawWires();
        this.drawNodes();

        // In-progress Wire Routing Preview
        if (this.mode === 'add_wire' && this.wireStartNode) {
            ctx.beginPath();
            let p1 = this.getPinAbsolutePos(this.wireStartNode, this.wireStartPin);
            ctx.moveTo(p1.x, p1.y);
            this.routePath(ctx, p1.x, p1.y, this.mouseX, this.mouseY, this.routingStyle);
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2.5;
            ctx.setLineDash([6, 6]);
            ctx.stroke();
            ctx.setLineDash([]);

            // Draw start pin pulse
            ctx.fillStyle = '#38bdf8';
            ctx.beginPath();
            ctx.arc(p1.x, p1.y, 5, 0, Math.PI*2);
            ctx.fill();
        }
    }

    getPinAbsolutePos(node, pinNum) {
        if(node.type === 'beta') return {x: node.x, y: node.y};
        const w = 110;
        const py = node.y + 35 + ((pinNum - 0.5) * 18);
        return { x: node.x + w, y: py };
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
            const dist = Math.abs(ox2 - ox1) * 0.5;
            const cp1x = ox1 + dist;
            const cp2x = ox2 - dist;
            ctx.bezierCurveTo(cp1x, oy1, cp2x, oy2, ox2, oy2);
        }
    }

    drawWires() {
        const segments = {}; 
        
        for (let w of this.wires) {
            if(!w.path || w.path.length < 2) continue;
            for(let i=0; i<w.path.length - 1; i++) {
                let n1 = w.path[i];
                let n2 = w.path[i+1];
                let key = [n1, n2].sort().join('---');
                if(!segments[key]) segments[key] = [];
                segments[key].push({ wire: w, segmentIndex: i });
            }
        }

        const ctx = this.ctx;
        
        for (let key in segments) {
            let sWires = segments[key];
            let idA = key.split('---')[0];
            let idB = key.split('---')[1];
            let n1 = this.nodes.find(n => n.id === idA);
            let n2 = this.nodes.find(n => n.id === idB);
            if(!n1 || !n2) continue;

            const isBundleSelected = sWires.some(sw => this.selectedWires.has(sw.wire));
            
            // Draw protective corrugated conduit / bundle hull
            if(sWires.length > 1) {
                let p1Center = n1.type === 'beta' ? {x: n1.x, y: n1.y} : {x: n1.x + 110, y: n1.y + 35 + (n1.pins * 9)};
                let p2Center = n2.type === 'beta' ? {x: n2.x, y: n2.y} : {x: n2.x, y: n2.y + 35 + (n2.pins * 9)};
                
                ctx.beginPath();
                this.routePath(ctx, p1Center.x, p1Center.y, p2Center.x, p2Center.y, this.routingStyle);
                ctx.lineWidth = Math.min(sWires.length * 4 + 8, 30);
                ctx.lineCap = 'round';
                ctx.strokeStyle = isBundleSelected ? 'rgba(212, 175, 55, 0.35)' : 'rgba(255, 255, 255, 0.08)';
                ctx.stroke();
            }

            // Draw individual routed conductors
            let offsetStep = sWires.length > 1 ? 5 : 0;
            let startOffset = -(sWires.length - 1) * offsetStep / 2;
            
            sWires.forEach((item, idx) => {
                const w = item.wire;
                const isWireSel = this.selectedWires.has(w);
                
                let p1 = (item.segmentIndex === 0 && n1.type === 'connector') ? 
                         this.getPinAbsolutePos(n1, w.fromPin) : 
                         (n1.type === 'beta' ? {x: n1.x, y: n1.y} : {x: n1.x + 110, y: n1.y + 25});
                         
                let p2 = (item.segmentIndex === w.path.length - 2 && n2.type === 'connector') ? 
                         (n2.id === w.path[w.path.length-1] ? {x: n2.x, y: n2.y + 35 + ((w.toPin - 0.5) * 18)} : this.getPinAbsolutePos(n2, w.fromPin)) : 
                         (n2.type === 'beta' ? {x: n2.x, y: n2.y} : {x: n2.x, y: n2.y + 25});

                let wOffset = startOffset + (idx * offsetStep);
                ctx.beginPath();
                this.routePath(ctx, p1.x, p1.y, p2.x, p2.y, this.routingStyle, wOffset);
                
                ctx.lineWidth = isWireSel ? 3.5 : (parseInt(w.awg) <= 14 ? 2.5 : 1.8);
                ctx.strokeStyle = isWireSel ? '#D4AF37' : (w.color || '#3b82f6');
                ctx.stroke();

                // Shielding braid texture
                if (w.shielded) {
                    ctx.save();
                    ctx.setLineDash([2, 4]);
                    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                    ctx.restore();
                }
            });
        }
    }

    drawNodes() {
        const ctx = this.ctx;
        this.nodes.forEach(n => {
            const isSelected = this.selectedNodes.has(n);
            
            if (n.type === 'connector') {
                const w = 110;
                const h = 45 + (n.pins * 18);
                
                // Connector Housing Box
                ctx.fillStyle = '#0f172a';
                ctx.fillRect(n.x, n.y, w, h);
                
                ctx.lineWidth = isSelected ? 2.5 : 1.5;
                ctx.strokeStyle = isSelected ? '#D4AF37' : '#334155';
                ctx.strokeRect(n.x, n.y, w, h);
                
                // Header Bar
                ctx.fillStyle = isSelected ? '#D4AF37' : '#1e293b';
                ctx.fillRect(n.x, n.y, w, 24);
                
                ctx.fillStyle = isSelected ? '#000' : '#f8fafc';
                ctx.font = 'bold 11px monospace';
                ctx.textAlign = 'left';
                ctx.fillText(n.id, n.x + 8, n.y + 16);
                
                ctx.fillStyle = '#94a3b8';
                ctx.font = '9px monospace';
                const truncName = n.name.length > 15 ? n.name.substring(0, 14) + '…' : n.name;
                ctx.fillText(truncName, n.x + 8, n.y + 36);
                
                // Render Pins
                for (let i = 1; i <= n.pins; i++) {
                    const py = n.y + 35 + ((i - 0.5) * 18);
                    const isPinHovered = this.hoveredPin && this.hoveredPin.node.id === n.id && this.hoveredPin.pin === i;
                    
                    // Pin Terminal Contact
                    ctx.fillStyle = isPinHovered ? '#38bdf8' : '#475569';
                    ctx.fillRect(n.x + w - 10, py - 5, 10, 10);
                    
                    // Pin Label & Net Signal preview
                    ctx.fillStyle = isPinHovered ? '#38bdf8' : '#cbd5e1';
                    ctx.font = '10px monospace';
                    ctx.fillText(`P${i}`, n.x + w - 28, py + 3);
                }
            } else if (n.type === 'beta') {
                // Breakout / Splice Junction Node
                ctx.beginPath();
                ctx.arc(n.x, n.y, 14, 0, Math.PI * 2);
                ctx.fillStyle = '#0f172a';
                ctx.fill();
                ctx.lineWidth = isSelected ? 3 : 2;
                ctx.strokeStyle = isSelected ? '#D4AF37' : '#38bdf8';
                ctx.stroke();
                
                ctx.fillStyle = '#38bdf8';
                ctx.font = 'bold 10px monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('⚡', n.x, n.y);
            }
        });
    }

    // ---------- Mouse & Interaction Handling ----------
    
    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return { 
            x: (e.clientX - rect.left), 
            y: (e.clientY - rect.top) 
        };
    }

    findPinAt(x, y) {
        for (let n of this.nodes) {
            if (n.type !== 'connector') continue;
            const w = 110;
            if (x >= n.x + w - 30 && x <= n.x + w + 10) {
                for (let i = 1; i <= n.pins; i++) {
                    const py = n.y + 35 + ((i - 0.5) * 18);
                    if (Math.abs(y - py) <= 10) {
                        return { node: n, pin: i };
                    }
                }
            }
        }
        return null;
    }

    onMouseDown(e) {
        const {x, y} = this.getMousePos(e);
        this.mouseX = x; this.mouseY = y;

        const pinHit = this.findPinAt(x, y);

        // Check node body hit
        let clickedNode = this.nodes.find(n => {
            if(n.type === 'connector') {
                const w = 110, h = 45 + (n.pins * 18);
                return (x >= n.x && x <= n.x + w && y >= n.y && y <= n.y + h);
            } else {
                return Math.hypot(n.x - x, n.y - y) <= 16;
            }
        });

        if (this.mode === 'add_wire') {
            if (pinHit) {
                if (!this.wireStartNode) {
                    this.wireStartNode = pinHit.node;
                    this.wireStartPin = pinHit.pin;
                } else if (this.wireStartNode.id !== pinHit.node.id) {
                    // Check if intermediate beta junctions are in path
                    const path = [this.wireStartNode.id];
                    const nearbyBeta = this.nodes.find(n => n.type === 'beta' && Math.abs(n.y - (this.wireStartNode.y + pinHit.node.y)/2) < 150);
                    if (nearbyBeta) path.push(nearbyBeta.id);
                    path.push(pinHit.node.id);

                    this.wires.push({
                        id: 'NET_' + (this.wires.length + 1),
                        signal: 'SIG_' + (this.wires.length + 1),
                        color: this.colorPalette[this.wires.length % this.colorPalette.length].hex,
                        path: path,
                        fromPin: this.wireStartPin,
                        toPin: pinHit.pin,
                        awg: '18',
                        len: 1.0,
                        i: 1.5,
                        shielded: false
                    });
                    this.mode = 'select';
                    this.wireStartNode = null;
                    this.updateUIState();
                    this.runDRC();
                }
            } else if (clickedNode && clickedNode.type === 'beta' && this.wireStartNode) {
                // Clicking beta point routes through it
                // Keep routing
            }
            this.draw();
            return;
        }

        if (this.mode === 'add_beta') {
            const count = this.nodes.filter(n => n.type === 'beta').length + 1;
            this.nodes.push({id: 'SPLICE_' + count, type: 'beta', x: x, y: y, name: 'Splice ' + count});
            this.mode = 'select';
            this.updateUIState();
            this.draw();
            return;
        }

        if (this.mode === 'add_connector') {
            const count = this.nodes.filter(n => n.type === 'connector').length + 1;
            this.nodes.push({id: 'J' + count, type: 'connector', x: x, y: y, pins: 4, name: 'Sub-Module ' + count, partNo: 'Standard Molex 4P'});
            this.mode = 'select';
            this.updateUIState();
            this.draw();
            return;
        }

        // Selection & Drag Mode
        if (clickedNode) {
            if (!e.shiftKey) {
                this.selectedNodes.clear();
                this.selectedWires.clear();
            }
            this.selectedNodes.add(clickedNode);
            this.draggingNode = clickedNode;
            this.dragStartX = x;
            this.dragStartY = y;
            this.nodeOrigX = clickedNode.x;
            this.nodeOrigY = clickedNode.y;
        } else {
            // Check Wire Hit
            let clickedWire = this.findWireAt(x, y);
            if (clickedWire) {
                if (!e.shiftKey) {
                    this.selectedNodes.clear();
                    this.selectedWires.clear();
                }
                this.selectedWires.add(clickedWire);
            } else if (!e.shiftKey) {
                this.selectedNodes.clear();
                this.selectedWires.clear();
            }
        }

        this.updatePropertiesPanel();
        this.draw();
    }

    findWireAt(x, y) {
        const hitCanvas = document.createElement('canvas');
        hitCanvas.width = this.canvasWidth || 800;
        hitCanvas.height = this.canvasHeight || 500;
        const hitCtx = hitCanvas.getContext('2d');

        for (let w of this.wires) {
            if (!w.path || w.path.length < 2) continue;
            for (let i = 0; i < w.path.length - 1; i++) {
                let n1 = this.nodes.find(n => n.id === w.path[i]);
                let n2 = this.nodes.find(n => n.id === w.path[i+1]);
                if (!n1 || !n2) continue;

                let p1 = (i === 0 && n1.type === 'connector') ? this.getPinAbsolutePos(n1, w.fromPin) : {x: n1.x, y: n1.y};
                let p2 = (i === w.path.length - 2 && n2.type === 'connector') ? {x: n2.x, y: n2.y + 35 + ((w.toPin - 0.5) * 18)} : {x: n2.x, y: n2.y};

                hitCtx.beginPath();
                this.routePath(hitCtx, p1.x, p1.y, p2.x, p2.y, this.routingStyle);
                hitCtx.lineWidth = 12;
                if (hitCtx.isPointInStroke(x, y)) {
                    return w;
                }
            }
        }
        return null;
    }

    onMouseMove(e) {
        const {x, y} = this.getMousePos(e);
        this.mouseX = x; this.mouseY = y;

        // Hover pin detection
        const pinHit = this.findPinAt(x, y);
        if (pinHit !== this.hoveredPin) {
            this.hoveredPin = pinHit;
            this.canvas.style.cursor = pinHit ? 'pointer' : (this.mode === 'select' ? 'default' : 'crosshair');
            this.draw();
        }

        if (this.draggingNode) {
            this.draggingNode.x = this.nodeOrigX + (x - this.dragStartX);
            this.draggingNode.y = this.nodeOrigY + (y - this.dragStartY);
            this.draw();
        } else if (this.mode === 'add_wire') {
            this.draw();
        }
    }

    onMouseUp() {
        this.draggingNode = null;
    }

    cancelAction() {
        this.mode = 'select';
        this.wireStartNode = null;
        this.updateUIState();
        this.draw();
    }

    deleteSelected() {
        this.selectedNodes.forEach(n => {
            this.nodes = this.nodes.filter(item => item.id !== n.id);
            this.wires = this.wires.filter(w => !w.path.includes(n.id));
        });
        this.selectedWires.forEach(w => {
            this.wires = this.wires.filter(item => item.id !== w.id);
        });
        this.selectedNodes.clear();
        this.selectedWires.clear();
        this.updatePropertiesPanel();
        this.draw();
        this.runDRC();
    }

    // ---------- UI State, Properties & DRC ----------
    
    updateUIState() {
        const btnWire = document.getElementById('btn-route-wire');
        const btnBeta = document.getElementById('btn-route-beta');
        if (btnWire) btnWire.className = this.mode === 'add_wire' ? 'px-2 py-1 bg-sky-500 text-white text-xs font-bold rounded shadow animate-pulse' : 'px-2 py-1 bg-themeAccent text-themeBg text-xs font-bold hover:opacity-80 rounded';
        if (btnBeta) btnBeta.className = this.mode === 'add_beta' ? 'px-2 py-1 bg-sky-500 text-white text-xs font-bold rounded shadow animate-pulse' : 'px-2 py-1 bg-themeBg text-themeText border border-themeBorder text-xs font-bold hover:bg-themeBorder rounded';
    }

    updatePropertiesPanel() {
        const info = document.getElementById('harness-selection-info');
        const content = document.getElementById('harness-props-content');
        if (!content) return;

        if (this.selectedNodes.size === 1) {
            const node = Array.from(this.selectedNodes)[0];
            if (info) info.innerText = node.id + ' (' + node.type + ')';
            
            if (node.type === 'connector') {
                content.innerHTML = `
                    <div class="space-y-2">
                        <div>
                            <label class="text-[10px] text-themeMuted block mb-0.5">Connector ID</label>
                            <input type="text" class="w-full bg-themeBg border border-themeBorder p-1 text-xs font-bold" value="${node.id}" onchange="window.HarnessApp.updateNodeProp('${node.id}', 'id', this.value)">
                        </div>
                        <div>
                            <label class="text-[10px] text-themeMuted block mb-0.5">Name / Description</label>
                            <input type="text" class="w-full bg-themeBg border border-themeBorder p-1 text-xs" value="${node.name}" onchange="window.HarnessApp.updateNodeProp('${node.id}', 'name', this.value)">
                        </div>
                        <div>
                            <label class="text-[10px] text-themeMuted block mb-0.5">Housing Part Number</label>
                            <input type="text" class="w-full bg-themeBg border border-themeBorder p-1 text-xs" value="${node.partNo || ''}" onchange="window.HarnessApp.updateNodeProp('${node.id}', 'partNo', this.value)">
                        </div>
                        <div>
                            <label class="text-[10px] text-themeMuted block mb-0.5">Pin Count (${node.pins}P)</label>
                            <input type="number" min="1" max="64" class="w-full bg-themeBg border border-themeBorder p-1 text-xs font-bold" value="${node.pins}" onchange="window.HarnessApp.updateNodeProp('${node.id}', 'pins', parseInt(this.value))">
                        </div>
                        <button class="w-full mt-2 py-1 bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold rounded hover:bg-red-500/30" onclick="window.HarnessApp.deleteSelected()">Delete Connector</button>
                    </div>
                `;
            } else {
                content.innerHTML = `
                    <div class="space-y-2">
                        <div>
                            <label class="text-[10px] text-themeMuted block mb-0.5">Junction / Splice ID</label>
                            <input type="text" class="w-full bg-themeBg border border-themeBorder p-1 text-xs font-bold" value="${node.id}" onchange="window.HarnessApp.updateNodeProp('${node.id}', 'id', this.value)">
                        </div>
                        <div>
                            <label class="text-[10px] text-themeMuted block mb-0.5">Name</label>
                            <input type="text" class="w-full bg-themeBg border border-themeBorder p-1 text-xs" value="${node.name}" onchange="window.HarnessApp.updateNodeProp('${node.id}', 'name', this.value)">
                        </div>
                        <button class="w-full mt-2 py-1 bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold rounded hover:bg-red-500/30" onclick="window.HarnessApp.deleteSelected()">Delete Splice Node</button>
                    </div>
                `;
            }
        } else if (this.selectedWires.size === 1) {
            const w = Array.from(this.selectedWires)[0];
            if (info) info.innerText = w.id + ' (' + w.signal + ')';

            const spec = this.awgSpecs[w.awg] || this.awgSpecs['18'];
            const r_wire = (spec.r_km / 1000) * w.len;
            const vdrop = (w.i || 1) * r_wire;

            content.innerHTML = `
                <div class="space-y-2">
                    <div>
                        <label class="text-[10px] text-themeMuted block mb-0.5">Net / Signal Name</label>
                        <input type="text" class="w-full bg-themeBg border border-themeBorder p-1 text-xs font-bold text-themeAccent" value="${w.signal || w.id}" onchange="window.HarnessApp.updateWireProp('${w.id}', 'signal', this.value)">
                    </div>
                    <div class="grid grid-cols-2 gap-2">
                        <div>
                            <label class="text-[10px] text-themeMuted block mb-0.5">From Pin (P)</label>
                            <input type="number" min="1" class="w-full bg-themeBg border border-themeBorder p-1 text-xs" value="${w.fromPin}" onchange="window.HarnessApp.updateWireProp('${w.id}', 'fromPin', parseInt(this.value))">
                        </div>
                        <div>
                            <label class="text-[10px] text-themeMuted block mb-0.5">To Pin (P)</label>
                            <input type="number" min="1" class="w-full bg-themeBg border border-themeBorder p-1 text-xs" value="${w.toPin}" onchange="window.HarnessApp.updateWireProp('${w.id}', 'toPin', parseInt(this.value))">
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-2">
                        <div>
                            <label class="text-[10px] text-themeMuted block mb-0.5">Wire AWG</label>
                            <select class="w-full bg-themeBg border border-themeBorder p-1 text-xs font-bold" onchange="window.HarnessApp.updateWireProp('${w.id}', 'awg', this.value)">
                                ${Object.keys(this.awgSpecs).map(awg => `<option value="${awg}" ${w.awg === awg ? 'selected' : ''}>${awg} AWG (max ${this.awgSpecs[awg].amp}A)</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="text-[10px] text-themeMuted block mb-0.5">Insulation Color</label>
                            <select class="w-full bg-themeBg border border-themeBorder p-1 text-xs font-bold" onchange="window.HarnessApp.updateWireProp('${w.id}', 'color', this.value)">
                                ${this.colorPalette.map(c => `<option value="${c.hex}" ${w.color === c.hex ? 'selected' : ''}>${c.name}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-2">
                        <div>
                            <label class="text-[10px] text-themeMuted block mb-0.5">Length (m)</label>
                            <input type="number" step="0.1" min="0.1" class="w-full bg-themeBg border border-themeBorder p-1 text-xs" value="${w.len}" onchange="window.HarnessApp.updateWireProp('${w.id}', 'len', parseFloat(this.value))">
                        </div>
                        <div>
                            <label class="text-[10px] text-themeMuted block mb-0.5">Peak Current (A)</label>
                            <input type="number" step="0.5" min="0.01" class="w-full bg-themeBg border border-themeBorder p-1 text-xs font-bold text-amber-400" value="${w.i}" onchange="window.HarnessApp.updateWireProp('${w.id}', 'i', parseFloat(this.value))">
                        </div>
                    </div>
                    <div class="pt-2 border-t border-themeBorder/20 text-[10px] space-y-1 text-themeMuted">
                        <div class="flex justify-between"><span>Conductor Res (R):</span><strong class="text-themeText">${(r_wire * 1000).toFixed(1)} mΩ</strong></div>
                        <div class="flex justify-between"><span>Voltage Drop (IR):</span><strong class="${vdrop > 0.5 ? 'text-red-400' : 'text-green-400'}">${vdrop.toFixed(3)} V</strong></div>
                    </div>
                    <button class="w-full mt-2 py-1 bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold rounded hover:bg-red-500/30" onclick="window.HarnessApp.deleteSelected()">Delete Wire</button>
                </div>
            `;
        } else {
            if (info) info.innerText = 'Nothing selected';
            content.innerHTML = `<div class="text-themeMuted text-center mt-10">Click a connector pin or wire to view and edit its electrical properties.</div>`;
        }
    }

    updateNodeProp(id, prop, val) {
        const node = this.nodes.find(n => n.id === id);
        if (node) {
            node[prop] = val;
            this.draw();
            this.runDRC();
        }
    }

    updateWireProp(id, prop, val) {
        const wire = this.wires.find(w => w.id === id);
        if (wire) {
            wire[prop] = val;
            this.draw();
            this.updatePropertiesPanel();
            this.runDRC();
        }
    }

    // ---------- Design Rule Check (DRC) Engine ----------
    
    runDRC() {
        const recList = document.getElementById('harness-rec-list');
        if (!recList) return;
        const violations = [];

        // 1. Check Unconnected Pins
        this.nodes.forEach(n => {
            if (n.type !== 'connector') return;
            for (let i = 1; i <= n.pins; i++) {
                const isConnected = this.wires.some(w => (w.path[0] === n.id && w.fromPin === i) || (w.path[w.path.length-1] === n.id && w.toPin === i));
                if (!isConnected) {
                    violations.push({
                        type: 'warn',
                        msg: `Unconnected Pin: ${n.id} Pin ${i} (${n.name}) has no net assigned.`
                    });
                }
            }
        });

        // 2. Check AWG Ampacity & Voltage Drop
        this.wires.forEach(w => {
            const spec = this.awgSpecs[w.awg] || this.awgSpecs['18'];
            const r_wire = (spec.r_km / 1000) * w.len;
            const vdrop = (w.i || 1) * r_wire;

            if (w.i > spec.amp) {
                violations.push({
                    type: 'error',
                    msg: `Ampacity Overload on ${w.signal || w.id}: Current ${w.i}A exceeds ${w.awg} AWG safe rating of ${spec.amp}A!`
                });
            } else if (vdrop > 0.6) {
                violations.push({
                    type: 'warn',
                    msg: `High Voltage Drop on ${w.signal || w.id}: Expected IR drop of ${vdrop.toFixed(2)}V across ${w.len}m run.`
                });
            }
        });

        if (violations.length === 0) {
            recList.innerHTML = `
                <div class="border-l-2 border-green-400 pl-2 text-xs">
                    <div class="font-bold text-green-400"><i class="fa-solid fa-circle-check mr-1"></i>Harness Fully Compliant</div>
                    <div class="text-themeMuted">All connector pins mapped, ampacity ratings verified, and voltage drop $< 0.5\\text{V}$.</div>
                </div>
            `;
        } else {
            recList.innerHTML = violations.map(v => `
                <div class="border-l-2 ${v.type === 'error' ? 'border-red-400' : 'border-amber-400'} pl-2 text-xs">
                    <div class="font-bold ${v.type === 'error' ? 'text-red-400' : 'text-amber-400'}">
                        <i class="fa-solid ${v.type === 'error' ? 'fa-triangle-exclamation' : 'fa-circle-info'} mr-1"></i>${v.msg}
                    </div>
                </div>
            `).join('');
        }
    }

    autoSolveHarness() {
        // Auto-fix AWG sizing to satisfy ampacity and voltage drop
        this.wires.forEach(w => {
            for (let awg of ['10', '12', '14', '16', '18', '20', '22', '24']) {
                const spec = this.awgSpecs[awg];
                const r_wire = (spec.r_km / 1000) * w.len;
                const vdrop = (w.i || 1) * r_wire;
                if (spec.amp >= (w.i || 1) * 1.3 && vdrop <= 0.35) {
                    w.awg = awg;
                    break;
                }
            }
        });

        this.draw();
        this.updatePropertiesPanel();
        this.runDRC();
    }

    // ---------- BOM & Reports Generator ----------
    
    showTable() {
        const modal = document.getElementById('harness-table-modal');
        const tbody = document.querySelector('#harness-table tbody');
        if (!modal || !tbody) return;

        tbody.innerHTML = this.wires.map(w => {
            const spec = this.awgSpecs[w.awg] || this.awgSpecs['18'];
            const r_wire = (spec.r_km / 1000) * w.len;
            const vdrop = (w.i || 1) * r_wire;
            const nFrom = w.path[0];
            const nTo = w.path[w.path.length - 1];

            return `
                <tr class="border-b border-themeBorder/20 hover:bg-themeBorder/10">
                    <td class="p-3 font-bold flex items-center gap-2">
                        <span class="w-3 h-3 rounded-full inline-block" style="background:${w.color || '#3b82f6'}"></span>
                        ${w.signal || w.id}
                    </td>
                    <td class="p-3">${nFrom}:P${w.fromPin}</td>
                    <td class="p-3">${nTo}:P${w.toPin}</td>
                    <td class="p-3">${w.awg} AWG</td>
                    <td class="p-3">${w.len.toFixed(2)} m</td>
                    <td class="p-3">${w.i} A</td>
                    <td class="p-3">${(r_wire * 1000).toFixed(1)} mΩ</td>
                    <td class="p-3 font-bold ${vdrop > 0.5 ? 'text-red-400' : 'text-green-400'}">${vdrop.toFixed(3)} V</td>
                </tr>
            `;
        }).join('');

        // Generate Aggregated BOM Table
        const bomContainer = document.getElementById('harness-bom-summary');
        if (bomContainer) {
            const wireUsage = {};
            let totalWeight = 0;

            this.wires.forEach(w => {
                const key = `${w.awg} AWG (${this.colorPalette.find(c => c.hex === w.color)?.name || 'Custom'})`;
                wireUsage[key] = (wireUsage[key] || 0) + w.len;
                const spec = this.awgSpecs[w.awg] || this.awgSpecs['18'];
                totalWeight += spec.weight_g_m * w.len;
            });

            bomContainer.innerHTML = `
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-xs font-mono">
                    <div class="bg-themeContainer border border-themeBorder p-3 rounded">
                        <h4 class="font-bold text-themeAccent mb-2 border-b border-themeBorder/20 pb-1">Conductor Cut List</h4>
                        <ul class="space-y-1">
                            ${Object.keys(wireUsage).map(k => `<li class="flex justify-between"><span>${k}:</span><strong>${wireUsage[k].toFixed(2)} meters</strong></li>`).join('')}
                        </ul>
                    </div>
                    <div class="bg-themeContainer border border-themeBorder p-3 rounded">
                        <h4 class="font-bold text-themeAccent mb-2 border-b border-themeBorder/20 pb-1">Harness Physical Metrics</h4>
                        <div class="space-y-1">
                            <div class="flex justify-between"><span>Total Wire Runs:</span><strong>${this.wires.length} conductors</strong></div>
                            <div class="flex justify-between"><span>Connector Count:</span><strong>${this.nodes.filter(n => n.type==='connector').length} housings</strong></div>
                            <div class="flex justify-between"><span>Total Crimp Terminals:</span><strong>${this.wires.length * 2} pins</strong></div>
                            <div class="flex justify-between pt-1 border-t border-themeBorder/20"><span>Est. Copper Weight:</span><strong class="text-themeAccent">${totalWeight.toFixed(1)} grams</strong></div>
                        </div>
                    </div>
                </div>
            `;
        }

        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }

    downloadCSV() {
        let csv = "Net_ID,Signal_Name,From_Connector,From_Pin,To_Connector,To_Pin,AWG,Length_m,Current_A,Resistance_mOhm,Voltage_Drop_V\n";
        this.wires.forEach(w => {
            const spec = this.awgSpecs[w.awg] || this.awgSpecs['18'];
            const r_wire = (spec.r_km / 1000) * w.len;
            const vdrop = (w.i || 1) * r_wire;
            csv += `${w.id},${w.signal || w.id},${w.path[0]},${w.fromPin},${w.path[w.path.length-1]},${w.toPin},${w.awg},${w.len},${w.i},${(r_wire*1000).toFixed(2)},${vdrop.toFixed(3)}\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'harness_wire_run_list.csv';
        a.click();
    }

    exportJSON() {
        const data = { nodes: this.nodes, wires: this.wires };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'harness_design.json';
        a.click();
    }

    importJSON(jsonStr) {
        try {
            const data = JSON.parse(jsonStr);
            if (data.nodes && data.wires) {
                this.nodes = data.nodes;
                this.wires = data.wires;
                this.draw();
                this.updatePropertiesPanel();
                this.runDRC();
            }
        } catch (e) {
            alert('Invalid JSON file format.');
        }
    }

    toggleAddWireMode() {
        this.mode = this.mode === 'add_wire' ? 'select' : 'add_wire';
        this.wireStartNode = null;
        this.updateUIState();
        this.draw();
    }

    toggleAddBetaMode() {
        this.mode = this.mode === 'add_beta' ? 'select' : 'add_beta';
        this.updateUIState();
        this.draw();
    }

    addConnector() {
        this.mode = 'add_connector';
        this.updateUIState();
        this.draw();
    }

    toggleRoutingStyle() {
        this.routingStyle = this.routingStyle === 'bezier' ? 'orthogonal' : 'bezier';
        this.draw();
    }
}

// Global Instance
window.HarnessApp = new HarnessDesigner();
document.addEventListener('DOMContentLoaded', () => {
    if(document.getElementById('harness-canvas')) window.HarnessApp.init();
});
document.addEventListener('toolLoaded', () => {
    if(document.getElementById('harness-canvas')) window.HarnessApp.init();
});
