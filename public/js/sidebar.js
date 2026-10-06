// Left navigation: collapsible on desktop (state remembered), slide-in drawer on phones.
// Filter box in subject navigation sections: hides non-matching topics, opens matching groups
// while a query is typed and restores their open/closed state when the query is cleared.
(function () {
  document.querySelectorAll('[data-nav-filter]').forEach(function (input) {
    const section = input.closest('[data-nav-section]');
    const items = Array.from(section.querySelectorAll('[data-nav-item]'));
    const empty = section.querySelector('[data-nav-empty]');
    const initiallyOpen = new Map();
    items.forEach(function (item) {
      const group = item.querySelector('details');
      if (group) initiallyOpen.set(group, group.open);
    });

    input.addEventListener('input', function () {
      const q = input.value.trim().toLowerCase();
      let shown = 0;
      items.forEach(function (item) {
        const match = !q || item.textContent.toLowerCase().includes(q);
        item.hidden = !match;
        if (match) shown += 1;
        const group = item.querySelector('details');
        if (group) group.open = q ? match : initiallyOpen.get(group);
      });
      if (empty) empty.hidden = shown > 0;
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && input.value) {
        e.stopPropagation();
        input.value = '';
        input.dispatchEvent(new Event('input'));
      }
    });
  });

  // Animate a group's items only when the user opens it (not for groups open on page load).
  document.querySelectorAll('.nav-group-summary').forEach(function (summary) {
    summary.addEventListener('click', function () {
      const group = summary.parentElement;
      if (!group.open) {
        group.classList.add('is-opening');
        setTimeout(function () { group.classList.remove('is-opening'); }, 400);
      }
    });
  });

  // Keep the active link in view when the page opens with a long navigation list.
  const active = document.querySelector('.sidebar-subject .nav-link.active');
  if (active && active.scrollIntoView) active.scrollIntoView({ block: 'nearest' });
})();

(function () {
  const toggle = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');
  if (!toggle || !sidebar) return;

  const root = document.documentElement;
  const mobile = window.matchMedia('(max-width: 700px)');
  const KEY = 'sidebarCollapsed';

  // Backdrop behind the mobile drawer; a click on it closes the menu.
  const backdrop = document.createElement('div');
  backdrop.className = 'sidebar-backdrop';
  sidebar.after(backdrop);

  function isOpen() {
    return mobile.matches ? sidebar.classList.contains('open') : !root.classList.contains('sidebar-collapsed');
  }
  function sync() {
    toggle.setAttribute('aria-expanded', isOpen() ? 'true' : 'false');
  }

  function setMobileOpen(open) {
    sidebar.classList.toggle('open', open);
    root.classList.toggle('sidebar-drawer-open', open);
    sync();
  }

  function setCollapsed(collapsed) {
    root.classList.toggle('sidebar-collapsed', collapsed);
    try { localStorage.setItem(KEY, collapsed ? '1' : '0'); } catch (e) { /* storage unavailable */ }
    sync();
  }

  toggle.addEventListener('click', function () {
    if (mobile.matches) setMobileOpen(!sidebar.classList.contains('open'));
    else setCollapsed(!root.classList.contains('sidebar-collapsed'));
  });
  backdrop.addEventListener('click', function () { setMobileOpen(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && mobile.matches && sidebar.classList.contains('open')) setMobileOpen(false);
  });
  mobile.addEventListener('change', function () { setMobileOpen(false); });

  sync();
  // Enable transitions only after the first paint, so the saved state doesn't animate on load.
  requestAnimationFrame(function () {
    requestAnimationFrame(function () { root.classList.add('sidebar-animate'); });
  });
})();
