// «▶ Запустить» у примеров в теории курса JavaScript (src/lib/js-course/theory.js): пример выполняется в браузере
// (js-worker.js + js-runner.js) с заданным вводом, вывод появляется под кодом. «Зависший» пример останавливается
// через 5 секунд.
(function () {
  var LIMIT_MS = 5000;
  var worker = null;
  var job = null;
  var seq = 0;

  function kill() {
    if (worker) worker.terminate();
    worker = null;
  }

  function append(out, text, kind) {
    var span = document.createElement('span');
    if (kind) span.className = 'code-output-' + kind;
    span.textContent = text;
    out.appendChild(span);
  }

  function finish(result) {
    var current = job;
    if (!current) return;
    job = null;
    clearTimeout(current.timer);
    if (result.timeout) append(current.out, '— Остановлено: пример работает слишком долго —\n', 'err');
    else {
      if (result.stdout) append(current.out, result.stdout + '\n');
      if (result.error) append(current.out, result.error + '\n', 'err');
      if (!result.stdout && !result.error) append(current.out, '(пример ничего не вывел)\n', 'info');
    }
    current.button.disabled = false;
  }

  function ensureWorker() {
    if (worker) return;
    worker = new Worker('/js/js-worker.js');
    worker.onmessage = function (e) { if (job && e.data.id === job.id) finish(e.data); };
    worker.onerror = function () { kill(); finish({ error: 'Не удалось запустить пример — обновите страницу.' }); };
  }

  document.querySelectorAll('.py-example').forEach(function (figure) {
    var button = figure.querySelector('.py-example-run');
    var out = figure.querySelector('.py-example-output');
    button.addEventListener('click', function () {
      if (job) return;
      out.textContent = '';
      out.hidden = false;
      button.disabled = true;
      ensureWorker();
      seq += 1;
      job = { id: seq, button: button, out: out, timer: setTimeout(function () { kill(); finish({ timeout: true }); }, LIMIT_MS) };
      worker.postMessage({ id: seq, code: figure.dataset.code, input: JSON.parse(figure.dataset.stdin || '[]') });
    });
  });
})();
