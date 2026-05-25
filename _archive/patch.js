// ==========================================
// REMEDIATION LOGIC (OVERRIDES)
// ==========================================

// --- Chart.js Initializations ---
let filterChartObj = null;
let serialChartObj = null;

// Initialize Chart.js for Filter and Serial
window.initRemediationCharts = function() {
    if(!window.Chart) return;
    
    // Filter Chart
    const fCtx = document.getElementById('filter-canvas');
    if(fCtx) {
        if(filterChartObj) filterChartObj.destroy();
        filterChartObj = new Chart(fCtx, {
            type: 'line',
            data: { labels: [], datasets: [{ label: 'Gain (dB)', data: [], borderColor: '#cda434', borderWidth: 2, tension: 0.1, pointRadius: 0 }] },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: { 
                    x: { type: 'logarithmic', title: { display: true, text: 'Frequency (Hz)' } },
                    y: { title: { display: true, text: 'Magnitude (dB)' } }
                },
                plugins: { legend: { display: false }, tooltip: { enabled: true, mode: 'index', intersect: false } }
            }
        });
    }

    // Serial Chart
    const sCtx = document.getElementById('serial-canvas-chart');
    if(sCtx) {
        if(serialChartObj) serialChartObj.destroy();
        serialChartObj = new Chart(sCtx, {
            type: 'line',
            data: { labels: [], datasets: [{ label: 'RX Data', data: [], borderColor: '#4ade80', borderWidth: 1, tension: 0, pointRadius: 0 }] },
            options: {
                responsive: true, maintainAspectRatio: false, animation: false,
                scales: { x: { display: false }, y: { display: true } },
                plugins: { legend: { display: false } }
            }
        });
    }
};

// --- Web Serial Overrides ---
window.serialDataArr = [];
window.clearSerialGraph = function() {
    window.serialDataArr = [];
    if(serialChartObj) {
        serialChartObj.data.labels = [];
        serialChartObj.data.datasets[0].data = [];
        serialChartObj.update();
    }
};

window.processSerialLine = function(line) {
    if(window.isSerialPaused) return;
    const rx = document.getElementById('serial-rx');
    if(rx) {
        rx.textContent += line + "\n";
        if(rx.textContent.length > 5000) rx.textContent = rx.textContent.substring(rx.textContent.length - 5000);
        rx.scrollTop = rx.scrollHeight;
    }
    const val = parseFloat(line);
    if(!isNaN(val)) {
        window.serialDataArr.push(val);
        if(window.serialDataArr.length > 100) window.serialDataArr.shift();
        
        if(serialChartObj) {
            serialChartObj.data.labels = Array.from({length: window.serialDataArr.length}, (_, i) => i);
            serialChartObj.data.datasets[0].data = window.serialDataArr;
            serialChartObj.update();
        }
    }
};

