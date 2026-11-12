const toolsAssetVersion = new URL(document.currentScript.src).searchParams.get('v') || '1';
const TOOL_REGISTRY = [
    {
        "category": "Circuit fundamentals",
        "icon": "fa-bolt",
        "tools": [
            {
                "id": "tool-ohms-law-wheel",
                "name": "Ohm’s law",
                "file": "ohms-law-wheel.html",
                "desc": "Positive DC resistive voltage, current, resistance and power.",
                "type": "Analytical calculator"
            },
            {
                "id": "tool-resistor-divider",
                "name": "Loaded resistor divider",
                "file": "resistor-divider.html",
                "desc": "DC division with an optional load and resistor dissipation.",
                "type": "Analytical calculator"
            },
            {
                "id": "tool-e-series-finder",
                "name": "E-series finder",
                "file": "e-series-finder.html",
                "desc": "Nearest nominal E12, E24 and E96 values, including decade boundaries.",
                "type": "Analytical calculator"
            },
            {
                "id": "tool-smd-resistor",
                "name": "SMD resistor decoder",
                "file": "smd-resistor.html",
                "desc": "Common nominal codes; tolerance still comes from the part.",
                "type": "Analytical calculator"
            },
            {
                "id": "tool-led-resistor",
                "name": "LED series resistor",
                "file": "led-resistor.html",
                "desc": "Constant-forward-voltage estimate and upward E12 rounding.",
                "type": "Analytical calculator"
            },
            {
                "id": "tool-reactance-calc",
                "name": "Reactance",
                "file": "reactance-calc.html",
                "desc": "Ideal inductive/capacitive reactance and LC resonance.",
                "type": "Analytical calculator"
            },
            {
                "id": "tool-rc-time-calc",
                "name": "RC timing",
                "file": "rc-time-calc.html",
                "desc": "Ideal first-order step response and cutoff frequency.",
                "type": "Analytical calculator"
            },
            {
                "id": "tool-555-timer-calc",
                "name": "555 timing",
                "file": "555-timer-calc.html",
                "desc": "Ideal astable and monostable threshold timing.",
                "type": "Analytical calculator"
            },
            {
                "id": "tool-current-sense-amp",
                "name": "Current-sense scaling",
                "file": "current-sense-amp.html",
                "desc": "Shunt resistance, ideal gain, dissipation and ADC scaling.",
                "type": "Analytical calculator"
            },
            {
                "id": "tool-unit-converter",
                "name": "Engineering units",
                "file": "unit-converter.html",
                "desc": "Explicit unit conventions and logarithmic references.",
                "type": "Analytical calculator"
            }
        ]
    },
    {
        "category": "Power & energy",
        "icon": "fa-plug-circle-bolt",
        "tools": [
            {
                "id": "tool-pv-yield-simulator",
                "name": "Solar PV generation",
                "file": "pv-yield-simulator.html",
                "desc": "Local map, solar power and monthly/yearly energy; panel-angle search and optional supplied data.",
                "type": "Generation estimate"
            },
            {
                "id": "tool-battery-suite",
                "name": "Battery life & voltage profiles",
                "file": "battery-suite.html",
                "desc": "Manufacturer references, current/power/resistance schedules and explicit temperature scenarios.",
                "type": "Discharge scenario model"
            },
            {
                "id": "tool-smps-loop-tuner",
                "name": "SMPS output-network & loop tuner",
                "file": "smps-loop-tuner.html",
                "desc": "Capacitor resonance, output sizing, loaded filters and measured-loop adjustment.",
                "type": "Analytical calculator"
            },
            {
                "id": "tool-pdn-impedance",
                "name": "PDN target impedance",
                "file": "pdn-impedance.html",
                "desc": "Allowed voltage change divided by a stated current step.",
                "type": "Analytical calculator"
            },
            {
                "id": "tool-magnetic-reluctance",
                "name": "Magnetic reluctance",
                "file": "magnetic-reluctance.html",
                "desc": "Uniform linear core/gap model with user-supplied material data.",
                "type": "Analytical calculator"
            },
            {
                "id": "tool-battery-life-estimator",
                "name": "Battery runtime arithmetic",
                "file": "battery-life-estimator.html",
                "desc": "Usable capacity and active/sleep current averaging.",
                "type": "Analytical calculator"
            },
            {
                "id": "tool-battery-pack-s-p-config",
                "name": "Battery pack arithmetic",
                "file": "battery-pack-s-p-config.html",
                "desc": "Identical-cell series/parallel nominal values and resistive loss.",
                "type": "Analytical calculator"
            },
            {
                "id": "tool-grid-power-calc",
                "name": "AC power & PFC",
                "file": "grid-power-calc.html",
                "desc": "Sinusoidal single-phase and balanced three-phase equations.",
                "type": "Analytical calculator"
            },
            {
                "id": "tool-hydro-power-calc",
                "name": "Hydro power balance",
                "file": "hydro-power-calc.html",
                "desc": "Steady flow, net head and supplied efficiencies.",
                "type": "Analytical calculator"
            },
            {
                "id": "tool-ev-powertrain-calc",
                "name": "EV steady-speed estimate",
                "file": "ev-powertrain-calc.html",
                "desc": "Flat-road rolling and aerodynamic power; no drive-cycle prediction.",
                "type": "Analytical calculator"
            }
        ]
    },
    {
        "category": "RF & matching",
        "icon": "fa-satellite-dish",
        "tools": [
            {
                "id": "tool-smith-chart",
                "name": "Smith chart & matching",
                "file": "smith-chart.html",
                "desc": "Complex impedance, reflection and ideal matching networks.",
                "type": "Analytical calculator"
            },
            {
                "id": "tool-skin-depth",
                "name": "Skin depth & DC resistance",
                "file": "skin-depth.html",
                "desc": "Good-conductor penetration depth; no AC resistance or thermal rating.",
                "type": "Analytical calculator"
            },
            {
                "id": "tool-rf-unit-translator",
                "name": "RF unit translator",
                "file": "rf-unit-translator.html",
                "desc": "Power/voltage references and specified resistive impedance.",
                "type": "Analytical calculator"
            },
            {
                "id": "tool-attenuator-calc",
                "name": "Matched resistive attenuator",
                "file": "attenuator-calc.html",
                "desc": "Equal-impedance Pi/T pads with resistor power calculation.",
                "type": "Analytical calculator"
            },
            {
                "id": "tool-rf-noise-figure",
                "name": "Cascade noise figure",
                "file": "rf-noise-figure.html",
                "desc": "Friis noise cascade with linear gains and stage order.",
                "type": "Analytical calculator"
            },
            {
                "id": "tool-friis-transmission",
                "name": "Free-space link budget",
                "file": "friis-transmission.html",
                "desc": "Ideal far-field free-space path, antenna gains and stated losses.",
                "type": "Analytical calculator"
            }
        ]
    },
    {
        "category": "Interface cheat sheets",
        "icon": "fa-book-open",
        "tools": [
            {
                "id": "tool-ddr-reference",
                "name": "DDR timing & routing",
                "file": "ddr-reference.html",
                "desc": "Timing terms, signal groups, delay budgets and bring-up.",
                "type": "Reference sheet"
            },
            {
                "id": "tool-ethernet-reference",
                "name": "Ethernet types & connections",
                "file": "ethernet-reference.html",
                "desc": "BASE-T and single-pair types, MAC–PHY interfaces, contacts and layout.",
                "type": "Reference sheet"
            },
            {
                "id": "tool-serdes-reference",
                "name": "SerDes channel design",
                "file": "serdes-reference.html",
                "desc": "Clocking, UI, coupling, equalization and channel checks.",
                "type": "Reference sheet"
            },
            {
                "id": "tool-lvds-reference",
                "name": "LVDS connections",
                "file": "lvds-reference.html",
                "desc": "Termination, common mode, topology, polarity and clock/data checks.",
                "type": "Reference sheet"
            }
        ]
    }
];

