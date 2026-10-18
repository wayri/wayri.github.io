(() => {
    'use strict';
    const panel = document.getElementById('power-budget');
    if (!panel) return;

    const rows = [...panel.querySelectorAll('[data-budget-load]')];
    const energy = panel.querySelector('#budget-energy');
    const efficiency = panel.querySelector('#budget-efficiency');
    const runtime = panel.querySelector('#budget-runtime');
    const insight = panel.querySelector('#budget-insight');
    const breakdown = panel.querySelector('#budget-breakdown');
    const legend = panel.querySelector('#budget-legend');
    const readings = ['average', 'draw', 'loss', 'peak'].map(id => panel.querySelector(`#budget-${id}`));
    const defaults = rows.map(row => ({
        watts: row.querySelector('[data-load-watts]').value,
        duty: row.querySelector('[data-load-duty]').value
    }));
    const formatPower = value => `${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} W`;

    function update() {
        panel.querySelector('#budget-efficiency-value').textContent = `${efficiency.value}%`;
        const loads = rows.map(row => {
            const watts = row.querySelector('[data-load-watts]');
            const duty = row.querySelector('[data-load-duty]');
            row.querySelector('output').textContent = `${duty.value}%`;
            return { name: row.dataset.budgetLoad, watts: watts.valueAsNumber, duty: duty.valueAsNumber, valid: watts.validity.valid && duty.validity.valid };
        });
        breakdown.replaceChildren();
        legend.replaceChildren();
        if (!energy.validity.valid || !Number.isFinite(energy.valueAsNumber) || !efficiency.validity.valid || loads.some(load => !load.valid || !Number.isFinite(load.watts))) {
            runtime.textContent = '—';
            readings.forEach(reading => { reading.textContent = '—'; });
            breakdown.setAttribute('aria-label', 'Power distribution unavailable: check inputs.');
            insight.textContent = 'Enter a nonnegative power and battery energy in each field.';
            return;
        }

        const average = loads.reduce((sum, load) => sum + load.watts * load.duty / 100, 0);
        const draw = average / (efficiency.valueAsNumber / 100);
        const loss = draw - average;
        const peak = loads.reduce((sum, load) => sum + (load.duty > 0 ? load.watts : 0), 0);
        [average, draw, loss, peak].forEach((value, i) => { readings[i].textContent = formatPower(value); });

        if (draw === 0) {
            runtime.textContent = 'No load';
            insight.textContent = 'Enable a load to estimate runtime. Off-state power is assumed to be zero.';
            breakdown.setAttribute('aria-label', 'No active loads.');
            return;
        }

        const hours = energy.valueAsNumber / draw;
        if (hours < 1 / 60 && hours > 0) {
            runtime.textContent = '< 1 min';
        } else if (hours >= 1000) {
            runtime.textContent = `${Math.round(hours).toLocaleString()} h`;
        } else {
            const minutes = Math.round(hours * 60);
            runtime.replaceChildren(document.createTextNode(`${Math.floor(minutes / 60)}`));
            const h = document.createElement('span'); h.textContent = 'h';
            const m = document.createElement('span'); m.textContent = 'm';
            runtime.append(h, document.createTextNode(` ${minutes % 60}`), m);
        }

        const active = loads.filter(load => load.watts * load.duty > 0);
        const distribution = [];
        active.forEach(load => {
            const share = load.watts * load.duty / 100 / average * 100;
            const color = `var(--budget-${load.name.toLowerCase()})`;
            const segment = document.createElement('span');
            segment.style.width = `${share}%`;
            segment.style.background = color;
            const item = document.createElement('span');
            const swatch = document.createElement('i'); swatch.style.background = color;
            item.append(swatch, document.createTextNode(load.name));
            breakdown.append(segment); legend.append(item);
            distribution.push(`${load.name}: ${share.toFixed(0)}%`);
        });
        breakdown.setAttribute('aria-label', `Average load power distribution. ${distribution.join(', ')}.`);
        const largest = active.reduce((a, b) => a.watts * a.duty >= b.watts * b.duty ? a : b);
        const largestShare = largest.watts * largest.duty / 100 / average * 100;
        insight.textContent = energy.valueAsNumber === 0
            ? 'There is no usable battery energy. Add energy to estimate an operating time.'
            : `${largest.name} uses ${largestShare.toFixed(0)}% of average load power. ${efficiency.value}% conversion efficiency reduces runtime by ${100 - efficiency.valueAsNumber}% versus an ideal converter.`;
    }

    panel.addEventListener('input', update);
    panel.querySelector('#budget-reset').addEventListener('click', () => {
        rows.forEach((row, i) => {
            row.querySelector('[data-load-watts]').value = defaults[i].watts;
            row.querySelector('[data-load-duty]').value = defaults[i].duty;
        });
        energy.value = '20'; efficiency.value = '90';
        update();
    });
    update();
})();
