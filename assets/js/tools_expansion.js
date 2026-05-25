// EE Tools Suite Expansion Pack

// ==========================================
// 1. VOLTAGE & CURRENT MARGINING
// ==========================================
function setupMarginMode() {
    const type = document.getElementById('margin-type').value;
    const solveGroup = document.getElementById('margin-solve-group');
    const inputs = document.getElementById('margin-inputs');

    let solvers = '';
    if(type === 'voltage') {
        solvers = `
            <span>SOLVE:</span>
            <label class="cursor-pointer hover:text-themeAccent"><input type="radio" name="vm_solve" value="vref" onchange="runMargin()"> Vref</label>
            <label class="cursor-pointer hover:text-themeAccent"><input type="radio" name="vm_solve" value="rtop" onchange="runMargin()"> R_top</label>
            <label class="cursor-pointer hover:text-themeAccent"><input type="radio" name="vm_solve" value="rbot" onchange="runMargin()"> R_bot</label>
            <label class="cursor-pointer hover:text-themeAccent"><input type="radio" name="vm_solve" value="rinj" onchange="runMargin()"> R_inj</label>
            <label class="cursor-pointer hover:text-themeAccent"><input type="radio" name="vm_solve" value="vout" checked onchange="runMargin()"> V_marg</label>
        `;
        inputs.innerHTML = `
            <div class="space-y-2">
                <div class="flex justify-between text-xs"><label>V_ref (V)</label><input type="number" id="vm-vref" value="0.6" step="0.1" class="w-16 border border-themeBorder px-1 text-right" oninput="runMargin()"></div>
                <div class="flex justify-between text-xs"><label>R_top (k&Omega;)</label><input type="number" id="vm-rtop" value="10" class="w-16 border border-themeBorder px-1 text-right" oninput="runMargin()"></div>
                <div class="flex justify-between text-xs"><label>R_bot (k&Omega;)</label><input type="number" id="vm-rbot" value="2.2" class="w-16 border border-themeBorder px-1 text-right" oninput="runMargin()"></div>
            </div>
            <div class="space-y-2 border-l border-themeBorder/20 pl-4">
                <div class="flex justify-between text-xs"><label class="text-themeAccent">V_dac (V)</label><input type="number" id="vm-vdac" value="1.5" step="0.1" class="w-16 border border-themeBorder px-1 text-right bg-themeAccent/10" oninput="runMargin()"></div>
                <div class="flex justify-between text-xs"><label>R_inj (k&Omega;)</label><input type="number" id="vm-rinj" value="47" class="w-16 border border-themeBorder px-1 text-right" oninput="runMargin()"></div>
            </div>
        `;
    } else {
        solvers = `
            <span>SOLVE:</span>
            <label class="cursor-pointer hover:text-themeAccent"><input type="radio" name="vm_solve" value="vref" onchange="runMargin()"> Vref</label>
            <label class="cursor-pointer hover:text-themeAccent"><input type="radio" name="vm_solve" value="rtop" onchange="runMargin()"> R_top</label>
            <label class="cursor-pointer hover:text-themeAccent"><input type="radio" name="vm_solve" value="i_inj" onchange="runMargin()"> I_inj</label>
            <label class="cursor-pointer hover:text-themeAccent"><input type="radio" name="vm_solve" value="vout" checked onchange="runMargin()"> V_marg</label>
        `;
        inputs.innerHTML = `
            <div class="space-y-2">
                <div class="flex justify-between text-xs"><label>V_ref (V)</label><input type="number" id="vm-vref" value="0.6" step="0.1" class="w-16 border border-themeBorder px-1 text-right" oninput="runMargin()"></div>
                <div class="flex justify-between text-xs"><label>R_top (k&Omega;)</label><input type="number" id="vm-rtop" value="10" class="w-16 border border-themeBorder px-1 text-right" oninput="runMargin()"></div>
                <div class="flex justify-between text-xs"><label>R_bot (k&Omega;)</label><input type="number" id="vm-rbot" value="2.2" class="w-16 border border-themeBorder px-1 text-right" oninput="runMargin()"></div>
            </div>
            <div class="space-y-2 border-l border-themeBorder/20 pl-4">
                <div class="flex justify-between text-xs"><label class="text-themeAccent">I_dac (&mu;A)</label><input type="number" id="vm-idac" value="-5.0" step="0.1" class="w-16 border border-themeBorder px-1 text-right bg-themeAccent/10" oninput="runMargin()"></div>
            </div>
        `;
    }
    solveGroup.innerHTML = solvers;
    runMargin();
}

