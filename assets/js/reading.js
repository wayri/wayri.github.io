(() => {
    const root = document.documentElement;
    const diagrams = [];
    let renderQueue = Promise.resolve();
    const index = document.querySelector('.article-index');
    if (index) {
        const navigation = index.querySelector('nav');
        const toggle = document.createElement('button');
        toggle.type = 'button'; toggle.className = 'article-index-toggle';
        toggle.textContent = 'Browse articles'; toggle.setAttribute('aria-expanded', 'false');
        navigation.id = 'article-index-navigation'; toggle.setAttribute('aria-controls', navigation.id);
        index.classList.add('is-collapsed'); index.prepend(toggle);
        toggle.addEventListener('click', () => {
            const collapsed = index.classList.toggle('is-collapsed');
            toggle.setAttribute('aria-expanded', String(!collapsed));
        });
        navigation.addEventListener('click', event => {
            if (!event.target.closest('a') || !window.matchMedia('(max-width: 760px)').matches) return;
            index.classList.add('is-collapsed'); toggle.setAttribute('aria-expanded', 'false');
        });
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

    window.addEventListener('themeChanged', renderDiagrams);

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
