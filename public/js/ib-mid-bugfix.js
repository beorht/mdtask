// Клиент блока C ИБ-контрольной (поиск и исправление ошибок). Редактор кода (CodeMirror), запуск в
// браузере (Pyodide, /js/python-worker.js) на тестах с подачей ввода через stdin. Запусков не больше
// лимита; ВЕРДИКТ НЕ ПОКАЗЫВАЕТСЯ — только «запуск N из K» и вывод программы. После лимита или по
// «Отправить» код блокируется и уходит на проверку. Выводы тестов отправляются на сервер для скрытой оценки.
(function () {
  'use strict';
  var root = document.getElementById('ibmidBug');
  if (!root) return;
  var tests = JSON.parse(root.getAttribute('data-tests') || '[]');
  var runUrl = root.getAttribute('data-run-url');
  var submitUrl = root.getAttribute('data-submit-url');
  var limit = parseInt(root.getAttribute('data-runs-limit'), 10) || 4;
  var runsUsed = parseInt(root.getAttribute('data-runs-used'), 10) || 0;
  var locked = root.getAttribute('data-locked') === '1';
  var taskId = root.getAttribute('data-task');
  var statusEl = document.getElementById('ibmidBugStatus');
  var outEl = document.getElementById('ibmidBugOut');
  var infoEl = document.getElementById('ibmidRunsInfo');
  var runBtn = document.getElementById('ibmidBugRun');
  var submitBtn = document.getElementById('ibmidBugSubmit');
  var ta = document.getElementById('ibmidBugCode');
  var LS = 'ibmid-bug-' + taskId;

  var cm = window.CodeMirror ? window.CodeMirror.fromTextArea(ta, {
    mode: 'python', theme: 'material-darker', lineNumbers: true, indentUnit: 4, tabSize: 4,
  }) : null;
  var code = function () { return cm ? cm.getValue() : ta.value; };
  var setCode = function (v) { if (cm) cm.setValue(v); else ta.value = v; };

  // локальная подстраховка от потери кода до первого запуска
  try { var saved = localStorage.getItem(LS); if (saved && !runsUsed) setCode(saved); } catch (e) {}
  if (cm) cm.on('change', function () { try { localStorage.setItem(LS, code()); } catch (e) {} });
  else ta.addEventListener('input', function () { try { localStorage.setItem(LS, code()); } catch (e) {} });

  function renderInfo() {
    if (locked) { infoEl.textContent = 'Отправлено на проверку (запусков: ' + runsUsed + ' из ' + limit + ').'; runBtn.disabled = true; submitBtn.disabled = true; }
    else infoEl.textContent = 'Запусков использовано: ' + runsUsed + ' из ' + limit;
  }
  renderInfo();

  function runOne(input) {
    return new Promise(function (resolve) {
      var worker = new Worker('/js/python-worker.js');
      var out = '', err = '';
      var timer = setTimeout(function () { try { worker.terminate(); } catch (e) {} resolve({ stdout: out, error: 'timeout' }); }, 20000);
      worker.onmessage = function (e) {
        var m = e.data || {};
        if (m.type === 'out') out += m.text;
        else if (m.type === 'err') err += m.text;
        else if (m.type === 'done') { clearTimeout(timer); worker.terminate(); resolve({ stdout: out, error: m.ok ? null : (err.trim().split('\n').pop() || 'ошибка') }); }
        else if (m.type === 'fail') { clearTimeout(timer); worker.terminate(); resolve({ stdout: out, error: m.text || 'ошибка' }); }
        else if (m.type === 'status') { statusEl.textContent = m.text; }
      };
      worker.postMessage({ files: { 'program.py': code() }, main: 'program.py', stdin: String(input || '').split('\n') });
    });
  }

  function runAll() {
    return tests.reduce(function (chain, t) {
      return chain.then(function (acc) { return runOne(t.input).then(function (r) { acc.push(r); return acc; }); });
    }, Promise.resolve([]));
  }

  function send(url) {
    if (locked) return;
    runBtn.disabled = true; submitBtn.disabled = true;
    statusEl.textContent = 'Выполнение…'; outEl.textContent = '';
    runAll().then(function (results) {
      outEl.textContent = results[0] ? (results[0].error ? ('Ошибка: ' + results[0].error + '\n' + (results[0].stdout || '')) : (results[0].stdout || '(пустой вывод)')) : '';
      return fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outputs: results.map(function (r) { return r.stdout || ''; }), draft: code() }),
      }).then(function (resp) { return resp.json(); });
    }).then(function (j) {
      statusEl.textContent = '';
      runsUsed = typeof j.runsUsed === 'number' ? j.runsUsed : runsUsed;
      locked = !!j.locked;
      renderInfo();
      if (!locked) { runBtn.disabled = false; submitBtn.disabled = false; }
    }).catch(function () { statusEl.textContent = 'Ошибка запуска.'; if (!locked) { runBtn.disabled = false; submitBtn.disabled = false; } });
  }

  runBtn.addEventListener('click', function () { send(runUrl); });
  submitBtn.addEventListener('click', function () {
    if (locked) return;
    if (!window.confirm('Отправить код на проверку? Больше запусков не будет.')) return;
    send(submitUrl);
  });
})();
