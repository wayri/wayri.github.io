(() => {
    'use strict';
    const sidebar = document.querySelector('.wv-docs-sidebar');
    const menu = sidebar?.querySelector('.wv-docs-menu');
    sidebar?.classList.add('is-enhanced');
    menu?.addEventListener('click', () => {
        const open = sidebar.classList.toggle('is-open');
        menu.setAttribute('aria-expanded', String(open));
        menu.querySelector('span').textContent = open ? '−' : '+';
    });
    document.querySelectorAll('.wv-docs-article pre').forEach((pre, index) => {
        pre.tabIndex = 0; pre.setAttribute('role','region'); pre.setAttribute('aria-label','Code example ' + (index + 1));
        const tools = document.createElement('div'), button = document.createElement('button');
        tools.className = 'wv-docs-code-tools'; button.type = 'button'; button.textContent = 'Copy code';
        button.setAttribute('aria-label','Copy code example ' + (index + 1));
        button.addEventListener('click', async () => {
            try { await navigator.clipboard.writeText((pre.querySelector('code') || pre).textContent); button.textContent = 'Copied'; }
            catch { button.textContent = 'Select code to copy'; pre.focus(); }
        });
        tools.append(button); pre.before(tools);
    });
})();