// --- Filter Designer Override ---
window.setupFilterMode = function() {
    const type = document.getElementById('filter-type').value;
    const container = document.getElementById('filter-inputs');
    const solveGroup = document.getElementById('filter-solve-group');
    
    let html = '';
    let solveHtml = '<span>SOLVE:</span>';
    
    if(type === 'rc') {
        solveHtml += `<label class="cursor-pointer hover:text-themeAccent"><input type="radio" name="solve_filt" value="r" onchange="runSmartFilter()"> R</label>
                      <label class="cursor-pointer hover:text-themeAccent"><input type="radio" name="solve_filt" value="c" onchange="runSmartFilter()"> C</label>
                      <label class="cursor-pointer hover:text-themeAccent"><input type="radio" name="solve_filt" value="fc" checked onchange="runSmartFilter()"> fc</label>`;
        html = `<div class="flex justify-between"><label>R (Ω)</label><input type="number" id="f-r" value="1000" class="w-24 bg-transparent border-b border-themeBorder text-right" oninput="runSmartFilter()"></div>
                <div class="flex justify-between"><label>C (nF)</label><input type="number" id="f-c" value="100" class="w-24 bg-transparent border-b border-themeBorder text-right" oninput="runSmartFilter()"></div>`;
    } else if(type === 'rl') {
        solveHtml += `<label class="cursor-pointer hover:text-themeAccent"><input type="radio" name="solve_filt" value="r" onchange="runSmartFilter()"> R</label>
                      <label class="cursor-pointer hover:text-themeAccent"><input type="radio" name="solve_filt" value="l" onchange="runSmartFilter()"> L</label>
                      <label class="cursor-pointer hover:text-themeAccent"><input type="radio" name="solve_filt" value="fc" checked onchange="runSmartFilter()"> fc</label>`;
        html = `<div class="flex justify-between"><label>R (Ω)</label><input type="number" id="f-r" value="1000" class="w-24 bg-transparent border-b border-themeBorder text-right" oninput="runSmartFilter()"></div>
                <div class="flex justify-between"><label>L (uH)</label><input type="number" id="f-l" value="100" class="w-24 bg-transparent border-b border-themeBorder text-right" oninput="runSmartFilter()"></div>`;
    } else if(type === 'lc') {
        solveHtml += `<label class="cursor-pointer hover:text-themeAccent"><input type="radio" name="solve_filt" value="l" onchange="runSmartFilter()"> L</label>
                      <label class="cursor-pointer hover:text-themeAccent"><input type="radio" name="solve_filt" value="c" onchange="runSmartFilter()"> C</label>
                      <label class="cursor-pointer hover:text-themeAccent"><input type="radio" name="solve_filt" value="fc" checked onchange="runSmartFilter()"> fc</label>`;
        html = `<div class="flex justify-between"><label>L (uH)</label><input type="number" id="f-l" value="10" class="w-24 bg-transparent border-b border-themeBorder text-right" oninput="runSmartFilter()"></div>
                <div class="flex justify-between"><label>C (uF)</label><input type="number" id="f-c" value="10" class="w-24 bg-transparent border-b border-themeBorder text-right" oninput="runSmartFilter()"></div>`;
    } else if(type === 'lcl') {
        solveHtml += `<span class="text-themeAccent">Simulation Only (3rd Order)</span>`;
        html = `<div class="flex justify-between"><label>L1 (uH)</label><input type="number" id="f-l1" value="10" class="w-24 bg-transparent border-b border-themeBorder text-right" oninput="runSmartFilter()"></div>
                <div class="flex justify-between"><label>C (uF)</label><input type="number" id="f-c" value="4.7" class="w-24 bg-transparent border-b border-themeBorder text-right" oninput="runSmartFilter()"></div>
                <div class="flex justify-between"><label>L2 (uH)</label><input type="number" id="f-l2" value="10" class="w-24 bg-transparent border-b border-themeBorder text-right" oninput="runSmartFilter()"></div>`;
    } else if(type === 'clc') {
        solveHtml += `<span class="text-themeAccent">Simulation Only (3rd Order)</span>`;
        html = `<div class="flex justify-between"><label>C1 (uF)</label><input type="number" id="f-c1" value="4.7" class="w-24 bg-transparent border-b border-themeBorder text-right" oninput="runSmartFilter()"></div>
                <div class="flex justify-between"><label>L (uH)</label><input type="number" id="f-l" value="10" class="w-24 bg-transparent border-b border-themeBorder text-right" oninput="runSmartFilter()"></div>
                <div class="flex justify-between"><label>C2 (uF)</label><input type="number" id="f-c2" value="4.7" class="w-24 bg-transparent border-b border-themeBorder text-right" oninput="runSmartFilter()"></div>`;
    }
    
    if(container) container.innerHTML = html;
    if(solveGroup) solveGroup.innerHTML = solveHtml;
    
    runSmartFilter();
};

