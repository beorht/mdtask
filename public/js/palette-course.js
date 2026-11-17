// Страница задачи предмета «Цвет и палитра» (src/views/palette-course/task.ejs). Студент пишет CSS к готовой
// разметке (без переменных), подбирая цвет пипеткой. Слева — живой предпросмотр и список проверок (локально
// через public/js/color-engine.js по вычисленным цветам из iframe), справа — пипетки по ролям и редактор CSS.
// «Проверить» уходит на сервер — он авторитетно считает по тем же правилам. Вставка в редактор запрещена.
(function () {
  var root = document.getElementById('palEditor');
  var cfgEl = document.querySelector('[data-pal-config]');
  if (!root || !cfgEl || !window.ColorEngine) return;

  var cfg = JSON.parse(cfgEl.textContent);
  var roles = cfg.roles || [];
  var rules = cfg.rules || [];
  var template = cfg.template || { html: '', baseCss: '' };
  var labels = {};
  roles.forEach(function (r) { labels[r.key] = r.label; });

  var AUTOSAVE_DELAY_MS = 1500;
  var area = root.querySelector('[data-pal-code]');
  var rolesEl = root.querySelector('[data-pal-roles]');
  var statusEl = root.querySelector('[data-pal-status]');
  var resultsEl = root.querySelector('[data-pal-results]');
  var nextEl = root.querySelector('[data-pal-next]');
  var chipEl = document.querySelector('[data-pal-chip]');
  var checksEl = document.querySelector('[data-pal-checks]');
  var frame = document.querySelector('[data-pal-preview]');
  var checkBtn = root.querySelector('[data-pal-action="check"]');

  function report(body) {
    fetch(root.dataset.eventUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'same-origin' }).catch(function () {});
  }
  function setStatus(t) { if (statusEl) statusEl.textContent = t || ''; }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  // --- сигналы: вставка и уходы ---
  var awaySince = null;
  function leave() { if (awaySince === null) awaySince = Date.now(); }
  function back() { if (awaySince === null) return; var ms = Date.now() - awaySince; awaySince = null; if (ms >= 2000) report({ type: 'away', ms: ms }); }
  document.addEventListener('visibilitychange', function () { if (document.hidden) leave(); else back(); });
  window.addEventListener('blur', function () { setTimeout(function () { if (!document.hasFocus()) leave(); }, 0); });
  window.addEventListener('focus', back);

  // --- редактор ---
  var seed = (area.value && area.value.trim()) ? area.value : (cfg.skeleton || '');
  var getCode, setCode, cm = null;
  if (window.CodeMirror) {
    area.value = seed;
    cm = window.CodeMirror.fromTextArea(area, {
      mode: 'css', theme: 'material-darker', lineNumbers: true, indentUnit: 2, tabSize: 2, viewportMargin: Infinity,
    });
    getCode = function () { return cm.getValue(); };
    setCode = function (v) { cm.setValue(v); };
    cm.on('change', onEdit);
    cm.on('keydown', function (c, e) { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); check(); } });
    cm.on('beforeChange', function (c, ch) {
      if (ch.origin === 'paste') { ch.cancel(); setStatus('Вставка отключена — выбирайте цвет пипеткой или набирайте #hex.'); report({ type: 'paste' }); }
    });
  } else {
    area.value = seed;
    getCode = function () { return area.value; };
    setCode = function (v) { area.value = v; };
    area.addEventListener('input', onEdit);
    area.addEventListener('paste', function (e) { e.preventDefault(); setStatus('Вставка отключена.'); report({ type: 'paste' }); });
    area.addEventListener('keydown', function (e) { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); check(); } });
  }

  // --- автосохранение + перерисовка ---
  var saveTimer = null, renderTimer = null;
  function onEdit() {
    clearTimeout(saveTimer); saveTimer = setTimeout(save, AUTOSAVE_DELAY_MS);
    clearTimeout(renderTimer); renderTimer = setTimeout(renderPreview, 180);
  }
  function save() {
    fetch(root.dataset.draftUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: getCode() }), credentials: 'same-origin' }).catch(function () {});
  }

  // --- пипетки по ролям ---
  var pickers = {};
  function cssProp(prop) { return prop === 'color' ? 'color' : prop === 'border' ? 'border-color' : 'background'; }
  roles.forEach(function (role) {
    var chip = document.createElement('label');
    chip.className = 'palette-role';
    var sw = document.createElement('input');
    sw.type = 'color'; sw.className = 'palette-role-swatch'; sw.value = '#cccccc';
    sw.setAttribute('aria-label', role.label);
    var name = document.createElement('span');
    name.className = 'palette-role-name'; name.textContent = role.label;
    var hex = document.createElement('span');
    hex.className = 'palette-role-hex'; hex.textContent = '—';
    chip.appendChild(sw); chip.appendChild(name); chip.appendChild(hex);
    rolesEl.appendChild(chip);
    pickers[role.key] = { input: sw, hex: hex, role: role };
    sw.addEventListener('input', function () { setRole(role, sw.value); });
  });

  function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  // Переписать значение цвета роли в CSS: заменить объявление в её блоке, иначе добавить правило.
  function setRole(role, value) {
    var prop = cssProp(role.prop);
    var css = getCode();
    var block = new RegExp('(' + escRe(role.selector) + '\\s*\\{)([^}]*)(\\})');
    var m = block.exec(css);
    if (m) {
      var body = m[2];
      var declRe = new RegExp('(^|[;{]|\\n)(\\s*)' + escRe(prop) + '\\s*:[^;}]*;?', 'i');
      if (declRe.test(body)) body = body.replace(declRe, '$1$2' + prop + ': ' + value + ';');
      else body = body.replace(/\s*$/, '') + '\n  ' + prop + ': ' + value + ';\n';
      css = css.slice(0, m.index) + m[1] + body + m[3] + css.slice(m.index + m[0].length);
    } else {
      css = css.replace(/\s*$/, '') + '\n' + role.selector + ' {\n  ' + prop + ': ' + value + ';\n}\n';
    }
    setCode(css);
  }

  // --- предпросмотр в iframe + локальная проверка ---
  function renderPreview() {
    var doc = '<!doctype html><html><head><meta charset="utf-8">'
      + '<style>' + template.baseCss + '</style>'
      + '<style>' + getCode() + '</style>'
      + '</head><body>' + template.html + '</body></html>';
    frame.srcdoc = doc;
  }
  frame.addEventListener('load', function () { syncSwatches(); liveGrade(); });

  function toHex(rgb) {
    var c = window.ColorEngine.parse(rgb);
    if (!c) return null;
    var h = function (n) { return ('0' + n.toString(16)).slice(-2); };
    return '#' + h(c.r) + h(c.g) + h(c.b);
  }
  function computedColor(role) {
    try {
      var d = frame.contentDocument || frame.contentWindow.document;
      var el = d.querySelector(role.selector);
      if (!el) return null;
      var st = (frame.contentWindow).getComputedStyle(el);
      return role.prop === 'color' ? st.color : role.prop === 'border' ? st.borderTopColor : st.backgroundColor;
    } catch (e) { return null; }
  }
  function colorsNow() {
    var colors = {};
    roles.forEach(function (role) { colors[role.key] = computedColor(role); });
    return colors;
  }
  function syncSwatches() {
    roles.forEach(function (role) {
      var p = pickers[role.key]; if (!p) return;
      var hex = toHex(computedColor(role));
      if (hex) { p.input.value = hex; p.hex.textContent = hex.toUpperCase(); }
    });
  }
  function liveGrade() {
    if (!checksEl) return;
    var res = window.ColorEngine.grade(colorsNow(), rules, labels);
    checksEl.innerHTML = res.checks.map(function (c) {
      return '<li class="palette-check ' + (c.ok ? 'is-ok' : 'is-pending') + '">'
        + '<span class="palette-check-mark" aria-hidden="true">' + (c.ok ? '✓' : '○') + '</span>'
        + '<span class="palette-check-text"><strong>' + esc(c.label) + '</strong>'
        + (c.detail ? '<span class="palette-check-detail">' + esc(c.detail) + '</span>' : '')
        + '</span></li>';
    }).join('');
  }

  // --- «Проверить» (на сервере, авторитетно) ---
  function check() {
    setStatus('Проверка…'); checkBtn.disabled = true;
    fetch(root.dataset.checkUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: getCode() }), credentials: 'same-origin' })
      .then(function (res) { return res.json().then(function (j) { return { ok: res.ok, j: j }; }); })
      .then(function (r) {
        checkBtn.disabled = false; setStatus('');
        if (!r.ok) { resultsEl.hidden = false; resultsEl.innerHTML = '<p class="pyb-rule-bad">' + esc((r.j && r.j.error) || 'Ошибка проверки.') + '</p>'; return; }
        renderResults(r.j);
      })
      .catch(function () { checkBtn.disabled = false; setStatus(''); resultsEl.hidden = false; resultsEl.innerHTML = '<p class="pyb-rule-bad">Не удалось связаться с сервером.</p>'; });
  }

  function renderResults(res) {
    var html = '<ul class="palette-checks">';
    (res.checks || []).forEach(function (c) {
      html += '<li class="palette-check ' + (c.ok ? 'is-ok' : 'is-bad') + '">'
        + '<span class="palette-check-mark" aria-hidden="true">' + (c.ok ? '✓' : '✗') + '</span>'
        + '<span class="palette-check-text"><strong>' + esc(c.label) + '</strong>'
        + (c.detail ? '<span class="palette-check-detail">' + esc(c.detail) + '</span>' : '')
        + '</span></li>';
    });
    html += '</ul>';
    resultsEl.innerHTML = html;
    resultsEl.hidden = false;
    if (res.success) {
      setStatus('Решено!');
      if (chipEl) { chipEl.textContent = '✓ Решено'; chipEl.classList.remove('sql-chip-open'); chipEl.classList.add('sql-chip-done'); }
      if (nextEl) nextEl.hidden = false;
    }
  }

  // --- бренд-гайд: клик по образцу копирует его код ---
  Array.prototype.forEach.call(document.querySelectorAll('[data-pal-brand]'), function (el) {
    el.addEventListener('click', function () {
      var hex = el.getAttribute('data-pal-brand');
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(hex).catch(function () {});
      setStatus('Скопировано: ' + hex + ' — вставьте в CSS или наберите в пипетке.');
    });
  });

  if (checkBtn) checkBtn.addEventListener('click', check);
  renderPreview();
})();
