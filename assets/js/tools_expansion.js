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
                <div class="flex justify-between text-xs"><label>R_top (kohms)</label><input type="number" id="vm-rtop" value="10" class="w-16 border border-themeBorder px-1 text-right" oninput="runMargin()"></div>
                <div class="flex justify-between text-xs"><label>R_bot (kohms)</label><input type="number" id="vm-rbot" value="2.2" class="w-16 border border-themeBorder px-1 text-right" oninput="runMargin()"></div>
            </div>
            <div class="space-y-2 border-l border-themeBorder/20 pl-4">
                <div class="flex justify-between text-xs"><label class="text-themeAccent">V_dac (V)</label><input type="number" id="vm-vdac" value="1.5" step="0.1" class="w-16 border border-themeBorder px-1 text-right bg-themeAccent/10" oninput="runMargin()"></div>
                <div class="flex justify-between text-xs"><label>R_inj (kohms)</label><input type="number" id="vm-rinj" value="47" class="w-16 border border-themeBorder px-1 text-right" oninput="runMargin()"></div>
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
                <div class="flex justify-between text-xs"><label>R_top (kohms)</label><input type="number" id="vm-rtop" value="10" class="w-16 border border-themeBorder px-1 text-right" oninput="runMargin()"></div>
                <div class="flex justify-between text-xs"><label>R_bot (kohms)</label><input type="number" id="vm-rbot" value="2.2" class="w-16 border border-themeBorder px-1 text-right" oninput="runMargin()"></div>
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
document.addEventListener('toolLoaded', () => {
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

document.addEventListener('toolLoaded', () => {
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

document.addEventListener('toolLoaded', () => {
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

    let l1_label = 'R1 (ohms) / L1 (µH)';
    let c1_label = 'C1 (µF) / R1 (ohms)';
    if(type === 'rc') { l1_label = 'R (ohms)'; c1_label = 'C (µF)'; }
    if(type === 'rl') { l1_label = 'L (µH)'; c1_label = 'R (ohms)'; }
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

document.addEventListener('toolLoaded', () => {
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
                <label>R_nom (ohms @ 25°C)</label>
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
                <label>R at Target (ohms)</label>
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
                <label>R at Target (ohms)</label>
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

    document.getElementById('ntc-result').textContent = solveTarget === 'rt' ? (rt ? rt.toFixed(1) + " ohms" : "-") : (temp ? temp.toFixed(2) + " °C" : "-");
}

document.addEventListener('toolLoaded', () => {
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

document.addEventListener('toolLoaded', () => {
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

    if(pvTimeChart) pvTimeChart.destroy();
    if(pvHistChart) pvHistChart.destroy();

    const mutedColor = getComputedStyle(document.documentElement).getPropertyValue('--muted-text').trim() || '#888';
    const gridColor = getComputedStyle(document.documentElement).getPropertyValue('--grid-color').trim() || 'rgba(128,128,128,0.2)';

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
                pointRadius: 0,
                pointHoverRadius: 4,
                hitRadius: 15
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
                axis: 'x'
            },
            scales: {
                x: {
                    grid: { color: gridColor },
                    ticks: { color: mutedColor }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: gridColor },
                    ticks: { color: mutedColor },
                    max: 1100
                }
            },
            plugins: { 
                legend: { display: false, labels: { color: mutedColor, font: { size: 10 } } },
                tooltip: { enabled: true, intersect: false, mode: 'index' }
            }
        },
        plugins: [{
            id: 'verticalLine',
            afterDraw: chart => {
                if (chart.tooltip?._active?.length) {
                    let x = chart.tooltip._active[0].element.x;
                    let yAxis = chart.scales.y;
                    let ctx = chart.ctx;
                    ctx.save();
                    ctx.beginPath();
                    ctx.moveTo(x, yAxis.top);
                    ctx.lineTo(x, yAxis.bottom);
                    ctx.lineWidth = 1;
                    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim() || '#D4AF37';
                    ctx.setLineDash([5, 5]);
                    ctx.stroke();
                    ctx.restore();
                }
            }
        }]
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
            interaction: {
                mode: 'index',
                intersect: false
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: mutedColor }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: gridColor },
                    ticks: { color: mutedColor }
                }
            },
            plugins: { 
                legend: { display: false },
                tooltip: { enabled: true, intersect: false, mode: 'index' }
            }
        }
    });
}

document.addEventListener('toolLoaded', () => {
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
    const mutedColor = getComputedStyle(document.documentElement).getPropertyValue('--muted-text').trim() || '#888';
    pvTimeChart.options.plugins.legend.labels = { color: mutedColor, font: { size: 10 } };
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
    let dec = decs[m] * Math.PI/180;
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
    let existingChart = Chart.getChart(ctx);
    if(existingChart) existingChart.destroy();

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

document.addEventListener('toolLoaded', function() { initFilterBodeChart(); });

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
document.addEventListener('toolLoaded', () => {
    setTimeout(() => {
        const allInputs = document.querySelectorAll('input[type="number"]');
        allInputs.forEach(input => {
            const id = input.id || '';
            const labelEl = input.parentElement;
            const textContent = labelEl ? labelEl.textContent : '';
            
            // Heuristic to detect Resistance or Capacitance
            const isRes = textContent.includes('ohms') || id.match(/-r\d*$/i) || id.includes('-r-') || id.includes('rtop') || id.includes('rbot');
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
                        let suffix = isRes ? 'ohms' : 'F';
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


// ==========================================
// PLANAR SPIRAL INDUCTOR (ADVANCED 3D)
// ==========================================

const K_COEFFS = {
    'square': { k1: 2.34, k2: 2.75 },
    'hexagonal': { k1: 2.33, k2: 3.82 },
    'octagonal': { k1: 2.25, k2: 3.55 }
};

let inductorScene, inductorCamera, inductorRenderer, inductorMesh;
let inductorReqId = null;

function initPlanarInductor3D() {
    const container = document.getElementById('ind-3d-container');
    if (!container || inductorRenderer) return; // already init

    inductorScene = new THREE.Scene();
    inductorCamera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    inductorCamera.position.set(0, -50, 50);
    inductorCamera.lookAt(0, 0, 0);

    inductorRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    inductorRenderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(inductorRenderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    inductorScene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(20, 20, 50);
    inductorScene.add(dirLight);

    inductorMesh = new THREE.Group();
    inductorScene.add(inductorMesh);

    // Grid helper
    const gridHelper = new THREE.GridHelper(100, 10, 0x444444, 0x222222);
    gridHelper.rotation.x = Math.PI / 2;
    inductorScene.add(gridHelper);

    updateInductor();

    const animate = function () {
        inductorReqId = requestAnimationFrame(animate);
        inductorMesh.rotation.z += 0.005;
        inductorRenderer.render(inductorScene, inductorCamera);
    };
    animate();
}

window.updateInductor = function() {
    if (!document.getElementById('ind-shape')) return;

    const shape = document.getElementById('ind-shape').value;
    const N = parseFloat(document.getElementById('ind-n').value) || 1;
    const D_out = parseFloat(document.getElementById('ind-dout').value) || 10;
    const W = parseFloat(document.getElementById('ind-w').value) || 0.5;
    const S = parseFloat(document.getElementById('ind-s').value) || 0.2;
    const t = parseFloat(document.getElementById('ind-t').value) || 0.035;
    
    const M = parseInt(document.getElementById('ind-layers').value) || 1;
    const layer_conn = document.getElementById('ind-connection').value;
    const h = parseFloat(document.getElementById('ind-h').value) || 0.2;
    const mu_r = parseFloat(document.getElementById('ind-mur').value) || 1;

    const wall_thickness = (N * W) + ((N - 1) * S);
    const D_in = D_out - (2 * wall_thickness);

    const warningsEl = document.getElementById('ind-warnings');
    if (D_in <= 0) {
        warningsEl.innerHTML = `<span class="text-red-400"><i class="fa-solid fa-triangle-exclamation"></i> Invalid geometry: Inner diameter is &le; 0.</span>`;
        document.getElementById('ind-l').innerText = "0.0";
        document.getElementById('ind-din').innerText = D_in.toFixed(2) + " mm";
        return;
    } else {
        warningsEl.innerHTML = `<span class="text-green-400"><i class="fa-solid fa-check"></i> Geometry valid.</span>`;
    }

    const D_avg = (D_out + D_in) / 2;
    const rho = (D_out - D_in) / (D_out + D_in);

    const k1 = K_COEFFS[shape].k1;
    const k2 = K_COEFFS[shape].k2;
    const mu0 = 4 * Math.PI * 1e-7;

    const D_avg_m = D_avg / 1000;
    
    // Single layer inductance
    const L_single = k1 * mu0 * (N * N) * D_avg_m / (1 + k2 * rho);
    
    // Approximation for effective permeability for a core sandwich
    // For a fully closed core, mu_eff approaches mu_r. For open planar, it's heavily air-gapped.
    // We'll use a simplified weighted mu_eff based on mu_r.
    const mu_eff = 1 + (mu_r - 1) * 0.5; 

    let L_tot = L_single * mu_eff;
    let DCR_single = 0;
    
    // Approx trace length
    let len_mm = 0;
    if(shape === 'square') len_mm = 4 * N * D_avg;
    else if (shape === 'hexagonal') len_mm = 3 * N * D_avg;
    else len_mm = Math.PI * N * D_avg;

    // Copper resistivity (ohms*mm^2 / m) -> 0.0171
    // R = rho * L / A
    const trace_area = W * t; // mm^2
    DCR_single = (0.0171 * (len_mm / 1000)) / trace_area;

    const f_ac_hz = (parseFloat(document.getElementById('ind-f').value) || 1) * 1e6;
    const er = parseFloat(document.getElementById('ind-er').value) || 4.4;
    
    // AC Resistance (Skin Effect)
    const rho_cu = 1.71e-8; // ohm*m
    const delta = Math.sqrt(rho_cu / (Math.PI * f_ac_hz * mu0)); // m
    const delta_mm = delta * 1000;
    const t_eff = Math.min(t, 2 * delta_mm);
    const ACR_single = (0.0171 * (len_mm / 1000)) / (W * t_eff);

    let DCR_tot = DCR_single;
    let ACR_tot = ACR_single;
    let M_val = 0;

    const eps0 = 8.854e-12;
    // Gap capacitance (between turns)
    const C_gap = eps0 * er * (t / 1000) / (S / 1000) * (len_mm / 1000); 
    let C_p = C_gap;

    if (M > 1) {
        const C_layer = eps0 * er * (len_mm / 1000 * W / 1000) / (h / 1000);
        if (layer_conn === 'series') {
            L_tot = L_tot * Math.pow(M, 1.6);
            DCR_tot = DCR_single * M;
            ACR_tot = ACR_single * M;
            C_p += C_layer / 3;
            M_val = (L_tot - M * (L_single * mu_eff)) / 2;
        } else {
            L_tot = L_tot * (1 - 0.05 * (M - 1));
            DCR_tot = DCR_single / M;
            ACR_tot = ACR_single / M;
            C_p += C_layer;
        }
    }

    let L_display = L_tot * 1e9; // nH
    let unit = "nH";
    if (L_display > 1000) {
        L_display /= 1000;
        unit = "&micro;H";
    }

    document.getElementById('ind-l').innerText = L_display.toFixed(2);
    document.getElementById('ind-l-unit').innerHTML = unit;
    document.getElementById('ind-din').innerText = D_in.toFixed(2) + " mm";
    document.getElementById('ind-rho').innerText = rho.toFixed(3);
    document.getElementById('ind-dcr').innerHTML = DCR_tot.toFixed(3) + " &Omega;";
    document.getElementById('ind-mueff').innerText = mu_eff.toFixed(2);
    
    document.getElementById('ind-acr').innerHTML = ACR_tot.toFixed(3) + " &Omega;";
    document.getElementById('ind-cp').innerText = (C_p * 1e12).toFixed(2) + " pF";
    const m_cont = document.getElementById('ind-m-cont');
    if(M_val > 0) {
        m_cont.classList.remove('hidden');
        document.getElementById('ind-m').innerText = (M_val * 1e9).toFixed(2) + " nH";
    } else {
        m_cont.classList.add('hidden');
    }

    // Update 3D Model
    if (inductorMesh && typeof THREE !== 'undefined') {
        // clear old
        while(inductorMesh.children.length > 0) { 
            inductorMesh.remove(inductorMesh.children[0]); 
        }

        const material = new THREE.MeshStandardMaterial({ color: 0xb87333, metalness: 0.8, roughness: 0.2 }); // Copper
        
        for (let m = 0; m < M; m++) {
            const z_offset = (m - (M-1)/2) * h;
            
            // Build spiral path
            const points = [];
            const segments = (shape === 'square') ? 4 : (shape === 'hexagonal') ? 6 : 32;
            const angleStep = (2 * Math.PI) / segments;
            const radiusStep = (W + S) / segments;
            
            let currentRadius = D_out / 2;
            
            for (let i = 0; i <= N * segments; i++) {
                const theta = i * angleStep;
                const x = currentRadius * Math.cos(theta);
                const y = currentRadius * Math.sin(theta);
                points.push(new THREE.Vector3(x, y, z_offset));
                currentRadius -= radiusStep;
            }

            const path = new THREE.CatmullRomCurve3(points);
            const tubeGeo = new THREE.TubeGeometry(path, points.length * 2, W / 2, 8, false);
            const tubeMesh = new THREE.Mesh(tubeGeo, material);
            inductorMesh.add(tubeMesh);
        }
        
        // Scale to fit camera
        const scale = 30 / D_out;
        inductorMesh.scale.set(scale, scale, scale);
    }
}


// ==========================================
// HEATSINK THERMAL SIMULATOR (3D)
// ==========================================

let hsScene, hsCamera, hsRenderer, hsGroup, hsControls;
let hsReqId = null;

function initHeatsink3D() {
    const container = document.getElementById('hs-3d-container');
    if (!container || hsRenderer) return;

    let width = container.clientWidth || 300;
    let height = container.clientHeight || 256;

    hsScene = new THREE.Scene();
    hsCamera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    hsCamera.position.set(100, 100, 150);
    hsCamera.lookAt(0, 0, 0);

    hsRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    hsRenderer.setSize(width, height);
    container.appendChild(hsRenderer.domElement);

    if (typeof THREE.OrbitControls !== 'undefined') {
        hsControls = new THREE.OrbitControls(hsCamera, hsRenderer.domElement);
        hsControls.enableDamping = true;
        hsControls.dampingFactor = 0.05;
    }

    const ro = new ResizeObserver(entries => {
        for (let entry of entries) {
            if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
                hsCamera.aspect = entry.contentRect.width / entry.contentRect.height;
                hsCamera.updateProjectionMatrix();
                hsRenderer.setSize(entry.contentRect.width, entry.contentRect.height);
            }
        }
    });
    ro.observe(container);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    hsScene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
    dirLight.position.set(50, 100, 50);
    hsScene.add(dirLight);

    hsGroup = new THREE.Group();
    hsScene.add(hsGroup);

    // Grid helper
    const gridHelper = new THREE.GridHelper(150, 15, 0x444444, 0x222222);
    hsScene.add(gridHelper);

    updateHeatsink();

    const animate = function () {
        hsReqId = requestAnimationFrame(animate);
        if (hsControls) hsControls.update();
        hsRenderer.render(hsScene, hsCamera);
    };
    animate();
}

window.updateHeatsink = function() {
    if (!document.getElementById('hs-pd')) return;

    const pd = parseFloat(document.getElementById('hs-pd').value) || 0;
    const ta = parseFloat(document.getElementById('hs-ta').value) || 25;
    const rjc = parseFloat(document.getElementById('hs-rjc').value) || 0;
    const rcs = parseFloat(document.getElementById('hs-rcs').value) || 0;
    
    const W = parseFloat(document.getElementById('hs-w').value) || 50;
    const L = parseFloat(document.getElementById('hs-l').value) || 50;
    const tb = parseFloat(document.getElementById('hs-tb').value) || 5;
    const hf = parseFloat(document.getElementById('hs-hf').value) || 20;
    const tf = parseFloat(document.getElementById('hs-tf').value) || 1.5;
    const N = parseInt(document.getElementById('hs-n').value) || 10;
    
    const lfm = parseFloat(document.getElementById('hs-lfm').value) || 0;
    const k_mat = parseFloat(document.getElementById('hs-mat').value) || 205; // W/mK

    const warningsEl = document.getElementById('hs-warnings');
    
    if (N < 2 || tf * N >= W) {
        warningsEl.innerHTML = `<span class="text-red-400"><i class="fa-solid fa-triangle-exclamation"></i> Invalid fins: Too many fins for the base width.</span>`;
        return;
    } else {
        warningsEl.innerHTML = `<span class="text-green-400"><i class="fa-solid fa-check"></i> Geometry valid.</span>`;
    }
    
    const tjmax = parseFloat(document.getElementById('hs-tjmax')?.value) || 125;

    // Thermal Resistance Calculation Approximation
    // 1. Surface Area
    const baseArea = (W * L) / 100; // cm^2
    const finAreaOne = (hf * L * 2) / 100 + (tf * L) / 100; // cm^2
    const totalArea = baseArea + (finAreaOne * N); // cm^2
    
    // 2. Heat transfer coefficient (h) in W/(m^2 K)
    // Natural convection h ~ 5 to 10. Forced ~ 10 to 100 depending on LFM.
    let h_conv = 5; // W/m^2K natural
    if (lfm > 0) {
        // Very rough empirical rule for LFM to h (W/m^2K)
        h_conv = 5 + 4 * Math.sqrt(lfm / 100);
    }
    
    // Convert Area to m^2
    const area_m2 = totalArea / 10000;
    
    // Fin efficiency (simplification)
    // m = sqrt(2*h / (k * tf)) where tf is in meters
    const m_fin = Math.sqrt((2 * h_conv) / (k_mat * (tf / 1000)));
    const hf_m = hf / 1000;
    let fin_eff = Math.tanh(m_fin * hf_m) / (m_fin * hf_m);
    if(isNaN(fin_eff) || fin_eff > 1) fin_eff = 1;
    
    // Effective area = Base + Fins * eff
    const a_eff_m2 = (baseArea / 10000) + (N * (finAreaOne / 10000) * fin_eff);
    
    // R_sa = 1 / (h * A_eff)
    const Rsa = 1 / (h_conv * a_eff_m2);
    
    // Temperatures
    const Ts = ta + (pd * Rsa);
    const Tc = Ts + (pd * rcs);
    const Tj = Tc + (pd * rjc);
    
    document.getElementById('hs-rsa').innerText = Rsa.toFixed(2) + " °C/W";
    document.getElementById('hs-tj').innerText = Tj.toFixed(1);
    document.getElementById('hs-ts').innerText = Ts.toFixed(1);
    document.getElementById('hs-area').innerText = totalArea.toFixed(1) + " cm²";
    
    const vol_cm3 = ((W * L * tb) + (N * tf * hf * L)) / 1000;
    document.getElementById('hs-vol').innerText = vol_cm3.toFixed(1) + " cm³";
    
    // Update 3D Model
    if (hsGroup && typeof THREE !== 'undefined') {
        while(hsGroup.children.length > 0) { 
            hsGroup.remove(hsGroup.children[0]); 
        }

        // Red = hot, Blue = cold
        const maxTempColor = new THREE.Color(0xff3333);
        const minTempColor = new THREE.Color(0x3333ff);
        
        // Base geometry
        const baseGeo = new THREE.BoxGeometry(W, tb, L);
        const t_ratio = Math.min((Ts - ta) / (tjmax - ta), 1.0);
        const baseColor = minTempColor.clone().lerp(maxTempColor, t_ratio);
        const coloredBaseMat = new THREE.MeshStandardMaterial({ color: baseColor, metalness: 0.5, roughness: 0.5 });
        
        const baseMesh = new THREE.Mesh(baseGeo, coloredBaseMat);
        baseMesh.position.y = tb / 2;
        hsGroup.add(baseMesh);
        
        // Fins geometry
        const finSpacing = (W - (N * tf)) / (N - 1);
        const tipTemp = Ts - (Ts - ta)*(1 - fin_eff);
        
        for (let i = 0; i < N; i++) {
            const finGeo = new THREE.BoxGeometry(tf, hf, L, 1, 4, 1);
            const count = finGeo.attributes.position.count;
            finGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
            const pos = finGeo.attributes.position;
            const col = finGeo.attributes.color;
            for(let j=0; j<count; j++) {
                const py = pos.getY(j);
                const normY = (py + hf/2) / hf;
                const vertTemp = Ts - (Ts - tipTemp)*normY;
                const vRatio = Math.max(0, Math.min((vertTemp - ta) / (tjmax - ta), 1.0));
                const vColor = minTempColor.clone().lerp(maxTempColor, vRatio);
                col.setXYZ(j, vColor.r, vColor.g, vColor.b);
            }
            
            const finMat = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.5, roughness: 0.5 });
            const finMesh = new THREE.Mesh(finGeo, finMat);
            const x_pos = -W/2 + (tf/2) + i * (tf + finSpacing);
            finMesh.position.set(x_pos, tb + (hf/2), 0);
            hsGroup.add(finMesh);
        }
        
        // Heat source (Die/Package)
        const compGeo = new THREE.BoxGeometry(W * 0.4, 2, L * 0.4);
        const tjRatio = Math.min((Tj - ta) / (tjmax - ta), 1.0);
        const tjColor = minTempColor.clone().lerp(new THREE.Color(0xff0000), tjRatio);
        // Make it look like a black chip with a glowing hot center dot on top
        const compMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8, roughness: 0.2 });
        const compMesh = new THREE.Mesh(compGeo, compMat);
        compMesh.position.y = -1;
        hsGroup.add(compMesh);
        
        // Add a glowing "junction" indicator
        const juncGeo = new THREE.PlaneGeometry(W * 0.2, L * 0.2);
        const juncMat = new THREE.MeshBasicMaterial({ color: tjColor, side: THREE.DoubleSide });
        const juncMesh = new THREE.Mesh(juncGeo, juncMat);
        juncMesh.rotation.x = -Math.PI / 2;
        juncMesh.position.y = 0.05; // just above package
        compMesh.add(juncMesh);
        
        // Airflow Arrows
        if (lfm > 0) {
            const dir = new THREE.Vector3(0, 0, -1);
            const arrowLen = L * 1.5;
            for(let j=1; j<N; j+=Math.max(1, Math.floor(N/3))) {
                const startPos = new THREE.Vector3(-W/2 + j*(tf + finSpacing) - finSpacing/2, tb + hf/2, L/2 + 10);
                const arrow = new THREE.ArrowHelper(dir, startPos, arrowLen, 0x3b82f6, 10, 5);
                hsGroup.add(arrow);
            }
        }
        
        // Scale to fit camera nicely
        const scale = 80 / Math.max(W, L);
        hsGroup.scale.set(scale, scale, scale);
        hsGroup.position.y = -10;
    }
}

window.runHeatsinkSim = function() {
    updateHeatsink();
    const pd = parseFloat(document.getElementById('hs-pd').value) || 50;
    const ta = parseFloat(document.getElementById('hs-ta').value) || 25;
    const tjmax = parseFloat(document.getElementById('hs-tjmax').value) || 125;
    const W = parseFloat(document.getElementById('hs-w').value) || 50;
    const L = parseFloat(document.getElementById('hs-l').value) || 50;
    const tb = parseFloat(document.getElementById('hs-tb').value) || 5;
    const hf = parseFloat(document.getElementById('hs-hf').value) || 20;
    const tf = parseFloat(document.getElementById('hs-tf').value) || 1.5;
    const N = parseInt(document.getElementById('hs-n').value) || 10;
    const lfm = parseFloat(document.getElementById('hs-lfm').value) || 0;
    const rjc = parseFloat(document.getElementById('hs-rjc').value) || 0;
    const rcs = parseFloat(document.getElementById('hs-rcs').value) || 0;
    const k_mat = parseFloat(document.getElementById('hs-mat').value) || 205;
    
    // Function to calculate Rsa given parameters
    const calcRsa = (nf, height, flow) => {
        const bArea = W*L/100;
        const fArea = (height*L*2)/100 + (tf*L)/100;
        let h_c = 5; if(flow>0) h_c = 5 + 4*Math.sqrt(flow/100);
        const m_fin = Math.sqrt((2*h_c)/(k_mat*(tf/1000)));
        let f_eff = Math.tanh(m_fin*(height/1000))/(m_fin*(height/1000));
        if(isNaN(f_eff) || f_eff>1) f_eff=1;
        const a_eff = (bArea/10000) + (nf*(fArea/10000)*f_eff);
        return 1/(h_c*a_eff);
    };
    
    const currRsa = calcRsa(N, hf, lfm);
    const currTj = ta + pd*(currRsa + rcs + rjc);
    
    const recPanel = document.getElementById('hs-recommendation-panel');
    const recText = document.getElementById('hs-recommendation-text');
    recPanel.classList.remove('hidden');
    
    let recommendations = [];
    
    if(currTj > tjmax) {
        recommendations.push(`<span class="text-red-400 font-bold"><i class="fa-solid fa-triangle-exclamation"></i> Thermal Failure:</span> Current $T_j$ (${currTj.toFixed(1)}&deg;C) exceeds maximum of ${tjmax}&deg;C.`);
        // Try increasing LFM
        if(lfm < 100) {
            let neededLFM = 100;
            while(neededLFM < 1000 && (ta + pd*(calcRsa(N, hf, neededLFM) + rcs + rjc)) > tjmax) neededLFM += 50;
            if(neededLFM < 1000) recommendations.push(`- <strong class="text-blue-400">Increase Airflow:</strong> Providing ${neededLFM} LFM solves the thermal issue.`);
            else recommendations.push(`- Airflow alone cannot solve this. A larger heatsink or better TIM is required.`);
        }
        // Try increasing fins
        const maxFins = Math.floor(W/tf) - 1;
        if(N < maxFins) {
            let optFins = N;
            while(optFins < maxFins && (ta + pd*(calcRsa(optFins, hf, lfm) + rcs + rjc)) > tjmax) optFins++;
            if(optFins < maxFins) recommendations.push(`- <strong class="text-themeAccent">Increase Fins:</strong> Adding fins to N=${optFins} solves the thermal issue.`);
        }
    } else {
        recommendations.push(`<span class="text-green-400 font-bold"><i class="fa-solid fa-check-circle"></i> Thermally Stable:</span> Current $T_j$ is safely below ${tjmax}&deg;C.`);
    }
    
    // Diminishing returns check for Fins
    const maxFins = Math.floor(W/tf) - 1;
    if(N < maxFins) {
        const nextRsa = calcRsa(N+2, hf, lfm);
        const improvement = ((currRsa - nextRsa)/currRsa)*100;
        if(improvement < 5) recommendations.push(`- Adding more fins yields <strong>diminishing returns</strong> (<5% improvement). Current fin count is optimal or saturated for this width.`);
    }
    
    recText.innerHTML = recommendations.join('<br><br>');
    if(typeof MathJax !== 'undefined') MathJax.typesetPromise([recText]);
};


// ==========================================
// ADVANCED MAGNETIC CORE CALCULATOR
// ==========================================

window.updateMagCore = function() {
    if (!document.getElementById('mag-le')) return;

    const le = parseFloat(document.getElementById('mag-le').value) || 0; // mm
    const ae = parseFloat(document.getElementById('mag-ae').value) || 0; // mm^2
    const matSel = document.getElementById('mag-mat').value;
    const customCont = document.getElementById('mag-mu-custom-cont');
    
    let mu_i = 1;
    if (matSel === 'custom') {
        customCont.classList.remove('hidden');
        mu_i = parseFloat(document.getElementById('mag-mu-custom').value) || 1;
    } else {
        customCont.classList.add('hidden');
        mu_i = parseFloat(matSel) || 1;
    }

    const lg = parseFloat(document.getElementById('mag-lg').value) || 0; // mm
    const N = parseFloat(document.getElementById('mag-n').value) || 1;
    const I = parseFloat(document.getElementById('mag-i').value) || 0; // A
    const Bsat = parseFloat(document.getElementById('mag-bsat').value) || 0.3; // T

    const le_m = le / 1000;
    const ae_m2 = ae / 1e6;
    const lg_m = lg / 1000;
    const mu0 = 4 * Math.PI * 1e-7;

    // Reluctance
    // Rc = le / (mu0 * mu_r * Ae)
    const Rc = le_m / (mu0 * mu_i * ae_m2);
    // Rg = lg / (mu0 * Ae)  // Assuming no fringing for simplicity
    const Rg = lg_m / (mu0 * ae_m2);
    const Rtot = Rc + Rg;

    // Effective Permeability
    // Rtot = (le + lg) / (mu0 * mu_eff * Ae) => mu_eff = (le + lg) / (mu0 * Ae * Rtot)
    const mu_eff = (le_m + lg_m) / (mu0 * ae_m2 * Rtot);

    // Inductance L = N^2 / Rtot
    const L_H = (N * N) / Rtot;
    let L_display = L_H * 1e6; // uH
    let unit = "μH";
    if (L_display < 1) {
        L_display *= 1000;
        unit = "nH";
    } else if (L_display > 1000) {
        L_display /= 1000;
        unit = "mH";
    }

    // AL value = L / N^2 in nH/N^2
    const AL = (L_H * 1e9) / (N * N);

    // Flux Density B = (L * I) / (N * Ae)
    const Bpk = (L_H * I) / (N * ae_m2);

    // Energy E = 1/2 L I^2
    const E_J = 0.5 * L_H * (I * I);

    document.getElementById('mag-out-l').innerText = L_display.toFixed(2);
    document.getElementById('mag-out-l-unit').innerText = unit;
    
    document.getElementById('mag-out-b').innerText = Bpk.toFixed(3);
    
    // Saturation Warning
    const warnEl = document.getElementById('mag-sat-warn');
    if (Bpk >= Bsat && I > 0) {
        warnEl.classList.remove('hidden');
    } else {
        warnEl.classList.add('hidden');
    }

    // Convert Reluctance to scientific notation string for cleaner UI
    document.getElementById('mag-out-rc').innerText = Rc.toExponential(2);
    document.getElementById('mag-out-rg').innerText = Rg.toExponential(2);
    document.getElementById('mag-out-rt').innerText = Rtot.toExponential(2);
    
    document.getElementById('mag-out-al').innerText = AL.toFixed(1) + " nH/N²";
    document.getElementById('mag-out-mueff').innerText = mu_eff.toFixed(1);
    document.getElementById('mag-out-e').innerText = (E_J * 1000).toFixed(2) + " mJ";
}


// ==========================================
// TRANSFORMER DESIGNER & EXTRACTOR
// ==========================================

let xfmrScene, xfmrCamera, xfmrRenderer, xfmrGroup, xfmrControls;
let xfmrReqId = null;
let xfmrCoreMeshes = [];
let xfmrFieldLines = [];
let xfmrLeakageArrows = [];
let xfmrRaycaster, xfmrMouse;
let xfmrProbeObjects = [];

const AWG_DIAMETER_MM = {
    10:2.588, 12:2.053, 14:1.628, 16:1.291, 18:1.024, 20:0.812,
    22:0.644, 24:0.511, 26:0.405, 28:0.321, 30:0.255, 32:0.202,
    34:0.160, 36:0.127, 38:0.101, 40:0.0799
};

function initXfmr3D() {
    const container = document.getElementById('xfmr-3d-container');
    if (!container || xfmrRenderer) return;

    let width = container.clientWidth || 400;
    let height = container.clientHeight || 288;

    xfmrScene = new THREE.Scene();
    xfmrCamera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    xfmrCamera.position.set(60, 45, 80);
    xfmrCamera.lookAt(0, 0, 0);

    xfmrRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    xfmrRenderer.setSize(width, height);
    xfmrRenderer.shadowMap.enabled = true;
    container.appendChild(xfmrRenderer.domElement);

    // OrbitControls
    if (typeof THREE.OrbitControls !== 'undefined') {
        xfmrControls = new THREE.OrbitControls(xfmrCamera, xfmrRenderer.domElement);
        xfmrControls.enableDamping = true;
        xfmrControls.dampingFactor = 0.07;
        xfmrControls.target.set(0, 0, 0);
    }

    // Raycaster for probe
    xfmrRaycaster = new THREE.Raycaster();
    xfmrMouse = new THREE.Vector2();
    xfmrRenderer.domElement.addEventListener('mousemove', (e) => {
        const rect = xfmrRenderer.domElement.getBoundingClientRect();
        xfmrMouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        xfmrMouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        xfmrDoProbe(e);
    });
    xfmrRenderer.domElement.addEventListener('mouseleave', () => {
        const probe = document.getElementById('xfmr-probe-info');
        if(probe) probe.classList.add('hidden');
    });

    const ro = new ResizeObserver(entries => {
        for (let entry of entries) {
            if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
                xfmrCamera.aspect = entry.contentRect.width / entry.contentRect.height;
                xfmrCamera.updateProjectionMatrix();
                xfmrRenderer.setSize(entry.contentRect.width, entry.contentRect.height);
            }
        }
    });
    ro.observe(container);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    xfmrScene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(30, 60, 40);
    dirLight.castShadow = true;
    xfmrScene.add(dirLight);
    const fillLight = new THREE.DirectionalLight(0x6699ff, 0.3);
    fillLight.position.set(-30, -20, -30);
    xfmrScene.add(fillLight);

    xfmrGroup = new THREE.Group();
    xfmrScene.add(xfmrGroup);

    const gridHelper = new THREE.GridHelper(120, 12, 0x333333, 0x1a1a1a);
    gridHelper.position.y = -20;
    xfmrScene.add(gridHelper);

    buildXfmr3D();

    const animate = () => {
        xfmrReqId = requestAnimationFrame(animate);
        if (xfmrControls) xfmrControls.update();
        xfmrRenderer.render(xfmrScene, xfmrCamera);
    };
    animate();
}

function xfmrDoProbe(e) {
    if (!xfmrRaycaster || !xfmrProbeObjects.length) return;
    xfmrRaycaster.setFromCamera(xfmrMouse, xfmrCamera);
    const hits = xfmrRaycaster.intersectObjects(xfmrProbeObjects, false);
    const probe = document.getElementById('xfmr-probe-info');
    if(!probe) return;
    if (hits.length > 0) {
        const obj = hits[0].object;
        const info = obj.userData.probeInfo || '';
        probe.textContent = info;
        probe.classList.remove('hidden');
    } else {
        probe.classList.add('hidden');
    }
}

function xfmrClearGroup() {
    if(!xfmrGroup) return;
    while(xfmrGroup.children.length > 0) {
        const c = xfmrGroup.children[0];
        if(c.geometry) c.geometry.dispose();
        if(c.material) c.material.dispose();
        xfmrGroup.remove(c);
    }
    xfmrProbeObjects = [];
    xfmrFieldLines = [];
    xfmrLeakageArrows = [];
}

window.buildXfmr3D = function(bRatio) {
    if(!xfmrGroup) return;
    xfmrClearGroup();
    const shape = (typeof xfmrCoreShape !== 'undefined') ? xfmrCoreShape : 'EE';
    const showField = (typeof xfmrShowField !== 'undefined') ? xfmrShowField : false;
    const showLeakage = (typeof xfmrShowLeakage !== 'undefined') ? xfmrShowLeakage : false;
    const showSat = (typeof xfmrShowSaturation !== 'undefined') ? xfmrShowSaturation : false;
    const satRatio = bRatio !== undefined ? bRatio : 0.7;

    // Color core based on saturation
    const coreBaseColor = showSat
        ? new THREE.Color().lerpColors(new THREE.Color(0x1a1a2e), new THREE.Color(0xff2200), Math.min(satRatio, 1.0))
        : new THREE.Color(0x1c1c2e);
    
    const coreMat = new THREE.MeshStandardMaterial({ color: coreBaseColor, metalness: 0.6, roughness: 0.5 });
    const priMat = new THREE.MeshStandardMaterial({ color: 0xb87333, metalness: 0.8, roughness: 0.2 }); // copper
    const secMat = new THREE.MeshStandardMaterial({ color: 0xc4a052, metalness: 0.7, roughness: 0.3 }); // gold
    const leakMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.6, side: THREE.DoubleSide });

    const addMesh = (geo, mat, pos, rot, label) => {
        const m = new THREE.Mesh(geo, mat);
        if(pos) m.position.set(...pos);
        if(rot) m.rotation.set(...rot);
        m.castShadow = true;
        if(label) {
            m.userData.probeInfo = label;
            xfmrProbeObjects.push(m);
        }
        xfmrGroup.add(m);
        return m;
    };

    if(shape === 'EE' || shape === 'EI') {
        // E Core: back plate + 3 legs
        addMesh(new THREE.BoxGeometry(40, 25, 6), coreMat, [0,0,-8], null, 'Core Back Yoke — E' + shape);
        addMesh(new THREE.BoxGeometry(6, 25, 20), coreMat, [-17,0,2], null, 'Outer Leg (Left)');
        addMesh(new THREE.BoxGeometry(6, 25, 20), coreMat, [17,0,2], null, 'Outer Leg (Right)');
        addMesh(new THREE.BoxGeometry(10, 25, 20), coreMat, [0,0,2], null, 'Center Leg (Primary flux path)');
        // I Core (mirror) or E mirror
        if(shape === 'EI') {
            addMesh(new THREE.BoxGeometry(40, 25, 6), coreMat, [0,0,22], null, 'I Core — return plate');
        } else {
            // Mirror E
            addMesh(new THREE.BoxGeometry(40, 25, 6), coreMat, [0,0,22], null, 'E Core (back) — mirrored half');
            addMesh(new THREE.BoxGeometry(6, 25, 20), coreMat, [-17,0,12], null, 'Outer Leg (Left) — mirror');
            addMesh(new THREE.BoxGeometry(6, 25, 20), coreMat, [17,0,12], null, 'Outer Leg (Right) — mirror');
            addMesh(new THREE.BoxGeometry(10, 25, 20), coreMat, [0,0,12], null, 'Center Leg — mirror');
        }
        // Primary winding — stacked rings around center leg (Z-axis)
        // Torus default = XY plane with hole along Z — correct for center leg running in Z
        for(let layer=0; layer<3; layer++) {
            const zPos = 2 + (layer - 1) * 5;
            const priRingGeo = new THREE.TorusGeometry(5.5, 1.0, 8, 24);
            addMesh(priRingGeo, priMat, [0, 0, zPos], null, `Primary Winding — Layer ${layer+1} (copper, inner)`);
        }
        // Secondary winding — outer concentric rings
        for(let layer=0; layer<2; layer++) {
            const zPos = 1 + (layer - 0.5) * 6;
            const secRingGeo = new THREE.TorusGeometry(8, 1.0, 8, 24);
            addMesh(secRingGeo, secMat, [0, 0, zPos], null, `Secondary Winding — Layer ${layer+1} (gold, outer)`);
        }

    } else if(shape === 'Toroid') {
        // Toroid core
        const toroidCore = new THREE.TorusGeometry(18, 6, 16, 32);
        addMesh(toroidCore, coreMat, [0,0,0], [Math.PI/2,0,0], 'Toroid Core — closed flux path, zero leakage');
        // Windings as smaller toroids
        for(let i=0; i<8; i++) {
            const angle = (i/8) * Math.PI * 2;
            const r = 18;
            const wx = Math.cos(angle) * r;
            const wz = Math.sin(angle) * r;
            const wGeo = new THREE.TorusGeometry(3.5, 0.8, 6, 12);
            const wMat = (i < 4) ? priMat.clone() : secMat.clone();
            const wMesh = new THREE.Mesh(wGeo, wMat);
            wMesh.position.set(wx, 0, wz);
            wMesh.lookAt(new THREE.Vector3(0,0,0));
            wMesh.rotateY(Math.PI/2);
            wMesh.userData.probeInfo = (i < 4 ? 'Primary' : 'Secondary') + ' turn ' + (i+1);
            xfmrProbeObjects.push(wMesh);
            xfmrGroup.add(wMesh);
        }

    } else if(shape === 'Pot') {
        // Pot core — cylindrical outer, inner post
        const outerGeo = new THREE.CylinderGeometry(20, 20, 15, 32, 1, false);
        addMesh(outerGeo, coreMat, [0,0,0], null, 'Pot Core Outer Shell');
        const innerCutGeo = new THREE.CylinderGeometry(14, 14, 15, 32, 1, false);
        const innerCut = new THREE.Mesh(innerCutGeo, new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide }));
        innerCut.position.set(0,0,0);
        xfmrGroup.add(innerCut);
        addMesh(new THREE.CylinderGeometry(5, 5, 15, 20), coreMat, [0,0,0], null, 'Pot Core Center Post (flux path)');
        // Toroidal winding in gap
        const wGeo = new THREE.TorusGeometry(9.5, 2, 8, 24);
        addMesh(wGeo, priMat, [0,0,0], null, 'Primary Winding');
        const wGeo2 = new THREE.TorusGeometry(9.5, 1.2, 8, 24);
        const wOffset = new THREE.Mesh(wGeo2, secMat);
        wOffset.position.set(0,3.5,0);
        wOffset.userData.probeInfo = 'Secondary Winding';
        xfmrProbeObjects.push(wOffset);
        xfmrGroup.add(wOffset);

    } else if(shape === 'UI') {
        // U + I core
        addMesh(new THREE.BoxGeometry(6, 30, 6), coreMat, [-14,0,0], null, 'U Core Left Leg');
        addMesh(new THREE.BoxGeometry(6, 30, 6), coreMat, [14,0,0], null, 'U Core Right Leg');
        addMesh(new THREE.BoxGeometry(34, 6, 6), coreMat, [0,-12,0], null, 'U Core Bottom Yoke');
        addMesh(new THREE.BoxGeometry(34, 6, 6), coreMat, [0,12,0], null, 'I Core Top Plate');
        // Winding on legs — torus hole along X (encircles the X-axis leg)
        const wGeo = new THREE.TorusGeometry(5, 2, 8, 16);
        addMesh(wGeo, priMat, [-14,0,0], [0,0,Math.PI/2], 'Primary Winding (left leg)');
        addMesh(wGeo.clone(), secMat, [14,0,0], [0,0,Math.PI/2], 'Secondary Winding (right leg)');

    } else if(shape === 'RM') {
        // RM core — rectangular base with round center post
        addMesh(new THREE.BoxGeometry(30, 5, 30), coreMat, [0,-8,0], null, 'RM Base Plate');
        addMesh(new THREE.BoxGeometry(30, 5, 30), coreMat, [0,8,0], null, 'RM Top Plate');
        addMesh(new THREE.CylinderGeometry(7, 7, 16, 20), coreMat, [0,0,0], null, 'RM Center Post');
        // Outer pillars
        addMesh(new THREE.BoxGeometry(4, 16, 4), coreMat, [-12,0,-12], null, 'RM Corner Post');
        addMesh(new THREE.BoxGeometry(4, 16, 4), coreMat, [12,0,-12], null, 'RM Corner Post');
        addMesh(new THREE.BoxGeometry(4, 16, 4), coreMat, [-12,0,12], null, 'RM Corner Post');
        addMesh(new THREE.BoxGeometry(4, 16, 4), coreMat, [12,0,12], null, 'RM Corner Post');
        // Windings
        const wGeo = new THREE.TorusGeometry(9, 2, 8, 24);
        addMesh(wGeo, priMat, [0,-2,0], null, 'Primary Winding');
        addMesh(wGeo.clone(), secMat, [0,2,0], null, 'Secondary Winding');
    }

    // --- Magnetic Field Lines (simplified toroidal arcs through core) ---
    if(showField) {
        const fieldColor = new THREE.Color(0x00bfff);
        const fieldMat = new THREE.LineBasicMaterial({ color: fieldColor, transparent: true, opacity: 0.7 });
        for(let j=0; j<6; j++) {
            const pts = [];
            const offset = (j - 2.5) * 3;
            for(let t=0; t<=64; t++) {
                const angle = (t/64) * Math.PI * 2;
                const rx = 12 + offset * 0.3;
                const ry = 10;
                pts.push(new THREE.Vector3(
                    Math.cos(angle) * rx,
                    Math.sin(angle) * ry,
                    offset
                ));
            }
            const geo = new THREE.BufferGeometry().setFromPoints(pts);
            const line = new THREE.Line(geo, fieldMat.clone());
            xfmrGroup.add(line);
            xfmrFieldLines.push(line);
        }
        // Arrow to show direction
        const arrowDir = new THREE.Vector3(0, 1, 0);
        const arrowOrigin = new THREE.Vector3(0, -10, 0);
        const arrow = new THREE.ArrowHelper(arrowDir, arrowOrigin, 8, 0x00bfff, 3, 2);
        xfmrGroup.add(arrow);
    }

    // --- Leakage Field Visualization ---
    if(showLeakage) {
        // Show fringing flux as disk planes between primary and secondary
        const leakGeo = new THREE.PlaneGeometry(8, 20, 1, 4);
        for(let lk=-1; lk<=1; lk+=2) {
            const lkMesh = new THREE.Mesh(leakGeo, leakMat);
            lkMesh.position.set(lk * 7.5, 0, 7);
            lkMesh.rotation.y = Math.PI / 2;
            lkMesh.userData.probeInfo = 'Leakage flux region — flux not fully coupled between windings';
            xfmrProbeObjects.push(lkMesh);
            xfmrGroup.add(lkMesh);
        }
    }

    xfmrGroup.position.y = 5;
};

