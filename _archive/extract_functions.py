import re
import os

def extract_functions(js_text):
    functions = {}
    
    pattern = r'(?:async\s+)?function\s+([a-zA-Z0-9_]+)\s*\(|window\.([a-zA-Z0-9_]+)\s*=\s*(?:async\s+)?function\s*\('
    
    pos = 0
    while True:
        match = re.search(pattern, js_text[pos:])
        if not match:
            break
            
        start_idx = pos + match.start()
        func_name = match.group(1) or match.group(2)
        
        brace_idx = js_text.find('{', start_idx)
        if brace_idx == -1:
            pos = start_idx + 1
            continue
            
        brace_count = 0
        end_idx = -1
        in_string = False
        string_char = None
        in_comment_single = False
        in_comment_multi = False
        
        i = brace_idx
        while i < len(js_text):
            char = js_text[i]
            
            if in_comment_single:
                if char == '\n':
                    in_comment_single = False
                i += 1
                continue
                
            if in_comment_multi:
                if char == '*' and i + 1 < len(js_text) and js_text[i+1] == '/':
                    in_comment_multi = False
                    i += 1
                i += 1
                continue
                
            if in_string:
                if char == '\\':
                    i += 2
                    continue
                if char == string_char:
                    in_string = False
                i += 1
                continue
                
            if char in ["'", '"', "`"]:
                in_string = True
                string_char = char
            elif char == '/' and i + 1 < len(js_text):
                if js_text[i+1] == '/':
                    in_comment_single = True
                    i += 1
                elif js_text[i+1] == '*':
                    in_comment_multi = True
                    i += 1
            elif char == '{':
                brace_count += 1
            elif char == '}':
                brace_count -= 1
                if brace_count == 0:
                    end_idx = i
                    break
                    
            i += 1
            
        if end_idx != -1:
            func_body = js_text[start_idx:end_idx+1]
            functions[func_name] = func_body
            pos = end_idx + 1
        else:
            pos = start_idx + 1
            
    return functions

