for (const demo of document.querySelectorAll('[data-walkthrough]')) {
    const image = demo.querySelector('img');
    const button = demo.querySelector('button');
    const poster = image.getAttribute('src');
    const animation = image.dataset.animation;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let playing = false;

    function setPlaying(next) {
        playing = next;
        image.src = playing ? animation : poster;
        button.textContent = playing ? 'Pause animation' : 'Play animation';
    }

    const observer = new IntersectionObserver(entries => {
        if (!entries.some(entry => entry.isIntersecting)) return;
        observer.disconnect();
        if (!reducedMotion.matches) setPlaying(true);
    });
    observer.observe(image);

    button.hidden = false;
    button.addEventListener('click', () => {
        observer.disconnect();
        setPlaying(!playing);
    });
    image.addEventListener('error', () => {
        if (playing) setPlaying(false);
    });
    reducedMotion.addEventListener('change', event => {
        if (event.matches && playing) setPlaying(false);
    });
}