let loadedScripts = new Set();
let loadedStyles = new Set();

document.addEventListener('DOMContentLoaded', () => {
    initSidebar();
    const requested = new URL(location.href).searchParams.get('tool');
    const tool = TOOL_REGISTRY.flatMap(category => category.tools).find(item => item.id === requested);
    if (tool) loadTool(tool.id, tool.file);
});

function initSidebar() {
    const sidebar = document.getElementById('tools-sidebar');
    if(!sidebar) return;

    let html = `
        <div class="p-2 border-b border-themeBorder/40 bg-themeBg/80 sticky top-0 z-20">
            <div class="relative flex items-center">
                <i class="fa-solid fa-search absolute left-2.5 text-themeMuted text-xs"></i>
                <input type="text" id="tools-search-input" aria-label="Search engineering tools" placeholder="Search calculators & references..."
                    class="w-full bg-themeContainer border border-themeBorder text-xs text-themeText pl-8 pr-2 py-1.5 rounded outline-none focus:border-themeAccent transition-colors font-mono"
                    oninput="filterTools(this.value)">
            </div>
        </div>
    `;

    TOOL_REGISTRY.forEach((category, catIdx) => {
        html += `
            <div class="border-b border-themeBorder/50 category-group" id="cat-group-${catIdx}">
                <button aria-expanded="false" aria-controls="cat-content-${catIdx}" class="w-full text-left p-3 flex justify-between items-center hover:bg-themeBorder/10 transition-colors focus:outline-none" onclick="toggleCategory(${catIdx})">
                    <span class="font-bold text-themeText flex items-center gap-2"><i class="fa-solid ${category.icon} w-4 text-center"></i> ${category.category}</span>
                    <i class="fa-solid fa-chevron-down text-xs text-themeMuted transition-transform duration-200" id="cat-icon-${catIdx}"></i>
                </button>
                <div id="cat-content-${catIdx}" class="hidden flex-col bg-themeBg/50 pb-2">
        `;
        category.tools.forEach(tool => {
            html += `
                <button class="tool-item-btn text-left pl-10 py-2 pr-4 text-themeMuted hover:text-themeAccent hover:bg-themeBorder/20 transition-colors text-xs border-l-2 border-transparent hover:border-themeAccent" data-tool-id="${tool.id}" data-tool-name="${tool.name.toLowerCase()}" data-cat-idx="${catIdx}" onclick="loadTool('${tool.id}', '${tool.file}', this)">
                    ${tool.name}
                </button>
            `;
        });
        html += `</div></div>`;
    });
    html += `<div id="tools-sidebar-empty" class="tools-sidebar-empty" role="status" hidden><p>No matching tools.</p><button type="button" onclick="clearToolSearch()">Clear search</button></div>`;
    sidebar.innerHTML = html;
}