def main():
    with open('extracted_inline_clean.js', 'r', encoding='utf-8') as f:
        clean_js = f.read()
        
    with open('patch.js', 'r', encoding='utf-8') as f:
        patch_js = f.read()
        
    clean_funcs = extract_functions(clean_js)
    patch_funcs = extract_functions(patch_js)
    
    merged_funcs = clean_funcs.copy()
    for name, body in patch_funcs.items():
        merged_funcs[name] = body
        
    # EXCLUDE FUNCTIONS THAT BELONG IN MAIN.JS
    if 'navigate' in merged_funcs:
        del merged_funcs['navigate']
    if 'runAllTools' in merged_funcs:
        del merged_funcs['runAllTools']
    if 'toggleMaximize' in merged_funcs:
        del merged_funcs['toggleMaximize']
    if 'toggleTheme' in merged_funcs:
        del merged_funcs['toggleTheme']
    if 'initSteampunkWidget' in merged_funcs:
        del merged_funcs['initSteampunkWidget']
    if 'drawSteampunkScope' in merged_funcs:
        del merged_funcs['drawSteampunkScope']
    if 'triggerAnomaly' in merged_funcs:
        del merged_funcs['triggerAnomaly']
    if 'updateSteampunkClock' in merged_funcs:
        del merged_funcs['updateSteampunkClock']
        
    final_js = []
    
    # ----------------------------------------------------
    # ALL REQUIRED GLOBAL CONSTANTS & STATE VARIABLES
    # ----------------------------------------------------
    global_vars = """
const E12 = [1.0, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2];
const E24 = [1.0, 1.1, 1.2, 1.3, 1.5, 1.6, 1.8, 2.0, 2.2, 2.4, 2.7, 3.0, 3.3, 3.6, 3.9, 4.3, 4.7, 5.1, 5.6, 6.2, 6.8, 7.5, 8.2, 9.1];
const AWG_DATA = {4:{dia:5.189,res:0.2485,amp:95},6:{dia:4.115,res:0.3951,amp:75},8:{dia:3.264,res:0.6282,amp:55},10:{dia:2.588,res:0.9989,amp:30},12:{dia:2.053,res:1.588,amp:20},14:{dia:1.628,res:2.525,amp:15},16:{dia:1.291,res:4.016,amp:10},18:{dia:1.024,res:6.385,amp:7},20:{dia:0.812,res:10.15,amp:5},22:{dia:0.645,res:16.14,amp:3},24:{dia:0.511,res:25.67,amp:2}};

// Chart objects
let filterChartObj = null;
let serialChartObj = null;
let _WMAP = null;
let solarChartObj = null;
let bodeChartObj = null;

// Serial
window.serialDataArr = [];
"""
    final_js.append(global_vars)
    
    for name, body in merged_funcs.items():
        final_js.append(body.replace('runcompensator', 'runCompensator'))
        
    master_init = """
window.toggleMaximize = function(el) {
    if(!el) return;
    el.classList.toggle('fixed');
    el.classList.toggle('top-0');
    el.classList.toggle('left-0');
    el.classList.toggle('w-screen');
    el.classList.toggle('h-screen');
    el.classList.toggle('z-50');
    el.classList.toggle('bg-themeBg');
    el.classList.toggle('p-8');
    el.classList.toggle('overflow-y-auto');
    
    setTimeout(() => { 
        window.dispatchEvent(new Event('resize')); 
        if(typeof drawSolarMap==='function') drawSolarMap(); 
        if(typeof runThermistor==='function') runThermistor();
    }, 50);
}

// Magnetics Logic
function runMagnetics() {
    const turns = parseFloat(document.getElementById('mag-turns')?.value) || 10;
    const current = parseFloat(document.getElementById('mag-current')?.value) || 1;
    const length_mm = parseFloat(document.getElementById('mag-length')?.value) || 50;
    const mu_r = parseFloat(document.getElementById('mag-mu')?.value) || 1;
    const length_m = length_mm / 1000;
    
    const mu_0 = 4 * Math.PI * 1e-7;
    let b_field = 0;
    if(length_m > 0) {
        b_field = (mu_0 * mu_r * turns * current) / length_m;
    }
    
    const bEl = document.getElementById('mag-bfield');
    if(bEl) bEl.textContent = (b_field * 1000).toFixed(2) + ' mT';
    
    const awg = parseInt(document.getElementById('mag-awg')?.value) || 12;
    const awg_d = (typeof AWG_DATA !== 'undefined' && AWG_DATA[awg]) ? AWG_DATA[awg] : {res: 1.588}; 
    
    const wire_len_m = parseFloat(document.getElementById('mag-wirelen')?.value) || 1;
    const wire_current = parseFloat(document.getElementById('mag-wirecurrent')?.value) || 1;
    
    const v_drop = (awg_d.res / 1000) * wire_len_m * wire_current; 
    
    const vDropEl = document.getElementById('mag-vdrop');
    if(vDropEl) vDropEl.textContent = v_drop.toFixed(3) + ' V';
}

window.runAllTools = function() {
    try { if(typeof setupDividerMode==='function') setupDividerMode(); if(typeof runSmartDivider==='function') runSmartDivider(); else if(typeof runDivider==='function') runDivider(); } catch(e){console.error(e);}
    try { if(typeof runCompensator==='function') runCompensator(); } catch(e){console.error(e);}
    try { if(typeof runSMPS==='function') runSMPS(); } catch(e){console.error(e);}
    try { if(typeof setupDacMode==='function') setupDacMode(); if(typeof runSmartDac==='function') runSmartDac(); if(typeof runMargin==='function') runMargin(); } catch(e){console.error(e);}
    try { if(typeof runAWG==='function') runAWG(); } catch(e){console.error(e);}
    try { if(typeof runBattery==='function') runBattery(); } catch(e){console.error(e);}
    try { if(typeof setupMotorMode==='function') setupMotorMode(); if(typeof runSmartMotor==='function') runSmartMotor(); if(typeof runMotor==='function') runMotor(); } catch(e){console.error(e);}
    try { if(typeof setupIPCMode==='function') setupIPCMode(); if(typeof runSmartIPC==='function') runSmartIPC(); if(typeof runPCBTrace==='function') runPCBTrace(); } catch(e){console.error(e);}
    try { if(typeof setupFilterMode==='function') setupFilterMode(); if(typeof runSmartFilter==='function') runSmartFilter(); if(typeof runFilter==='function') runFilter(); } catch(e){console.error(e);}
    try { if(typeof runESeries==='function') runESeries(); } catch(e){console.error(e);}
    try { if(typeof runThermistor==='function') runThermistor(); } catch(e){console.error(e);}
    try { if(typeof runBode==='function') runBode(); } catch(e){console.error(e);}
    try { if(typeof runMagnetics==='function') runMagnetics(); } catch(e){console.error(e);}
    try { if(typeof initRemediationCharts==='function') initRemediationCharts(); } catch(e){console.error(e);}
    try { if(typeof initSolarWidget==='function') initSolarWidget(); } catch(e){console.error(e);}
    try { if(typeof initPlotter==='function') initPlotter(); } catch(e){console.error(e);}
}

window.addEventListener('DOMContentLoaded', () => {
    runAllTools();
    try { if(typeof initPlotter==='function') initPlotter(); } catch(e){}
    try { if(typeof initSolarWidget==='function') initSolarWidget(); } catch(e){}
});

window.addEventListener('themeChanged', () => {
    try { if(typeof drawPlot==='function') drawPlot(); } catch(e){}
    try { if(typeof drawSolarWidget==='function') drawSolarWidget(); } catch(e){}
    try { if(typeof runThermistor==='function') runThermistor(); } catch(e){}
    try { if(typeof runFilter==='function') runFilter(); } catch(e){}
});
"""
    final_js.append(master_init)
    
    with open('assets/js/tools.js', 'w', encoding='utf-8') as f:
        f.write('\\n\\n'.join(final_js))
        
    print(f"Successfully extracted and merged {len(merged_funcs)} functions.")

if __name__ == '__main__':
    main()
