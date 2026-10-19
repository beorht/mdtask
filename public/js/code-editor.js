// Python editor of an editor assignment: file tabs, autosaved draft, running the program
// in the browser (python-worker.js) and submitting the files for review.
(function () {
  var root = document.getElementById('codeEditor');
  if (!root) return;

  var RUN_TIMEOUT_MS = 15000;
  var AUTOSAVE_DELAY_MS = 1500;

  var statusEl = root.querySelector('[data-code-status]');
  var outputEl = root.querySelector('[data-code-output]');
  var runBtn = root.querySelector('[data-code-action="run"]');
  var stopBtn = root.querySelector('[data-code-action="stop"]');
  var submitBtn = root.querySelector('[data-code-action="submit"]');
  var tabs = Array.prototype.slice.call(root.querySelectorAll('[data-code-file]'));
  var names = tabs.map(function (t) { return t.dataset.codeFile; });
  var mainFile = names.indexOf('main.py') !== -1 ? 'main.py' : names[0];

  // One editor per file: CodeMirror when the CDN loaded, else the plain textarea.
  var editors = {};
  root.querySelectorAll('[data-code-source]').forEach(function (area) {
    var name = area.dataset.codeSource;
    var readOnly = area.dataset.codeReadonly === '1';
    if (window.CodeMirror) {
      var cm = window.CodeMirror.fromTextArea(area, {
        mode: 'python',
        readOnly: readOnly,
        theme: 'material-darker',
        lineNumbers: true,
        indentUnit: 4,
        tabSize: 4,
        indentWithTabs: false,
        matchBrackets: true,
        viewportMargin: Infinity,
        extraKeys: {
          Tab: function (c) {
            if (c.somethingSelected()) c.indentSelection('add');
            else c.replaceSelection('    ', 'end');
          },
          'Shift-Tab': function (c) { c.indentSelection('subtract'); },
          'Ctrl-Enter': function () { run(); },
          'Cmd-Enter': function () { run(); },
          'Ctrl-S': function () { saveDraft(); },
          'Cmd-S': function () { saveDraft(); },
        },
      });
      cm.on('change', scheduleSave);
      editors[name] = { get: function () { return cm.getValue(); }, refresh: function () { cm.refresh(); } };
    } else {
      area.addEventListener('input', scheduleSave);
      area.addEventListener('keydown', function (e) {
        if (e.key === 'Tab' && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
          e.preventDefault();
          area.setRangeText('    ', area.selectionStart, area.selectionEnd, 'end');
          scheduleSave();
        }
      });
      editors[name] = { get: function () { return area.value; }, refresh: function () {} };
    }
  });

  function showFile(name) {
    tabs.forEach(function (t) {
      var active = t.dataset.codeFile === name;
      t.classList.toggle('active', active);
      t.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    root.querySelectorAll('[data-code-pane]').forEach(function (pane) {
      pane.hidden = pane.dataset.codePane !== name;
    });
    editors[name].refresh();
  }
  tabs.forEach(function (t) {
    t.addEventListener('click', function () { showFile(t.dataset.codeFile); });
  });

  function collect() {
    var files = {};
    names.forEach(function (n) { files[n] = editors[n].get(); });
    return files;
  }

  function setStatus(text) { statusEl.textContent = text; }

  function post(url, files) {
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files: files }),
      credentials: 'same-origin',
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) throw new Error(data.error || 'Ошибка сервера (' + res.status + ')');
        return data;
      });
    });
  }

  // --- Autosave ---
  var saveTimer = null;
  var dirty = false;
  function scheduleSave() {
    dirty = true;
    setStatus('Есть несохранённые изменения…');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveDraft, AUTOSAVE_DELAY_MS);
  }
  function saveDraft() {
    clearTimeout(saveTimer);
    dirty = false;
    return post(root.dataset.draftUrl, collect())
      .then(function () { if (!dirty) setStatus('Черновик сохранён'); })
      .catch(function (err) { dirty = true; setStatus('Не удалось сохранить: ' + err.message); });
  }
  window.addEventListener('beforeunload', function (e) {
    if (dirty) { e.preventDefault(); e.returnValue = ''; }
  });

  // --- Running ---
  var worker = null;
  var timer = null;
  var running = false;

  function print(text, kind) {
    var span = document.createElement('span');
    if (kind) span.className = 'code-output-' + kind;
    span.textContent = text;
    outputEl.appendChild(span);
    outputEl.scrollTop = outputEl.scrollHeight;
  }

  function finish() {
    running = false;
    clearTimeout(timer);
    runBtn.disabled = false;
    stopBtn.hidden = true;
  }

  function killWorker() {
    if (worker) worker.terminate();
    worker = null;
  }

  function startWorker() {
    worker = new Worker('/js/python-worker.js');
    worker.onmessage = function (e) {
      var m = e.data;
      if (m.type === 'status') setStatus(m.text);
      else if (m.type === 'running') {
        // The time limit counts from here, not from the (slow) first load of Python.
        setStatus('Выполняется…');
        timer = setTimeout(function () {
          stop('\n— Остановлено: программа работает дольше ' + RUN_TIMEOUT_MS / 1000 + ' с (бесконечный цикл?) —\n');
        }, RUN_TIMEOUT_MS);
      }
      else if (m.type === 'out') print(m.text);
      else if (m.type === 'err') print(m.text, 'err');
      else if (m.type === 'done') {
        print(m.ok ? '\n— Программа завершена —\n' : '\n— Программа завершилась с ошибкой —\n', m.ok ? 'info' : 'err');
        setStatus(dirty ? 'Есть несохранённые изменения…' : 'Готово');
        finish();
      } else if (m.type === 'fail') {
        print('Не удалось запустить Python: ' + m.text + '\n', 'err');
        setStatus('');
        killWorker();
        finish();
      }
    };
    worker.onerror = function () {
      print('Не удалось загрузить Python. Проверьте подключение к интернету и попробуйте ещё раз.\n', 'err');
      killWorker();
      finish();
    };
  }

  function run() {
    if (running) return;
    running = true;
    outputEl.textContent = '';
    runBtn.disabled = true;
    stopBtn.hidden = false;
    if (dirty) saveDraft();
    if (!worker) startWorker();
    worker.postMessage({ files: collect(), main: mainFile });
  }

  // Stopping kills the worker; the next run loads Python again.
  function stop(message) {
    if (!running) return;
    killWorker();
    print(message || '\n— Остановлено —\n', 'err');
    setStatus('');
    finish();
  }

  runBtn.addEventListener('click', run);
  stopBtn.addEventListener('click', function () { stop(); });

  // --- Submit ---
  if (submitBtn) {
    submitBtn.addEventListener('click', function () {
      if (!window.confirm('Сдать текущий код на проверку преподавателю?')) return;
      submitBtn.disabled = true;
      clearTimeout(saveTimer);
      post(root.dataset.submitUrl, collect())
        .then(function () {
          dirty = false;
          window.location.reload();
        })
        .catch(function (err) {
          submitBtn.disabled = false;
          window.alert(err.message);
        });
    });
  }
})();
