// Задача предмета «Bash: скрипты в Linux» (src/views/bash-course/task.ejs): редактор с автосохранением черновика,
// «Запустить» (скрипт выполняется в браузере движком public/js/bash-engine.js с аргументами и вводом) и «Проверить»
// (код уходит на сервер, сервер прогоняет его тем же движком на всех тестах и возвращает результат). Вставка в
// редактор запрещена; вставки и уходы со страницы уходят преподавателю.
(function () {
  var root = document.getElementById('pycEditor');
  if (!root || !window.BashEngine) return;

  var AUTOSAVE_DELAY_MS = 1500;
  var MAX_OUTPUT = 20000;

  var area = root.querySelector('[data-pyc-code]');
  var argsEl = root.querySelector('[data-pyc-args]');
  var stdinEl = root.querySelector('[data-pyc-stdin]');
  var statusEl = root.querySelector('[data-pyc-status]');
  var outputEl = root.querySelector('[data-pyc-output]');
  var resultsEl = root.querySelector('[data-pyc-results]');
  var nextEl = root.querySelector('[data-pyc-next]');
  var chipEl = document.querySelector('[data-pyc-chip]');
  var runBtn = root.querySelector('[data-pyc-action="run"]');
  var checkBtn = root.querySelector('[data-pyc-action="check"]');

  function report(body) {
    fetch(root.dataset.eventUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'same-origin' }).catch(function () {});
  }
  function setStatus(t) { if (statusEl) statusEl.textContent = t || ''; }

  // --- сигналы: вставка и уходы ---
  var awaySince = null;
  function leave() { if (awaySince === null) awaySince = Date.now(); }
  function back() { if (awaySince === null) return; var ms = Date.now() - awaySince; awaySince = null; if (ms >= 2000) report({ type: 'away', ms: ms }); }
  document.addEventListener('visibilitychange', function () { if (document.hidden) leave(); else back(); });
  window.addEventListener('blur', function () { setTimeout(function () { if (!document.hasFocus()) leave(); }, 0); });
  window.addEventListener('focus', back);

  // --- редактор ---
  var getCode, cm = null;
  if (window.CodeMirror) {
    cm = window.CodeMirror.fromTextArea(area, {
      mode: 'shell', theme: 'material-darker', lineNumbers: true, indentUnit: 2, tabSize: 2,
      matchBrackets: true, viewportMargin: Infinity,
    });
    getCode = function () { return cm.getValue(); };
    cm.on('change', scheduleSave);
    cm.on('keydown', function (c, e) { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); run(); } });
    cm.on('beforeChange', function (c, ch) {
      if (ch.origin === 'paste') { ch.cancel(); setStatus('Вставка в редактор отключена — наберите код сами.'); report({ type: 'paste' }); }
    });
  } else {
    getCode = function () { return area.value; };
    area.addEventListener('input', scheduleSave);
    area.addEventListener('paste', function (e) { e.preventDefault(); setStatus('Вставка в редактор отключена — наберите код сами.'); report({ type: 'paste' }); });
    area.addEventListener('keydown', function (e) { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); run(); } });
  }

  // --- автосохранение ---
  var saveTimer = null;
  function scheduleSave() { clearTimeout(saveTimer); saveTimer = setTimeout(save, AUTOSAVE_DELAY_MS); }
  function save() {
    fetch(root.dataset.draftUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: getCode() }), credentials: 'same-origin' }).catch(function () {});
  }

  function parseArgs(s) { s = (s || '').trim(); return s ? s.split(/\s+/) : []; }
  function clip(s) { s = String(s == null ? '' : s); return s.length > MAX_OUTPUT ? s.slice(0, MAX_OUTPUT) + '\n…' : s; }

  // --- «Запустить» (в браузере) ---
  function run() {
    setStatus('Запуск…');
    var r;
    try { r = window.BashEngine.run(getCode(), { args: parseArgs(argsEl && argsEl.value), stdin: (stdinEl && stdinEl.value ? stdinEl.value + '\n' : '') }); }
    catch (e) { outputEl.textContent = 'Ошибка запуска: ' + (e && e.message); setStatus(''); return; }
    var text = clip(r.stdout);
    if (r.stderr) text += (text ? '\n' : '') + '[stderr] ' + clip(r.stderr);
    text += '\n[код возврата: ' + r.code + ']';
    outputEl.textContent = text || '(нет вывода)';
    setStatus('');
  }

  // --- «Проверить» (на сервере) ---
  function check() {
    setStatus('Проверка…'); checkBtn.disabled = true;
    fetch(root.dataset.checkUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: getCode() }), credentials: 'same-origin' })
      .then(function (res) { return res.json().then(function (j) { return { ok: res.ok, j: j }; }); })
      .then(function (r) {
        checkBtn.disabled = false; setStatus('');
        if (!r.ok) { outputEl.textContent = (r.j && r.j.error) || 'Ошибка проверки.'; return; }
        renderResults(r.j);
      })
      .catch(function () { checkBtn.disabled = false; setStatus(''); outputEl.textContent = 'Не удалось связаться с сервером.'; });
  }

  function renderResults(res) {
    var html = '';
    if (res.syntax) html += '<p class="pyb-rule-bad">Синтаксическая ошибка bash: ' + esc(res.syntax) + '</p>';
    if (res.forbidden && res.forbidden.length) html += '<p class="pyb-rule-bad">Использовано запрещённое: ' + esc(res.forbidden.join(', ')) + '.</p>';
    if (res.missing && res.missing.length) html += '<p class="pyb-rule-bad">Не хватает обязательного: ' + esc(res.missing.join(', ')) + '.</p>';
    if (res.tests && res.tests.length) {
      html += '<p>Пройдено тестов: <strong>' + res.passed + ' / ' + res.total + '</strong></p>';
      html += '<ol class="pyb-test-list">';
      res.tests.forEach(function (t) {
        html += '<li class="' + (t.passed ? 'pyb-test-ok' : 'pyb-test-bad') + '">';
        html += (t.passed ? '✓' : '✗') + ' Тест ' + t.number + (t.open ? '' : ' (скрытый)');
        if (!t.passed) {
          if (t.hint) html += ' — ' + esc(t.hint);
          if (t.open) {
            html += '<div class="pyb-test-io"><div>ожидалось:</div><pre>' + esc(t.expected) + '</pre><div>получено:</div><pre>' + esc(t.actual) + '</pre></div>';
          }
        }
        html += '</li>';
      });
      html += '</ol>';
    }
    resultsEl.innerHTML = html;
    resultsEl.hidden = false;
    if (res.solved) {
      setStatus('Решено!');
      if (chipEl) { chipEl.textContent = '✓ Решено'; chipEl.classList.remove('sql-chip-open'); chipEl.classList.add('sql-chip-done'); }
      if (nextEl) nextEl.hidden = false;
    }
  }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  if (runBtn) runBtn.addEventListener('click', run);
  if (checkBtn) checkBtn.addEventListener('click', check);
})();
