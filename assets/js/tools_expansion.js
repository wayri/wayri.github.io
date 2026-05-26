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

    solveGroup.innerHTML = `        <span>SOLVE:</span>
        <label class="cursor-pointer hover:text-themeAccent"><input type="radio" name="mot_solve" value="rpm" onchange="runMotor()" checked> Ns (RPM)</label>
        <label class="cursor-pointer hover:text-themeAccent"><input type="radio" name="mot_solve" value="torque" onchange="runMotor()"> Torque</label>
        <label class="cursor-pointer hover:text-themeAccent"><input type="radio" name="mot_solve" value="power" onchange="runMotor()"> Power</label>
        <label class="cursor-pointer hover:text-themeAccent"><input type="radio" name="mot_solve" value="slip" onchange="runMotor()"> Slip</label>
        <label class="cursor-pointer hover:text-themeAccent"><input type="radio" name="mot_solve" value="eff" onchange="runMotor()"> Eff</label>
    `;

    inputs.innerHTML = `
        <div class="space-y-2">
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
    `;
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

    solveGroup.innerHTML = `        <span>SOLVE:</span>
        <label class="cursor-pointer hover:text-themeAccent"><input type="radio" name="smps_solve" value="vin" onchange="runSMPS()"> Vin</label>
        <label class="cursor-pointer hover:text-themeAccent"><input type="radio" name="smps_solve" value="vout" onchange="runSMPS()"> Vout</label>
        <label class="cursor-pointer hover:text-themeAccent"><input type="radio" name="smps_solve" value="duty" checked onchange="runSMPS()"> Duty (D)</label>
    `;

    let extra = '';
    if(['flyback', 'forward', 'push-pull', 'half-bridge', 'full-bridge'].includes(type)) {
        extra = `            <div class="flex justify-between items-center text-xs">
                <label class="w-24">Ratio (Np/Ns)</label>
                <input type="number" id="smps-n" value="1" step="0.1" class="w-32 border border-themeBorder px-2 py-1 text-right" oninput="runSMPS()">
            </div>
    `;
        document.getElementById('smps-ratio-grp').classList.remove('opacity-50');
    } else {
        document.getElementById('smps-ratio-grp').classList.add('opacity-50');
    }

    inputs.innerHTML = `        <div class="flex justify-between items-center text-xs">
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
        
    `;
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

    solveGroup.innerHTML = `        <span>SOLVE:</span>
        <label class="cursor-pointer hover:text-themeAccent"><input type="radio" name="filter_solve" value="r1" onchange="runSmartFilter()"> R1 / L1</label>
        <label class="cursor-pointer hover:text-themeAccent"><input type="radio" name="filter_solve" value="c1" onchange="runSmartFilter()"> C1</label>
        <label class="cursor-pointer hover:text-themeAccent"><input type="radio" name="filter_solve" value="fc" checked onchange="runSmartFilter()"> Fc (Hz)</label>
    `;

    let l1_label = 'R1 (Ω) / L1 (µH)';
    let c1_label = 'C1 (µF) / R1 (Ω)';
    if(type === 'rc') { l1_label = 'R (Ω)'; c1_label = 'C (µF)'; }
    if(type === 'rl') { l1_label = 'L (µH)'; c1_label = 'R (Ω)'; }
    if(type === 'lc' || type === 'lcl' || type === 'clc') { l1_label = 'L1 (µH)'; c1_label = 'C1 (µF)'; }

    let extra = '';
    if(type === 'lcl' || type === 'clc') {
        let l2_label = type === 'lcl' ? 'L2 (µH)' : 'C2 (µF)';
        extra = `            <div class="flex justify-between items-center text-xs">
                <label>${l2_label}</label>
                <input type="number" id="filter-c2" value="10" class="w-24 border border-themeBorder px-1 text-right" oninput="runSmartFilter()">
            </div>
    `;
    }

    inputs.innerHTML = `        <div class="flex justify-between items-center text-xs">
            <label>${l1_label}</label>
            <input type="number" id="filter-r1" value="1000" class="w-24 border border-themeBorder px-1 text-right" oninput="runSmartFilter()">
        </div>
        <div class="flex justify-between items-center text-xs">
            <label>${c1_label}</label>
            <input type="number" id="filter-c1" value="0.1" class="w-24 border border-themeBorder px-1 text-right" oninput="runSmartFilter()">
        </div>
        
    `;
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
        solvers = `            <span>SOLVE:</span>
            <label class="cursor-pointer hover:text-themeAccent"><input type="radio" name="ntc_solve" value="r25" onchange="runThermistor()"> R25</label>
            <label class="cursor-pointer hover:text-themeAccent"><input type="radio" name="ntc_solve" value="beta" onchange="runThermistor()"> Beta</label>
            <label class="cursor-pointer hover:text-themeAccent"><input type="radio" name="ntc_solve" value="temp" onchange="runThermistor()"> Temp (°C)</label>
            <label class="cursor-pointer hover:text-themeAccent"><input type="radio" name="ntc_solve" value="rt" checked onchange="runThermistor()"> Rt (O)</label>
    `;
        inputs.innerHTML = `            <div class="flex justify-between items-center text-xs">
                <label>R_nom (Ω @ 25°C)</label>
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
                <label>R at Target (Ω)</label>
                <input type="number" id="ntc-rt" value="1451" class="w-24 border border-themeBorder px-1 text-right" oninput="runThermistor()">
            </div>
    `;
    } else {
        solvers = `            <span>SOLVE:</span>
            <label class="cursor-pointer hover:text-themeAccent"><input type="radio" name="ntc_solve" value="temp" onchange="runThermistor()"> Temp (°C)</label>
            <label class="cursor-pointer hover:text-themeAccent"><input type="radio" name="ntc_solve" value="rt" checked onchange="runThermistor()"> Rt (O)</label>
    `;
        inputs.innerHTML = `            <div class="flex justify-between items-center text-[10px]">
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
                <label>R at Target (Ω)</label>
                <input type="number" id="ntc-rt" value="1451" class="w-24 border border-themeBorder px-1 text-right" oninput="runThermistor()">
            </div>
    `;
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

    document.getElementById('ntc-result').textContent = solveTarget === 'rt' ? (rt ? rt.toFixed(1) + " Ω" : "-") : (temp ? temp.toFixed(2) + " °C" : "-");
}

