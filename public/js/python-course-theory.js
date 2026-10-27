// «▶ Запустить» у примеров в теории курса «Начальный Python» (src/lib/python-course/theory.js): пример выполняется
// в браузере (Pyodide, python-worker.js) с заданным вводом, вывод появляется под кодом. Python загружается при первом
// запуске; бесконечный цикл останавливается через 10 секунд.
(function () {
  var LIMIT_MS = 10000;
  var EOF_MESSAGE = 'пример вызвал input() больше раз, чем задано строк ввода';
  var worker = null;
  var job = null;

  function kill() {
    if (worker) worker.terminate();
    worker = null;
  }

  function finish(text, kind) {
    var current = job;
    if (!current) return;
    job = null;
    clearTimeout(current.timer);
    if (text) append(current.out, text, kind);
    current.button.disabled = false;
  }

  function append(out, text, kind) {
    var span = document.createElement('span');
    if (kind) span.className = 'code-output-' + kind;
    span.textContent = text;
    out.appendChild(span);
  }

  function ensureWorker() {
    if (worker) return;
    worker = new Worker('/js/python-worker.js');
    worker.onmessage = function (e) {
      var m = e.data;
      if (!job) return;
      if (m.type === 'status') append(job.out, m.text + '\n', 'info');
      else if (m.type === 'running') {
        job.timer = setTimeout(function () { kill(); finish('\n— Остановлено: пример работает слишком долго —\n', 'err'); }, LIMIT_MS);
      } else if (m.type === 'out') append(job.out, m.text);
      else if (m.type === 'err') append(job.out, m.text, 'err');
      else if (m.type === 'done') finish('', null);
      else if (m.type === 'fail') { kill(); finish('Не удалось запустить Python: ' + m.text + '\n', 'err'); }
    };
    worker.onerror = function () { kill(); finish('Не удалось загрузить Python — обновите страницу.\n', 'err'); };
  }

  document.querySelectorAll('.py-example').forEach(function (figure) {
    var button = figure.querySelector('.py-example-run');
    var out = figure.querySelector('.py-example-output');
    button.addEventListener('click', function () {
      if (job) return;
      out.textContent = '';
      out.hidden = false;
      button.disabled = true;
      job = { button: button, out: out, timer: null };
      ensureWorker();
      var stdin = JSON.parse(figure.dataset.stdin || '[]');
      var modules = JSON.parse(figure.dataset.modules || '{}');
      worker.postMessage({ files: { 'main.py': figure.dataset.code }, main: 'main.py', stdin: stdin, echo: true, eofMessage: EOF_MESSAGE, modules: modules });
    });
  });
})();
