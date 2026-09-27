(function () {
  'use strict';

  var root = document.documentElement;

  // ---------- theme (same localStorage key as the rest of the platform) ----------
  function setTheme(theme) {
    root.setAttribute('data-theme', theme);
    try { localStorage.setItem('theme', theme); } catch (e) {}
    document.querySelectorAll('[data-theme-choice] input').forEach(function (input) {
      input.checked = input.value === theme;
    });
  }
  function currentTheme() {
    return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }
  document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
    btn.addEventListener('click', function () { setTheme(currentTheme() === 'dark' ? 'light' : 'dark'); });
  });
  document.querySelectorAll('[data-theme-choice] input').forEach(function (input) {
    input.checked = input.value === currentTheme();
    input.addEventListener('change', function () { if (input.checked) setTheme(input.value); });
  });

  // ---------- mobile sidebar ----------
  var sidebar = document.getElementById('adminSidebar');
  var backdrop = document.querySelector('[data-sidebar-close]');
  var menuBtn = document.querySelector('[data-sidebar-toggle]');
  function toggleSidebar(open) {
    if (!sidebar) return;
    sidebar.classList.toggle('is-open', open);
    if (backdrop) backdrop.hidden = !open;
    if (menuBtn) menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  if (menuBtn) menuBtn.addEventListener('click', function () { toggleSidebar(!sidebar.classList.contains('is-open')); });
  if (backdrop) backdrop.addEventListener('click', function () { toggleSidebar(false); });

  // ---------- dropdowns ----------
  document.querySelectorAll('[data-dropdown]').forEach(function (dd) {
    var btn = dd.querySelector('[data-dropdown-toggle]');
    var menu = dd.querySelector('[data-dropdown-menu]');
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = menu.hidden;
      menu.hidden = !open;
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.addEventListener('click', function (e) {
      if (!dd.contains(e.target)) { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); }
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    document.querySelectorAll('[data-dropdown-menu]').forEach(function (m) { m.hidden = true; });
    toggleSidebar(false);
  });

  // ---------- flash messages ----------
  document.querySelectorAll('[data-flash]').forEach(function (flash) {
    var close = function () {
      flash.classList.add('is-hiding');
      setTimeout(function () { flash.remove(); }, 260);
    };
    var btn = flash.querySelector('[data-flash-close]');
    if (btn) btn.addEventListener('click', close);
    if (flash.classList.contains('a-flash-success')) setTimeout(close, 5000);
  });

  // ---------- clickable rows (links/buttons inside keep working) ----------
  document.querySelectorAll('tr[data-href]').forEach(function (row) {
    row.addEventListener('click', function (e) {
      if (e.target.closest('a, button, input, select, textarea, label')) return;
      if (window.getSelection && String(window.getSelection())) return;
      if (e.ctrlKey || e.metaKey) window.open(row.dataset.href, '_blank');
      else window.location.href = row.dataset.href;
    });
  });

  // ---------- filters apply immediately ----------
  document.querySelectorAll('form[data-autosubmit]').forEach(function (form) {
    var timer = null;
    form.querySelectorAll('select').forEach(function (s) {
      s.addEventListener('change', function () { form.submit(); });
    });
    var q = form.querySelector('input[type="search"]');
    if (q) {
      q.addEventListener('input', function () {
        clearTimeout(timer);
        timer = setTimeout(function () { form.submit(); }, 450);
      });
      // keep the caret at the end after the page reloads with the query
      if (q.value && document.activeElement !== q && sessionStorage.getItem('a-refocus') === form.action) {
        q.focus();
        q.setSelectionRange(q.value.length, q.value.length);
      }
      form.addEventListener('submit', function () {
        if (document.activeElement === q) sessionStorage.setItem('a-refocus', form.action);
        else sessionStorage.removeItem('a-refocus');
      });
    }
  });

  // ---------- loading state on submit ----------
  document.querySelectorAll('form[method="post"]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      var btn = e.submitter;
      if (!btn || !btn.classList.contains('a-btn')) return;
      // Deferred so later listeners (e.g. the confirm dialog) get a chance to cancel first.
      setTimeout(function () {
        if (e.defaultPrevented) return;
        btn.classList.add('is-loading');
        btn.dataset.label = btn.textContent;
        btn.textContent = 'Сохранение…';
      }, 0);
    });
  });

  // ---------- confirmation dialog ----------
  var dialog = document.querySelector('[data-confirm-dialog]');
  function confirmAction(opts) {
    return new Promise(function (resolve) {
      if (!dialog || typeof dialog.showModal !== 'function') {
        resolve(window.confirm(opts.title + '\n\n' + opts.text));
        return;
      }
      dialog.querySelector('[data-confirm-title]').textContent = opts.title;
      dialog.querySelector('[data-confirm-text]').textContent = opts.text;
      dialog.querySelector('[data-confirm-ok]').textContent = opts.ok;
      dialog.returnValue = '';
      dialog.addEventListener('close', function onClose() {
        dialog.removeEventListener('close', onClose);
        resolve(dialog.returnValue === 'ok');
      });
      dialog.showModal();
      dialog.querySelector('[data-confirm-ok]').focus();
    });
  }

  // ---------- review form ----------
  var review = document.querySelector('[data-review-form]');
  if (review) {
    var hint = review.querySelector('[data-verdict-hint]');
    var hints = {
      done: 'Работа будет принята.',
      not_done: 'Студент сможет пересдать только до дедлайна.',
      resubmit: 'Студент сможет загрузить новую версию даже после дедлайна.',
    };
    var syncHint = function () {
      var checked = review.querySelector('input[name="verdict"]:checked');
      hint.textContent = checked ? hints[checked.value] : '';
    };
    review.addEventListener('change', syncHint);
    syncHint();

    var confirmed = false;
    review.addEventListener('submit', function (e) {
      if (confirmed) return;
      var checked = review.querySelector('input[name="verdict"]:checked');
      if (!checked) return; // native "required" handles it
      var verdict = checked.value;
      var wasChecked = review.dataset.checked === '1';
      var changing = wasChecked && review.dataset.currentVerdict && review.dataset.currentVerdict !== verdict;
      var opts = null;
      if (verdict === 'resubmit' && review.dataset.currentVerdict !== 'resubmit') {
        opts = { title: 'Отправить работу на пересдачу?', text: 'Студент получит возможность повторно выполнить задание.', ok: 'Отправить на пересдачу' };
      } else if (changing) {
        opts = { title: 'Изменить результат проверки?', text: 'Работа уже была проверена. Студент увидит новый статус.', ok: 'Изменить статус' };
      }
      if (!opts) return;
      e.preventDefault();
      var submitter = e.submitter;
      confirmAction(opts).then(function (ok) {
        if (!ok) return;
        confirmed = true;
        if (submitter && review.requestSubmit) review.requestSubmit(submitter);
        else review.submit();
      });
    });

    // Ctrl/Cmd + Enter = the primary save action
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        var primary = review.querySelector('[data-primary-submit]');
        if (primary) { e.preventDefault(); review.requestSubmit ? review.requestSubmit(primary) : primary.click(); }
      }
    });
  }

  // ---------- generic data-confirm forms ----------
  document.querySelectorAll('form[data-confirm]').forEach(function (form) {
    var ok = false;
    form.addEventListener('submit', function (e) {
      if (ok) return;
      e.preventDefault();
      var parts = form.dataset.confirm.split('|');
      confirmAction({ title: parts[0], text: parts[1] || '', ok: parts[2] || 'Подтвердить' }).then(function (yes) {
        if (yes) { ok = true; form.submit(); }
      });
    });
  });

  // ---------- assignment form: group vs individual target ----------
  var assignmentForm = document.querySelector('[data-assignment-form]');
  if (assignmentForm) {
    var groupBlock = assignmentForm.querySelector('[data-target-group]');
    var individualBlock = assignmentForm.querySelector('[data-target-individual]');
    var syncTarget = function () {
      var checked = assignmentForm.querySelector('[data-target-type]:checked');
      var individual = checked && checked.value === 'individual';
      groupBlock.hidden = individual;
      individualBlock.hidden = !individual;
      assignmentForm.querySelector('[name="sectionTitle"]').required = !individual;
      assignmentForm.querySelector('[name="targetStudentId"]').required = individual;
    };
    assignmentForm.addEventListener('change', function (e) { if (e.target.matches('[data-target-type]')) syncTarget(); });
    syncTarget();
  }

  // ---------- global live search ----------
  var searchForm = document.querySelector('[data-live-search]');
  if (searchForm) {
    var input = searchForm.querySelector('input[name="q"]');
    var box = searchForm.querySelector('[data-search-results]');
    var timer = null;
    var controller = null;
    var active = -1;

    var escapeHtml = function (s) {
      return String(s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    };
    var items = function () { return Array.prototype.slice.call(box.querySelectorAll('.a-search-item')); };
    var setActive = function (i) {
      var list = items();
      list.forEach(function (el, idx) { el.classList.toggle('is-active', idx === i); });
      active = i;
      if (list[i]) list[i].scrollIntoView({ block: 'nearest' });
    };
    var render = function (data) {
      var groups = [['works', 'Работы'], ['students', 'Студенты'], ['assignments', 'Задания'], ['courses', 'Курсы']];
      var html = '';
      groups.forEach(function (g) {
        var list = data[g[0]] || [];
        if (!list.length) return;
        html += '<div class="a-search-group"><div class="a-search-group-title">' + g[1] + '</div>';
        list.slice(0, 5).forEach(function (r) {
          html += '<a class="a-search-item" href="' + escapeHtml(r.url) + '"><span>' + escapeHtml(r.title) + '</span><span>' + escapeHtml(r.meta || '') + '</span></a>';
        });
        html += '</div>';
      });
      if (!html) html = '<span class="a-search-empty">Ничего не найдено</span>';
      else html += '<a class="a-search-all" href="/admin/search?q=' + encodeURIComponent(data.query) + '">Все результаты →</a>';
      box.innerHTML = html;
      box.hidden = false;
      active = -1;
    };
    var run = function () {
      var q = input.value.trim();
      if (q.length < 2) { box.hidden = true; return; }
      if (controller) controller.abort();
      controller = typeof AbortController === 'function' ? new AbortController() : null;
      fetch('/admin/search?format=json&q=' + encodeURIComponent(q), controller ? { signal: controller.signal } : {})
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (data) { if (data) render(data); })
        .catch(function () {});
    };
    input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(run, 180); });
    input.addEventListener('focus', function () { if (input.value.trim().length >= 2 && box.innerHTML) box.hidden = false; });
    input.addEventListener('keydown', function (e) {
      var list = items();
      if (e.key === 'ArrowDown' && list.length) { e.preventDefault(); setActive(Math.min(active + 1, list.length - 1)); }
      else if (e.key === 'ArrowUp' && list.length) { e.preventDefault(); setActive(Math.max(active - 1, 0)); }
      else if (e.key === 'Enter' && active >= 0 && list[active]) { e.preventDefault(); window.location.href = list[active].href; }
      else if (e.key === 'Escape') { box.hidden = true; input.blur(); }
    });
    document.addEventListener('click', function (e) { if (!searchForm.contains(e.target)) box.hidden = true; });

    // "/" focuses search from anywhere (not while typing)
    document.addEventListener('keydown', function (e) {
      if (e.key === '/' && !e.target.closest('input, textarea, select, [contenteditable]')) {
        e.preventDefault();
        input.focus();
      }
    });
  }
})();