window.updateXfmrUI = function() {
    const mode = document.getElementById('xfmr-mode').value;
    if (mode === 'extract') {
        document.getElementById('xfmr-design-cont').classList.add('hidden');
        document.getElementById('xfmr-res-design').classList.add('hidden');
        document.getElementById('xfmr-extract-cont').classList.remove('hidden');
        document.getElementById('xfmr-res-extract').classList.remove('hidden');
    } else {
        document.getElementById('xfmr-design-cont').classList.remove('hidden');
        document.getElementById('xfmr-res-design').classList.remove('hidden');
        document.getElementById('xfmr-extract-cont').classList.add('hidden');
        document.getElementById('xfmr-res-extract').classList.add('hidden');
    }
    updateXfmr();
};

window.updateXfmr = function() {
    if (!document.getElementById('xfmr-mode')) return;
    const mode = document.getElementById('xfmr-mode').value;

    if (mode === 'design') {
        const vp = parseFloat(document.getElementById('xfmr-vp').value) || 230;
        const vs = parseFloat(document.getElementById('xfmr-vs').value) || 24;
        const s = parseFloat(document.getElementById('xfmr-s').value) || 100;
        const f = parseFloat(document.getElementById('xfmr-f').value) || 50;
        const ae = parseFloat(document.getElementById('xfmr-ae').value) || 12;
        const bmax = parseFloat(document.getElementById('xfmr-bmax').value) || 1.2;
        const aw = parseFloat(document.getElementById('xfmr-aw').value) || 15;
        const kw = parseFloat(document.getElementById('xfmr-kw').value) || 0.4;
        const lg_mm = parseFloat(document.getElementById('xfmr-lg').value) || 0;
        const awg = parseInt(document.getElementById('xfmr-awg')?.value) || 24;
        const bobbinH = parseFloat(document.getElementById('xfmr-bh')?.value) || 30;
        const ta = parseFloat(document.getElementById('xfmr-ta')?.value) || 25;
        const rca = parseFloat(document.getElementById('xfmr-rca')?.value) || 15;
        const rwc = parseFloat(document.getElementById('xfmr-rwc')?.value) || 5;
        const twMax = parseFloat(document.getElementById('xfmr-twmax')?.value) || 130;

        const ae_m2 = ae / 10000;
        const vpt = 4.44 * f * bmax * ae_m2;
        const np = Math.max(1, Math.round(vp / vpt));
        const ns = Math.max(1, Math.round((vs / vpt) * 1.05));
        const ip = s / vp;
        const is_a = s / vs;

        // Winding fit
        const wireDia_mm = AWG_DIAMETER_MM[awg] || 0.511;
        const wireDia_cm = wireDia_mm / 10;
        const wireArea_cm2 = Math.PI * (wireDia_cm/2) ** 2;
        const totalTurns = np + ns;
        const totalWireArea = totalTurns * wireArea_cm2;
        const usableWindow = aw * kw;
        const windowFill = (totalWireArea / usableWindow) * 100;
        const turnsPerLayer = Math.floor(bobbinH / wireDia_mm);
        const layers = turnsPerLayer > 0 ? Math.ceil(totalTurns / turnsPerLayer) : 99;
        const windingThick_mm = layers * wireDia_mm;
        const fits = windowFill <= 100;

        // Area Product check
        const J_cm2 = 300;
        const required_ap = s / (4.44 * f * bmax * kw * J_cm2);
        const actual_ap = ae * aw;

        // Inductance
        const mu0 = 4 * Math.PI * 1e-7;
        const le_m = Math.sqrt(ae_m2) * 4;
        const mu_r = 2500;
        const lg_m = lg_mm / 1000;
        const reluctance = lg_m > 0
            ? (lg_m / (mu0 * ae_m2) + le_m / (mu0 * mu_r * ae_m2))
            : (le_m / (mu0 * mu_r * ae_m2));
        const lp_mH = ((np * np) / reluctance) * 1000;

        // Saturation check — B_op = Vp / (4.44 * f * Np * Ae)
        const b_op = vp / (4.44 * f * np * ae_m2);
        const satRatio = b_op / bmax;

        // Thermal
        const rho_cu = 1.72e-8; // Ohm·m
        const wireDia_m = wireDia_mm / 1000;
        const wireArea_m2 = Math.PI * (wireDia_m/2) ** 2;
        const meanTurnLen_m = 2 * Math.PI * 0.01; // ~1cm radius approx
        const Rp = rho_cu * (np * meanTurnLen_m) / wireArea_m2;
        const Rs = rho_cu * (ns * meanTurnLen_m) / wireArea_m2;
        const P_cu = ip*ip*Rp + is_a*is_a*Rs;
        const P_cu_total = isFinite(P_cu) ? P_cu : 0;
        const Tc = ta + P_cu_total * rca;
        const Tw = Tc + P_cu_total * rwc;
        const thermOk = Tw <= twMax;

        // Update outputs
        document.getElementById('xfmr-out-np').innerText = isNaN(np) ? 0 : np;
        document.getElementById('xfmr-out-ns').innerText = isNaN(ns) ? 0 : ns;
        document.getElementById('xfmr-out-ip').innerText = ip.toFixed(2) + ' A';
        document.getElementById('xfmr-out-is').innerText = is_a.toFixed(2) + ' A';
        document.getElementById('xfmr-out-vpt').innerText = vpt.toFixed(3);
        document.getElementById('xfmr-out-ap').innerText = required_ap.toFixed(1);
        document.getElementById('xfmr-out-lp').innerText = lp_mH > 10000 ? '∞' : lp_mH.toFixed(2);
        document.getElementById('xfmr-out-dia').innerText = wireDia_mm.toFixed(3) + ' mm';
        document.getElementById('xfmr-out-wfill').innerText = windowFill.toFixed(1) + '%';
        document.getElementById('xfmr-out-layers').innerText = layers + ' (' + windingThick_mm.toFixed(1) + 'mm)';

        // Status badges
        const fitBadge = document.getElementById('xfmr-fit-badge');
        const fitVal = document.getElementById('xfmr-fit-val');
        if(fits) {
            fitBadge.className = 'bg-themeContainer border border-green-500/40 p-2 text-center rounded';
            fitVal.className = 'text-green-400 font-bold';
            fitVal.textContent = 'FIT OK';
        } else {
            fitBadge.className = 'bg-themeContainer border border-red-500/40 p-2 text-center rounded';
            fitVal.className = 'text-red-400 font-bold';
            fitVal.textContent = 'OVERFILL!';
        }

        const satBadge = document.getElementById('xfmr-sat-badge');
        const satVal = document.getElementById('xfmr-sat-val');
        satVal.textContent = b_op.toFixed(3) + 'T / ' + bmax + 'T';
        if(satRatio > 0.95) {
            satBadge.className = 'bg-themeContainer border border-red-500/40 p-2 text-center rounded';
            satVal.className = 'text-red-400 font-bold text-[9px]';
        } else if(satRatio > 0.8) {
            satBadge.className = 'bg-themeContainer border border-yellow-500/40 p-2 text-center rounded';
            satVal.className = 'text-yellow-400 font-bold text-[9px]';
        } else {
            satBadge.className = 'bg-themeContainer border border-green-500/30 p-2 text-center rounded';
            satVal.className = 'text-green-400 font-bold text-[9px]';
        }

        const twVal = document.getElementById('xfmr-tw-val');
        const thermBadge = document.getElementById('xfmr-therm-badge');
        twVal.textContent = Tw.toFixed(1) + '°C';
        if(!thermOk) {
            thermBadge.className = 'bg-themeContainer border border-red-500/40 p-2 text-center rounded';
            twVal.className = 'text-red-400 font-bold';
        } else {
            thermBadge.className = 'bg-themeContainer border border-green-500/30 p-2 text-center rounded';
            twVal.className = 'text-green-400 font-bold';
        }

        // Thermal summary panel
        const thermRes = document.getElementById('xfmr-thermal-res');
        if(thermRes && !thermRes.classList.contains('hidden')) {
            document.getElementById('xfmr-tc-val').textContent = Tc.toFixed(1) + '°C';
            document.getElementById('xfmr-tw2-val').textContent = Tw.toFixed(1) + '°C';
            document.getElementById('xfmr-cu-val').textContent = (P_cu_total*1000).toFixed(1) + ' mW';
        }

        // Warnings
        document.getElementById('xfmr-warn-ap').classList.toggle('hidden', actual_ap >= required_ap || s <= 0);
        document.getElementById('xfmr-warn-fit').classList.toggle('hidden', fits);
        document.getElementById('xfmr-warn-sat').classList.toggle('hidden', satRatio <= 0.95);

        // Smart Recommendations Engine
        const recPanel = document.getElementById('xfmr-recommendations');
        const recList = document.getElementById('xfmr-rec-list');
        const recs = [];

        // Saturation recommendations
        if(satRatio > 0.95) {
            const needAe = (vp / (4.44 * f * np * bmax * satRatio * 0.85)) * 10000; // cm²
            const needNp = Math.ceil(vp / (4.44 * f * bmax * ae_m2));
            const needBmax = b_op * 1.1;
            recs.push({
                color: 'text-red-400',
                icon: 'fa-bolt',
                title: 'Fix Saturation',
                items: [
                    `<strong>Increase core area (Ae):</strong> Need ≥ ${needAe.toFixed(1)} cm² — use a larger core (current: ${ae} cm²)`,
                    `<strong>Increase primary turns (Np):</strong> Target ≥ ${needNp} turns to reduce B_op below B_max`,
                    `<strong>Reduce B_max setting:</strong> Target ≤ ${(b_op * 0.85).toFixed(2)} T to add 15% margin`,
                    `<strong>Increase frequency:</strong> Higher f reduces required turns and flux density (V/t ∝ f)`
                ]
            });
        } else if(satRatio > 0.80) {
            recs.push({
                color: 'text-yellow-400',
                icon: 'fa-exclamation-circle',
                title: 'Saturation Margin Low',
                items: [
                    `B_op/B_max = ${(satRatio*100).toFixed(0)}% — consider adding 10–15% margin for transient spikes`,
                    `Add an air gap of 0.1–0.5mm to shift the saturation knee higher`
                ]
            });
        }

        // Core too small
        if(actual_ap < required_ap && s > 0) {
            const scaleNeeded = Math.sqrt(required_ap / actual_ap);
            recs.push({
                color: 'text-red-400',
                icon: 'fa-expand',
                title: 'Core Too Small (Ap insufficient)',
                items: [
                    `<strong>Required Ap:</strong> ${required_ap.toFixed(1)} cm⁴ — Current: ${actual_ap.toFixed(1)} cm⁴ (${((actual_ap/required_ap)*100).toFixed(0)}% of needed)`,
                    `<strong>Scale core up:</strong> All dimensions × ${scaleNeeded.toFixed(2)} — try a core with Ae×Aw ≥ ${required_ap.toFixed(1)} cm⁴`,
                    `<strong>Reduce power:</strong> Derate to ≤ ${(s * actual_ap / required_ap).toFixed(0)} VA for this core`,
                    `<strong>Increase frequency:</strong> At 2× frequency, required Ap halves — consider SMPS topology`
                ]
            });
        }

        // Winding doesn't fit
        if(!fits) {
            const nextAwg = Math.min(awg + 4, 40);
            const nextDia = AWG_DIAMETER_MM[nextAwg] || 0;
            const fitsAtNextAwg = (totalTurns * Math.PI * (nextDia/10/2)**2) / usableWindow * 100 <= 100;
            recs.push({
                color: 'text-orange-400',
                icon: 'fa-layer-group',
                title: 'Winding Overfills Window',
                items: [
                    `<strong>Window fill:</strong> ${windowFill.toFixed(1)}% (max 100%) — ${(windowFill-100).toFixed(0)}% over capacity`,
                    fitsAtNextAwg
                        ? `<strong>Use thinner wire:</strong> Switch to AWG ${nextAwg} (${nextDia.toFixed(3)}mm) — reduces fill to fit`
                        : `<strong>Use thinner wire:</strong> Try AWG ${nextAwg} or finer (Litz wire for HF)`,
                    `<strong>Increase window area (Aw):</strong> Need ≥ ${(aw * windowFill/100 * 1.1).toFixed(1)} cm² — use a wider bobbin/core`,
                    `<strong>Reduce fill factor (kw):</strong> Check if winding pattern allows > ${(kw*100).toFixed(0)}% fill`,
                    `<strong>Reduce turns:</strong> Increase Ae to allow fewer turns at same flux density`
                ]
            });
        }

        // Thermal warning
        if(!thermOk) {
            const maxPcu = (twMax - ta) / (rca + rwc);
            const maxS = Math.sqrt(maxPcu / (Rp/ip**2 + Rs/is_a**2)) * vp;
            recs.push({
                color: 'text-orange-400',
                icon: 'fa-temperature-arrow-up',
                title: 'Winding Temperature Exceeded',
                items: [
                    `<strong>Winding temp:</strong> ${Tw.toFixed(1)}°C — max allowed: ${twMax}°C`,
                    `<strong>Use thicker wire:</strong> Larger AWG (lower number) reduces Cu loss (I²R)`,
                    `<strong>Improve thermal interface:</strong> Reduce Rθ winding-core (better potting/heatsinking)`,
                    `<strong>Reduce load power:</strong> Max safe power ≈ ${isFinite(maxS) ? maxS.toFixed(0) : '?'} VA at current thermal resistance`,
                    `<strong>Add forced airflow:</strong> Even 100 LFM reduces Rθ SA by ~40%`
                ]
            });
        }

        if(recs.length > 0) {
            recPanel.classList.remove('hidden');
            recList.innerHTML = recs.map(r => `
                <div class="border-l-2 border-${r.color.replace('text-','')} pl-2 mb-2">
                    <div class="font-bold ${r.color} mb-1"><i class="fa-solid ${r.icon} mr-1"></i>${r.title}</div>
                    <ul class="list-disc pl-3 space-y-0.5">
                        ${r.items.map(item => `<li>${item}</li>`).join('')}
                    </ul>
                </div>
            `).join('');
        } else {
            recPanel.classList.add('hidden');
            recList.innerHTML = '';
        }

        // Rebuild 3D with saturation info
        if(typeof buildXfmr3D === 'function') buildXfmr3D(satRatio);

    } else {
        const voc = parseFloat(document.getElementById('xfmr-voc').value) || 230;
        const ioc = parseFloat(document.getElementById('xfmr-ioc').value) || 0.5;
        const poc = parseFloat(document.getElementById('xfmr-poc').value) || 30;
        const vsc = parseFloat(document.getElementById('xfmr-vsc').value) || 12;
        const isc = parseFloat(document.getElementById('xfmr-isc').value) || 4.5;
        const psc = parseFloat(document.getElementById('xfmr-psc').value) || 25;

        let rc = 0, xm = 0;
        if (ioc > 0 && poc > 0) {
            rc = (voc * voc) / poc;
            const ic = voc / rc;
            const im = Math.sqrt(Math.max(0, ioc*ioc - ic*ic));
            xm = im > 0 ? (voc / im) : 0;
        }
        let req = 0, xeq = 0;
        if (isc > 0) {
            req = psc / (isc * isc);
            const zeq = vsc / isc;
            xeq = Math.sqrt(Math.max(0, zeq*zeq - req*req));
        }

        document.getElementById('xfmr-out-rc').innerText = rc.toFixed(1) + ' Ω';
        document.getElementById('xfmr-out-xm').innerText = xm.toFixed(1) + ' Ω';
        document.getElementById('xfmr-out-req').innerText = req.toFixed(3) + ' Ω';
        document.getElementById('xfmr-out-xeq').innerText = xeq.toFixed(3) + ' Ω';
    }
};