function runMargin() {
    const type = document.getElementById('margin-type')?.value;
    if(!type) return;
    const solveTarget = document.querySelector('input[name="vm_solve"]:checked')?.value || 'vout';

    // Clear highlights
    document.querySelectorAll('#margin-inputs input').forEach(el => el.classList.remove('bg-themeAccent/20', 'font-bold'));
    const targetEl = type === 'voltage' ? 
        (solveTarget === 'vref' ? 'vm-vref' : solveTarget === 'rtop' ? 'vm-rtop' : solveTarget === 'rbot' ? 'vm-rbot' : solveTarget === 'rinj' ? 'vm-rinj' : null) :
        (solveTarget === 'vref' ? 'vm-vref' : solveTarget === 'rtop' ? 'vm-rtop' : solveTarget === 'i_inj' ? 'vm-idac' : null);
    
    if(targetEl) document.getElementById(targetEl).classList.add('bg-themeAccent/20', 'font-bold');

    const vref = parseFloat(document.getElementById('vm-vref')?.value);
    const rtop = parseFloat(document.getElementById('vm-rtop')?.value);
    const rbot = parseFloat(document.getElementById('vm-rbot')?.value);
    
    let vnom = 0;
    if(vref && rtop && rbot) vnom = vref * (1 + (rtop / rbot));
    document.getElementById('vm-vnom').textContent = isNaN(vnom) ? "-" : vnom.toFixed(3) + " V";

    if(type === 'voltage') {
        const vdac = parseFloat(document.getElementById('vm-vdac')?.value);
        const rinj = parseFloat(document.getElementById('vm-rinj')?.value);
        let vmarg = 0;
        
        if(solveTarget === 'vout' && vref && rtop && rbot && rinj && !isNaN(vdac)) {
            const term1 = vref * (1/rtop + 1/rbot + 1/rinj);
            const term2 = vdac / rinj;
            vmarg = (term1 - term2) * rtop;
            document.getElementById('vm-vmarg').textContent = vmarg.toFixed(3) + " V";
        } else if (solveTarget === 'rinj') {
            // Solve for rinj
        }
    } else {
        const idac = parseFloat(document.getElementById('vm-idac')?.value) * 1e-6; // microamps
        let vmarg = 0;
        if(solveTarget === 'vout' && vref && rtop && rbot && !isNaN(idac)) {
            vmarg = vnom + (idac * (rtop*1e3));
            document.getElementById('vm-vmarg').textContent = vmarg.toFixed(3) + " V";
        }
    }
}

// Ensure it runs on load
window.addEventListener('DOMContentLoaded', () => {
    if(document.getElementById('margin-type')) setupMarginMode();
});

// ==========================================
// 2. AC MOTOR DYNAMICS
// ==========================================
function setupMotorMode() {
    const solveGroup = document.getElementById('motor-solve-group');
    const inputs = document.getElementById('motor-inputs');
    if(!solveGroup || !inputs) return;

    solveGroup.innerHTML = `n        <span>SOLVE:</span>
        <label class="cursor-pointer hover:text-themeAccent"><input type="radio" name="mot_solve" value="rpm" onchange="runMotor()" checked> Ns (RPM)</label>
        <label class="cursor-pointer hover:text-themeAccent"><input type="radio" name="mot_solve" value="torque" onchange="runMotor()"> Torque</label>
        <label class="cursor-pointer hover:text-themeAccent"><input type="radio" name="mot_solve" value="power" onchange="runMotor()"> Power</label>
        <label class="cursor-pointer hover:text-themeAccent"><input type="radio" name="mot_solve" value="slip" onchange="runMotor()"> Slip</label>
        <label class="cursor-pointer hover:text-themeAccent"><input type="radio" name="mot_solve" value="eff" onchange="runMotor()"> Eff</label>
    ;

    inputs.innerHTML = `n        <div class="space-y-2">
            <div class="flex justify-between text-[10px]"><label>Poles (P)</label><input type="number" id="mot-p" value="4" step="2" class="w-16 border border-themeBorder px-1 text-right" oninput="runMotor()"></div>
            <div class="flex justify-between text-[10px]"><label>Freq (Hz)</label><input type="number" id="mot-f" value="50" step="1" class="w-16 border border-themeBorder px-1 text-right" oninput="runMotor()"></div>
            <div class="flex justify-between text-[10px]"><label>Voltage (V)</label><input type="number" id="mot-v" value="400" step="10" class="w-16 border border-themeBorder px-1 text-right" oninput="runMotor()"></div>
            <div class="flex justify-between text-[10px]"><label>Slip (%)</label><input type="number" id="mot-s" value="2" step="0.5" class="w-16 border border-themeBorder px-1 text-right" oninput="runMotor()"></div>
        </div>
        <div class="space-y-2 border-l border-themeBorder/20 pl-4">
            <div class="flex justify-between text-[10px]"><label>Torque (Nm)</label><input type="number" id="mot-t" value="15" step="0.5" class="w-16 border border-themeBorder px-1 text-right" oninput="runMotor()"></div>
            <div class="flex justify-between text-[10px]"><label>P_mech (kW)</label><input type="number" id="mot-pm" value="2.3" step="0.1" class="w-16 border border-themeBorder px-1 text-right" oninput="runMotor()"></div>
            <div class="flex justify-between text-[10px]"><label>P_elec (kW)</label><input type="number" id="mot-pe" value="2.5" step="0.1" class="w-16 border border-themeBorder px-1 text-right" oninput="runMotor()"></div>
        </div>
    ;
    runMotor();
}