function filterTools(query) {
    const q = (query || '').toLowerCase().trim();
    const words = q.split(/\s+/).filter(Boolean);
    const matches = new Set(TOOL_REGISTRY.flatMap(category => category.tools).filter(tool => words.every(word => `${tool.name} ${tool.desc || ''} ${tool.type}`.toLowerCase().includes(word))).map(tool => tool.id));
    TOOL_REGISTRY.forEach((category, catIdx) => {
        const group = document.getElementById(`cat-group-${catIdx}`);
        const content = document.getElementById(`cat-content-${catIdx}`);
        const icon = document.getElementById(`cat-icon-${catIdx}`);
        if (!group || !content) return;
        const categoryButton = group.querySelector('[aria-expanded]');

        let visibleCount = 0;
        const toolBtns = group.querySelectorAll('.tool-item-btn');
        toolBtns.forEach(btn => {
            if (matches.has(btn.getAttribute('data-tool-id'))) {
                btn.style.display = 'block';
                visibleCount++;
            } else {
                btn.style.display = 'none';
            }
        });

        if (!q) {
            group.style.display = 'block';
            content.classList.add('hidden');
            content.classList.remove('flex');
            if (icon) icon.style.transform = 'rotate(0deg)';
        } else if (visibleCount > 0) {
            group.style.display = 'block';
            content.classList.remove('hidden');
            content.classList.add('flex');
            if (icon) icon.style.transform = 'rotate(180deg)';
        } else {
            group.style.display = 'none';
        }
        if (categoryButton) categoryButton.setAttribute('aria-expanded', String(!!q && visibleCount > 0));
    });
    document.querySelectorAll('[data-tool-card]').forEach(card => {
        card.hidden = !matches.has(card.getAttribute('data-tool-card'));
    });
    document.querySelectorAll('.tools-directory-category').forEach(category => {
        category.hidden = !category.querySelector('[data-tool-card]:not([hidden])');
    });
    const summary = document.getElementById('tools-search-summary');
    if (summary) summary.textContent = q ? `${matches.size} matching ${matches.size === 1 ? 'tool' : 'tools'}.` : `${matches.size} calculators and references. Browse below or search by name or topic.`;
    const empty = document.getElementById('tools-empty-results');
    if (empty) empty.hidden = matches.size !== 0;
    const sidebarEmpty = document.getElementById('tools-sidebar-empty');
    if (sidebarEmpty) sidebarEmpty.hidden = matches.size !== 0;
}