window.addEventListener('DOMContentLoaded', () => {
    if(document.getElementById('ntc-solve-group')) setupNTCMode();
});

// ==========================================
// NEW WEB SERIAL INTERFACE (CHART.JS)
// ==========================================
let serialChart = null;
let serialPlotData = [];
let serialPlotLabels = [];

function initSerialChart() {
    const ctx = document.getElementById('serial-plot-canvas');
    if(!ctx) return;
    if(serialChart) serialChart.destroy();
    
    serialChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: serialPlotLabels,
            datasets: [{
                label: 'Telemetry',
                data: serialPlotData,
                borderColor: '#D4AF37',
                borderWidth: 2,
                tension: 0.1,
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            scales: {
                x: { display: false },
                y: {
                    display: true,
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: { color: 'rgba(255, 255, 255, 0.5)' }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

window.addEventListener('DOMContentLoaded', () => {
    initSerialChart();
});

window.toggleSerial = async function() {
    const btn = document.getElementById('serial-btn');
    const status = document.getElementById('serial-status');
    
    if (port && port.readable) {
        try {
            if(reader) { await reader.cancel(); reader = null; }
            await port.close(); port = null;
        } catch (e) { console.error(e); }
        
        btn.textContent = "CONNECT";
        status.textContent = "OFFLINE";
        status.classList.remove('text-[#4ade80]', 'border-[#4ade80]');
        return;
    }

    try {
        if (!navigator.serial) {
            alert("Web Serial API is not supported in this browser. Please use Chrome or Edge on desktop.");
            return;
        }
        
        let baud = parseInt(document.getElementById('serial-baud').value) || 115200;
        let dataBits = parseInt(document.getElementById('serial-data').value) || 8;
        let stopBits = parseInt(document.getElementById('serial-stop').value) || 1;
        let parity = document.getElementById('serial-parity').value || 'none';
        
        port = await navigator.serial.requestPort();
        await port.open({ baudRate: baud, dataBits: dataBits, stopBits: stopBits, parity: parity });
        
        btn.textContent = "DISCONNECT";
        status.textContent = "CONNECTED";
        status.classList.add('text-[#4ade80]', 'border-[#4ade80]');
        
        window.readSerialLoopChart();
    } catch (err) {
        console.error("Serial error:", err);
    }
};

window.readSerialLoopChart = async function() {
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
                
                if(monitor.value.length > 5000) monitor.value = monitor.value.substring(monitor.value.length - 2500);
                monitor.scrollTop = monitor.scrollHeight;

                let lines = serialBuffer.split('\n');
                if (lines.length > 1) {
                    for(let i=0; i<lines.length-1; i++) {
                        let line = lines[i].trim();
                        if(line) {
                            let vals = line.split(',').map(v => parseFloat(v.trim()));
                            if(vals.length > 0 && !isNaN(vals[0])) {
                                serialPlotData.push(vals[0]);
                                serialPlotLabels.push('');
                                if(serialPlotData.length > 100) {
                                    serialPlotData.shift();
                                    serialPlotLabels.shift();
                                }
                            }
                        }
                    }
                    serialBuffer = lines[lines.length-1];
                    if(serialChart) serialChart.update();
                }
            }
        } catch (error) {
            console.error("Read error:", error);
        } finally {
            reader.releaseLock();
        }
    }
};

window.sendSerial = async function() {
    if(!port || !port.writable) return;
    const input = document.getElementById('serial-send-input');
    let data = input.value;
    if(!data) return;
    
    let lineEnding = document.getElementById('serial-line').value;
    if(lineEnding === 'cr') data += "\r";
    else if(lineEnding === 'lf') data += "\n";
    else if(lineEnding === 'crlf') data += "\r\n";
    
    try {
        const encoder = new TextEncoder();
        const writer = port.writable.getWriter();
        await writer.write(encoder.encode(data));
        writer.releaseLock();
        input.value = '';
    } catch (err) {
        console.error(err);
    }
};

window.clearSerial = function() {
    document.getElementById('serial-monitor').value = '';
};

window.clearSerialPlot = function() {
    serialPlotData.length = 0;
    serialPlotLabels.length = 0;
    if(serialChart) serialChart.update();
};

window.saveSerialLog = function() {
    const text = document.getElementById('serial-monitor').value;
    if(!text) return;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'serial_log.txt';
    a.click();
    URL.revokeObjectURL(url);
};

window.saveSerialPlot = function() {
    const canvas = document.getElementById('serial-plot-canvas');
    if(!canvas) return;
    const link = document.createElement('a');
    link.download = 'serial_plot.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
};

// Override old readSerialLoop just in case
window.readSerialLoop = window.readSerialLoopChart;

// ==========================================
// NEW SOLAR PV SIMULATOR (CHART.JS)
// ==========================================
let pvTimeChart = null;
let pvHistChart = null;

function initPVCharts() {
    const ctxTime = document.getElementById('pv-time-chart');
    const ctxHist = document.getElementById('pv-hist-chart');
    if(!ctxTime || !ctxHist) return;

    pvTimeChart = new Chart(ctxTime, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Generation (W/m²)',
                data: [],
                borderColor: '#D4AF37',
                backgroundColor: 'rgba(212, 175, 55, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: { color: 'rgba(255, 255, 255, 0.5)' }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: { color: 'rgba(255, 255, 255, 0.5)' },
                    max: 1100
                }
            },
            plugins: { legend: { display: false } }
        }
    });

    pvHistChart = new Chart(ctxHist, {
        type: 'bar',
        data: {
            labels: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
            datasets: [{
                label: 'Monthly Yield (kWh/m²)',
                data: [],
                backgroundColor: '#D4AF37',
                borderRadius: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: 'rgba(255, 255, 255, 0.5)' }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: { color: 'rgba(255, 255, 255, 0.5)' }
                }
            },
            plugins: { legend: { display: false } }
        }
    });
}