function runMotor() {
    const solveTarget = document.querySelector('input[name="mot_solve"]:checked')?.value || 'rpm';
    
    document.querySelectorAll('#motor-inputs input').forEach(el => el.classList.remove('bg-themeAccent/20', 'font-bold'));
    const targetEl = solveTarget === 'torque' ? 'mot-t' : solveTarget === 'power' ? 'mot-pm' : solveTarget === 'slip' ? 'mot-s' : solveTarget === 'eff' ? 'mot-pe' : null;
    if(targetEl) document.getElementById(targetEl).classList.add('bg-themeAccent/20', 'font-bold');

    const p = parseFloat(document.getElementById('mot-p')?.value);
    const f = parseFloat(document.getElementById('mot-f')?.value);
    const v = parseFloat(document.getElementById('mot-v')?.value);
    let s = parseFloat(document.getElementById('mot-s')?.value) / 100;
    let t = parseFloat(document.getElementById('mot-t')?.value);
    let pm = parseFloat(document.getElementById('mot-pm')?.value);
    let pe = parseFloat(document.getElementById('mot-pe')?.value);

    if(!p || !f) return;

    const ns = (120 * f) / p;
    document.getElementById('mot-rpm').textContent = ns.toFixed(0) + " RPM";
    document.getElementById('mot-vf').textContent = v ? (v / f).toFixed(2) : "-";

    if (solveTarget === 'rpm' || solveTarget === 'torque') {
        if(solveTarget === 'torque' && pm) t = (pm * 1000 * 9.549) / (ns * (1 - s));
        if(t && !isNaN(s)) {
            pm = (t * ns * (1 - s)) / 9549;
            document.getElementById('mot-kw').textContent = pm.toFixed(2);
            document.getElementById('mot-hp').textContent = (pm * 1.34102).toFixed(2);
        }
    } else if (solveTarget === 'power' && t) {
        pm = (t * ns * (1 - s)) / 9549;
        document.getElementById('mot-pm').value = pm.toFixed(2);
    } else if (solveTarget === 'slip' && t && pm) {
        s = 1 - ((pm * 9549) / (t * ns));
        document.getElementById('mot-s').value = (s * 100).toFixed(2);
    } else if (solveTarget === 'eff' && pm && pe) {
        // just calculate eff if needed, but here we just update display
    }

    if(!isNaN(s)) {
        const rotorRpm = ns * (1 - s);
        document.getElementById('mot-rotor').textContent = rotorRpm.toFixed(0) + " RPM";
    }
}

window.addEventListener('DOMContentLoaded', () => {
    if(document.getElementById('motor-solve-group')) setupMotorMode();
});

