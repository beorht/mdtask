// Песочница анимаций. Ничего не импортирует из основного сайта.
// Публичный API для будущей интеграции: window.GifLab.pick('error') → URL случайной анимации события или null.

(function () {
  'use strict';

  const AUTO_MIN_MS = 8000;   // в случайном режиме — пауза между показами
  const AUTO_MAX_MS = 20000;

  const state = {
    catalog: null,
    current: null,      // id события
    index: 0,           // индекс анимации у события
    autoTimer: null,
    assignDraft: null,  // несохранённые назначения: { eventId: [animationId, ...] }
    mode: 'view',       // 'view' | 'assign'
  };

  const $ = (id) => document.getElementById(id);

  function randomItem(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function eventById(id) {
    return state.catalog.events.find((e) => e.id === id) || null;
  }

  // ---- публичный API (для будущего подключения к сайту) ----
  function pick(eventId) {
    const ev = eventById(eventId);
    if (!ev || ev.gifs.length === 0) return null;
    return randomItem(ev.gifs).url;
  }
  window.GifLab = { pick };

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // ---- просмотр ----
  function renderNav() {
    const nav = $('events');
    nav.innerHTML = '';
    for (const group of state.catalog.groups) {
      const title = document.createElement('div');
      title.className = 'group-title';
      title.textContent = group;
      nav.appendChild(title);

      for (const ev of state.catalog.events.filter((e) => e.group === group)) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'event-btn' + (ev.id === state.current && state.mode === 'view' ? ' active' : '');
        btn.dataset.id = ev.id;
        btn.innerHTML =
          `<span>${escapeHtml(ev.title)}${ev.random ? '<span class="badge">фон</span>' : ''}</span>` +
          `<span class="count">${ev.gifs.length}</span>`;
        btn.addEventListener('click', () => {
          setMode('view');
          show(ev.id, 0);
        });
        nav.appendChild(btn);
      }
    }
  }

  function renderNavActive() {
    for (const btn of document.querySelectorAll('.event-btn')) {
      btn.classList.toggle('active', state.mode === 'view' && btn.dataset.id === state.current);
    }
  }

  function show(eventId, index) {
    const ev = eventById(eventId);
    if (!ev) return;
    state.current = eventId;
    state.index = ev.gifs.length ? ((index % ev.gifs.length) + ev.gifs.length) % ev.gifs.length : 0;
    renderNavActive();

    const hasItems = ev.gifs.length > 0;
    $('empty').hidden = hasItems;
    $('viewer').hidden = !hasItems;
    $('title').textContent = ev.title;
    $('when').textContent = ev.when;
    $('where').textContent = ev.where;

    if (!hasItems) {
      $('empty').querySelector('p').textContent =
        `Для события «${ev.title}» анимации не назначены. Откройте «Назначения» и отметьте нужные.`;
      return;
    }

    const item = ev.gifs[state.index];
    $('frame').replaceChildren(mediaFor(ev, item));
    const kind = item.type === 'html' ? 'HTML-анимация' : 'гифка';
    $('counter').textContent = `${state.index + 1} / ${ev.gifs.length} · ${kind} · ${item.name}`;

    const thumbs = $('thumbs');
    thumbs.innerHTML = '';
    ev.gifs.forEach((g, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = i === state.index ? 'current' : '';
      b.title = g.name;
      if (g.type === 'html') {
        // миниатюра HTML-анимации не грузит страницу целиком: только подпись
        const t = document.createElement('span');
        t.className = 'html-tag';
        t.textContent = '▶ HTML';
        b.appendChild(t);
      } else {
        const t = document.createElement('img');
        t.src = g.url;
        t.alt = g.name;
        t.loading = 'lazy';
        b.appendChild(t);
      }
      b.addEventListener('click', () => show(eventId, i));
      thumbs.appendChild(b);
    });
  }

  // Гифка — <img>; HTML-анимация — <iframe> (sandbox без доступа к песочнице и к сайту).
  function mediaFor(ev, item) {
    if (item.type === 'html') {
      const f = document.createElement('iframe');
      f.src = item.url;
      f.title = `${ev.title}: ${item.name}`;
      f.setAttribute('sandbox', 'allow-scripts');
      return f;
    }
    const img = document.createElement('img');
    img.src = item.url;
    img.alt = `${ev.title}: ${item.name}`;
    return img;
  }

  // ---- назначения ----
  function setMode(mode) {
    state.mode = mode;
    $('toggle-assign').classList.toggle('btn-primary', mode === 'assign');
    $('assign').hidden = mode !== 'assign';
    if (mode === 'assign') {
      $('viewer').hidden = true;
      $('empty').hidden = true;
      state.assignDraft = JSON.parse(JSON.stringify(state.catalog.assignments));
      renderAssign();
      $('save-status').textContent = '';
      renderNavActive();
    } else {
      show(state.current, state.index); // show() сам выставит блоки просмотра
    }
  }

  function renderAssign() {
    const list = $('assign-list');
    list.innerHTML = '';
    if (state.catalog.library.length === 0) {
      list.innerHTML = '<p class="status">В папке library/ пока нет анимаций.</p>';
      return;
    }
    for (const item of state.catalog.library) {
      const card = document.createElement('div');
      card.className = 'assign-card';
      const boxes = state.catalog.events.map((ev) => {
        const checked = (state.assignDraft[ev.id] || []).includes(item.id) ? ' checked' : '';
        return `<label class="assign-opt"><input type="checkbox" data-event="${escapeHtml(ev.id)}" data-anim="${escapeHtml(item.id)}"${checked}> ${escapeHtml(ev.title)}</label>`;
      }).join('');
      card.innerHTML =
        `<div class="assign-head"><strong>${escapeHtml(item.id)}</strong> <span class="badge">${item.type === 'html' ? 'HTML' : 'гифка'}</span></div>` +
        `<div class="assign-opts">${boxes}</div>`;
      list.appendChild(card);
    }
    list.querySelectorAll('input[type=checkbox]').forEach((cb) => {
      cb.addEventListener('change', () => {
        const ev = cb.dataset.event;
        const anim = cb.dataset.anim;
        const set = new Set(state.assignDraft[ev] || []);
        if (cb.checked) set.add(anim); else set.delete(anim);
        state.assignDraft[ev] = [...set];
        $('save-status').textContent = 'Есть несохранённые изменения';
      });
    });
  }

  async function saveAssignments() {
    $('save').disabled = true;
    $('save-status').textContent = 'Сохраняю…';
    try {
      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state.assignDraft),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ошибка сохранения');
      state.catalog = data;
      renderNav();
      $('save-status').textContent = 'Сохранено';
    } catch (err) {
      $('save-status').textContent = 'Не сохранено: ' + err.message;
    } finally {
      $('save').disabled = false;
    }
  }

  // ---- случайный режим: случайные события с random: true и их назначенные анимации ----
  function autoStep() {
    const pool = state.catalog.events.filter((e) => e.random && e.gifs.length);
    // в режиме назначений не перебиваем панель
    if (pool.length && state.mode === 'view') {
      const ev = randomItem(pool);
      show(ev.id, Math.floor(Math.random() * ev.gifs.length));
    }
    state.autoTimer = setTimeout(autoStep, AUTO_MIN_MS + Math.random() * (AUTO_MAX_MS - AUTO_MIN_MS));
  }

  function setAuto(on) {
    clearTimeout(state.autoTimer);
    state.autoTimer = null;
    if (on) autoStep();
  }

  // ---- запуск ----
  async function load() {
    const res = await fetch('/api/catalog', { cache: 'no-store' });
    state.catalog = await res.json();
    const first = state.catalog.events.find((e) => e.gifs.length) || state.catalog.events[0];
    renderNav();
    show(first.id, 0);
  }

  $('prev').addEventListener('click', () => show(state.current, state.index - 1));
  $('next').addEventListener('click', () => show(state.current, state.index + 1));
  $('rand').addEventListener('click', () => {
    const ev = eventById(state.current);
    if (ev && ev.gifs.length) show(ev.id, Math.floor(Math.random() * ev.gifs.length));
  });
  $('auto').addEventListener('change', (e) => setAuto(e.target.checked));
  $('toggle-assign').addEventListener('click', () => setMode(state.mode === 'assign' ? 'view' : 'assign'));
  $('save').addEventListener('click', saveAssignments);

  load().catch((err) => {
    $('empty').hidden = false;
    $('empty').querySelector('p').textContent = 'Не удалось загрузить каталог: ' + err.message;
  });
})();
