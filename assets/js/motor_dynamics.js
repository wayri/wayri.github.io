let mcLastExtractedFluxA = 0;
let mcLastExtractedFluxB = 0;

function mcSwitchTab(tabId) {
    document.getElementById('mc-tab-foc').classList.add('hidden');
    document.getElementById('mc-tab-dynamics').classList.add('hidden');
    document.getElementById('mc-tab-extract').classList.add('hidden');
    
    document.getElementById('mc-tab-' + tabId).classList.remove('hidden');
    if(tabId === 'dynamics') {
        runMotorSuite(); // redraw canvas
    }
}

function mcExtractParams(mode) {
    if(mode === 'bemf') {
        const vll_rms = parseFloat(document.getElementById('ext-vll').value) || 0;
        const rpm = parseFloat(document.getElementById('ext-rpm').value) || 0;
        const p = parseFloat(document.getElementById('mc-p').value) || 1;
        
        // Vll_rms to V_phase_peak: Vph_pk = Vll_rms * sqrt(2) / sqrt(3)
        const vph_pk = vll_rms * Math.sqrt(2/3);
        const we = rpm * (2 * Math.PI / 60) * p;
        
        let flux = 0;
        if(we > 0) flux = vph_pk / we;
        
        mcLastExtractedFluxA = flux;
        document.getElementById('ext-res-fluxA').innerText = flux.toFixed(5);
        
    } else if (mode === 'torque') {
        const tq = parseFloat(document.getElementById('ext-tq').value) || 0;
        const irms = parseFloat(document.getElementById('ext-irms').value) || 0;
        const p = parseFloat(document.getElementById('mc-p').value) || 1;
        
        // Phase peak current
        const ipk = irms * Math.sqrt(2);
        
        // T = 1.5 * p * flux * Iq  (Assuming SPM, no reluctance torque for this basic test)
        let flux = 0;
        if(ipk > 0 && p > 0) {
            flux = Math.abs(tq) / (1.5 * p * ipk);
        }
        
        mcLastExtractedFluxB = flux;
        document.getElementById('ext-res-fluxB').innerText = flux.toFixed(5);
    }
}

function mcApplyExtractedFlux(source) {
    let flux = source === 'A' ? mcLastExtractedFluxA : mcLastExtractedFluxB;
    if(flux > 0) {
        document.getElementById('mc-flux').value = flux.toFixed(4);
        runMotorSuite();
    }
}

function runMotorSuite() {
    // Inputs
    const isMotor = document.getElementById('mc-machine-type').value === 'motor';
    const rs = parseFloat(document.getElementById('mc-rs').value) || 0;
    const ld = (parseFloat(document.getElementById('mc-ld').value) || 0) * 1e-3;
    const lq = (parseFloat(document.getElementById('mc-lq').value) || 0) * 1e-3;
    const p = parseFloat(document.getElementById('mc-p').value) || 1;
    const flux = parseFloat(document.getElementById('mc-flux').value) || 0;
    
    const vdc = parseFloat(document.getElementById('mc-vdc').value) || 0;
    const irms = parseFloat(document.getElementById('mc-irms').value) || 0;
    const pwmStrat = document.getElementById('mc-pwm-strat').value;
    const fpwm = (parseFloat(document.getElementById('mc-fpwm').value) || 1) * 1e3;
    
    // Limits
    const vmax = pwmStrat === 'svpwm' ? (vdc / Math.sqrt(3)) : (vdc / 2);
    const imax = irms * Math.sqrt(2);
    
    // FOC Tuning
    const bw_rad = (fpwm / 10) * 2 * Math.PI;
    const kpd = bw_rad * ld;
    const kid = bw_rad * rs;
    const kpq = bw_rad * lq;
    const kiq = bw_rad * rs;
    
    document.getElementById('foc-bw').innerText = Math.round(bw_rad);
    document.getElementById('foc-kpd').innerText = kpd.toFixed(3);
    document.getElementById('foc-kid').innerText = kid.toFixed(1);
    document.getElementById('foc-kpq').innerText = kpq.toFixed(3);
    document.getElementById('foc-ted').innerText = ((ld/rs)*1000).toFixed(2);
    document.getElementById('foc-teq').innerText = ((lq/rs)*1000).toFixed(2);
    
    // Inverter Loss (Simplified)
    const rdson = (parseFloat(document.getElementById('mc-rdson').value) || 0) * 1e-3;
    const swloss = (parseFloat(document.getElementById('mc-swloss').value) || 0) * 1e-3;
    
    const pcond = 0.5 * irms * irms * rdson;
    const psw = (2 / Math.PI) * swloss * fpwm;
    document.getElementById('foc-pcond').innerText = pcond.toFixed(1);
    document.getElementById('foc-psw').innerText = psw.toFixed(1);
    document.getElementById('foc-pinv').innerText = ((pcond + psw) * 6).toFixed(1);
    
    // Dynamics & Field Weakening
    calculateDynamics(isMotor, rs, ld, lq, p, flux, vmax, imax);
}

