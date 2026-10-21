(function () {
  // Основная тема — тёмная; partials/head.ejs ставит её ещё до загрузки стилей.
  let stored = null;
  try { stored = localStorage.getItem('theme'); } catch (e) {}
  document.documentElement.setAttribute('data-theme', stored || 'dark');

  document.addEventListener('click', function (e) {
    if (e.target && e.target.id === 'themeToggle') {
      const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      // Плавная перекраска всей страницы (theme.css: .theme-switching) на время перехода.
      const root = document.documentElement;
      root.classList.add('theme-switching');
      clearTimeout(window.__themeSwitchTimer);
      window.__themeSwitchTimer = setTimeout(function () { root.classList.remove('theme-switching'); }, 1000);
      root.setAttribute('data-theme', current);
      try { localStorage.setItem('theme', current); } catch (err) {}
    }
  });
})();
