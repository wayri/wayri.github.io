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
        const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
        const autoplay = gallery.hasAttribute('data-gallery-autoplay') && !!toggle;
        let index = 0;
        let paused = !autoplay || motion.matches;
        let hovering = false;
        let focused = false;
        let timer;
        function schedule() {
            window.clearTimeout(timer);
            status.setAttribute('aria-live', paused ? 'polite' : 'off');
            if (paused || hovering || focused || document.hidden) return;
            timer = window.setTimeout(() => { show(index + 1); schedule(); }, 7000);
        }
        function show(value) {
            index = (value + slides.length) % slides.length;
            slides.forEach((slide, i) => slide.hidden = i !== index);
            status.textContent = (index + 1) + ' / ' + slides.length + ' · ' + slides[index].dataset.label;
        }
        function updateToggle() {
            if (!toggle) return;
            toggle.textContent = paused ? 'Play slideshow' : 'Pause slideshow';
            toggle.setAttribute('aria-label', paused ? 'Play automatic screenshots' : 'Pause automatic screenshots');
        }
        previous.addEventListener('click', () => { show(index - 1); schedule(); });
        next.addEventListener('click', () => { show(index + 1); schedule(); });
        gallery.addEventListener('keydown', event => {
            if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
            event.preventDefault();
            show(index + (event.key === 'ArrowRight' ? 1 : -1));
            schedule();
        });
        if (autoplay) {
            toggle.addEventListener('click', () => { paused = !paused; updateToggle(); schedule(); });
            gallery.addEventListener('mouseenter', () => { hovering = true; schedule(); });
            gallery.addEventListener('mouseleave', () => { hovering = false; schedule(); });
            gallery.addEventListener('focusin', () => { focused = true; schedule(); });
            gallery.addEventListener('focusout', event => { focused = gallery.contains(event.relatedTarget); schedule(); });
            document.addEventListener('visibilitychange', schedule);
            motion.addEventListener('change', event => { if (event.matches) paused = true; updateToggle(); schedule(); });
        }
        show(0);
        updateToggle();
        schedule();
    });
})();
