// Задача курса «Начальный Python» (src/views/python-course/task.ejs): редактор с автосохранением черновика,
// «Запустить» со своим вводом, «Проверить» — программа выполняется в браузере (python-worker.js) по разу на тест,
// сервер сравнивает вывод и проверяет правила кода. Вставка в редактор запрещена; уходы со страницы и попытки
// вставки уходят преподавателю (сигналы в /admin/python-course). Перенесено из курса pybasics (docs/archive/pybasics/).
(function () {
  var root = document.getElementById('pycEditor');
  if (!root) return;

  var RUN_TIMEOUT_MS = 15000;
  var TEST_TIMEOUT_MS = 5000;
  var AUTOSAVE_DELAY_MS = 1500;
  var MAX_OUTPUT = 20000;

  var EOF_MESSAGE = 'программа вызвала input() больше раз, чем строк ввода';
  var tests = JSON.parse(document.getElementById('pycTests').textContent);
  // Учебные модули задачи (requests, dotenv, socket) и файлы с данными тестов — в рабочую папку каждого запуска.
  var modules = JSON.parse(document.getElementById('pycModules').textContent);
  var runFiles = (tests[0] && tests[0].files) || {};
  var area = root.querySelector('[data-pyc-code]');
  var stdinEl = root.querySelector('[data-pyc-stdin]');
  var statusEl = root.querySelector('[data-pyc-status]');
  var outputEl = root.querySelector('[data-pyc-output]');
  var resultsEl = root.querySelector('[data-pyc-results]');
  var nextEl = root.querySelector('[data-pyc-next]');
  var chipEl = document.querySelector('[data-pyc-chip]');
  var runBtn = root.querySelector('[data-pyc-action="run"]');
  var checkBtn = root.querySelector('[data-pyc-action="check"]');
  var stopBtn = root.querySelector('[data-pyc-action="stop"]');

  // --- Сигналы преподавателю: вставка и уходы со страницы ---
  function report(body) {
    fetch(root.dataset.eventUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'same-origin' }).catch(function () {});
  }
  function blockPaste() {
    setStatus('Вставка в редактор отключена — наберите код сами.');
    report({ type: 'paste' });
  }
  var awaySince = null;
  function leave() { if (awaySince === null) awaySince = Date.now(); }
  function back() {
    if (awaySince === null) return;
    var ms = Date.now() - awaySince;
    awaySince = null;
    if (ms >= 2000) report({ type: 'away', ms: ms });
  }
  document.addEventListener('visibilitychange', function () { if (document.hidden) leave(); else back(); });
  window.addEventListener('blur', function () { setTimeout(function () { if (!document.hasFocus()) leave(); }, 0); });
  window.addEventListener('focus', back);

  // --- Editor: CodeMirror (public/vendor), else the plain textarea ---
  var getCode;
  if (window.CodeMirror) {
    var cm = window.CodeMirror.fromTextArea(area, {
      mode: 'python',
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
    cm.on('beforeChange', function (c, change) {
      if (change.origin === 'paste' || change.origin === 'drop') { change.cancel(); blockPaste(); }
    });
    getCode = function () { return cm.getValue(); };
  } else {
    area.addEventListener('input', scheduleSave);
    area.addEventListener('paste', function (e) { e.preventDefault(); blockPaste(); });
    area.addEventListener('drop', function (e) { e.preventDefault(); blockPaste(); });
    area.addEventListener('keydown', function (e) {
      if (e.key === 'Tab' && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        area.setRangeText('    ', area.selectionStart, area.selectionEnd, 'end');
        scheduleSave();
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        run();
      }
    });
    getCode = function () { return area.value; };
  }

  function setStatus(text) { statusEl.textContent = text; }

  function post(url, body) {
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
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
    if (!dirty) return Promise.resolve();
    dirty = false;
    return post(root.dataset.draftUrl, { code: getCode() })
      .then(function () { if (!dirty && !busy) setStatus('Черновик сохранён'); })
      .catch(function (err) { dirty = true; setStatus('Не удалось сохранить: ' + err.message); });
  }
  window.addEventListener('beforeunload', function (e) {
    if (dirty) { e.preventDefault(); e.returnValue = ''; }
  });

  // --- One program run in the worker; resolves { stdout, stderr, ok, timeout } ---
  var worker = null;
  var current = null; // { resolve, timer, stdout, stderr, onOut }

  function killWorker() {
    if (worker) worker.terminate();
    worker = null;
  }

  function settle(result) {
    var job = current;
    if (!job) return;
    current = null;
    clearTimeout(job.timer);
    job.resolve(result);
  }

  function ensureWorker() {
    if (worker) return;
    worker = new Worker('/js/python-worker.js');
    worker.onmessage = function (e) {
      var m = e.data;
      var job = current;
      if (!job) return;
      if (m.type === 'status') setStatus(m.text);
      else if (m.type === 'running') {
        // The time limit counts from here, not from the (slow) first load of Python.
        job.timer = setTimeout(function () {
          killWorker();
          settle({ stdout: job.stdout, stderr: job.stderr, ok: false, timeout: true });
        }, job.limit);
      } else if (m.type === 'out' || m.type === 'err') {
        if (m.type === 'out') job.stdout = (job.stdout + m.text).slice(0, MAX_OUTPUT + 1);
        else job.stderr = (job.stderr + m.text).slice(0, MAX_OUTPUT + 1);
        if (job.onOut) job.onOut(m.text, m.type);
      } else if (m.type === 'done') {
        settle({ stdout: job.stdout, stderr: job.stderr, ok: m.ok, timeout: false });
      } else if (m.type === 'fail') {
        killWorker();
        settle({ stdout: job.stdout, stderr: job.stderr, ok: false, timeout: false, fail: m.text });
      }
    };
    worker.onerror = function () {
      killWorker();
      settle({ stdout: '', stderr: '', ok: false, timeout: false, fail: 'не удалось загрузить Python — обновите страницу' });
    };
  }

  function runProgram(stdin, echo, limit, onOut, files) {
    return new Promise(function (resolve) {
      ensureWorker();
      current = { resolve: resolve, timer: null, stdout: '', stderr: '', onOut: onOut, limit: limit };
      var all = Object.assign({}, files || {}, { 'main.py': getCode() });
      worker.postMessage({ files: all, main: 'main.py', stdin: stdin, echo: echo, eofMessage: EOF_MESSAGE, modules: modules });
    });
  }

  function lastLine(text) {
    var lines = String(text || '').trim().split('\n');
    return lines[lines.length - 1] || '';
  }

  // --- UI state ---
  var busy = false;
  var stopped = false;
  function setBusy(on) {
    busy = on;
    runBtn.disabled = on;
    checkBtn.disabled = on;
    stopBtn.hidden = !on;
  }

  function print(text, kind) {
    var span = document.createElement('span');
    if (kind) span.className = 'code-output-' + kind;
    span.textContent = text;
    outputEl.appendChild(span);
    outputEl.scrollTop = outputEl.scrollHeight;
  }

  function emptyCode() {
    if (getCode().trim()) return false;
    outputEl.textContent = '';
    print('Редактор пуст — сначала напишите программу.\n', 'err');
    return true;
  }

  // «Запустить»: the student's own input, prompts and entered values echoed like a terminal.
  function run() {
    if (busy || emptyCode()) return;
    setBusy(true);
    stopped = false;
    outputEl.textContent = '';
    resultsEl.hidden = true;
    saveDraft();
    setStatus('Выполняется…');
    var lines = stdinEl.value.replace(/\r\n?/g, '\n').replace(/\n$/, '');
    runProgram(lines === '' ? [] : lines.split('\n'), true, RUN_TIMEOUT_MS, print, runFiles).then(function (r) {
      if (stopped) return;
      if (r.fail) print('Не удалось запустить Python: ' + r.fail + '\n', 'err');
      else if (r.timeout) print('\n— Остановлено: программа работает дольше ' + RUN_TIMEOUT_MS / 1000 + ' секунд (бесконечный цикл?) —\n', 'err');
      else print(r.ok ? '\n— Программа завершена —\n' : '\n— Программа завершилась с ошибкой —\n', r.ok ? 'info' : 'err');
      setStatus('');
      setBusy(false);
    });
  }

  // «Проверить»: every test in a fresh run, then the server compares the outputs.
  function check() {
    if (busy || emptyCode()) return;
    setBusy(true);
    stopped = false;
    outputEl.textContent = '';
    resultsEl.hidden = true;
    saveDraft();
    print('Проверка: тестов — ' + tests.length + ', каждый запуск с новыми данными…\n', 'info');
    var runs = [];
    var i = 0;
    function step() {
      if (stopped) return;
      if (i >= tests.length) return submit(runs);
      setStatus('Проверка: тест ' + (i + 1) + ' из ' + tests.length + '…');
      runProgram(tests[i].input, false, TEST_TIMEOUT_MS, null, tests[i].files).then(function (r) {
        if (stopped) return;
        if (r.fail) {
          print('Не удалось запустить Python: ' + r.fail + '\n', 'err');
          setStatus('');
          setBusy(false);
          return;
        }
        runs.push({ stdout: r.stdout.slice(0, MAX_OUTPUT), error: r.ok ? null : lastLine(r.stderr) || 'ошибка', timeout: r.timeout });
        i += 1;
        step();
      });
    }
    step();
  }

  function submit(runs) {
    setStatus('Сравниваю результаты…');
    post(root.dataset.checkUrl, { code: getCode(), runs: runs })
      .then(function (data) {
        print('Проверка закончена: пройдено тестов ' + data.passed + ' из ' + data.total + '. Подробности ниже.\n', data.solved ? 'info' : 'err');
        showResults(data);
        setStatus(data.solved ? '' : 'Пройдено тестов: ' + data.passed + ' / ' + data.total);
      })
      .catch(function (err) { print('Проверка не выполнена: ' + err.message + '\n', 'err'); setStatus(''); })
      .then(function () { setBusy(false); });
  }

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function showResults(data) {
    resultsEl.textContent = '';
    var rulesBroken = (data.forbidden && data.forbidden.length) || (data.missing && data.missing.length);
    resultsEl.appendChild(el('div', 'sql-alert ' + (data.solved ? 'sql-alert-success' : 'sql-alert-error'),
      data.solved ? '✓ Все тесты пройдены — задача решена!'
        : data.passed === data.total && rulesBroken ? '✕ Тесты пройдены, но решение нарушает правила задачи.'
          : '✕ Пройдено тестов: ' + data.passed + ' из ' + data.total + '. Исправьте программу и проверьте ещё раз.'));
    if (data.forbidden && data.forbidden.length) resultsEl.appendChild(el('p', 'pyb-test-hint', 'Нельзя использовать: ' + data.forbidden.join('; ') + '. Напишите этот шаг алгоритма сами.'));
    if (data.missing && data.missing.length) resultsEl.appendChild(el('p', 'pyb-test-hint', 'В решении должно быть: ' + data.missing.join('; ') + '.'));
    var list = el('ol', 'pyb-test-list');
    data.tests.forEach(function (t) {
      var item = el('li', 'pyb-test ' + (t.passed ? 'is-passed' : 'is-failed'));
      var head = el('div', 'pyb-test-head');
      head.appendChild(el('span', 'pyb-test-mark', t.passed ? '✓' : '✕'));
      head.appendChild(el('span', '', 'Тест ' + t.number + (t.open ? '' : ' (закрытый)')));
      item.appendChild(head);
      if (!t.passed) {
        if (t.hint) item.appendChild(el('p', 'pyb-test-hint', t.hint));
        var grid = el('div', 'pyb-test-grid');
        grid.appendChild(block('Ввод', t.input.length ? t.input.join('\n') : '(нет ввода)'));
        grid.appendChild(block('Вывод программы', t.actual || '(пусто)'));
        if (t.open) grid.appendChild(block('Ожидается', t.expected));
        item.appendChild(grid);
      }
      list.appendChild(item);
    });
    resultsEl.appendChild(list);
    resultsEl.hidden = false;
    if (data.solved) {
      if (chipEl) { chipEl.textContent = '✓ Решено'; chipEl.className = 'sql-chip sql-chip-done'; }
      nextEl.hidden = false;
    }
    resultsEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function block(title, text) {
    var box = el('div', 'pyb-test-block');
    box.appendChild(el('div', 'pyb-test-label', title));
    box.appendChild(el('pre', '', text));
    return box;
  }

  // Stopping kills the worker; the next run loads Python again.
  function stop() {
    if (!busy) return;
    stopped = true;
    killWorker();
    current = null;
    print('\n— Остановлено —\n', 'err');
    setStatus('');
    setBusy(false);
  }

  runBtn.addEventListener('click', run);
  checkBtn.addEventListener('click', check);
  stopBtn.addEventListener('click', stop);
})();