function calculateDynamics(isMotor, rs, ld, lq, p, flux, vmax, imax) {
    // MTPA calculation for base speed
    let id_mtpa = 0;
    if (ld < lq) {
        // IPM MTPA
        id_mtpa = (flux - Math.sqrt(flux*flux + 8*(lq-ld)*(lq-ld)*imax*imax)) / (4*(lq-ld));
    }
    // Limit Id to physical capability
    if(id_mtpa < -imax) id_mtpa = -imax;
    
    let iq_mtpa = Math.sqrt(imax*imax - id_mtpa*id_mtpa);
    if(!isMotor) iq_mtpa = -iq_mtpa;
    
    // Helper to calculate Vmag
    const getVmag = (id, iq, we) => {
        const vd = rs*id - we*lq*iq;
        const vq = rs*iq + we*ld*id + we*flux;
        return Math.sqrt(vd*vd + vq*vq);
    };
    
    // Helper to calculate Torque
    const getTorque = (id, iq) => {
        return 1.5 * p * (flux * iq + (ld - lq) * id * iq);
    };
    
    const peakTq = getTorque(id_mtpa, iq_mtpa);
    
    // Sweep speed to generate capability curve
    let rpm_arr = [];
    let tq_arr = [];
    let pwr_arr = [];
    let id_arr = [];
    let iq_arr = [];
    
    let baseSpeedReached = false;
    let baseSpeedRPM = 0;
    
    for(let rpm = 0; rpm <= 30000; rpm += 50) {
        const we = rpm * (2 * Math.PI / 60) * p;
        
        let valid_id = id_mtpa;
        let valid_iq = iq_mtpa;
        
        if(getVmag(id_mtpa, iq_mtpa, we) <= vmax) {
            // Below base speed
        } else {
            if(!baseSpeedReached) {
                baseSpeedReached = true;
                baseSpeedRPM = rpm;
            }
            // Field Weakening: sweep Id from MTPA down to -imax to find intersection
            let found = false;
            // Crude linear search for intersection
            for(let scan_id = id_mtpa; scan_id >= -imax; scan_id -= (imax/200)) {
                let scan_iq = Math.sqrt(imax*imax - scan_id*scan_id);
                if(!isMotor) scan_iq = -scan_iq;
                
                if(getVmag(scan_id, scan_iq, we) <= vmax) {
                    valid_id = scan_id;
                    valid_iq = scan_iq;
                    found = true;
                    break;
                }
            }
            
            if(!found) {
                // Cannot satisfy voltage limit, max speed reached
                break;
            }
        }
        
        let tq = getTorque(valid_id, valid_iq);
        let pwr = tq * (rpm * 2 * Math.PI / 60) / 1000; // kW
        
        rpm_arr.push(rpm);
        tq_arr.push(tq);
        pwr_arr.push(pwr);
        id_arr.push(valid_id);
        iq_arr.push(valid_iq);
    }
    
    const maxRpm = rpm_arr.length > 0 ? rpm_arr[rpm_arr.length - 1] : 0;
    
    let peakPwr = 0;
    for(let pwr of pwr_arr) {
        if(Math.abs(pwr) > Math.abs(peakPwr)) peakPwr = pwr;
    }
    
    document.getElementById('dyn-base-rpm').innerText = baseSpeedRPM + ' RPM';
    document.getElementById('dyn-max-rpm').innerText = maxRpm + ' RPM';
    document.getElementById('dyn-peak-tq').innerText = peakTq.toFixed(1) + ' Nm';
    document.getElementById('dyn-peak-pwr').innerText = peakPwr.toFixed(1) + ' kW';
    
    drawCapabilityCurve(rpm_arr, tq_arr, pwr_arr, id_arr, iq_arr, imax, Math.abs(peakTq), Math.abs(peakPwr));
}

function drawCapabilityCurve(rpm, tq, pwr, id, iq, imax, maxTq, maxPwr) {
    const canvas = document.getElementById('mc-dyn-canvas');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Handle DPI scaling
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    
    const w = rect.width;
    const h = rect.height;
    
    ctx.clearRect(0, 0, w, h);
    if(rpm.length === 0) return;
    
    const maxSpeed = rpm[rpm.length - 1] || 1000;
    
    // Scales
    const padding = 40;
    const innerW = w - padding * 2;
    const innerH = h - padding * 2;
    
    // Normalize data
    const mapX = (val) => padding + (val / maxSpeed) * innerW;
    
    // For torque and power, max value maps to top (padding), 0 maps to center (h/2), -max maps to bottom (h-padding)
    // Find absolute maximum among all variables being plotted so they share a comparable scale, 
    // or just normalize them all to 1. Let's normalize to their own peaks so they fill the screen nicely, 
    // but Id/Iq share Imax scale.
    
    const overallMaxY = Math.max(maxTq, maxPwr, imax) * 1.1; 
    
    const mapY = (val) => {
        // center is 0
        const centerY = h / 2;
        return centerY - (val / overallMaxY) * (innerH / 2);
    };
    
    // Draw Grid
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    // Center line (0)
    ctx.moveTo(padding, h/2);
    ctx.lineTo(w - padding, h/2);
    ctx.stroke();
    
    // Draw Curves
    const drawLine = (data, color, width) => {
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        for(let i=0; i<rpm.length; i++) {
            const x = mapX(rpm[i]);
            const y = mapY(data[i]);
            if(i===0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
    };
    
    // Torque (Theme Accent)
    drawLine(tq, '#5c6bc0', 2.5);
    // Power (Orange)
    drawLine(pwr, '#f59e0b', 2.5);
    // Id (Blue)
    drawLine(id, '#3b82f6', 1.5);
    // Iq (Purple)
    drawLine(iq, '#8b5cf6', 1.5);
    
    // Axes text
    ctx.fillStyle = '#888';
    ctx.font = '10px monospace';
    ctx.fillText('0 RPM', padding, h/2 + 12);
    ctx.fillText(maxSpeed + ' RPM', w - padding - 40, h/2 + 12);
}

// Init
setTimeout(runMotorSuite, 200);