window.addEventListener('DOMContentLoaded', () => {
    initPVCharts();
});

window.updateSolarSim = function() {
    if(!pvTimeChart || !pvHistChart) return;
    
    let lat = parseFloat(document.getElementById('pv-lat').value) || 0;
    let m = _solarMonth;
    
    const decs = [-20.9, -13.0, -2.4, 9.4, 18.8, 23.1, 21.2, 13.5, 2.2, -9.6, -18.9, -23.0];
    let monthlyYields = [];
    let annual = 0;
    
    for(let i=0; i<12; i++) {
        let dec = decs[i];
        let d = dec * Math.PI/180;
        let l = lat * Math.PI/180;
        
        let ws = Math.acos( -Math.tan(l) * Math.tan(d) );
        if(isNaN(ws)) ws = (Math.tan(l)*Math.tan(d) > 0) ? Math.PI : 0;
        
        let dayLen = (24/Math.PI) * ws;
        
        let peakAlt = Math.asin( Math.sin(l)*Math.sin(d) + Math.cos(l)*Math.cos(d) );
        let peakYield = Math.max(0, 1000 * Math.sin(peakAlt));
        
        let daily = (peakYield * dayLen * 0.6) / 1000; 
        let mo = daily * 30;
        monthlyYields.push(mo);
        annual += mo;
    }
    
    pvHistChart.data.datasets[0].data = monthlyYields;
    let colors = Array(12).fill('rgba(212, 175, 55, 0.3)');
    colors[m] = '#D4AF37';
    pvHistChart.data.datasets[0].backgroundColor = colors;
    pvHistChart.update();
    
    document.getElementById('pv-annual').textContent = "Annual: " + annual.toFixed(0) + " kWh/m\u00B2";
    
    let showAll = document.getElementById('pv-all-months')?.checked;
    let timeLabels = [];
    for(let h=0; h<=24; h+=0.5) {
        timeLabels.push(Math.floor(h) + (h%1===0 ? ':00' : ':30'));
    }
    pvTimeChart.data.labels = timeLabels;

    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    let datasets = [];
    let l = lat * Math.PI/180;
    
    for(let i=0; i<(showAll ? 12 : 1); i++) {
        let monthIdx = showAll ? i : m;
        let d = decs[monthIdx] * Math.PI/180;
        let timeData = [];
        for(let h=0; h<=24; h+=0.5) {
            let hrAngle = (h - 12) * 15 * Math.PI/180;
            let alt = Math.asin( Math.sin(l)*Math.sin(d) + Math.cos(l)*Math.cos(d)*Math.cos(hrAngle) );
            let y = alt > 0 ? 1000 * Math.sin(alt) : 0;
            timeData.push(y);
        }
        let isSelected = (monthIdx === m);
        let color = showAll ? `hsl(${monthIdx * 30}, 80%, 65%)` : '#D4AF37';
        datasets.push({
            label: monthNames[monthIdx],
            data: timeData,
            borderColor: color,
            backgroundColor: isSelected ? (showAll ? `hsla(${monthIdx * 30}, 80%, 65%, 0.15)` : 'rgba(212, 175, 55, 0.15)') : 'transparent',
            borderWidth: isSelected ? 3 : 1.5,
            fill: isSelected,
            tension: 0.4,
            pointRadius: 0,
            order: isSelected ? 0 : 1
        });
    }
    pvTimeChart.options.plugins.legend.display = showAll;
    pvTimeChart.options.plugins.legend.labels = { color: 'rgba(255,255,255,0.7)', font: { size: 10 } };
    pvTimeChart.data.datasets = datasets;
    pvTimeChart.update();

    // Update text fields
    let optTilt = Math.abs(lat - (decs[m]));
    let el_tilt = document.getElementById('pv-tilt');
    if(el_tilt) el_tilt.textContent = optTilt.toFixed(1) + '\u00B0';
    let t = parseFloat(document.getElementById('pv-time')?.value) || 12;
    let timeValEl = document.getElementById('pv-time-val');
    if(timeValEl) {
        let hh = Math.floor(t);
        let mm = t % 1 === 0 ? '00' : '30';
        timeValEl.textContent = `${hh.toString().padStart(2, '0')}:${mm}`;
    }
    let hrA = (t-12)*15*Math.PI/180;
    let sinAlt = Math.sin(lat*Math.PI/180)*Math.sin(dec) + Math.cos(lat*Math.PI/180)*Math.cos(dec)*Math.cos(hrA);
    let alt0 = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
    let yW = alt0 > 0 ? 1000*Math.sin(alt0) : 0;
    let el_y = document.getElementById('pv-yield');
    if(el_y) el_y.textContent = yW.toFixed(0) + ' W/m\u00B2';
    let dailyE = monthlyYields[m] / 30;
    let el_d = document.getElementById('pv-daily');
    if(el_d) el_d.textContent = dailyE.toFixed(2) + ' kWh/m\u00B2';
};

