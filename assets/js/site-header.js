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
        const updateTheme = () => theme.setAttribute('aria-pressed', String(root.dataset.theme === 'dark'));
        updateTheme();
        theme.addEventListener('click', () => {
            const dark = root.dataset.theme !== 'dark';
            if (dark) root.dataset.theme = 'dark';
            else root.removeAttribute('data-theme');
            try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch (error) { /* Saving is optional. */ }
            updateTheme();
            window.dispatchEvent(new Event('themeChanged'));
        });
        menu.addEventListener('click', () => {
            const open = navigation.classList.toggle('is-open');
            menu.setAttribute('aria-expanded', String(open));
            menu.querySelector('i').className = open ? 'fa-solid fa-xmark' : 'fa-solid fa-bars';
        });
        navigation.addEventListener('click', event => {
            if (!event.target.closest('a')) return;
            navigation.classList.remove('is-open');
            menu.setAttribute('aria-expanded', 'false');
            menu.querySelector('i').className = 'fa-solid fa-bars';
        });
    });
})();