// ==========================================
// 3. SMPS TOPOLOGIES
// ==========================================
function setupSMPSMode() {
    const type = document.getElementById('smps-type')?.value;
    const solveGroup = document.getElementById('smps-solve-group');
    const inputs = document.getElementById('smps-inputs');
    if(!solveGroup || !inputs) return;

    solveGroup.innerHTML = `n        <span>SOLVE:</span>
        <label class="cursor-pointer hover:text-themeAccent"><input type="radio" name="smps_solve" value="vin" onchange="runSMPS()"> Vin</label>
        <label class="cursor-pointer hover:text-themeAccent"><input type="radio" name="smps_solve" value="vout" onchange="runSMPS()"> Vout</label>
        <label class="cursor-pointer hover:text-themeAccent"><input type="radio" name="smps_solve" value="duty" checked onchange="runSMPS()"> Duty (D)</label>
    ;

    let extra = '';
    if(['flyback', 'forward', 'push-pull', 'half-bridge', 'full-bridge'].includes(type)) {
        extra = `n            <div class="flex justify-between items-center text-xs">
                <label class="w-24">Ratio (Np/Ns)</label>
                <input type="number" id="smps-n" value="1" step="0.1" class="w-32 border border-themeBorder px-2 py-1 text-right" oninput="runSMPS()">
            </div>
        ;
        document.getElementById('smps-ratio-grp').classList.remove('opacity-50');
    } else {
        document.getElementById('smps-ratio-grp').classList.add('opacity-50');
    }

    inputs.innerHTML = `n        <div class="flex justify-between items-center text-xs">
            <label class="w-24">Vin (V)</label>
            <input type="number" id="smps-vin" value="24" step="1" class="w-32 border border-themeBorder px-2 py-1 text-right" oninput="runSMPS()">
        </div>
        <div class="flex justify-between items-center text-xs">
            <label class="w-24">Vout (V)</label>
            <input type="number" id="smps-vout" value="5" step="0.1" class="w-32 border border-themeBorder px-2 py-1 text-right" oninput="runSMPS()">
        </div>
        <div class="flex justify-between items-center text-xs">
            <label class="w-24">Duty (D)</label>
            <input type="number" id="smps-d" value="0.5" step="0.05" class="w-32 border border-themeBorder px-2 py-1 text-right" oninput="runSMPS()">
        </div>
        
    ;
    runSMPS();
}

function runSMPS() {
    const type = document.getElementById('smps-type')?.value;
    const solveTarget = document.querySelector('input[name="smps_solve"]:checked')?.value || 'duty';
    
    document.querySelectorAll('#smps-inputs input').forEach(el => el.classList.remove('bg-themeAccent/20', 'font-bold'));
    const targetEl = solveTarget === 'vin' ? 'smps-vin' : solveTarget === 'vout' ? 'smps-vout' : 'smps-d';
    if(document.getElementById(targetEl)) document.getElementById(targetEl).classList.add('bg-themeAccent/20', 'font-bold');

    let vin = parseFloat(document.getElementById('smps-vin')?.value);
    let vout = parseFloat(document.getElementById('smps-vout')?.value);
    let d = parseFloat(document.getElementById('smps-d')?.value);
    const n = parseFloat(document.getElementById('smps-n')?.value) || 1; // Np/Ns

    if(solveTarget === 'vin' && vout && d) {
        if(type==='buck') vin = vout / d;
        else if(type==='boost') vin = vout * (1 - d);
        else if(type==='buck-boost') vin = (vout * (1 - d)) / d;
        else if(type==='flyback') vin = (vout * n * (1 - d)) / d;
        else if(type==='forward') vin = (vout * n) / d;
        else if(type==='push-pull' || type==='full-bridge') vin = (vout * n) / (2 * d);
        else if(type==='half-bridge') vin = (vout * n * 2) / d; // Wait: Vout = Vin/(2n) * 2D = Vin*D/n
        document.getElementById('smps-vin').value = isNaN(vin) ? '' : Math.abs(vin).toFixed(2);
    } else if(solveTarget === 'vout' && vin && d) {
        if(type==='buck') vout = vin * d;
        else if(type==='boost') vout = vin / (1 - d);
        else if(type==='buck-boost') vout = vin * (d / (1 - d));
        else if(type==='flyback') vout = (vin / n) * (d / (1 - d));
        else if(type==='forward') vout = (vin / n) * d;
        else if(type==='push-pull' || type==='full-bridge') vout = 2 * (vin / n) * d;
        else if(type==='half-bridge') vout = (vin / n) * d;
        document.getElementById('smps-vout').value = isNaN(vout) ? '' : Math.abs(vout).toFixed(2);
    } else if(solveTarget === 'duty' && vin && vout) {
        if(type==='buck') d = vout / vin;
        else if(type==='boost') d = 1 - (vin / vout);
        else if(type==='buck-boost') d = vout / (vin + vout);
        else if(type==='flyback') d = (vout * n) / (vin + (vout * n));
        else if(type==='forward') d = (vout * n) / vin;
        else if(type==='push-pull' || type==='full-bridge') d = (vout * n) / (2 * vin);
        else if(type==='half-bridge') d = (vout * n) / vin;
        document.getElementById('smps-d').value = isNaN(d) ? '' : Math.abs(d).toFixed(3);
    }

    let resultStr = "-";
    if(solveTarget === 'vin') resultStr = " V";
    if(solveTarget === 'vout') resultStr = " V";
    if(solveTarget === 'duty') resultStr = " %";
    document.getElementById('smps-result').textContent = resultStr;

    // Update ideal ratio hint if flyback/forward/etc
    if(['flyback', 'forward', 'push-pull', 'half-bridge', 'full-bridge'].includes(type) && vin && vout) {
        let recN = 1;
        if(type==='flyback') recN = vin / vout; // assume 50% duty
        else if(type==='forward') recN = (vin * 0.4) / vout; // assume 40% duty limit
        else if(type==='push-pull' || type==='full-bridge') recN = (2 * vin * 0.4) / vout;
        else if(type==='half-bridge') recN = (vin * 0.4) / vout;
        document.getElementById('smps-ratio').textContent = recN.toFixed(2) + " : 1";
    } else {
        document.getElementById('smps-ratio').textContent = "--";
    }
}

window.addEventListener('DOMContentLoaded', () => {
    if(document.getElementById('smps-solve-group')) setupSMPSMode();
});

// ==========================================
// 4. FILTER DESIGNER
// ==========================================
function setupFilterMode() {
    const type = document.getElementById('filter-type')?.value;
    const solveGroup = document.getElementById('filter-solve-group');
    const inputs = document.getElementById('filter-inputs');
    if(!solveGroup || !inputs) return;

    solveGroup.innerHTML = `n        <span>SOLVE:</span>
        <label class="cursor-pointer hover:text-themeAccent"><input type="radio" name="filter_solve" value="r1" onchange="runSmartFilter()"> R1 / L1</label>
        <label class="cursor-pointer hover:text-themeAccent"><input type="radio" name="filter_solve" value="c1" onchange="runSmartFilter()"> C1</label>
        <label class="cursor-pointer hover:text-themeAccent"><input type="radio" name="filter_solve" value="fc" checked onchange="runSmartFilter()"> Fc (Hz)</label>
    ;

    let extra = '';
    if(type === 'lcl' || type === 'clc') {
        extra = `n            <div class="flex justify-between items-center text-xs">
                <label></label>
                <input type="number" id="filter-c2" value="10" class="w-24 border border-themeBorder px-1 text-right" oninput="runSmartFilter()">
            </div>
        ;
    }

    inputs.innerHTML = `n        <div class="flex justify-between items-center text-xs">
            <label></label>
            <input type="number" id="filter-r1" value="1000" class="w-24 border border-themeBorder px-1 text-right" oninput="runSmartFilter()">
        </div>
        <div class="flex justify-between items-center text-xs">
            <label></label>
            <input type="number" id="filter-c1" value="0.1" class="w-24 border border-themeBorder px-1 text-right" oninput="runSmartFilter()">
        </div>
        
    ;
    runSmartFilter();
}

