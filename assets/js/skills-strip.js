(() => {
    'use strict';
    const marquee = document.getElementById('skill-marquee-view');
    const table = document.getElementById('skill-table-view');
    const collapse = document.getElementById('skills-collapse');
    if (marquee && table) {
        let observer;
        window.expandSkillMatrix = () => {
            if (marquee.classList.contains('hidden')) return;
            marquee.classList.add('hidden'); marquee.setAttribute('aria-expanded', 'true');
            table.classList.remove('hidden'); table.classList.add('animate-fade-in-up');
            collapse.hidden = false; observer?.disconnect();
        };
        marquee.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); window.expandSkillMatrix(); }
        });
        collapse.addEventListener('click', () => {
            table.classList.add('hidden'); marquee.classList.remove('hidden');
            marquee.setAttribute('aria-expanded', 'false'); collapse.hidden = true;
        });
        if ('IntersectionObserver' in window) {
            observer = new IntersectionObserver(entries => {
                if (entries.some(entry => entry.isIntersecting)) window.expandSkillMatrix();
            }, { rootMargin: '0px 0px -40% 0px', threshold: 0 });
            observer.observe(marquee);
        }
    }
})();