// ==========================================
// NEW FILTER DESIGNER BODE PLOT (CHART.JS)
// ==========================================
let filterBodeChart = null;

function initFilterBodeChart() {
    const ctx = document.getElementById('filter-canvas');
    if(!ctx) return;
    if(filterBodeChart) filterBodeChart.destroy();

    filterBodeChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Magnitude (dB)',
                data: [],
                borderColor: '#D4AF37',
                borderWidth: 2,
                tension: 0.1,
                pointRadius: 0,
                fill: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            scales: {
                x: {
                    title: { display: true, text: 'Frequency', color: 'rgba(255,255,255,0.6)' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: { color: 'rgba(255, 255, 255, 0.5)', maxTicksLimit: 10 }
                },
                y: {
                    title: { display: true, text: 'Magnitude (dB)', color: 'rgba(255,255,255,0.6)' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: { color: 'rgba(255, 255, 255, 0.5)' },
                    min: -60, max: 5
                }
            },
            plugins: { legend: { display: false } }
        }
    });
}

window.addEventListener('DOMContentLoaded', function() { initFilterBodeChart(); });

// Override runFilter to use Chart.js
var _origRunFilter = (typeof runFilter === 'function') ? runFilter : null;
window.runFilter = function() {
    const fc = parseFloat(document.getElementById('calc-filter-fc')?.value);
    if(!fc || !filterBodeChart) { if(_origRunFilter) _origRunFilter(); return; }

    let type = document.getElementById('filter-type')?.value || 'rc';
    let order = (type==='lc') ? 2 : (type==='lcl'||type==='clc') ? 3 : 1;

    let labels = [];
    let data = [];
    for(let i=0; i<=200; i++) {
        let freq = fc * Math.pow(10, -2 + (i/200)*4);
        let ratio = freq / fc;
        let mag = 1 / Math.sqrt(1 + Math.pow(ratio, 2 * order));
        let db = 20 * Math.log10(mag);
        let lbl = freq >= 1e6 ? (freq/1e6).toFixed(1)+'MHz' : freq >= 1000 ? (freq/1000).toFixed(1)+'kHz' : freq.toFixed(0)+'Hz';
        labels.push(lbl);
        data.push(db);
    }
    filterBodeChart.data.labels = labels;
    filterBodeChart.data.datasets[0].data = data;
    filterBodeChart.update();
};