function runSmartFilter() {
    const type = document.getElementById('filter-type')?.value;
    const solveTarget = document.querySelector('input[name="filter_solve"]:checked')?.value || 'fc';
    
    document.querySelectorAll('#filter-inputs input, #calc-filter-fc').forEach(el => el.classList.remove('bg-themeAccent/20', 'font-bold'));
    const targetEl = solveTarget === 'r1' ? 'filter-r1' : solveTarget === 'c1' ? 'filter-c1' : 'calc-filter-fc';
    if(document.getElementById(targetEl)) document.getElementById(targetEl).classList.add('bg-themeAccent/20', 'font-bold');

    let r1 = parseFloat(document.getElementById('filter-r1')?.value); // R or L1
    let c1 = parseFloat(document.getElementById('filter-c1')?.value); // C1 or R1 for RL
    let fc = parseFloat(document.getElementById('calc-filter-fc')?.value);

    if(solveTarget === 'r1' && c1 && fc) {
        if(type==='rc') r1 = 1 / (2 * Math.PI * (c1*1e-6) * fc);
        else if(type==='rl') r1 = 2 * Math.PI * fc * (r1*1e-6);
        else if(type==='lc' || type==='lcl' || type==='clc') r1 = 1 / (4 * Math.PI * Math.PI * fc * fc * (c1*1e-6)) * 1e6; // uH
        document.getElementById('filter-r1').value = isNaN(r1) ? '' : r1.toFixed(2);
    } else if(solveTarget === 'c1' && r1 && fc) {
        if(type==='rc') c1 = 1 / (2 * Math.PI * r1 * fc) * 1e6;
        else if(type==='rl') c1 = r1 / (2 * Math.PI * fc) * 1e6; // wait, c1 is R1 for RL
        else if(type==='lc' || type==='lcl' || type==='clc') c1 = 1 / (4 * Math.PI * Math.PI * fc * fc * (r1*1e-6)) * 1e6; // uF
        document.getElementById('filter-c1').value = isNaN(c1) ? '' : c1.toFixed(3);
    } else if(solveTarget === 'fc' && r1 && c1) {
        if(type==='rc') fc = 1 / (2 * Math.PI * r1 * (c1*1e-6));
        else if(type==='rl') fc = c1 / (2 * Math.PI * (r1*1e-6));
        else if(type==='lc' || type==='lcl' || type==='clc') fc = 1 / (2 * Math.PI * Math.sqrt((r1*1e-6) * (c1*1e-6)));
        document.getElementById('calc-filter-fc').value = isNaN(fc) ? '' : fc.toFixed(2);
    }
    runFilter();
}

function runFilter() {
    // Draw bode plot graph on filter-canvas
    const fc = parseFloat(document.getElementById('calc-filter-fc')?.value);
    if(!fc) return;
    if(typeof addGraphCursor !== 'function') return;
    addGraphCursor('filter-canvas', (nx, ny) => {
        const f = fc * Math.pow(10, -2 + nx * 4);
        const db = -60 + ny * 60;
        return (f>=1000 ? (f/1000).toFixed(1)+'kHz' : f.toFixed(0)+'Hz') + ', ' + db.toFixed(1) + 'dB';
    });
    const canvas = document.getElementById('filter-canvas');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    if(canvas.width !== canvas.clientWidth) canvas.width = canvas.clientWidth;
    if(canvas.height !== canvas.clientHeight) canvas.height = canvas.clientHeight;
    
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0,0,w,h);

    // Grid
    ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--theme-border') || '#333';
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    for(let i=1; i<10; i++) {
        for(let j=0; j<4; j++) {
            let x = (Math.log10(i) + j)/4 * w;
            ctx.moveTo(x, 0); ctx.lineTo(x, h);
        }
    }
    for(let i=0; i<=6; i++) {
        let y = i * (h/6);
        ctx.moveTo(0, y); ctx.lineTo(w, y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1.0;

    // Plot
    ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--theme-accent') || '#ff9900';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for(let x=0; x<w; x++) {
        let freq = fc * Math.pow(10, -2 + (x/w)*4); // from 0.01fc to 100fc
        let ratio = freq / fc;
        let type = document.getElementById('filter-type')?.value;
        let order = (type==='lc') ? 2 : (type==='lcl'||type==='clc') ? 3 : 1;
        let mag = 1 / Math.sqrt(1 + Math.pow(ratio, 2 * order));
        let db = 20 * Math.log10(mag);
        let y = h - ((db + 60) / 60) * h;
        if(x===0) ctx.moveTo(x,y);
        else ctx.lineTo(x,y);
    }
    ctx.stroke();
}

