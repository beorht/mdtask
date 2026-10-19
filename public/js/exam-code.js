// Итоговая контрольная, задания 3.1–3.7 (src/views/exam/code.ejs). The program runs in the
// browser (python-worker.js, Pyodide); the server is asked before every «Запустить» (it counts
// the runs of a bug program and logs every run) and compares the outputs of the tests.
//   Algorithm (3.1–3.2): unlimited runs and checks; the check shows which tests passed.
//   Bug program (3.3–3.7): 4 runs and one submission. Before the 4th run the student is warned;
//   after it the task is closed and that run's code is submitted automatically. At the end of
//   the exam an unsent program is submitted as it is. The verdict is not shown.
(function () {
  var root = document.getElementById('examEditor');
  if (!root) return;

  var RUN_TIMEOUT_MS = 15000;
  var TEST_TIMEOUT_MS = 10000;
  var AUTOSAVE_DELAY_MS = 4000;
  var MAX_OUTPUT = 20000;
  var EOF_MESSAGE = 'input(): строки ввода закончились — программа читает больше данных, чем ей дали';

  var post = window.examPost;
  var URL = root.dataset.url;
  var KIND = root.dataset.kind;
  var isBug = KIND === 'bug';
  var locked = root.dataset.locked === '1';
  var submitted = root.dataset.submitted === '1';
  var phaseOpen = root.dataset.phase === 'open';
  var runsLeft = root.dataset.runsLeft === '' ? null : Number(root.dataset.runsLeft);

  var tests = JSON.parse(document.getElementById('examTests').textContent);
  var area = root.querySelector('[data-code]');
  var stdinEl = root.querySelector('[data-stdin]');
  var statusEl = root.querySelector('[data-status]');
  var outputEl = root.querySelector('[data-output]');
  var resultsEl = root.querySelector('[data-results]');
  var lockNote = root.querySelector('[data-lock-note]');
  var runsLeftEl = document.querySelector('[data-runs-left]');
  var chipEl = document.querySelector('[data-exam-chip]');
  var buttons = {};
  ['run', 'check', 'submit', 'reset', 'stop'].forEach(function (name) {
    buttons[name] = root.querySelector('[data-action="' + name + '"]');
  });

  // --- editor ---
  var cm = null;
  if (window.CodeMirror) {
    cm = window.CodeMirror.fromTextArea(area, {
      mode: 'python',
      theme: 'material-darker',
      lineNumbers: true,
      indentUnit: 4,
      tabSize: 4,
      indentWithTabs: false,
      matchBrackets: true,
      viewportMargin: Infinity,
      readOnly: locked,
      extraKeys: {
        Tab: function (c) {
          if (c.somethingSelected()) c.indentSelection('add');
          else c.replaceSelection('    ', 'end');
        },
        'Shift-Tab': function (c) { c.indentSelection('subtract'); },
        'Ctrl-Enter': function () { run(); },
        'Cmd-Enter': function () { run(); },
      },
    });
    cm.on('change', scheduleSave);
  } else {
    area.addEventListener('input', scheduleSave);
  }
  function getCode() { return cm ? cm.getValue() : area.value; }
  function setCode(code) {
    if (cm) cm.setValue(code);
    else area.value = code;
  }

  function setStatus(text) { statusEl.textContent = text; }

  // --- autosave ---
  var saveTimer = null;
  var dirty = false;
  function scheduleSave() {
    if (locked) return;
    dirty = true;
    setStatus('Есть несохранённые изменения…');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveDraft, AUTOSAVE_DELAY_MS);
  }
  function saveDraft() {
    clearTimeout(saveTimer);
    if (!dirty || locked) return Promise.resolve();
    dirty = false;
    return post(URL + '/draft', { code: getCode() })
      .then(function () { if (!dirty && !busy) setStatus('Черновик сохранён'); })
      .catch(function (err) {
        if (err.status === 409) lock(err.message);
        else { dirty = true; setStatus('Не удалось сохранить: ' + err.message); }
      });
  }
  window.addEventListener('beforeunload', function (e) {
    if (dirty && !locked) { e.preventDefault(); e.returnValue = ''; }
  });

  // --- the worker ---
  var worker = null;
  var current = null;
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
      if (m.type === 'status') setStatus('Загружаю Python (только при первом запуске, ~10 МБ)…');
      else if (m.type === 'running') {
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
      settle({ stdout: '', stderr: '', ok: false, timeout: false, fail: 'не удалось загрузить Python — проверьте подключение к интернету' });
    };
  }
  function runProgram(code, stdin, echo, limit, onOut) {
    return new Promise(function (resolve) {
      ensureWorker();
      current = { resolve: resolve, timer: null, stdout: '', stderr: '', onOut: onOut, limit: limit };
      worker.postMessage({ files: { 'main.py': code }, main: 'main.py', stdin: stdin, echo: echo, eofMessage: EOF_MESSAGE });
    });
  }
  function lastLine(text) {
    var lines = String(text || '').trim().split('\n');
    return lines[lines.length - 1] || '';
  }

  // --- UI ---
  var busy = false;
  var stopped = false;
  function setBusy(on) {
    busy = on;
    ['run', 'check', 'submit', 'reset'].forEach(function (name) { if (buttons[name]) buttons[name].disabled = on; });
    if (buttons.stop) buttons.stop.hidden = !on;
  }
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

  function lock(message) {
    locked = true;
    if (cm) cm.setOption('readOnly', true);
    else area.readOnly = true;
    stdinEl.readOnly = true;
    ['run', 'check', 'submit', 'reset', 'stop'].forEach(function (name) { if (buttons[name]) buttons[name].remove(); });
    if (lockNote) lockNote.textContent = message || 'Задание закрыто — код только для чтения';
  }

  function setRunsLeft(n) {
    runsLeft = n;
    if (runsLeftEl) runsLeftEl.textContent = n;
    if (chipEl && isBug && n !== null) chipEl.textContent = 'Запусков: ' + (4 - n) + ' из 4';
  }

  // «Запустить»: asks the server first, then runs with the student's own input.
  function run() {
    if (busy || locked) return;
    var code = getCode();
    if (!code.trim()) { outputEl.textContent = ''; print('Редактор пуст.\n', 'err'); return; }
    if (isBug && runsLeft === 1 &&
        !window.confirm('Это последний, 4-й запуск. После него код будет заблокирован и отправлен на проверку. Запустить?')) return;
    setBusy(true);
    stopped = false;
    outputEl.textContent = '';
    resultsEl.hidden = true;
    var input = stdinEl.value.replace(/\r\n?/g, '\n').replace(/\n$/, '');
    saveDraft()
      .then(function () { return post(URL + '/run', { code: code, stdin: input }); })
      .then(function (grant) {
        if (grant.runsLeft !== null && grant.runsLeft !== undefined) setRunsLeft(grant.runsLeft);
        setStatus('Выполняется…');
        return runProgram(code, input === '' ? [] : input.split('\n'), true, RUN_TIMEOUT_MS, print).then(function (r) {
          post(URL + '/run-result', {
            runId: grant.runId,
            stdout: r.stdout,
            error: r.ok ? null : (r.fail || lastLine(r.stderr) || 'ошибка'),
            timeout: r.timeout,
            stopped: stopped,
          }).catch(function () {});
          if (stopped) return grant;
          if (r.fail) print('Не удалось запустить Python: ' + r.fail + '\n', 'err');
          else if (r.timeout) print('\n— Остановлено: программа работает дольше ' + RUN_TIMEOUT_MS / 1000 + ' секунд (бесконечный цикл?) —\n', 'err');
          else print(r.ok ? '\n— Программа завершилась —\n' : '\n— Программа завершилась с ошибкой —\n', r.ok ? 'info' : 'err');
          return grant;
        });
      })
      .then(function (grant) {
        setStatus('');
        setBusy(false);
        if (grant && grant.last) {
          print('\nЭто был последний запуск: задание закрыто, код отправляется на проверку…\n', 'info');
          lock('Запуски закончились — код только для чтения');
          submitBug('runs', code);
        }
      })
      .catch(function (err) {
        print(err.message + '\n', 'err');
        setStatus('');
        setBusy(false);
        if (err.status === 409 && err.data && err.data.runsLeft === 0) {
          setRunsLeft(0);
          lock('Задание закрыто — код только для чтения');
        }
      });
  }

  // Every test in a fresh run; resolves with the outputs (null if Python couldn't start).
  function runTests(code) {
    var runs = [];
    var i = 0;
    return new Promise(function (resolve) {
      function step() {
        if (stopped) return resolve(null);
        if (i >= tests.length) return resolve(runs);
        setStatus('Тест ' + (i + 1) + ' из ' + tests.length + '…');
        runProgram(code, tests[i].input, false, TEST_TIMEOUT_MS, null).then(function (r) {
          if (r.fail) {
            print('Не удалось запустить Python: ' + r.fail + '\n', 'err');
            return resolve(null);
          }
          runs.push({ stdout: r.stdout.slice(0, MAX_OUTPUT), error: r.ok ? null : lastLine(r.stderr) || 'ошибка', timeout: r.timeout });
          i += 1;
          step();
        });
      }
      step();
    });
  }

  // «Проверить» (algorithms).
  function check() {
    if (busy || locked) return;
    var code = getCode();
    if (!code.trim()) { outputEl.textContent = ''; print('Редактор пуст.\n', 'err'); return; }
    setBusy(true);
    stopped = false;
    outputEl.textContent = '';
    resultsEl.hidden = true;
    saveDraft();
    print('Программа запускается на ' + tests.length + ' тестах, каждый раз заново…\n', 'info');
    runTests(code).then(function (runs) {
      if (!runs) { setStatus(''); setBusy(false); return; }
      setStatus('Сравниваю результаты…');
      return post(URL + '/check', { code: code, runs: runs }).then(function (data) {
        print('Проверка закончена: пройдено тестов ' + data.passed + ' из ' + data.total + '.\n', data.solved ? 'info' : 'err');
        showResults(data);
        setStatus('');
      });
    }).catch(function (err) { print('Проверка не выполнена: ' + err.message + '\n', 'err'); setStatus(''); })
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
    if (data.forbidden && data.forbidden.length) {
      resultsEl.appendChild(el('div', 'sql-alert sql-alert-error', '✕ Решение не засчитано: использованы запрещённые функции — ' + data.forbidden.join(', ') + '. Напишите алгоритм сами.'));
    } else {
      resultsEl.appendChild(el('div', 'sql-alert ' + (data.solved ? 'sql-alert-success' : 'sql-alert-error'),
        data.solved ? '✓ Все тесты пройдены — задание решено.' : '✕ Пройдено тестов: ' + data.passed + ' из ' + data.total + '. Исправьте программу и проверьте снова.'));
    }
    var list = el('ol', 'pyb-test-list');
    data.tests.forEach(function (t) {
      var item = el('li', 'pyb-test ' + (t.passed ? 'is-passed' : 'is-failed'));
      var head = el('div', 'pyb-test-head');
      head.appendChild(el('span', 'pyb-test-mark', t.passed ? '✓' : '✕'));
      head.appendChild(el('span', '', 'Тест ' + t.number + (t.open ? '' : ' (закрытый)')));
      item.appendChild(head);
      if (!t.passed) {
        if (t.error) item.appendChild(el('p', 'pyb-test-hint', 'Ошибка: ' + t.error));
        if (t.open) {
          var grid = el('div', 'pyb-test-grid');
          grid.appendChild(block('Ввод', t.input.join('\n')));
          grid.appendChild(block('Вывод программы', t.actual || '(пусто)'));
          grid.appendChild(block('Ожидалось', t.expected));
          item.appendChild(grid);
        }
      }
      list.appendChild(item);
    });
    resultsEl.appendChild(list);
    resultsEl.hidden = false;
    if (data.solved && chipEl) { chipEl.textContent = 'Решено'; chipEl.className = 'sql-chip exam-state-done'; }
    resultsEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  // The single submission of a bug program: the tests run here, the server keeps the verdict.
  var submitting = null;
  function submitBug(kind, code) {
    if (submitting) return submitting;
    submitted = false;
    setBusy(true);
    stopped = false;
    submitting = runTests(code).then(function (runs) {
      if (!runs) {
        print('Не удалось прогнать тесты. Обновите страницу — отправка повторится.\n', 'err');
        return;
      }
      setStatus('Отправляю…');
      return post(URL + '/submit', { code: code, runs: runs, kind: kind }).then(function () {
        submitted = true;
        print('📨 Программа отправлена на проверку. Результат объявит преподаватель.\n', 'info');
        lock('Задание отправлено — код только для чтения');
        if (chipEl) { chipEl.textContent = 'Отправлено'; chipEl.className = 'sql-chip exam-state-sent'; }
      });
    }).catch(function (err) {
      print('Отправка не выполнена: ' + err.message + '\n', 'err');
      if (err.status === 409) lock(err.message);
    }).then(function () {
      setStatus('');
      setBusy(false);
      submitting = null;
    });
    return submitting;
  }

  function submit() {
    if (busy || locked) return;
    if (!window.confirm('Отправить программу на проверку? Изменить решение после отправки будет нельзя.')) return;
    var code = getCode();
    outputEl.textContent = '';
    saveDraft().then(function () {
      print('Программа проверяется на ' + tests.length + ' тестах и отправляется…\n', 'info');
      lock('Задание отправляется…');
      submitBug('manual', code);
    });
  }

  function reset() {
    if (busy || locked) return;
    if (!window.confirm('Вернуть исходную программу? Ваши исправления пропадут, а использованные запуски не вернутся.')) return;
    clearTimeout(saveTimer);
    dirty = false;
    post(URL + '/reset', {})
      .then(function (data) {
        setCode(data.code);
        dirty = false;
        setStatus('Исходная программа возвращена');
      })
      .catch(function (err) { setStatus(err.message); });
  }

  function stop() {
    if (!busy) return;
    stopped = true;
    killWorker();
    settle({ stdout: '', stderr: '', ok: false, timeout: false });
    print('\n— Остановлено —\n', 'err');
    setStatus('');
    setBusy(false);
  }

  if (buttons.run) buttons.run.addEventListener('click', run);
  if (buttons.check) buttons.check.addEventListener('click', check);
  if (buttons.submit) buttons.submit.addEventListener('click', submit);
  if (buttons.reset) buttons.reset.addEventListener('click', reset);
  if (buttons.stop) buttons.stop.addEventListener('click', stop);

  // Closed by its 4th run but not sent yet (the page was closed in between): send it now.
  if (isBug && locked && !submitted && phaseOpen) {
    outputEl.textContent = '';
    print('Запуски закончились: отправляю код последнего запуска на проверку…\n', 'info');
    submitBug('runs', getCode());
  }

  // Time is up: an unsent bug program is sent as it is now.
  window.addEventListener('exam:timeup', function (ev) {
    if (!isBug || submitted) return;
    var code = getCode();
    print('\nВремя вышло: программа отправляется на проверку в текущем виде…\n', 'info');
    var wasLocked = locked;
    lock('Время вышло — код только для чтения');
    ev.detail.waitFor.push(submitBug(wasLocked ? 'runs' : 'timeout', code));
  });
})();
