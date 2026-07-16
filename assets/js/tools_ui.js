const TOOL_REGISTRY = [
    {
        category: "Basic EE",
        icon: "fa-bolt",
        tools: [
            { id: "tool-resistor-divider", name: "Resistor Divider", file: "resistor-divider.html" },
            { id: "tool-e-series-finder", name: "E-Series Finder", file: "e-series-finder.html" },
            { id: "tool-awg-wire-ampacity", name: "AWG Wire Ampacity", file: "awg-wire-ampacity.html" },
            { id: "tool-ipc-2221-trace-width", name: "IPC-2221 Trace Width", file: "ipc-2221-trace-width.html" },
            { id: "tool-smd-resistor", name: "SMD Resistor Decoder", file: "smd-resistor.html" },
            { id: "tool-led-resistor", name: "LED Resistor Calculator", file: "led-resistor.html" },
            { id: "tool-reactance-calc", name: "Reactance Calculator", file: "reactance-calc.html" },
            { id: "tool-rc-time-calc", name: "RC Time Constant", file: "rc-time-calc.html" },
            { id: "tool-555-timer-calc", name: "555 Timer Calculator", file: "555-timer-calc.html" },
            { id: "tool-ohms-law-wheel", name: "Ohm's Law Wheel", file: "ohms-law-wheel.html" }
        ]
    },
    {
        category: "Analog & Signal Chains",
        icon: "fa-wave-square",
        tools: [
            { id: "tool-opamp-calc", name: "OpAmp Calculator", file: "opamp-calc.html" },
            { id: "tool-current-sense-amp", name: "Current Sense Amplifier", file: "current-sense-amp.html" }
        ]
    },
    {
        category: "Power & SMPS",
        icon: "fa-plug-circle-bolt",
        tools: [
            { id: "tool-loop-compensator-p-z", name: "Loop Compensator (P/Z)", file: "loop-compensator-p-z.html" },
            { id: "tool-smps-topology-ratio", name: "SMPS Topology & Ratio", file: "smps-topology-ratio.html" }
        ]
    },
    {
        category: "Grid & Generation",
        icon: "fa-tower-observation",
        tools: [
            { id: "tool-grid-power", name: "Grid Power Equations", file: "grid-power-calc.html" },
            { id: "tool-hydro-power", name: "Hydroelectric Dam", file: "hydro-power-calc.html" },
            { id: "tool-pv-yield-simulator", name: "PV Yield Simulator", file: "pv-yield-simulator.html" }
        ]
    },
    {
        category: "Batteries & EV",
        icon: "fa-car-battery",
        tools: [
            { id: "tool-battery-pack-s-p-config", name: "Battery Pack Config", file: "battery-pack-s-p-config.html" },
            { id: "tool-battery-suite", name: "Full Battery Suite", file: "battery-suite.html" },
            { id: "tool-battery-life", name: "Battery Life Estimator", file: "battery-life-estimator.html" },
            { id: "tool-ev-powertrain", name: "EV Powertrain & Range", file: "ev-powertrain-calc.html" }
        ]
    },
    {
        category: "RF & Wireless",
        icon: "fa-satellite-dish",
        tools: [
            { id: "tool-attenuator", name: "Attenuator Calculator", file: "attenuator-calc.html" },
            { id: "tool-rf-noise-figure", name: "Cascade Noise Figure", file: "rf-noise-figure.html" },
            { id: "tool-friis-transmission", name: "Friis Transmission", file: "friis-transmission.html" }
        ]
    },
    {
        category: "Magnetics & Filters",
        icon: "fa-magnet",
        tools: [
            { id: "tool-magnetic-core", name: "Magnetic Core & Inductor", file: "magnetic-core-calc.html" },
            { id: "tool-emi-filter", name: "EMI Filter Calculator", file: "emi-filter-calc.html" },
            { id: "tool-magnetics-suite", name: "Magnetics Design Suite", file: "magnetics-suite.html" },
            { id: "tool-filter-designer", name: "Analog Filter Designer", file: "filter-designer.html" }
        ]
    },
    {
        category: "Harness & Interconnect",
        icon: "fa-network-wired",
        tools: [
            { id: "tool-multipoint-harness", name: "Multipoint Harness", file: "multipoint-harness.html" },
            { id: "tool-can-bus", name: "CAN Bus Harness", file: "can-bus.html" }
        ]
    },
    {
        category: "PCB & High Speed",
        icon: "fa-microchip",
        tools: [
            { id: "tool-impedance-calc", name: "Impedance Calculation", file: "impedance-calc.html" },
            { id: "tool-high-speed-design", name: "High Speed Design", file: "high-speed-design.html" },
            { id: "tool-pcb-impedance-diff", name: "Diff Pair Impedance", file: "pcb-impedance-diff.html" },
            { id: "tool-via-impedance", name: "Via Parasitics", file: "via-impedance.html" },
            { id: "tool-crosstalk-estimator", name: "Crosstalk Estimator", file: "crosstalk-estimator.html" },
            { id: "tool-pdn-impedance", name: "PDN Target Impedance", file: "pdn-impedance.html" },
            { id: "tool-skin-effect", name: "Skin Effect & AC Resistance", file: "skin-effect.html" },
            { id: "tool-insertion-loss", name: "S-Parameter / Insertion Loss", file: "insertion-loss.html" }
        ]
    },
    {
        category: "Motor & Drives",
        icon: "fa-gear",
        tools: [
            { id: "tool-ac-motor-dynamics", name: "AC Motor Dynamics", file: "ac-motor-dynamics.html" },
            { id: "tool-motor-controller", name: "Motor Controller Design", file: "motor-controller.html" }
        ]
    },
    {
        category: "Embedded & Sensors",
        icon: "fa-temperature-half",
        tools: [
            { id: "tool-voltage-margining-dac", name: "Voltage/Current Margining", file: "voltage-margining-dac.html" },
            { id: "tool-thermistor-r-t-curve-ntc", name: "Thermistor R-T Curve", file: "thermistor-r-t-curve-ntc.html" },
            { id: "tool-web-serial-interface", name: "Web Serial Interface", file: "web-serial-interface.html" }
        ]
    },
    {
        category: "Advanced Toolkit",
        icon: "fa-layer-group",
        tools: [
            { id: "tool-unit-converter", name: "Engineering Unit Converter", file: "unit-converter.html" },
            { id: "tool-busbar-capacity", name: "Busbar Capacity", file: "busbar-capacity.html" },
            { id: "tool-cable-thermal", name: "Dynamic Cable Thermal", file: "cable-thermal.html" },
            { id: "tool-fishbone", name: "Ishikawa Fishbone Diagram", file: "fishbone.html" },
            { id: "tool-plot-extractor", name: "Plot Data Extractor", file: "plot-extractor.html" }
        ]
    }
];