document.addEventListener('toolLoaded', function() {
    initHeatsink3D();
    initInductor3D();
    initXfmr3D();
});

// ==========================================
// SMITH CHART UI LOGIC
// ==========================================
let smithComponents = [];

window.addSmithComponent = function() {
    const typeSelect = document.getElementById('smith-comp-type');
    if(!typeSelect) return;
    const type = typeSelect.value;
    const typeName = typeSelect.options[typeSelect.selectedIndex].text;
    
    // Check if component already has Q input. If not, default to ideal.
    const isTline = type === 'tline';
    
    smithComponents.push({
        type: type,
        name: typeName,
        val1: isTline ? 50 : 1, // Z0 or L/C/R val
        val2: isTline ? 90 : 0,  // EL or Q
        isIdeal: !isTline 
    });
    
    renderSmithComponents();
    runSmithChart();
}

window.removeSmithComponent = function(idx) {
    smithComponents.splice(idx, 1);
    renderSmithComponents();
    runSmithChart();
}

window.updateSmithComp = function(idx, field, val) {
    if(field === 'ideal') {
        smithComponents[idx].isIdeal = val;
    } else {
        smithComponents[idx][field] = parseFloat(val) || 0;
    }
    runSmithChart();
    renderSmithComponents(); // re-render to toggle Q inputs
}