function clearToolSearch() {
    const input = document.getElementById('tools-search-input');
    if (input) { input.value = ''; input.focus(); }
    filterTools('');
}

function toggleCategory(idx) {
    const content = document.getElementById(`cat-content-${idx}`);
    const icon = document.getElementById(`cat-icon-${idx}`);
    const button = document.querySelector(`[aria-controls="cat-content-${idx}"]`);
    if (button) button.setAttribute('aria-expanded', String(content.classList.contains('hidden')));
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

let toolRequest = 0;
let toolFetchController = null;
const loadedToolScripts = new Map();
function setToolBrowserCollapsed(collapsed) {
    const workspace = document.getElementById('tools-workspace');
    const toggle = document.getElementById('tools-browser-toggle');
    if (!workspace || !toggle) return;
    workspace.classList.toggle('tools-sidebar-collapsed', collapsed);
    toggle.setAttribute('aria-expanded', String(!collapsed));
    toggle.textContent = collapsed ? 'Browse tools' : 'Hide tools';
}
document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('tools-browser-toggle');
    if (!toggle) return;
    toggle.addEventListener('click', () => setToolBrowserCollapsed(toggle.getAttribute('aria-expanded') === 'true'));
    setToolBrowserCollapsed(window.matchMedia('(max-width: 767px)').matches);
});
async function loadTool(toolId, fileName, btnElement) {
    const allowed = TOOL_REGISTRY.flatMap(category => category.tools).find(item => item.id === toolId && item.file === fileName);
    if (!allowed) return;
    const request = ++toolRequest;
    if (toolFetchController) toolFetchController.abort();
    const controller = toolFetchController = new AbortController();
    if (window.HarnessApp) window.HarnessApp.destroy();
    const tool = TOOL_REGISTRY.flatMap(category => category.tools).find(tool => tool.id === toolId);
    const label = document.getElementById('tools-current-label');
    if (label) label.textContent = tool ? tool.name : 'Engineering tool';
    if (window.matchMedia('(max-width: 767px)').matches) setToolBrowserCollapsed(true);
    // Update Active State on Buttons
    document.querySelectorAll('#tools-sidebar button').forEach(b => {
        b.classList.remove('text-themeAccent', 'border-themeAccent', 'bg-themeBorder/10');
        if(b.classList.contains('pl-10')) {
            b.classList.add('text-themeMuted', 'border-transparent');
        }
    });
    if (!btnElement) btnElement = document.querySelector(`[data-tool-id="${toolId}"]`);
    if(btnElement) {
        btnElement.classList.add('text-themeAccent', 'border-themeAccent', 'bg-themeBorder/10');
        btnElement.classList.remove('text-themeMuted', 'border-transparent');
    }

    const mainArea = document.getElementById('tools-content');
    const welcome = document.getElementById('tools-welcome');
    if (window.Chart) {
        Object.values(window.Chart.instances).forEach(chart => {
            if (mainArea.contains(chart.canvas)) chart.destroy();
        });
    }
    
    welcome.classList.add('hidden');
    mainArea.classList.remove('hidden');
    mainArea.classList.add('flex');
    mainArea.setAttribute('aria-busy', 'true');
    mainArea.inert = true;
    
    mainArea.innerHTML = `<div class="flex justify-center p-12 text-themeMuted"><i class="fa-solid fa-spinner fa-spin text-2xl"></i><span class="ml-2 font-mono">Loading tool...</span></div>`;

    try {
        // Fetch the HTML content for the selected tool with cache-busting
        const response = await fetch(`/assets/tools_html/${fileName}?v=${encodeURIComponent(toolsAssetVersion)}`, { signal: controller.signal, cache: 'no-cache' });
        if (!response.ok) throw new Error('Tool file not found');
        const html = await response.text();
        if (request !== toolRequest) return;
        
        mainArea.innerHTML = html;
        mainArea.dataset.toolId = toolId;
        ToolsHelp.mount(mainArea, toolId);

        // Execute scripts found in the fetched HTML
        const scripts = mainArea.querySelectorAll('script');
        for (const oldScript of scripts) {
            if (request !== toolRequest) return;
            const newScript = document.createElement('script');
            Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
            if (oldScript.src) {
                let loaded = loadedToolScripts.get(oldScript.src);
                if (!loaded) {
                    newScript.async = false;
                    loaded = new Promise((resolve, reject) => {
                        newScript.onload = resolve;
                        newScript.onerror = () => reject(new Error('Could not load the tool engine. Please retry.'));
                        oldScript.parentNode.replaceChild(newScript, oldScript);
                    });
                    loadedToolScripts.set(oldScript.src, loaded);
                    loaded.catch(() => loadedToolScripts.delete(oldScript.src));
                } else oldScript.remove();
                await loaded;
            } else {
                newScript.textContent = oldScript.textContent;
                oldScript.parentNode.replaceChild(newScript, oldScript);
            }
        }
        
        // Universal Lifecycle Auto-Initializer
        if (request !== toolRequest) return;
        requestAnimationFrame(() => {
            if (request !== toolRequest || !mainArea.isConnected) return;
            // Trigger MathJax typesetting for equations in the newly loaded tool
            if (window.MathJax && typeof MathJax.typesetPromise === 'function') {
                MathJax.typesetPromise([mainArea]).catch((err) => console.log('MathJax typeset failed: ' + err.message));
            }

            // Dispatch universal toolLoaded event
            document.dispatchEvent(new CustomEvent('toolLoaded', { detail: { toolId } }));
            

        });

    } catch (error) {
        if (request !== toolRequest || error.name === 'AbortError') return;
        mainArea.innerHTML = `<div class="p-6 border border-red-500/50 bg-red-500/10 text-red-400 font-mono"><i class="fa-solid fa-triangle-exclamation mr-2"></i> Error loading tool: ${error.message}<br><br>Tool File: ${fileName}</div>`;
    } finally {
        if (request === toolRequest) {
            mainArea.inert = false;
            mainArea.setAttribute('aria-busy', 'false');
        }
    }
}