let loadedScripts = new Set();
let loadedStyles = new Set();

document.addEventListener('DOMContentLoaded', () => {
    initSidebar();
});

function initSidebar() {
    const sidebar = document.getElementById('tools-sidebar');
    if(!sidebar) return;

    let html = '';
    TOOL_REGISTRY.forEach((category, catIdx) => {
        html += `
            <div class="border-b border-themeBorder/50">
                <button class="w-full text-left p-3 flex justify-between items-center hover:bg-themeBorder/10 transition-colors focus:outline-none" onclick="toggleCategory(${catIdx})">
                    <span class="font-bold text-themeText flex items-center gap-2"><i class="fa-solid ${category.icon} w-4 text-center"></i> ${category.category}</span>
                    <i class="fa-solid fa-chevron-down text-xs text-themeMuted transition-transform duration-200" id="cat-icon-${catIdx}"></i>
                </button>
                <div id="cat-content-${catIdx}" class="hidden flex-col bg-themeBg/50 pb-2">
        `;
        category.tools.forEach(tool => {
            html += `
                <button class="text-left pl-10 py-2 pr-4 text-themeMuted hover:text-themeAccent hover:bg-themeBorder/20 transition-colors text-xs border-l-2 border-transparent hover:border-themeAccent" onclick="loadTool('${tool.id}', '${tool.file}', this)">
                    ${tool.name}
                </button>
            `;
        });
        html += `</div></div>`;
    });
    sidebar.innerHTML = html;
}

function toggleCategory(idx) {
    const content = document.getElementById(`cat-content-${idx}`);
    const icon = document.getElementById(`cat-icon-${idx}`);
    if(content.classList.contains('hidden')) {
        content.classList.remove('hidden');
        content.classList.add('flex');
        icon.style.transform = 'rotate(180deg)';
    } else {
        content.classList.add('hidden');
        content.classList.remove('flex');
        icon.style.transform = 'rotate(0deg)';
    }
}

