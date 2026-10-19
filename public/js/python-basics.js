// «Простое программирование на Python» task page (src/views/pybasics/task.ejs, texts in Uzbek): editor with
// autosaved draft, «Запустить» with the student's own input, «Проверить» — the program runs in
// the browser (python-worker.js) once per test, and the server compares what it printed.
(function () {
  var root = document.getElementById('pybEditor');
  if (!root) return;

  var RUN_TIMEOUT_MS = 15000;
  var TEST_TIMEOUT_MS = 5000;
  var AUTOSAVE_DELAY_MS = 1500;
  var MAX_OUTPUT = 20000;

  var tests = JSON.parse(document.getElementById('pybTests').textContent);
  var area = root.querySelector('[data-pyb-code]');
  var stdinEl = root.querySelector('[data-pyb-stdin]');
  var statusEl = root.querySelector('[data-pyb-status]');
  var outputEl = root.querySelector('[data-pyb-output]');
  var resultsEl = root.querySelector('[data-pyb-results]');
  var nextEl = root.querySelector('[data-pyb-next]');
  var chipEl = document.querySelector('[data-pyb-chip]');
  var runBtn = root.querySelector('[data-pyb-action="run"]');
  var checkBtn = root.querySelector('[data-pyb-action="check"]');
  var stopBtn = root.querySelector('[data-pyb-action="stop"]');

  // --- Editor: CodeMirror when the CDN loaded, else the plain textarea ---
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
    getCode = function () { return cm.getValue(); };
  } else {
    area.addEventListener('input', scheduleSave);
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
        if (!res.ok) throw new Error(data.error || 'Server xatosi (' + res.status + ')');
        return data;
      });
    });
  }

  // --- Autosave ---
  var saveTimer = null;
  var dirty = false;
  function scheduleSave() {
    dirty = true;
    setStatus('Saqlanmagan o‘zgarishlar bor…');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveDraft, AUTOSAVE_DELAY_MS);
  }
  function saveDraft() {
    clearTimeout(saveTimer);
    if (!dirty) return Promise.resolve();
    dirty = false;
    return post(root.dataset.draftUrl, { code: getCode() })
      .then(function () { if (!dirty && !busy) setStatus('Qoralama saqlandi'); })
      .catch(function (err) { dirty = true; setStatus('Saqlab bo‘lmadi: ' + err.message); });
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
      // The worker's own status text is in Russian (shared with code-editor.js); it only says Python is loading.
      if (m.type === 'status') setStatus('Python yuklanmoqda (faqat birinchi marta, ~10 MB)…');
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
      settle({ stdout: '', stderr: '', ok: false, timeout: false, fail: 'Python’ni yuklab bo‘lmadi — internet ulanishini tekshiring' });
    };
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
    print('Muharrir bo‘sh — avval dasturni yozing.\n', 'err');
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
    setStatus('Bajarilmoqda…');
    var lines = stdinEl.value.replace(/\r\n?/g, '\n').replace(/\n$/, '');
    runProgram(lines === '' ? [] : lines.split('\n'), true, RUN_TIMEOUT_MS, print).then(function (r) {
      if (stopped) return;
      if (r.fail) print('Python’ni ishga tushirib bo‘lmadi: ' + r.fail + '\n', 'err');
      else if (r.timeout) print('\n— To‘xtatildi: dastur ' + RUN_TIMEOUT_MS / 1000 + ' soniyadan ko‘proq ishlamoqda (cheksiz sikl?) —\n', 'err');
      else print(r.ok ? '\n— Dastur tugadi —\n' : '\n— Dastur xato bilan tugadi —\n', r.ok ? 'info' : 'err');
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
    print('Dastur ' + tests.length + ' ta testda, har safar yangi ma’lumotlar bilan ishga tushiriladi…\n', 'info');
    var runs = [];
    var i = 0;
    function step() {
      if (stopped) return;
      if (i >= tests.length) return submit(runs);
      setStatus('Tekshiruv: ' + (i + 1) + '-test, jami ' + tests.length + '…');
      runProgram(tests[i].input, false, TEST_TIMEOUT_MS, null).then(function (r) {
        if (stopped) return;
        if (r.fail) {
          print('Python’ni ishga tushirib bo‘lmadi: ' + r.fail + '\n', 'err');
          setStatus('');
          setBusy(false);
          return;
        }
        runs.push({ stdout: r.stdout.slice(0, MAX_OUTPUT), error: r.ok ? null : lastLine(r.stderr) || 'xato', timeout: r.timeout });
        i += 1;
        step();
      });
    }
    step();
  }

  function submit(runs) {
    setStatus('Natijalar solishtirilmoqda…');
    post(root.dataset.checkUrl, { code: getCode(), runs: runs })
      .then(function (data) {
        print('Tekshiruv tugadi: ' + data.total + ' ta testdan ' + data.passed + ' tasi o‘tdi. Batafsil pastda.\n', data.solved ? 'info' : 'err');
        showResults(data);
        setStatus(data.solved ? '' : 'O‘tgan testlar: ' + data.passed + ' / ' + data.total);
      })
      .catch(function (err) { print('Tekshiruv bajarilmadi: ' + err.message + '\n', 'err'); setStatus(''); })
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
    resultsEl.appendChild(el('div', 'sql-alert ' + (data.solved ? 'sql-alert-success' : 'sql-alert-error'),
      data.solved ? '✓ Barcha testlar o‘tdi — topshiriq bajarildi!' : '✕ ' + data.total + ' ta testdan ' + data.passed + ' tasi o‘tdi. Dasturni tuzating va yana tekshiring.'));
    var list = el('ol', 'pyb-test-list');
    data.tests.forEach(function (t) {
      var item = el('li', 'pyb-test ' + (t.passed ? 'is-passed' : 'is-failed'));
      var head = el('div', 'pyb-test-head');
      head.appendChild(el('span', 'pyb-test-mark', t.passed ? '✓' : '✕'));
      head.appendChild(el('span', '', t.number + '-test' + (t.open ? '' : ' (yopiq)')));
      item.appendChild(head);
      if (!t.passed) {
        if (t.hint) item.appendChild(el('p', 'pyb-test-hint', t.hint));
        var grid = el('div', 'pyb-test-grid');
        grid.appendChild(block('Kiritish', t.input.join('\n')));
        grid.appendChild(block('Dastur chiqishi', t.actual || '(bo‘sh)'));
        if (t.open) grid.appendChild(block('Kutilgan', t.expected));
        item.appendChild(grid);
      }
      list.appendChild(item);
    });
    resultsEl.appendChild(list);
    resultsEl.hidden = false;
    if (data.solved) {
      if (chipEl) { chipEl.textContent = '✓ Bajarildi'; chipEl.className = 'sql-chip sql-chip-done'; }
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
    print('\n— To‘xtatildi —\n', 'err');
    setStatus('');
    setBusy(false);
  }

  runBtn.addEventListener('click', run);
  checkBtn.addEventListener('click', check);
  stopBtn.addEventListener('click', stop);
})();
