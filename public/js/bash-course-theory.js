// Запуск примеров в теории предмета «Bash: скрипты в Linux» (блоки ```bash run). Каждый пример — .py-example с
// data-code, data-stdin, data-args; кнопка «▶ Запустить» выполняет код движком public/js/bash-engine.js и
// показывает вывод. Всё в браузере, без сервера.
(function () {
  if (!window.BashEngine) return;
  var MAX_OUTPUT = 20000;
  function clip(s) { s = String(s == null ? '' : s); return s.length > MAX_OUTPUT ? s.slice(0, MAX_OUTPUT) + '\n…' : s; }
  document.querySelectorAll('.py-example').forEach(function (fig) {
    var btn = fig.querySelector('.py-example-run');
    var out = fig.querySelector('.py-example-output');
    if (!btn || !out) return;
    btn.addEventListener('click', function () {
      var code = fig.dataset.code || '';
      var stdin = [];
      var args = [];
      try { stdin = JSON.parse(fig.dataset.stdin || '[]'); } catch (e) {}
      try { args = JSON.parse(fig.dataset.args || '[]'); } catch (e) {}
      var r;
      try { r = window.BashEngine.run(code, { args: args, stdin: stdin.length ? stdin.join('\n') + '\n' : '' }); }
      catch (e) { out.hidden = false; out.textContent = 'Ошибка: ' + (e && e.message); return; }
      var text = clip(r.stdout);
      if (r.stderr) text += (text ? '\n' : '') + '[stderr] ' + clip(r.stderr);
      out.hidden = false;
      out.textContent = text || '(нет вывода)';
    });
  });
})();