async function loadTool(toolId, fileName, btnElement) {
    // Update Active State on Buttons
    document.querySelectorAll('#tools-sidebar button').forEach(b => {
        b.classList.remove('text-themeAccent', 'border-themeAccent', 'bg-themeBorder/10');
        if(b.classList.contains('pl-10')) {
            b.classList.add('text-themeMuted', 'border-transparent');
        }
    });
    if(btnElement) {
        btnElement.classList.add('text-themeAccent', 'border-themeAccent', 'bg-themeBorder/10');
        btnElement.classList.remove('text-themeMuted', 'border-transparent');
    }

    const mainArea = document.getElementById('tools-content');
    const welcome = document.getElementById('tools-welcome');
    
    welcome.classList.add('hidden');
    mainArea.classList.remove('hidden');
    mainArea.classList.add('flex');
    
    mainArea.innerHTML = `<div class="flex justify-center p-12 text-themeMuted"><i class="fa-solid fa-spinner fa-spin text-2xl"></i><span class="ml-2 font-mono">Loading tool...</span></div>`;

    try {
        const response = await fetch(`/assets/tools_html/${fileName}`);
        if (!response.ok) throw new Error('Tool file not found');
        const html = await response.text();
        
        mainArea.innerHTML = html;

        // Execute scripts found in the fetched HTML
        const scripts = mainArea.querySelectorAll('script');
        scripts.forEach(oldScript => {
            const newScript = document.createElement('script');
            Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
            newScript.appendChild(document.createTextNode(oldScript.innerHTML));
            oldScript.parentNode.replaceChild(newScript, oldScript);
        });
        
        // Ensure any newly added canvas elements correctly size themselves
        // and trigger existing initialization scripts
        setTimeout(() => {
            // Some old tools rely on specific window functions or setup calls.
            // Dispatch a custom event that tools can listen to.
            document.dispatchEvent(new CustomEvent('toolLoaded', { detail: { toolId } }));
            
            // Legacy fallbacks for tools that don't use the event listener
            if(toolId === 'tool-pv-yield-simulator' && typeof initSolarWidget === 'function') initSolarWidget();
            if(toolId === 'tool-resistor-divider' && typeof setupDividerMode === 'function') setupDividerMode();
            if(toolId === 'tool-loop-compensator-p-z' && typeof runCompensator === 'function') runCompensator();
            if(toolId === 'tool-filter-designer' && typeof setupFilterMode === 'function') setupFilterMode();
            
            // New tools might load scripts dynamically, but typically we will include their JS in default.html or load it here.
        }, 100);

    } catch (error) {
        mainArea.innerHTML = `<div class="p-6 border border-red-500/50 bg-red-500/10 text-red-400 font-mono"><i class="fa-solid fa-triangle-exclamation mr-2"></i> Error loading tool: ${error.message}<br><br>Tool File: ${fileName}</div>`;
    }
}

function renderWelcomeGrid() {
    const welcome = document.getElementById('tools-welcome');
    if(!welcome) return;
    
    let gridHtml = `<div class="w-full max-w-6xl mx-auto p-6 flex flex-col gap-8">
        <div class="text-center mb-4">
            <h2 class="text-3xl font-bold font-mono text-themeText"><i class="fa-solid fa-toolbox text-themeAccent mr-3"></i>Engineering Toolkit</h2>
            <p class="text-themeMuted mt-2 text-sm max-w-2xl mx-auto">A curated, unified suite of high-performance interactive design calculators, simulation solvers, and engineering utilities.</p>
        </div>
    `;
    
    TOOL_REGISTRY.forEach(category => {
        gridHtml += `
            <div>
                <h3 class="text-lg font-bold font-mono text-themeText border-b border-themeBorder pb-2 mb-4"><i class="fa-solid ${category.icon} mr-2 text-themeAccent"></i>${category.category}</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        `;
        
        category.tools.forEach(tool => {
            gridHtml += `
                <div class="group border border-themeBorder bg-themeContainer hover:border-themeAccent hover:shadow-[0_0_15px_rgba(var(--theme-accent-rgb),0.2)] rounded p-4 cursor-pointer transition-all flex flex-col gap-2" onclick="loadTool('${tool.id}', '${tool.file}')">
                    <h4 class="font-bold font-mono text-themeAccent group-hover:text-themeText transition-colors">${tool.name}</h4>
                    <p class="text-xs text-themeMuted leading-relaxed">${tool.desc || 'Interactive engineering design utility.'}</p>
                </div>
            `;
        });
        
        gridHtml += `</div></div>`;
    });
    
    gridHtml += `</div>`;
    
    // Replace the default welcome content with our new grid
    welcome.innerHTML = gridHtml;
    // Remove the opacity classes
    welcome.className = "absolute inset-0 overflow-y-auto bg-themeBg";
}

// Call renderWelcomeGrid after initSidebar
const origInitSidebar = initSidebar;
initSidebar = function() {
    origInitSidebar();
    renderWelcomeGrid();
};
