// Клиент задач блока B ИБ-контрольной (Python + sqlite3). Редактор main.py (CodeMirror), запуск в
// браузере через /js/python-worker.js (Pyodide + sqlite3). «Запустить» — на основном наборе данных,
// «Проверить» — на двух наборах, выводы отправляются на сервер для сверки с эталоном.
(function () {
  'use strict';
  var root = document.getElementById('ibmidPy');
  if (!root) return;
  var datasets = JSON.parse(root.getAttribute('data-datasets') || '[]');
  var datafile = root.getAttribute('data-datafile') || 'data.sql';
  var draftUrl = root.getAttribute('data-draft-url');
  var checkUrl = root.getAttribute('data-check-url');
  var statusEl = document.getElementById('ibmidStatus');
  var outEl = document.getElementById('ibmidOut');
  var verdictEl = document.getElementById('ibmidVerdict');
  var ta = document.getElementById('ibmidCode');

  var cm = window.CodeMirror ? window.CodeMirror.fromTextArea(ta, {
    mode: 'python', theme: 'material-darker', lineNumbers: true, indentUnit: 4, tabSize: 4,
  }) : null;
  var code = function () { return cm ? cm.getValue() : ta.value; };

  // ---- автосохранение черновика ----
  var saveTimer = null;
  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      fetch(draftUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ draft: code() }) }).catch(function () {});
    }, 1200);
  }
  if (cm) cm.on('change', scheduleSave); else ta.addEventListener('input', scheduleSave);

  // ---- запуск программы в Pyodide ----
  function runOnce(dataSql) {
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
      var files = { 'main.py': code() };
      files[datafile] = dataSql;
      worker.postMessage({ files: files, main: 'main.py' });
    });
  }

  document.getElementById('ibmidRun').addEventListener('click', function () {
    verdictEl.hidden = true;
    statusEl.textContent = 'Запуск…';
    outEl.textContent = '';
    runOnce(datasets[0]).then(function (r) {
      statusEl.textContent = '';
      outEl.textContent = r.error ? ('Ошибка: ' + r.error + '\n' + (r.stdout || '')) : (r.stdout || '(пустой вывод)');
    });
  });

  document.getElementById('ibmidCheck').addEventListener('click', function () {
    verdictEl.hidden = true;
    statusEl.textContent = 'Проверка…';
    outEl.textContent = '';
    runOnce(datasets[0]).then(function (r1) {
      outEl.textContent = (r1.stdout || '');
      return runOnce(datasets[1]).then(function (r2) {
        return fetch(checkUrl, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ outputs: [r1.stdout || '', r2.stdout || ''], errors: [r1.error, r2.error] }),
        }).then(function (resp) { return resp.json(); });
      });
    }).then(function (j) {
      statusEl.textContent = '';
      verdictEl.hidden = false;
      verdictEl.className = 'ltt-verdict ' + (j.solved ? 'is-ok' : 'is-no');
      verdictEl.innerHTML = '<strong>' + (j.solved ? '✔ Задание выполнено' : '✘ Пока не верно') + '</strong>' + (j.hint ? '<div>' + j.hint.replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }) + '</div>' : '');
    }).catch(function () { statusEl.textContent = 'Ошибка проверки.'; });
  });
})();