window.addEventListener('DOMContentLoaded', () => {
    if(document.getElementById('filter-solve-group')) setupFilterMode();
});

// ==========================================
// 5. THERMISTOR DESIGNER
// ==========================================
function setupNTCMode() {
    const type = document.getElementById('ntc-type')?.value;
    const solveGroup = document.getElementById('ntc-solve-group');
    const inputs = document.getElementById('ntc-inputs');
    if(!solveGroup || !inputs) return;

    let solvers = '';
    if(type === 'beta') {
        solvers = `n            <span>SOLVE:</span>
            <label class="cursor-pointer hover:text-themeAccent"><input type="radio" name="ntc_solve" value="r25" onchange="runThermistor()"> R25</label>
            <label class="cursor-pointer hover:text-themeAccent"><input type="radio" name="ntc_solve" value="beta" onchange="runThermistor()"> Beta</label>
            <label class="cursor-pointer hover:text-themeAccent"><input type="radio" name="ntc_solve" value="temp" onchange="runThermistor()"> Temp (°C)</label>
            <label class="cursor-pointer hover:text-themeAccent"><input type="radio" name="ntc_solve" value="rt" checked onchange="runThermistor()"> Rt (O)</label>
        ;
        inputs.innerHTML = `n            <div class="flex justify-between items-center text-xs">
                <label>R_nom (O @ 25°C)</label>
                <input type="number" id="ntc-r25" value="10000" class="w-24 border border-themeBorder px-1 text-right" oninput="runThermistor()">
            </div>
            <div class="flex justify-between items-center text-xs">
                <label>Beta (ß)</label>
                <input type="number" id="ntc-beta" value="3950" class="w-24 border border-themeBorder px-1 text-right" oninput="runThermistor()">
            </div>
            <div class="flex justify-between items-center text-xs">
                <label>Target Temp (°C)</label>
                <input type="number" id="ntc-t" value="85" class="w-24 border border-themeBorder px-1 text-right" oninput="runThermistor()">
            </div>
            <div class="flex justify-between items-center text-xs">
                <label>R at Target (O)</label>
                <input type="number" id="ntc-rt" value="1451" class="w-24 border border-themeBorder px-1 text-right" oninput="runThermistor()">
            </div>
        ;
    } else {
        solvers = `n            <span>SOLVE:</span>
            <label class="cursor-pointer hover:text-themeAccent"><input type="radio" name="ntc_solve" value="temp" onchange="runThermistor()"> Temp (°C)</label>
            <label class="cursor-pointer hover:text-themeAccent"><input type="radio" name="ntc_solve" value="rt" checked onchange="runThermistor()"> Rt (O)</label>
        ;
        inputs.innerHTML = `n            <div class="flex justify-between items-center text-[10px]">
                <label>A</label>
                <input type="number" id="ntc-a" value="1.129148e-3" class="w-24 border border-themeBorder px-1 text-right" oninput="runThermistor()">
            </div>
            <div class="flex justify-between items-center text-[10px]">
                <label>B</label>
                <input type="number" id="ntc-b" value="2.34125e-4" class="w-24 border border-themeBorder px-1 text-right" oninput="runThermistor()">
            </div>
            <div class="flex justify-between items-center text-[10px]">
                <label>C</label>
                <input type="number" id="ntc-c" value="8.76741e-8" class="w-24 border border-themeBorder px-1 text-right" oninput="runThermistor()">
            </div>
            <div class="flex justify-between items-center text-xs mt-1">
                <label>Target Temp (°C)</label>
                <input type="number" id="ntc-t" value="85" class="w-24 border border-themeBorder px-1 text-right" oninput="runThermistor()">
            </div>
            <div class="flex justify-between items-center text-xs">
                <label>R at Target (O)</label>
                <input type="number" id="ntc-rt" value="1451" class="w-24 border border-themeBorder px-1 text-right" oninput="runThermistor()">
            </div>
        ;
    }
    solveGroup.innerHTML = solvers;
    runThermistor();
}