window.updatePVFromInputs = function() {
  let lat = parseFloat(document.getElementById("pv-lat").value) || 0;
  let lng = parseFloat(document.getElementById("pv-lng").value) || 0;
  _solarLat = lat;
  _solarLon = lng;
  if (window.calculateSolarMath) window.calculateSolarMath();
};


// ==========================================
// GLOBAL STANDARD VALUE SUGGESTIONS
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const allInputs = document.querySelectorAll('input[type="number"]');
        allInputs.forEach(input => {
            const id = input.id || '';
            const labelEl = input.parentElement;
            const textContent = labelEl ? labelEl.textContent : '';
            
            // Heuristic to detect Resistance or Capacitance
            const isRes = textContent.includes('Ω') || id.match(/-r\d*$/i) || id.includes('-r-') || id.includes('rtop') || id.includes('rbot');
            const isCap = textContent.includes('F') || id.match(/-c\d*$/i) || id.includes('-c-');
            
            // Ignore non-components like time, temp, turns, etc.
            if ((isRes || isCap) && !id.includes('time') && !id.includes('temp')) {
                let sugSpan = document.getElementById('sug-' + id);
                if (!sugSpan) {
                    sugSpan = document.createElement('span');
                    sugSpan.id = 'sug-' + id;
                    sugSpan.className = "text-[9px] text-themeAccent cursor-pointer hover:underline mt-0.5 opacity-0 h-0 transition-opacity whitespace-nowrap block";
                    
                    if (input.nextSibling) {
                        input.parentElement.insertBefore(sugSpan, input.nextSibling);
                    } else {
                        input.parentElement.appendChild(sugSpan);
                    }
                    
                    const pStyle = window.getComputedStyle(input.parentElement);
                    if (pStyle.display === 'flex' && pStyle.flexDirection === 'row') {
                        input.parentElement.style.flexWrap = 'wrap';
                        sugSpan.style.width = '100%';
                        sugSpan.style.textAlign = 'right';
                    }
                }
                
                const updateCb = () => {
                    const val = parseFloat(input.value);
                    if (val > 0) {
                        let e, seriesName;
                        if (isRes) {
                            e = window.getNearest(val, window.E24);
                            seriesName = 'E24';
                        } else {
                            e = window.getNearest(val, window.E12);
                            seriesName = 'E12';
                        }
                        
                        let unitStr = window.formatUnit ? window.formatUnit(e.val) : e.val;
                        let suffix = isRes ? 'Ω' : 'F';
                        let diff = Math.abs(e.val - val) / val;
                        
                        if (diff < 0.01) {
                            sugSpan.textContent = `Standard ${seriesName}: ${unitStr}${suffix}`;
                            sugSpan.dataset.val = e.val;
                            sugSpan.classList.remove('opacity-0', 'h-0');
                            sugSpan.classList.add('opacity-50'); // Dim if already standard
                        } else {
                            sugSpan.textContent = `Set nearest ${seriesName}: ${unitStr}${suffix}`;
                            sugSpan.dataset.val = e.val;
                            sugSpan.classList.remove('opacity-0', 'h-0', 'opacity-50');
                        }
                    } else {
                        sugSpan.classList.add('opacity-0', 'h-0');
                    }
                };
                
                input.addEventListener('input', updateCb);
                
                let lastVal = input.value;
                setInterval(() => {
                    if (input.value !== lastVal) {
                        lastVal = input.value;
                        updateCb();
                    }
                }, 500);
                
                sugSpan.addEventListener('click', () => {
                    input.value = sugSpan.dataset.val;
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    if (input.oninput) {
                        input.oninput({ target: input });
                    }
                });
                
                updateCb();
            }
        });
    }, 1000);
});
