(() => {
    const root = document.documentElement;
    try {
        if (localStorage.getItem('theme') === 'light') root.removeAttribute('data-theme');
        else root.dataset.theme = 'dark';
    } catch (error) { root.dataset.theme = 'dark'; }

    document.addEventListener('DOMContentLoaded', () => {
        const theme = document.getElementById('site-theme-toggle');
        const menu = document.getElementById('site-menu-toggle');
        const navigation = document.getElementById('site-navigation');
        const updateTheme = () => {
            const dark = root.dataset.theme === 'dark';
            theme.setAttribute('aria-pressed', String(dark));
            theme.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
            theme.title = dark ? 'Switch to light theme' : 'Switch to dark theme';
        };
        updateTheme();
        theme.addEventListener('click', () => {
            const dark = root.dataset.theme !== 'dark';
            if (dark) root.dataset.theme = 'dark';
            else root.removeAttribute('data-theme');
            try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch (error) { /* Saving is optional. */ }
            updateTheme();
            window.dispatchEvent(new Event('themeChanged'));
        });
        const setMenu = open => {
            navigation.classList.toggle('is-open', open);
            menu.setAttribute('aria-expanded', String(open));
            menu.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
            menu.title = open ? 'Close navigation' : 'Open navigation';
            menu.querySelector('i').className = open ? 'fa-solid fa-xmark' : 'fa-solid fa-bars';
        };
        menu.addEventListener('click', () => {
            setMenu(!navigation.classList.contains('is-open'));
        });
        navigation.addEventListener('click', event => {
            if (!event.target.closest('a')) return;
            setMenu(false);
        });
        document.addEventListener('keydown', event => {
            if (event.key !== 'Escape' || !navigation.classList.contains('is-open')) return;
            setMenu(false); menu.focus();
        });
        document.addEventListener('click', event => {
            if (!event.target.closest('.portfolio-header')) setMenu(false);
        });
    });
})();