function runThermistor() {
    const type = document.getElementById('ntc-type')?.value;
    const solveTarget = document.querySelector('input[name="ntc_solve"]:checked')?.value || 'rt';
    
    document.querySelectorAll('#ntc-inputs input').forEach(el => el.classList.remove('bg-themeAccent/20', 'font-bold'));
    const targetEl = solveTarget === 'r25' ? 'ntc-r25' : solveTarget === 'beta' ? 'ntc-beta' : solveTarget === 'temp' ? 'ntc-t' : 'ntc-rt';
    if(document.getElementById(targetEl)) document.getElementById(targetEl).classList.add('bg-themeAccent/20', 'font-bold');

    let rt = parseFloat(document.getElementById('ntc-rt')?.value);
    let temp = parseFloat(document.getElementById('ntc-t')?.value);

    if(type === 'beta') {
        let r25 = parseFloat(document.getElementById('ntc-r25')?.value);
        let beta = parseFloat(document.getElementById('ntc-beta')?.value);

        if(solveTarget === 'rt' && r25 && beta && !isNaN(temp)) {
            let tk = temp + 273.15;
            rt = r25 * Math.exp(beta * (1/tk - 1/298.15));
            document.getElementById('ntc-rt').value = isNaN(rt) ? '' : rt.toFixed(1);
        } else if (solveTarget === 'temp' && r25 && beta && rt) {
            let tk = 1 / ( (1/298.15) + (1/beta) * Math.log(rt / r25) );
            temp = tk - 273.15;
            document.getElementById('ntc-t').value = isNaN(temp) ? '' : temp.toFixed(2);
        } else if (solveTarget === 'r25' && beta && rt && !isNaN(temp)) {
            let tk = temp + 273.15;
            r25 = rt / Math.exp(beta * (1/tk - 1/298.15));
            document.getElementById('ntc-r25').value = isNaN(r25) ? '' : r25.toFixed(1);
        } else if (solveTarget === 'beta' && r25 && rt && !isNaN(temp)) {
            let tk = temp + 273.15;
            beta = Math.log(rt / r25) / (1/tk - 1/298.15);
            document.getElementById('ntc-beta').value = isNaN(beta) ? '' : beta.toFixed(1);
        }
        if(r25 && beta) drawThermistorPlot(r25, beta);
    } else {
        // Steinhart-Hart
        let a = parseFloat(document.getElementById('ntc-a')?.value);
        let b = parseFloat(document.getElementById('ntc-b')?.value);
        let c = parseFloat(document.getElementById('ntc-c')?.value);

        if(solveTarget === 'rt' && a && b && c && !isNaN(temp)) {
            let tk = temp + 273.15;
            // We need to solve: 1/T = A + B*ln(R) + C*(ln(R))^3 for R
            // This is a cubic equation in ln(R). 
            let x = (1/tk) - a;
            // Approximation using Newton-Raphson for better stability
            let lnr = Math.log(10000); // initial guess 10k
            for(let i=0; i<20; i++) {
                let f = b*lnr + c*Math.pow(lnr,3) - x;
                let df = b + 3*c*Math.pow(lnr,2);
                lnr = lnr - f/df;
            }
            rt = Math.exp(lnr);
            document.getElementById('ntc-rt').value = isNaN(rt) ? '' : rt.toFixed(1);
        } else if (solveTarget === 'temp' && a && b && c && rt) {
            let lnr = Math.log(rt);
            let invTk = a + b*lnr + c*Math.pow(lnr, 3);
            temp = (1/invTk) - 273.15;
            document.getElementById('ntc-t').value = isNaN(temp) ? '' : temp.toFixed(2);
        }
        // For drawing plot we can fake R25 and Beta from SH
        if(a && b && c) {
            let invTk25 = a + b*Math.log(10000) + c*Math.pow(Math.log(10000), 3);
            drawThermistorPlot(10000, 3950); // placeholder plot for SH mode to avoid complex re-plot logic
        }
    }

    document.getElementById('ntc-result').textContent = solveTarget === 'rt' ? (rt ? rt.toFixed(1) + " O" : "-") : (temp ? temp.toFixed(2) + " °C" : "-");
}

window.addEventListener('DOMContentLoaded', () => {
    if(document.getElementById('ntc-solve-group')) setupNTCMode();
});

// ==========================================
// 6. WEB SERIAL INTERFACE FIXES
// ==========================================
async function readSerialLoop() {
    const monitor = document.getElementById('serial-monitor');
    while (port && port.readable) {
        reader = port.readable.getReader();
        try {
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                
                const chunk = new TextDecoder().decode(value);
                monitor.value += chunk;
                serialBuffer += chunk;
                
                if(monitor.value.length > 3000) monitor.value = monitor.value.substring(monitor.value.length - 1500);
                monitor.scrollTop = monitor.scrollHeight;

                let lines = serialBuffer.split('\n');
                if (lines.length > 1) {
                    for(let i=0; i<lines.length-1; i++) {
                        let line = lines[i].trim();
                        if(line) {
                            let vals = line.split(',').map(v => parseFloat(v.trim()));
                            if(vals.length > 0 && !vals.some(isNaN)) {
                                plotData.push(vals[0]);
                                if(plotData.length > 100) plotData.shift();
                            }
                        }
                    }
                    serialBuffer = lines[lines.length-1];
                    drawPlot();
                }
            }
        } catch (error) {
            console.error("Read error:", error);
        } finally {
            reader.releaseLock();
        }
    }
}