window.runSmartFilter = function() {
    const type = document.getElementById('filter-type');
    if(!type) return;
    const t = type.value;
    
    let fc = 0;
    
    if(t === 'rc') {
        let rEl = document.getElementById('f-r');
        let cEl = document.getElementById('f-c');
        let fcEl = document.getElementById('calc-filter-fc');
        const target = document.querySelector('input[name="solve_filt"]:checked')?.value || 'fc';
        
        let r = parseFloat(rEl.value);
        let c = parseFloat(cEl.value) * 1e-9;
        let f = parseFloat(fcEl.value);
        
        if(target === 'fc') { f = 1 / (2 * Math.PI * r * c); fcEl.value = f.toFixed(2); }
        else if(target === 'r') { r = 1 / (2 * Math.PI * f * c); rEl.value = r.toFixed(2); }
        else if(target === 'c') { c = 1 / (2 * Math.PI * f * r); cEl.value = (c * 1e9).toFixed(2); }
        fc = f;
    } 
    else if(t === 'rl') {
        let rEl = document.getElementById('f-r');
        let lEl = document.getElementById('f-l');
        let fcEl = document.getElementById('calc-filter-fc');
        const target = document.querySelector('input[name="solve_filt"]:checked')?.value || 'fc';
        
        let r = parseFloat(rEl.value);
        let l = parseFloat(lEl.value) * 1e-6;
        let f = parseFloat(fcEl.value);
        
        if(target === 'fc') { f = r / (2 * Math.PI * l); fcEl.value = f.toFixed(2); }
        else if(target === 'r') { r = 2 * Math.PI * f * l; rEl.value = r.toFixed(2); }
        else if(target === 'l') { l = r / (2 * Math.PI * f); lEl.value = (l * 1e6).toFixed(2); }
        fc = f;
    }
    else if(t === 'lc') {
        let lEl = document.getElementById('f-l');
        let cEl = document.getElementById('f-c');
        let fcEl = document.getElementById('calc-filter-fc');
        const target = document.querySelector('input[name="solve_filt"]:checked')?.value || 'fc';
        
        let l = parseFloat(lEl.value) * 1e-6;
        let c = parseFloat(cEl.value) * 1e-6;
        let f = parseFloat(fcEl.value);
        
        if(target === 'fc') { f = 1 / (2 * Math.PI * Math.sqrt(l * c)); fcEl.value = f.toFixed(2); }
        else if(target === 'l') { l = 1 / (Math.pow(2 * Math.PI * f, 2) * c); lEl.value = (l * 1e6).toFixed(2); }
        else if(target === 'c') { c = 1 / (Math.pow(2 * Math.PI * f, 2) * l); cEl.value = (c * 1e6).toFixed(2); }
        fc = f;
    }
    
    if(!filterChartObj) return;
    
    let labels = [];
    let data = [];
    
    for(let i=0; i<100; i++) {
        let freq = Math.pow(10, 1 + (i * 5/100));
        let w = 2 * Math.PI * freq;
        let mag = 1;
        
        if(t === 'rc') {
            let r = parseFloat(document.getElementById('f-r').value);
            let c = parseFloat(document.getElementById('f-c').value) * 1e-9;
            mag = 1 / Math.sqrt(1 + Math.pow(w * r * c, 2));
        } else if(t === 'rl') {
            let r = parseFloat(document.getElementById('f-r').value);
            let l = parseFloat(document.getElementById('f-l').value) * 1e-6;
            mag = r / Math.sqrt(Math.pow(r, 2) + Math.pow(w * l, 2));
        } else if(t === 'lc') {
            let l = parseFloat(document.getElementById('f-l').value) * 1e-6;
            let c = parseFloat(document.getElementById('f-c').value) * 1e-6;
            mag = 1 / Math.abs(1 - Math.pow(w, 2) * l * c);
            if(mag > 1000) mag = 1000;
        } else if(t === 'lcl') {
            let l1 = parseFloat(document.getElementById('f-l1').value) * 1e-6;
            let l2 = parseFloat(document.getElementById('f-l2').value) * 1e-6;
            let c = parseFloat(document.getElementById('f-c').value) * 1e-6;
            let denom = Math.abs(1 - Math.pow(w, 2) * c * (l1 + l2));
            mag = denom > 0 ? 1 / denom : 1000;
            if(mag > 1000) mag = 1000;
        } else if(t === 'clc') {
            let c1 = parseFloat(document.getElementById('f-c1').value) * 1e-6;
            let c2 = parseFloat(document.getElementById('f-c2').value) * 1e-6;
            let l = parseFloat(document.getElementById('f-l').value) * 1e-6;
            let denom = Math.abs(1 - Math.pow(w, 2) * l * (c1 + c2));
            mag = denom > 0 ? 1 / denom : 1000;
            if(mag > 1000) mag = 1000;
        }
        
        labels.push(freq.toFixed(0));
        data.push(20 * Math.log10(mag));
    }
    
    filterChartObj.data.labels = labels;
    filterChartObj.data.datasets[0].data = data;
    filterChartObj.update();
};

let isTiltLinked = false;
window.toggleTiltLink = function() {
    isTiltLinked = !isTiltLinked;
    const btn = document.getElementById('pv-link-tilt');
    if(btn) {
        btn.innerHTML = isTiltLinked ? '<i class="fa-solid fa-link text-green-500"></i>' : '<i class="fa-solid fa-link-slash text-red-500"></i>';
    }
    if(window.calculateSolarMath) window.calculateSolarMath();
};

