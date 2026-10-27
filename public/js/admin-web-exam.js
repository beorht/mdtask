// Админка, работа студента на контрольной WEB (src/views/admin/web-exam-student.ejs): запуск его приложения
// в изолированном окне (web-runner.js) — последнее сохранение или любой снимок кода.
(function () {
  var frame = document.querySelector('[data-frame]');
  if (!frame || !window.WebRunner) return;
  var consoleEl = document.querySelector('[data-console]');
  var snapshotSel = document.querySelector('[data-snapshot]');
  var snapshotUrl = document.querySelector('[data-snapshot-url]').dataset.snapshotUrl;
  var latest = JSON.parse(document.getElementById('webFiles').textContent);
  var files = latest;
  var lines = 0;

  var runner = window.WebRunner.create(frame, {
    onConsole: function (level, text) {
      if (!lines) consoleEl.textContent = '';
      lines += 1;
      consoleEl.textContent += (level === 'log' || level === 'info' ? '' : level + ': ') + text + '\n';
    },
  });

  function show(f) {
    document.querySelectorAll('[data-file-view]').forEach(function (pre) {
      pre.textContent = f[pre.dataset.fileView] || '(пусто)';
    });
  }

  function run() {
    lines = 0;
    consoleEl.textContent = '(консоль пуста)';
    runner.run(files);
  }

  snapshotSel.addEventListener('change', function () {
    var name = snapshotSel.value;
    if (!name) {
      files = latest;
      show(files);
      run();
      return;
    }
    fetch(snapshotUrl + encodeURIComponent(name), { credentials: 'same-origin' })
      .then(function (res) { return res.json(); })
      .then(function (snap) {
        files = snap.files || {};
        show(files);
        run();
      });
  });
  document.querySelector('[data-run]').addEventListener('click', run);
  document.querySelector('[data-reset]').addEventListener('click', function () { runner.clearStore(); run(); });
  run();
})();