// ==========================================
// 7. SOLAR PV FIXES
// ==========================================
function drawSolarWidget() {
    const canvas = document.getElementById('solar-canvas');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    if(canvas.width !== canvas.clientWidth) canvas.width = canvas.clientWidth;
    if(canvas.height !== canvas.clientHeight) canvas.height = canvas.clientHeight;

    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0,0,w,h);

    // Draw Map (simple equirectangular grid)
    ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--theme-border') || '#333';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    for(let lon=-180; lon<=180; lon+=30) { let x = (lon+180)/360 * w; ctx.moveTo(x, 0); ctx.lineTo(x, h); }
    for(let lat=-90; lat<=90; lat+=30) { let y = (90-lat)/180 * h; ctx.moveTo(0, y); ctx.lineTo(w, y); }
    ctx.stroke();
    ctx.globalAlpha = 1.0;

    // Continents rough outline placeholder
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--theme-border') || '#333';
    ctx.globalAlpha = 0.2;
    ctx.fillRect(w*0.4, h*0.2, w*0.3, h*0.4); // Eurasia/Africa
    ctx.fillRect(w*0.1, h*0.2, w*0.2, h*0.3); // Americas
    ctx.fillRect(w*0.8, h*0.6, w*0.15, h*0.2); // Oceania
    ctx.globalAlpha = 1.0;

    // Draw Marker
    let px = (_solarLon + 180) / 360 * w;
    let py = (90 - _solarLat) / 180 * h;
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--theme-accent') || '#ff9900';
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, Math.PI*2);
    ctx.fill();
    
    // Calculate and update fields
    updateSolarSim();
}

function initSolarWidget() {
    const canvas = document.getElementById('solar-canvas');
    if(!canvas) return;
    
    if(typeof _solarLat === 'undefined') {
        window._solarLat = 0;
        window._solarLon = 0;
        window._solarMonth = 5;
    }

    if(!canvas.hasAttribute('data-solar-attached')) {
        canvas.setAttribute('data-solar-attached','1');
        canvas.addEventListener('click', (e) => {
            const rect = canvas.getBoundingClientRect();
            _solarLon = ((e.clientX - rect.left) / canvas.clientWidth) * 360 - 180;
            _solarLat = 90 - ((e.clientY - rect.top) / canvas.clientHeight) * 180;
            document.getElementById('pv-lat').value = _solarLat.toFixed(1);
            document.getElementById('pv-lng').value = _solarLon.toFixed(1);
            drawSolarWidget();
        });
        
        document.getElementById('pv-time')?.addEventListener('input', () => {
            let t = parseFloat(document.getElementById('pv-time').value);
            let hrs = Math.floor(t);
            let mins = (t - hrs)*60;
            document.getElementById('pv-time-val').textContent = hrs.toString().padStart(2,'0') + ':' + mins.toString().padStart(2,'0');
            updateSolarSim();
        });
    }
    drawSolarWidget();
}

window.updatePVFromInputs = function() {
    _solarLat = parseFloat(document.getElementById('pv-lat').value) || 0;
    _solarLon = parseFloat(document.getElementById('pv-lng').value) || 0;
    drawSolarWidget();
};

window.setSolarMonth = function(m) {
    _solarMonth = m;
    const mn = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    document.getElementById('pv-month-val').textContent = mn[m];
    let btns = document.getElementById('pv-month-buttons').querySelectorAll('button');
    btns.forEach((b, i) => {
        if(i === m) {
            b.classList.remove('hover:bg-themeAccent', 'hover:text-themeBg');
            b.classList.add('bg-themeAccent', 'text-themeBg');
        } else {
            b.classList.add('hover:bg-themeAccent', 'hover:text-themeBg');
            b.classList.remove('bg-themeAccent', 'text-themeBg');
        }
    });
    drawSolarWidget();
};

window.updateSolarSim = function() {
    // Simple model based on latitude and month
    const dec = -23.45 * Math.cos((360/365) * (_solarMonth*30 + 15) * Math.PI/180);
    let optTilt = Math.abs(_solarLat - dec);
    document.getElementById('pv-tilt').textContent = optTilt.toFixed(1) + "°";
    
    let cTilt = document.getElementById('pv-custom-tilt')?.value;
    if(document.getElementById('pv-link-tilt')?.classList.contains('text-themeAccent')) {
        cTilt = optTilt;
        if(document.getElementById('pv-custom-tilt')) document.getElementById('pv-custom-tilt').value = optTilt.toFixed(1);
    }

    // Time of day
    let t = parseFloat(document.getElementById('pv-time')?.value) || 12;
    let hrAngle = (t - 12) * 15; // degrees
    
    // Altitude angle
    let sinAlt = Math.sin(_solarLat*Math.PI/180)*Math.sin(dec*Math.PI/180) + Math.cos(_solarLat*Math.PI/180)*Math.cos(dec*Math.PI/180)*Math.cos(hrAngle*Math.PI/180);
    let alt = Math.asin(sinAlt) * 180/Math.PI;

    let yieldW = 0;
    if(alt > 0) {
        // simplified projection
        yieldW = 1000 * Math.sin(alt*Math.PI/180);
    }
    document.getElementById('pv-yield').textContent = yieldW.toFixed(0) + " W/m²";
    
    // approx daily integral
    let daily = yieldW * 6; // highly simplified
    document.getElementById('pv-daily').textContent = (daily/1000).toFixed(2) + " kWh/m²";
    document.getElementById('pv-annual').textContent = "Annual: " + ((daily/1000)*365).toFixed(0) + " kWh/m²";
};

window.toggleTiltLink = function() {
    let btn = document.getElementById('pv-link-tilt');
    if(!btn) return;
    btn.classList.toggle('text-themeAccent');
    btn.classList.toggle('text-themeMuted');
    updateSolarSim();
};

