(() => {
    'use strict';
    document.querySelectorAll('[data-project-gallery]').forEach(gallery => {
        if (gallery.dataset.galleryReady) return;
        gallery.dataset.galleryReady = 'true';
        const slides = [...gallery.querySelectorAll('[data-gallery-slide]')];
        if (!slides.length) return;
        const previous = gallery.querySelector('[data-gallery-previous]');
        const next = gallery.querySelector('[data-gallery-next]');
        const status = gallery.querySelector('[data-gallery-status]');
        const toggle = gallery.querySelector('[data-gallery-toggle]');
        const topics = [...gallery.querySelectorAll('[data-gallery-topic]')];
        const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
        const autoplay = gallery.hasAttribute('data-gallery-autoplay') && !!toggle;
        let index = 0;
        let paused = !autoplay || motion.matches;
        let hovering = false;
        let focused = false;
        let inViewport = true;
        let timer;
        function schedule() {
            window.clearTimeout(timer);
            status.setAttribute('aria-live', paused ? 'polite' : 'off');
            if (paused || hovering || focused || !inViewport || document.hidden) return;
            const duration = slides[index].dataset.galleryDuration === '12000' ? 12000 : 7000;
            timer = window.setTimeout(() => { show(index + 1); schedule(); }, duration);
        }
        function show(value) {
            index = (value + slides.length) % slides.length;
            slides.forEach((slide, i) => slide.hidden = i !== index);
            status.textContent = (index + 1) + ' / ' + slides.length + ' · ' + slides[index].dataset.label;
            topics.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.galleryTopic === slides[index].dataset.galleryGroup)));
        }
        function updateToggle() {
            if (!toggle) return;
            toggle.textContent = paused ? 'Play slideshow' : 'Pause slideshow';
            toggle.setAttribute('aria-label', paused ? 'Play presentation' : 'Pause presentation');
        }
        function navigate(value) {
            paused = true;
            show(value);
            updateToggle();
            schedule();
        }
        previous.addEventListener('click', () => navigate(index - 1));
        next.addEventListener('click', () => navigate(index + 1));
        topics.forEach(button => button.addEventListener('click', () => {
            const target = slides.findIndex(slide => slide.dataset.galleryGroup === button.dataset.galleryTopic);
            if (target !== -1) navigate(target);
        }));
        gallery.addEventListener('keydown', event => {
            if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
            event.preventDefault();
            navigate(index + (event.key === 'ArrowRight' ? 1 : -1));
        });
        if (autoplay) {
            toggle.addEventListener('click', () => { paused = !paused; updateToggle(); schedule(); });
            gallery.addEventListener('mouseenter', () => { hovering = true; schedule(); });
            gallery.addEventListener('mouseleave', () => { hovering = false; schedule(); });
            gallery.addEventListener('focusin', () => { focused = true; schedule(); });
            gallery.addEventListener('focusout', event => { focused = gallery.contains(event.relatedTarget); schedule(); });
            document.addEventListener('visibilitychange', schedule);
            window.addEventListener('pagehide', () => window.clearTimeout(timer));
            window.addEventListener('pageshow', schedule);
            if ('IntersectionObserver' in window) {
                const observer = new IntersectionObserver(entries => {
                    inViewport = entries.some(entry => entry.isIntersecting);
                    schedule();
                });
                observer.observe(gallery);
            }
            motion.addEventListener('change', event => { if (event.matches) paused = true; updateToggle(); schedule(); });
        }
        show(0);
        updateToggle();
        schedule();
    });
})();