window.setSolarMonth = function(m) {
    const btns = document.getElementById('pv-month-buttons')?.children;
    if(btns) {
        for(let i=0; i<12; i++) {
            btns[i].className = (i === m) ? "border border-themeBorder bg-themeAccent text-themeBg" : "border border-themeBorder hover:bg-themeAccent hover:text-themeBg";
        }
    }
    document.getElementById('pv-month-val').textContent = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m];
    document.getElementById('pv-month-val').dataset.month = m;
    if(window.calculateSolarMath) window.calculateSolarMath();
};

window.drawSolarMap = function() {
    const canvas = document.getElementById('world-map');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#222';
    ctx.fillRect(0,0,w,h);
    ctx.fillStyle = '#cda434';
    ctx.globalAlpha = 0.5;
    if(typeof _WMAP !== 'undefined' && _WMAP.length) {
        for(let poly of _WMAP) {
            ctx.beginPath();
            for(let i=0; i<poly.length; i++) {
                let x = (poly[i][0] + 180) * (w / 360);
                let y = (90 - poly[i][1]) * (h / 180);
                if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
            }
            ctx.fill();
        }
    }
    let lat = parseFloat(document.getElementById('pv-lat')?.value) || 0;
    let lng = parseFloat(document.getElementById('pv-lng')?.value) || 0;
    let px = (lng + 180) * (w / 360);
    let py = (90 - lat) * (h / 180);
    ctx.fillStyle = '#ff0000';
    ctx.globalAlpha = 1.0;
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, Math.PI*2);
    ctx.fill();
};

window.setupIPCMode = function() {
    const target = document.querySelector('input[name="solve_ipc"]:checked')?.value || 'width';
    const inputs = {
        current: document.getElementById('ipc-i'),
        width: document.getElementById('ipc-req-width')
    };
    let wEl = document.getElementById('ipc-req-width');
    if(wEl && wEl.tagName !== 'INPUT') {
        let parent = wEl.parentElement;
        let val = parseFloat(wEl.textContent) || 11.8;
        let newInput = document.createElement('input');
        newInput.type = 'number';
        newInput.id = 'ipc-req-width';
        newInput.value = val;
        newInput.className = "w-24 bg-transparent border-b border-themeBorder text-right text-themeAccent font-bold";
        newInput.oninput = runSmartIPC;
        parent.replaceChild(newInput, wEl);
        inputs.width = newInput;
    }
    
    for (let key in inputs) {
        if(!inputs[key]) continue;
        inputs[key].readOnly = false;
        inputs[key].classList.remove('border-2', 'border-themeAccent', 'bg-opacity-10', 'bg-themeAccent', 'font-bold', 'text-themeAccent');
        if(key === target) {
            inputs[key].readOnly = true;
            inputs[key].classList.add('border-2', 'border-themeAccent', 'bg-opacity-10', 'bg-themeAccent', 'font-bold', 'text-themeAccent');
        }
    }
    runSmartIPC();
};

window.runSmartIPC = function() {
    const iEl = document.getElementById('ipc-i');
    const dtEl = document.getElementById('ipc-dt');
    const ozEl = document.getElementById('ipc-oz');
    const wEl = document.getElementById('ipc-req-width');
    
    if(!iEl || !dtEl || !ozEl || !wEl) return;
    
    const target = document.querySelector('input[name="solve_ipc"]:checked')?.value || 'width';
    
    let current = parseFloat(iEl.value);
    let dt = parseFloat(dtEl.value);
    let oz = parseFloat(ozEl.value);
    let width = parseFloat(wEl.value);
    
    const k = 0.048;
    
    if(target === 'width') {
        let area = Math.pow(current / (k * Math.pow(dt, 0.44)), 1/0.725);
        width = area / (oz * 1.378);
        wEl.value = width.toFixed(1);
    } else if (target === 'current') {
        let area = width * oz * 1.378;
        current = k * Math.pow(dt, 0.44) * Math.pow(area, 0.725);
        iEl.value = current.toFixed(2);
    }
    
    let w_mm = (width * 0.0254).toFixed(3);
    const mmOut = document.getElementById('ipc-req-mm');
    if(mmOut) mmOut.textContent = w_mm + ' mm';
};

