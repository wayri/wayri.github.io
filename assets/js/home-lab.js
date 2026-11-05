(() => {
    'use strict';
    // Preserve old bookmarks as the detailed content moves to dedicated pages.
    const redirects = { '#power-runner': '/play/#power-runner', '#power-budget': '/play/#power-budget', '#skill-marquee-view': '/about/#skills', '#skill-table-view': '/about/#skills', '#skills': '/about/#skills', '#project-pcb-heater': '/projects/#project-pcb-heater', '#project-pocket-kiview': '/projects/#project-pocket-kiview' };
    if (redirects[location.hash]) location.replace(redirects[location.hash]);
})();