function renderSmithComponents() {
    const container = document.getElementById('smith-components');
    if(!container) return;
    
    container.innerHTML = '';
    
    smithComponents.forEach((comp, idx) => {
        const isTline = comp.type === 'tline';
        let val1Label = 'Val';
        if(comp.type.includes('l')) val1Label = 'nH';
        else if(comp.type.includes('c')) val1Label = 'pF';
        else if(comp.type.includes('r')) val1Label = '&Omega;';
        
        if(isTline) val1Label = 'Z0 (&Omega;)';
        
        let val2Label = isTline ? 'E.L. (&deg;)' : 'Q-factor';
        
        let html = `
            <div class="bg-themeBorder/10 border border-themeBorder p-2 relative group">
                <button class="absolute top-1 right-1 text-red-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" onclick="removeSmithComponent(${idx})"><i class="fa-solid fa-xmark"></i></button>
                <div class="font-bold text-themeAccent mb-1">${comp.name}</div>
                <div class="flex gap-2 items-center">
                    <div class="flex-1">
                        <label class="text-[10px] text-themeMuted">${val1Label}</label>
                        <input type="number" class="w-full bg-themeBg border border-themeBorder p-1 text-right text-xs" value="${comp.val1}" onchange="updateSmithComp(${idx}, 'val1', this.value)">
                    </div>
                    ${!isTline ? `
                    <div class="flex items-end pb-1 px-1">
                        <label class="text-[10px] text-themeMuted flex items-center gap-1 cursor-pointer">
                            <input type="checkbox" ${comp.isIdeal ? 'checked' : ''} onchange="updateSmithComp(${idx}, 'ideal', this.checked)"> Ideal
                        </label>
                    </div>
                    ` : ''}
                    <div class="flex-1 ${(!isTline && comp.isIdeal) ? 'opacity-30 pointer-events-none' : ''}">
                        <label class="text-[10px] text-themeMuted">${val2Label}</label>
                        <input type="number" class="w-full bg-themeBg border border-themeBorder p-1 text-right text-xs" value="${comp.val2}" onchange="updateSmithComp(${idx}, 'val2', this.value)">
                    </div>
                </div>
            </div>
        `;
        container.innerHTML += html;
    });
}

window.runSmithChart = function() {
    if(typeof drawSmithChart === 'function') {
        drawSmithChart();
    }
}