window.setupMotorMode = function() {
    const target = document.querySelector('input[name="solve_motor"]:checked')?.value || 'speed';
    const inputs = {
        poles: document.getElementById('mot-poles'),
        freq: document.getElementById('mot-freq'),
        speed: document.getElementById('mot-sync')
    };
    
    let sEl = document.getElementById('mot-sync');
    if(sEl && sEl.tagName !== 'INPUT') {
        let parent = sEl.parentElement;
        let val = parseFloat(sEl.textContent) || 1500;
        let newInput = document.createElement('input');
        newInput.type = 'number';
        newInput.id = 'mot-sync';
        newInput.value = val;
        newInput.className = "w-24 bg-transparent border-b border-themeBorder text-right text-themeAccent font-bold";
        newInput.oninput = runSmartMotor;
        parent.replaceChild(newInput, sEl);
        inputs.speed = newInput;
    }
    
    for (let key in inputs) {
        if(!inputs[key]) continue;
        inputs[key].readOnly = false;
        inputs[key].classList.remove('border-2', 'border-themeAccent');
        if(key === target) {
            inputs[key].readOnly = true;
            inputs[key].classList.add('border-2', 'border-themeAccent');
        }
    }
    runSmartMotor();
};

window.runSmartMotor = function() {
    const pEl = document.getElementById('mot-poles');
    const fEl = document.getElementById('mot-freq');
    const sEl = document.getElementById('mot-sync');
    const tqEl = document.getElementById('mot-torque');
    
    if(!pEl || !fEl || !sEl) return;
    
    const target = document.querySelector('input[name="solve_motor"]:checked')?.value || 'speed';
    
    let poles = parseFloat(pEl.value);
    let freq = parseFloat(fEl.value);
    let speed = parseFloat(sEl.value);
    let torque = parseFloat(tqEl?.value || 0);
    
    if(target === 'speed') {
        speed = (120 * freq) / poles;
        sEl.value = speed.toFixed(0);
    } else if (target === 'poles') {
        poles = (120 * freq) / speed;
        pEl.value = poles.toFixed(0);
    } else if (target === 'freq') {
        freq = (speed * poles) / 120;
        fEl.value = freq.toFixed(1);
    }
    
    if(tqEl) {
        let w = speed * (2 * Math.PI / 60);
        let p_watts = torque * w;
        let p_kw = p_watts / 1000;
        let p_hp = p_watts / 745.7;
        let mechOut = document.getElementById('mot-mech');
        if(mechOut) mechOut.textContent = p_kw.toFixed(2) + ' kW / ' + p_hp.toFixed(2) + ' HP';
    }
};

window.setupDacMode = function() {
    const target = document.querySelector('input[name="solve_dac"]:checked')?.value || 'vout';
    const inputs = {
        rtop: document.getElementById('dac-r-top'),
        rbot: document.getElementById('dac-r-bot'),
        rinj: document.getElementById('dac-r-inj'),
        vdac: document.getElementById('dac-v-dac'),
        vout: document.getElementById('dac-v-out')
    };
    
    let vOutEl = document.getElementById('dac-v-out');
    if(vOutEl && vOutEl.tagName !== 'INPUT') {
        let parent = vOutEl.parentElement;
        let val = parseFloat(vOutEl.textContent) || 3.14;
        let newInput = document.createElement('input');
        newInput.type = 'number';
        newInput.id = 'dac-v-out';
        newInput.value = val;
        newInput.className = "w-24 bg-transparent border-b border-themeBorder text-right text-themeAccent font-bold";
        newInput.oninput = runSmartDac;
        parent.replaceChild(newInput, vOutEl);
        inputs.vout = newInput;
    }
    
    for (let key in inputs) {
        if(!inputs[key]) continue;
        inputs[key].readOnly = false;
        inputs[key].classList.remove('border-2', 'border-themeAccent');
        if(key === target) {
            inputs[key].readOnly = true;
            inputs[key].classList.add('border-2', 'border-themeAccent');
        }
    }
    runSmartDac();
};

