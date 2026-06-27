// ARCANA — thème clair/sombre (mémorisé + préférence système, sans flash)
(function () {
    const KEY = 'arcana_theme';
    const root = document.documentElement;

    // appliqué immédiatement (script dans le <head>) pour éviter le clignotement
    const saved = localStorage.getItem(KEY);
    const sysDark = window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = saved || (sysDark ? 'dark' : 'light');

    const SUN = '<svg class="ic-sun" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="12" cy="12" r="4.4" fill="currentColor"/><g stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5 5l1.4 1.4M17.6 17.6 19 19M19 5l-1.4 1.4M6.4 17.6 5 19"/></g></svg>';
    const MOON = '<svg class="ic-moon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.5 6.5 0 0 0 9.8 9.8Z"/></svg>';

    function refresh() {
        const dark = root.dataset.theme === 'dark';
        document.querySelectorAll('.theme-toggle').forEach(b => {
            b.setAttribute('aria-pressed', dark);
            b.title = dark ? 'Passer en thème clair' : 'Passer en thème sombre';
            b.querySelector('.ic-sun').style.display = dark ? 'none' : '';
            b.querySelector('.ic-moon').style.display = dark ? '' : 'none';
        });
    }
    function toggle() {
        root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
        localStorage.setItem(KEY, root.dataset.theme);
        refresh();
    }
    function inject() {
        document.querySelectorAll('.nav-actions').forEach(actions => {
            if (actions.querySelector('.theme-toggle')) return;
            const b = document.createElement('button');
            b.className = 'nav-icon theme-toggle';
            b.setAttribute('aria-label', 'Basculer le thème clair / sombre');
            b.innerHTML = SUN + MOON;
            b.addEventListener('click', toggle);
            actions.insertBefore(b, actions.firstChild);
        });
        refresh();
    }
    document.addEventListener('DOMContentLoaded', inject);
})();
