(() => {
    'use strict';
    document.querySelectorAll('[data-project-gallery]').forEach(gallery => {
        if (gallery.dataset.galleryReady) return;
        gallery.dataset.galleryReady = 'true';
        const slides = [...gallery.querySelectorAll('[data-gallery-slide]')];
        const previous = gallery.querySelector('[data-gallery-previous]');
        const next = gallery.querySelector('[data-gallery-next]');
        const status = gallery.querySelector('[data-gallery-status]');
        let index = 0;
        function show(value) {
            index = (value + slides.length) % slides.length;
            slides.forEach((slide, i) => slide.hidden = i !== index);
            status.textContent = (index + 1) + ' / ' + slides.length + ' · ' + slides[index].dataset.label;
        }
        previous.addEventListener('click', () => show(index - 1));
        next.addEventListener('click', () => show(index + 1));
        gallery.addEventListener('keydown', event => {
            if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
            event.preventDefault();
            show(index + (event.key === 'ArrowRight' ? 1 : -1));
        });
        show(0);
    });
})();
