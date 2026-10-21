// Задание ИБ №8, этап 7 (src/views/ib-detector.ejs): редактор детектора атак. «Запустить» — на своём вводе,
// «Проверить» — программа выполняется в браузере (python-worker.js) на каждом тесте, сервер сравнивает вывод.
// После прохождения тестов — контрольный вопрос: предсказать вывод своей программы (60 секунд, один раз).
// Вставка в редактор и в поле ответа отключена (public/js/ib-guard.js).
(function () {
  var root = document.getElementById('detEditor');
  if (!root) return;

  var RUN_TIMEOUT_MS = 15000;
  var TEST_TIMEOUT_MS = 8000;
  var AUTOSAVE_DELAY_MS = 1500;
  var MAX_OUTPUT = 20000;

  var tests = JSON.parse(document.getElementById('detTests').textContent);
  var area = root.querySelector('[data-det-code]');
  var stdinEl = root.querySelector('[data-det-stdin]');
  var statusEl = root.querySelector('[data-det-status]');
  var outputEl = root.querySelector('[data-det-output]');
  var resultsEl = root.querySelector('[data-det-results]');
  var chipEl = document.querySelector('[data-det-chip]');
  var runBtn = root.querySelector('[data-det-action="run"]');
  var checkBtn = root.querySelector('[data-det-action="check"]');
  var stopBtn = root.querySelector('[data-det-action="stop"]');
  var defenseEl = root.querySelector('[data-det-defense]');
  var defenseResult = root.querySelector('[data-det-defense-result]');

  var getCode;
  if (window.CodeMirror) {
    var cm = window.CodeMirror.fromTextArea(area, {
      mode: 'python', theme: 'material-darker', lineNumbers: true, indentUnit: 4, tabSize: 4,
      indentWithTabs: false, matchBrackets: true, viewportMargin: Infinity,
      extraKeys: {
        Tab: function (c) { if (c.somethingSelected()) c.indentSelection('add'); else c.replaceSelection('    ', 'end'); },
        'Shift-Tab': function (c) { c.indentSelection('subtract'); },
        'Ctrl-Enter': function () { run(); },
        'Cmd-Enter': function () { run(); },
      },
    });
    // Вставка и перетаскивание в редактор не проходят (ib-guard.js записывает попытку).
    cm.on('beforeChange', function (_, change) {
      if (change.origin === 'paste' || change.origin === 'drop') change.cancel();
    });
    cm.on('change', scheduleSave);
    getCode = function () { return cm.getValue(); };
  } else {
    area.addEventListener('input', scheduleSave);
    getCode = function () { return area.value; };
  }

  function setStatus(text) { statusEl.textContent = text; }

  function post(url, body) {
    return fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}), credentials: 'same-origin',
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) throw new Error(data.error || 'Ошибка сервера (' + res.status + ')');
        return data;
      });
    });
  }

  var saveTimer = null;
  var dirty = false;
  function scheduleSave() {
    dirty = true;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveDraft, AUTOSAVE_DELAY_MS);
  }
  function saveDraft() {
    clearTimeout(saveTimer);
    if (!dirty) return Promise.resolve();
    dirty = false;
    return post(root.dataset.draftUrl, { code: getCode() }).catch(function () { dirty = true; });
  }

  var worker = null;
  var current = null;
  function killWorker() { if (worker) worker.terminate(); worker = null; }
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
      if (m.type === 'status') setStatus(m.text || 'Загрузка Python…');
      else if (m.type === 'running') {
        job.timer = setTimeout(function () { killWorker(); settle({ stdout: job.stdout, stderr: job.stderr, ok: false, timeout: true }); }, job.limit);
      } else if (m.type === 'out' || m.type === 'err') {
        if (m.type === 'out') job.stdout = (job.stdout + m.text).slice(0, MAX_OUTPUT + 1);
        else job.stderr = (job.stderr + m.text).slice(0, MAX_OUTPUT + 1);
        if (job.onOut) job.onOut(m.text, m.type);
      } else if (m.type === 'done') settle({ stdout: job.stdout, stderr: job.stderr, ok: m.ok, timeout: false });
      else if (m.type === 'fail') { killWorker(); settle({ stdout: job.stdout, stderr: job.stderr, ok: false, fail: m.text }); }
    };
    worker.onerror = function () { killWorker(); settle({ stdout: '', stderr: '', ok: false, fail: 'Не удалось загрузить Python' }); };
  }
  function runProgram(stdin, echo, limit, onOut) {
    return new Promise(function (resolve) {
      ensureWorker();
      current = { resolve: resolve, timer: null, stdout: '', stderr: '', onOut: onOut, limit: limit };
      worker.postMessage({ files: { 'main.py': getCode() }, main: 'main.py', stdin: stdin, echo: echo });
    });
  }
  function lastLine(text) {
    var lines = String(text || '').trim().split('\n');
    return lines[lines.length - 1] || '';
  }

  var busy = false;
  var stopped = false;
  function setBusy(on) { busy = on; runBtn.disabled = on; checkBtn.disabled = on; stopBtn.hidden = !on; }
  function print(text, kind) {
    var span = document.createElement('span');
    if (kind) span.className = 'code-output-' + kind;
    span.textContent = text;
    outputEl.appendChild(span);
    outputEl.scrollTop = outputEl.scrollHeight;
  }
  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function emptyCode() {
    if (getCode().trim()) return false;
    outputEl.textContent = '';
    print('Редактор пуст — сначала напишите программу.\n', 'err');
    return true;
  }

  function run() {
    if (busy || emptyCode()) return;
    setBusy(true);
    stopped = false;
    outputEl.textContent = '';
    saveDraft();
    setStatus('Выполняется…');
    var lines = stdinEl.value.replace(/\r\n?/g, '\n').replace(/\n$/, '');
    runProgram(lines === '' ? [] : lines.split('\n'), false, RUN_TIMEOUT_MS, print).then(function (r) {
      if (stopped) return;
      if (r.fail) print('Не удалось запустить Python: ' + r.fail + '\n', 'err');
      else if (r.timeout) print('\n— Остановлено: программа работает дольше ' + RUN_TIMEOUT_MS / 1000 + ' с —\n', 'err');
      else print(r.ok ? '\n— Программа завершена —\n' : '\n— Программа завершилась с ошибкой —\n', r.ok ? 'info' : 'err');
      setStatus('');
      setBusy(false);
    });
  }

  function check() {
    if (busy || emptyCode()) return;
    setBusy(true);
    stopped = false;
    outputEl.textContent = '';
    resultsEl.hidden = true;
    saveDraft();
    print('Программа запускается на ' + tests.length + ' журналах…\n', 'info');
    var runs = [];
    var i = 0;
    function step() {
      if (stopped) return;
      if (i >= tests.length) return submit(runs);
      setStatus('Тест ' + (i + 1) + ' из ' + tests.length + '…');
      runProgram(tests[i].input, false, TEST_TIMEOUT_MS, null).then(function (r) {
        if (stopped) return;
        if (r.fail) { print('Не удалось запустить Python: ' + r.fail + '\n', 'err'); setStatus(''); setBusy(false); return; }
        runs.push({ stdout: r.stdout.slice(0, MAX_OUTPUT), error: r.ok ? null : lastLine(r.stderr) || 'ошибка', timeout: r.timeout });
        i += 1;
        step();
      });
    }
    step();
  }

  function submit(runs) {
    setStatus('Сравнение с эталоном…');
    post(root.dataset.checkUrl, { code: getCode(), runs: runs })
      .then(function (data) {
        print('Проверка закончена: пройдено ' + data.passed + ' из ' + data.total + '.\n', data.passed === data.total ? 'info' : 'err');
        showResults(data);
        setStatus('');
        if (data.solved) {
          if (chipEl) { chipEl.textContent = '✓ Тесты пройдены'; chipEl.className = 'sql-chip sql-chip-done'; }
          if (data.defense === null) startDefense();
        }
      })
      .catch(function (err) { print('Проверка не выполнена: ' + err.message + '\n', 'err'); setStatus(''); })
      .then(function () { setBusy(false); });
  }

  function block(title, text) {
    var box = el('div', 'pyb-test-block');
    box.appendChild(el('div', 'pyb-test-label', title));
    box.appendChild(el('pre', '', text));
    return box;
  }

  function showResults(data) {
    resultsEl.textContent = '';
    var all = data.passed === data.total;
    resultsEl.appendChild(el('div', 'sql-alert ' + (all ? 'sql-alert-success' : 'sql-alert-error'),
      all ? '✓ Все тесты пройдены.' : '✕ Пройдено ' + data.passed + ' из ' + data.total + '. Исправьте программу и проверьте снова.'));
    var list = el('ol', 'pyb-test-list');
    data.results.forEach(function (t) {
      var item = el('li', 'pyb-test ' + (t.passed ? 'is-passed' : 'is-failed'));
      var head = el('div', 'pyb-test-head');
      head.appendChild(el('span', 'pyb-test-mark', t.passed ? '✓' : '✕'));
      head.appendChild(el('span', '', 'Тест ' + t.number + (t.open ? '' : ' (закрытый)')));
      item.appendChild(head);
      if (!t.passed) {
        if (t.error) item.appendChild(el('p', 'pyb-test-hint', 'Ошибка: ' + t.error));
        if (t.open) {
          var grid = el('div', 'pyb-test-grid');
          grid.appendChild(block('Вывод программы', t.actual || '(пусто)'));
          grid.appendChild(block('Ожидалось', t.expected));
          item.appendChild(grid);
        }
      }
      list.appendChild(item);
    });
    resultsEl.appendChild(list);
    resultsEl.hidden = false;
  }

  // --- контрольный вопрос ---
  var leftTimer = null;
  function startDefense() {
    post(root.dataset.challengeUrl).then(function (data) {
      defenseEl.hidden = false;
      defenseEl.querySelector('[data-det-input]').textContent = data.input;
      var leftEl = defenseEl.querySelector('[data-det-left]');
      var left = data.seconds;
      leftEl.textContent = left;
      clearInterval(leftTimer);
      leftTimer = setInterval(function () {
        left = Math.max(0, left - 1);
        leftEl.textContent = left;
        if (!left) clearInterval(leftTimer);
      }, 1000);
      defenseEl.querySelector('[data-det-answer]').focus();
      defenseEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }).catch(function (err) { defenseResult.textContent = err.message; });
  }

  root.querySelector('[data-det-action="defend"]').addEventListener('click', function () {
    var answer = defenseEl.querySelector('[data-det-answer]').value;
    post(root.dataset.defenseUrl, { answer: answer }).then(function (r) {
      clearInterval(leftTimer);
      defenseEl.hidden = true;
      defenseResult.textContent = r.ok ? '✓ Верно: вы знаете, как работает ваша программа. Вернитесь в терминал и выполните check.'
        : (r.late ? '⏱ Время вышло. ' : '✕ Неверно. ') + 'Правильный вывод:\n' + r.expected +
          '\nЭтап засчитан частично; вернитесь в терминал и выполните check.';
    }).catch(function (err) { defenseResult.textContent = err.message; });
  });

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
  if (root.dataset.solved && !root.dataset.defense) startDefense();
})();
