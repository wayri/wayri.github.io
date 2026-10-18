(() => {
    const root = document.documentElement;
    const toggle = document.getElementById('reading-theme-toggle');
    const diagrams = [];
    let renderQueue = Promise.resolve();

    function updateButton() {
        const dark = root.dataset.theme === 'dark';
        toggle.textContent = dark ? 'Light mode' : 'Dark mode';
        toggle.setAttribute('aria-pressed', String(dark));
    }

    function renderDiagrams() {
        renderQueue = renderQueue.then(async () => {
            if (!window.mermaid || !diagrams.length) return;
            mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: root.dataset.theme === 'dark' ? 'dark' : 'neutral', fontFamily: 'system-ui, sans-serif' });
            for (const { element, source } of diagrams) {
                // Hold the diagram's space while its theme is redrawn.
                element.style.minHeight = `${element.getBoundingClientRect().height}px`;
                element.removeAttribute('data-processed');
                element.textContent = source;
                try {
                    await mermaid.run({ nodes: [element] });
                } catch (error) {
                    const fallback = document.createElement('pre');
                    fallback.textContent = source;
                    element.replaceChildren(fallback);
                } finally {
                    element.style.minHeight = '';
                }
            }
        });
    }

    toggle.hidden = false;
    updateButton();
    toggle.addEventListener('click', () => {
        const dark = root.dataset.theme !== 'dark';
        if (dark) root.dataset.theme = 'dark';
        else root.removeAttribute('data-theme');
        try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch (error) { /* Optional storage. */ }
        updateButton();
        renderDiagrams();
    });

    document.querySelectorAll('pre code.language-mermaid').forEach(code => {
        const element = document.createElement('div');
        element.className = 'mermaid';
        const source = code.textContent;
        element.textContent = source;
        code.parentElement.replaceWith(element);
        diagrams.push({ element, source });
    });
    renderDiagrams();
})();