window.runSmartDac = function() {
    const vrefEl = document.getElementById('v-ref');
    const rtopEl = document.getElementById('dac-r-top');
    const rbotEl = document.getElementById('dac-r-bot');
    const rinjEl = document.getElementById('dac-r-inj');
    const vdacEl = document.getElementById('dac-v-dac');
    const voutEl = document.getElementById('dac-v-out');
    
    if(!vrefEl || !rtopEl || !rbotEl || !rinjEl || !vdacEl || !voutEl) return;
    
    const target = document.querySelector('input[name="solve_dac"]:checked')?.value || 'vout';
    
    let vref = parseFloat(vrefEl.value);
    let rtop = parseFloat(rtopEl.value) * 1000;
    let rbot = parseFloat(rbotEl.value) * 1000;
    let rinj = parseFloat(rinjEl.value) * 1000;
    let vdac = parseFloat(vdacEl.value);
    let vout = parseFloat(voutEl.value);
    
    if(target === 'vout') {
        let rhs = (vref/rbot) + ((vref - vdac)/rinj);
        vout = (rhs * rtop) + vref;
        voutEl.value = vout.toFixed(2);
    } else if (target === 'rtop') {
        let rhs = (vref/rbot) + ((vref - vdac)/rinj);
        rtop = (vout - vref) / rhs;
        rtopEl.value = (rtop/1000).toFixed(2);
    } else if (target === 'rbot') {
        let lhs = (vout - vref)/rtop;
        let rhs_part = (vref - vdac)/rinj;
        rbot = vref / (lhs - rhs_part);
        rbotEl.value = (rbot/1000).toFixed(2);
    } else if (target === 'rinj') {
        let lhs = (vout - vref)/rtop;
        let rhs_part = vref/rbot;
        rinj = (vref - vdac) / (lhs - rhs_part);
        rinjEl.value = (rinj/1000).toFixed(2);
    } else if (target === 'vdac') {
        let lhs = (vout - vref)/rtop;
        let rhs_part = vref/rbot;
        vdac = vref - (rinj * (lhs - rhs_part));
        vdacEl.value = vdac.toFixed(2);
    }
    
    let nomOut = document.getElementById('dac-nom-out');
    if(nomOut) nomOut.textContent = (vref * (1 + (rtop/rbot))).toFixed(2) + ' V';
};

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        initRemediationCharts();
        setupFilterMode();
        if(typeof drawSolarMap === 'function') drawSolarMap();
        
        const c = document.getElementById('world-map');
        if(c) {
            c.addEventListener('click', (e) => {
                const rect = c.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const lng = (x / rect.width) * 360 - 180;
                const lat = 90 - (y / rect.height) * 180;
                document.getElementById('pv-lat').value = lat.toFixed(2);
                document.getElementById('pv-lng').value = lng.toFixed(2);
                if(window.calculateSolarMath) window.calculateSolarMath();
                if(typeof drawSolarMap === 'function') drawSolarMap();
            });
        }
        
        const oldMath = window.calculateSolarMath;
        window.calculateSolarMath = function() {
            if(oldMath) {
                const mVal = document.getElementById('pv-month-val');
                if(mVal && mVal.dataset.month !== undefined) {
                    let dummy = document.getElementById('pv-month');
                    if(!dummy) { dummy = document.createElement('input'); dummy.id='pv-month'; document.body.appendChild(dummy); }
                    dummy.value = mVal.dataset.month;
                }
                oldMath();
                
                let lat = parseFloat(document.getElementById('pv-lat').value) || 0;
                let m = parseInt(document.getElementById('pv-month-val')?.dataset?.month) || 5;
                let declination = 23.45 * Math.sin((360 / 365) * (284 + (m * 30)) * Math.PI / 180);
                let optTilt = Math.abs(lat - declination);
                document.getElementById('pv-tilt').textContent = optTilt.toFixed(1) + '°';
                
                let customInput = document.getElementById('pv-custom-tilt');
                if(isTiltLinked && customInput) {
                    customInput.value = optTilt.toFixed(1);
                }
                
                if(customInput) {
                    let actualTilt = parseFloat(customInput.value) || 0;
                    let tiltLoss = Math.cos((actualTilt - optTilt) * Math.PI / 180);
                    if(tiltLoss < 0) tiltLoss = 0;
                    
                    let y = document.getElementById('pv-yield');
                    if(y) y.textContent = (parseFloat(y.textContent) * tiltLoss).toFixed(1) + ' W';
                }
            }
        };
        
        if(window.setupIPCMode) setupIPCMode();
        if(window.setupMotorMode) setupMotorMode();
        if(window.setupDacMode) setupDacMode();
    }, 1500);
});
