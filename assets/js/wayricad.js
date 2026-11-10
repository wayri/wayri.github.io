(() => {
    'use strict';
    const input = document.getElementById('plugin-search');
    const rows = [...document.querySelectorAll('.wayricad-tool')];
    const groups = [...document.querySelectorAll('.wayricad-tool-group')];
    const count = document.getElementById('plugin-count');
    const empty = document.getElementById('plugin-empty');
    function filter() {
        const terms = input.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
        let visible = 0;
        rows.forEach(row => {
            const text = row.dataset.search.toLowerCase();
            row.hidden = !terms.every(term => text.includes(term));
            if (!row.hidden) visible++;
        });
        groups.forEach(group => { group.hidden = ![...group.querySelectorAll('.wayricad-tool')].some(row => !row.hidden); });
        count.textContent = `${visible} of ${rows.length} tools shown.`;
        empty.hidden = visible !== 0;
    }
    if (input && count && empty) { input.addEventListener('input', filter); filter(); }
    const copy = document.getElementById('copy-pcm');
    if (copy) copy.addEventListener('click', async () => {
        const feed = document.getElementById('pcm-feed');
        const status = document.getElementById('copy-status');
        try {
            await navigator.clipboard.writeText(feed.value);
            status.textContent = 'Repository URL copied.';
        } catch {
            feed.focus(); feed.select();
            status.textContent = 'Copy is unavailable here. The URL is selected for manual copying.';
        }
    });
})();
