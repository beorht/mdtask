// Итоговая контрольная WEB (src/views/web-exam/index.ejs): редактор трёх файлов (CodeMirror), запуск в
// изолированном предпросмотре (web-runner.js), автосохранение на сервер (<exam>/save, снимки кода там же) и
// журнал: запуски, заблокированные вставки, набор без клавиш. Общая часть страниц контрольной — exam.js
// (таймер, уход со страницы, копирование). Вставка и перетаскивание текста в редактор отключены.
(function () {
  var root = document.getElementById('webExam');
  if (!root) return;
  var BASE = root.dataset.base;
  var LOCKED = !!root.dataset.locked;
  var AUTOSAVE_MS = 3000;
  var MODES = { 'index.html': 'htmlmixed', 'style.css': 'css', 'script.js': 'javascript' };
  var statusEl = root.querySelector('[data-status]');
  var consoleEl = root.querySelector('[data-console]');
  var chip = document.querySelector('[data-saved-chip]');
  var editors = {};
  var current = 'index.html';

  function log(type, data) { if (window.examLog) window.examLog(type, data || {}); }
  function setStatus(text) { statusEl.textContent = text; }

  // --- редакторы ---
  root.querySelectorAll('[data-file]').forEach(function (area) {
    var name = area.dataset.file;
    if (!window.CodeMirror) {
      editors[name] = { getValue: function () { return area.value; }, on: function (ev, fn) { area.addEventListener('input', fn); }, refresh: function () {} };
      return;
    }
    var cm = window.CodeMirror.fromTextArea(area, {
      mode: MODES[name], theme: 'material-darker', lineNumbers: true, indentUnit: 2, tabSize: 2,
      indentWithTabs: false, matchBrackets: true, autoCloseBrackets: true, autoCloseTags: true,
      readOnly: LOCKED, viewportMargin: Infinity,
      extraKeys: {
        'Ctrl-Enter': run, 'Cmd-Enter': run,
        'Ctrl-S': function () { save(true); }, 'Cmd-S': function () { save(true); },
        Tab: function (c) { if (c.somethingSelected()) c.indentSelection('add'); else c.replaceSelection('  ', 'end'); },
      },
    });
    // Вставка и перетаскивание не проходят — попытка записывается в журнал.
    cm.on('beforeChange', function (_, change) {
      if (change.origin === 'paste' || change.origin === 'drop') {
        change.cancel();
        log('paste_blocked', { file: name, chars: (change.text || []).join('\n').length });
        setStatus('Вставка в редактор отключена — набирайте код сами. Попытка записана.');
      }
    });
    editors[name] = cm;
  });

  function files() {
    var out = {};
    Object.keys(editors).forEach(function (f) { out[f] = editors[f].getValue(); });
    return out;
  }

  // --- вкладки ---
  root.querySelectorAll('[data-file-tab]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      current = btn.dataset.fileTab;
      root.querySelectorAll('[data-file-tab]').forEach(function (b) { b.classList.toggle('active', b === btn); });
      root.querySelectorAll('[data-file-pane]').forEach(function (p) { p.hidden = p.dataset.filePane !== current; });
      editors[current].refresh();
      if (editors[current].focus) editors[current].focus();
    });
  });

  // --- предпросмотр ---
  var STORE_KEY = 'webExamStore:' + root.dataset.exam;
  var savedStore = {};
  try { savedStore = JSON.parse(sessionStorage.getItem(STORE_KEY) || '{}'); } catch (e) { savedStore = {}; }
  var consoleLines = 0;
  function printConsole(level, text) {
    if (!consoleLines) consoleEl.textContent = '';
    consoleLines += 1;
    var span = document.createElement('span');
    if (level === 'error') span.className = 'code-output-err';
    else if (level === 'warn') span.className = 'code-output-info';
    span.textContent = (level === 'log' || level === 'info' ? '' : level + ': ') + text + '\n';
    consoleEl.appendChild(span);
    consoleEl.scrollTop = consoleEl.scrollHeight;
    if (level === 'error') log('preview_error', { text: text.slice(0, 300) });
  }
  var runner = window.WebRunner.create(root.querySelector('[data-frame]'), {
    store: savedStore,
    onConsole: printConsole,
    onStorage: function (store) { try { sessionStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (e) { /* нет места */ } },
  });
  function run() {
    consoleLines = 0;
    consoleEl.textContent = 'Запуск…';
    runner.run(files());
    setTimeout(function () { if (!consoleLines) consoleEl.textContent = '(пусто)'; }, 800);
    log('run', {});
    if (!LOCKED) save(false);
  }

  // --- сохранение ---
  var timer = null;
  var dirty = false;
  var saving = null;
  function save(manual) {
    if (LOCKED) return Promise.resolve();
    clearTimeout(timer);
    if (!dirty && !manual) return Promise.resolve();
    dirty = false;
    var body = JSON.stringify({ files: files(), manual: !!manual });
    saving = fetch(BASE + '/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body, credentials: 'same-origin', keepalive: body.length < 60000 })
      .then(function (res) { return res.json().then(function (d) { if (!res.ok) throw new Error(d.error || 'ошибка ' + res.status); return d; }); })
      .then(function (d) {
        var t = new Date(d.savedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        if (chip) chip.textContent = 'Сохранено в ' + t;
        if (manual) setStatus('Сохранено в ' + t + '.');
      })
      .catch(function (err) {
        dirty = true;
        setStatus('Не сохранено: ' + err.message + '. Повторю через несколько секунд.');
        if (chip) chip.textContent = 'Не сохранено';
        timer = setTimeout(function () { save(false); }, AUTOSAVE_MS * 2);
      });
    return saving;
  }
  Object.keys(editors).forEach(function (f) {
    editors[f].on('change', function () {
      dirty = true;
      if (chip) chip.textContent = 'Есть несохранённые изменения';
      clearTimeout(timer);
      timer = setTimeout(function () { save(false); }, AUTOSAVE_MS);
    });
  });
  window.addEventListener('pagehide', function () { if (dirty) save(false); });
  // Конец контрольной (exam.js): сохранить код до перезагрузки страницы.
  window.addEventListener('exam:timeup', function (ev) { dirty = true; ev.detail.waitFor.push(save(true)); });

  root.querySelectorAll('[data-action]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var a = btn.dataset.action;
      if (a === 'run') run();
      else if (a === 'save') save(true);
      else if (a === 'reset-storage') { runner.clearStore(); log('storage_reset', {}); run(); }
    });
  });

  run();
})();