function renderWelcomeGrid() {
    const welcome = document.getElementById('tools-welcome');
    if (!welcome) return;
    const allTools = TOOL_REGISTRY.flatMap(category => category.tools);
    const starters = ['tool-pv-yield-simulator', 'tool-battery-suite', 'tool-smps-loop-tuner', 'tool-smith-chart'];
    let gridHtml = `<div class="tools-directory">
        <header class="tools-directory-intro">
            <h2><i class="fa-solid fa-toolbox text-themeAccent" aria-hidden="true"></i> Engineering Toolkit</h2>
            <p>Calculators for circuit, power and RF work, with practical interface references.</p>
            <p class="tools-model-note">Each calculator explains its equations and limits, with representative numerical checks in the repository. Reference sheets link to device-vendor guidance. Use your actual component data, stackup and operating conditions; a calculation alone does not validate hardware.</p>
        </header>
        <nav class="tools-starting-points" aria-label="Start with a calculation"><span>Start with</span>${starters.map(id => {
            const tool = allTools.find(item => item.id === id);
            return tool ? `<button type="button" onclick="loadTool('${tool.id}', '${tool.file}')">${tool.name} <span aria-hidden="true">↗</span></button>` : '';
        }).join('')}</nav>
        <p id="tools-search-summary" class="tools-search-summary" role="status" aria-live="polite">${allTools.length} calculators and references. Browse below or search by name or topic.</p>
        <div id="tools-empty-results" class="tools-empty-results" hidden><h3>No matching tools</h3><p>Try a broader term, such as battery, resistor or impedance.</p><button type="button" onclick="clearToolSearch()">Clear search</button></div>`;
    TOOL_REGISTRY.forEach(category => {
        gridHtml += `<section class="tools-directory-category"><h3><i class="fa-solid ${category.icon}" aria-hidden="true"></i> ${category.category}</h3><div class="tools-directory-grid">`;
        category.tools.forEach(tool => {
            gridHtml += `<button type="button" class="tool-card" data-tool-card="${tool.id}" onclick="loadTool('${tool.id}', '${tool.file}')"><span class="tool-card-name">${tool.name}<span aria-hidden="true">↗</span></span><span class="tool-card-description">${tool.desc || 'Engineering calculation and reference.'}</span><span class="tool-card-type">${tool.type}</span></button>`;
        });
        gridHtml += '</div></section>';
    });
    welcome.innerHTML = gridHtml + '</div>';
    welcome.className = 'absolute inset-0 overflow-y-auto bg-themeBg';
}

// Call renderWelcomeGrid after initSidebar
const origInitSidebar = initSidebar;
initSidebar = function() {
    origInitSidebar();
    renderWelcomeGrid();
};

// Keep axes and labels readable when switching the workspace theme.
if (window.Chart) {
    const originalColors = new WeakMap();
    window.Chart.register({
        id: 'toolsWorkspaceTheme',
        beforeUpdate(chart) {
            if (!chart.canvas.closest('#tools-workspace')) return;
            const style = getComputedStyle(document.documentElement);
            const text = style.getPropertyValue('--text-color').trim();
            const muted = style.getPropertyValue('--muted-text').trim();
            const accent = style.getPropertyValue('--accent-color').trim();
            const dark = document.documentElement.getAttribute('data-theme') === 'dark';
            const options = chart.config.options;
            options.color = text;
            for (const scale of Object.values(options.scales || {})) {
                scale.ticks = { ...scale.ticks, color: muted };
                scale.title = { ...scale.title, color: text };
                scale.grid = { ...scale.grid, color: dark ? '#ffffff20' : '#0f172a20' };
                scale.border = { ...scale.border, color: muted };
            }
            if (options.plugins?.legend) options.plugins.legend.labels = { ...options.plugins.legend.labels, color: text };
            const lightColors = { '#4ade80': '#15803d', '#60a5fa': '#1d4ed8', '#f87171': '#b91c1c', '#facc15': '#a16207', '#38bdf8': '#0369a1' };
            chart.data.datasets.forEach(dataset => {
                if (!originalColors.has(dataset)) originalColors.set(dataset, dataset.borderColor);
                const original = originalColors.get(dataset);
                if (typeof original !== 'string') return;
                const color = original.toLowerCase();
                dataset.borderColor = ['#d4af37', '#cda434'].includes(color) ? accent : !dark && lightColors[color] ? lightColors[color] : original;
            });
        }
    });
    window.addEventListener('themeChanged', () => {
        Object.values(window.Chart.instances).forEach(chart => {
            if (chart.canvas.closest('#tools-workspace')) chart.update('none');
        });
    });
}

// Register the tools service worker for offline use.
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(reg => {
                console.log('⚡ Engineering Tools Suite ServiceWorker Registered (Offline Ready):', reg.scope);
            })
            .catch(err => {
                console.log('ServiceWorker registration note:', err.message);
            });
    });
}
