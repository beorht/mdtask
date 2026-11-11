// Клиент практической работы «Терминал»: одна страница, последовательность шагов на ОБЩЕЙ файловой
// системе (между шагами ФС не сбрасывается — задания связаны). «Проверить» отправляет накопленный
// журнал команд и id текущего шага; при успехе показывает уведомление и меняет текст на следующий шаг,
// окно и страница остаются на месте. Восстановление ФС после перезагрузки — повтором сохранённого журнала.
(function () {
  'use strict';
  var root = document.getElementById('ltt');
  if (!root || !window.LinuxFS) return;
  var BASE = root.getAttribute('data-base');
  var FS = window.LinuxFS;
  var el = function (id) { return document.getElementById(id); };
  var out = el('ltt-out'), input = el('ltt-input'), promptEl = el('ltt-prompt'), term = el('ltt-terminal');
  var treeEl = el('ltt-tree'), cwdEl = el('ltt-cwd');

  var data = null, state = null, log = [], history = [], hpos = -1, idx = 0;

  function api(path, opts) {
    return fetch(BASE + '/practical/api' + path, Object.assign({ headers: { 'Content-Type': 'application/json' } }, opts))
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); });
  }
  function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }

  // ---- загрузка ----
  api('/me').then(function (res) {
    if (!res.ok) { el('ltt-goal').textContent = (res.j && res.j.error) || 'Ошибка загрузки.'; return; }
    data = res.j;
    el('ltt-sub').textContent = data.title;
    state = FS.createState(data.fs, data.startCwd ? { cwd: FS.resolvePath(FS.createState(data.fs), data.startCwd) } : {});
    // восстановление ФС по сохранённому журналу (без вывода на экран)
    (data.savedLog || []).forEach(function (line) { try { FS.run(state, line); } catch (e) {} log.push(line); });
    promptEl.textContent = FS.prompt(state).replace(/\s$/, '');
    print('Практическая работа «Терминал». Выполняйте команды из задания и нажимайте «Проверить».', 'ltt-note');
    renderTree();
    idx = Math.min(data.currentIndex, data.steps.length - 1);
    if (data.done) { showDone(); } else { showStep(); }
    input.focus();
  });

  function showStep() {
    var s = data.steps[idx];
    el('ltt-num').textContent = (idx + 1) + ' / ' + data.total;
    el('ltt-title').textContent = 'Команда: ' + s.cmd;
    el('ltt-goal').textContent = s.task;
    el('ltt-syntax').innerHTML = '';
    (s.syntax || []).forEach(function (x) { var li = document.createElement('li'); li.textContent = x; el('ltt-syntax').appendChild(li); });
    el('ltt-hint-box').hidden = true;
    el('ltt-progress').innerHTML = 'Шаг <strong>' + (idx + 1) + '</strong> из ' + data.total
      + ' · выполнено ' + data.solvedCount + ' / ' + data.total;
  }
  function showDone() {
    el('ltt-num').textContent = '✓';
    el('ltt-title').textContent = 'Практическая выполнена';
    el('ltt-goal').textContent = 'Все задания пройдены. Молодец!';
    el('ltt-syntax').innerHTML = '';
    el('ltt-progress').innerHTML = 'Выполнено ' + data.total + ' / ' + data.total;
    el('ltt-check').disabled = true;
    el('ltt-hint-btn').disabled = true;
  }

  // ---- терминал ----
  function print(text, cls) {
    var div = document.createElement('div');
    if (cls) div.className = cls;
    div.textContent = text;
    out.appendChild(div);
    term.scrollTop = term.scrollHeight;
  }
  function runLine(line) {
    print(FS.prompt(state) + line, 'ltt-echo');
    var res = FS.run(state, line);
    if (res.cleared) { out.innerHTML = ''; }
    else { if (res.out) print(res.out, 'ltt-ok-line'); if (res.err) print(res.err, 'ltt-err-line'); }
    log.push(line);
    promptEl.textContent = FS.prompt(state).replace(/\s$/, '');
    renderTree();
  }
  function submit() {
    var line = input.value; input.value = '';
    if (line.trim()) { history.push(line); hpos = history.length; }
    runLine(line);
  }
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { submit(); }
    else if (e.key === 'ArrowUp') { if (hpos > 0) { hpos--; input.value = history[hpos]; } e.preventDefault(); }
    else if (e.key === 'ArrowDown') { if (hpos < history.length - 1) { hpos++; input.value = history[hpos]; } else { hpos = history.length; input.value = ''; } e.preventDefault(); }
    else if (e.key === 'l' && e.ctrlKey) { out.innerHTML = ''; e.preventDefault(); }
  });
  term.addEventListener('click', function () { input.focus(); });

  // ---- дерево ----
  function renderTree() {
    var snap = FS.snapshot(state, '/home/student');
    cwdEl.textContent = FS.cwdDisplay(state);
    treeEl.innerHTML = '';
    if (snap) treeEl.appendChild(nodeEl(snap, '/home/student'));
  }
  function nodeEl(node, abspath) {
    var wrap = document.createElement('div');
    wrap.className = 'ltt-node ltt-' + node.type;
    var self = document.createElement('div');
    self.className = 'ltt-node-self' + (abspath === FS.cwdDisplay(state) ? ' is-cwd' : '');
    self.textContent = (node.type === 'dir' ? '📁 ' : '📄 ') + node.name;
    wrap.appendChild(self);
    if (node.type === 'dir' && node.children && node.children.length) {
      var ch = document.createElement('div'); ch.className = 'ltt-children';
      node.children.forEach(function (c) { ch.appendChild(nodeEl(c, abspath === '/' ? '/' + c.name : abspath + '/' + c.name)); });
      wrap.appendChild(ch);
    }
    return wrap;
  }

  // ---- вердикт / уведомление ----
  function verdict(ok, msg, results) {
    var v = el('ltt-verdict');
    v.hidden = false;
    v.className = 'ltt-verdict ' + (ok ? 'is-ok' : 'is-no');
    var html = '<strong>' + (ok ? '✔ Выполнено верно' : '✘ Пока не верно') + '</strong>';
    if (msg) html += '<div>' + esc(msg) + '</div>';
    if (results) html += '<ul>' + results.map(function (r) { return '<li>' + (r.ok ? '✔' : '○') + ' ' + esc(r.label) + '</li>'; }).join('') + '</ul>';
    v.innerHTML = html;
  }

  // ---- управление ----
  el('ltt-clear').addEventListener('click', function () { out.innerHTML = ''; input.focus(); });
  el('ltt-hint-btn').addEventListener('click', function () {
    var s = data && data.steps[idx];
    if (!s || !s.hint) return;
    el('ltt-hint-box').hidden = false;
    el('ltt-hint').textContent = s.hint;
  });
  el('ltt-check').addEventListener('click', function () {
    if (!data || data.done) return;
    var s = data.steps[idx];
    api('/check', { method: 'POST', body: JSON.stringify({ stepId: s.id, log: log }) }).then(function (res) {
      if (!res.ok) { verdict(false, (res.j && res.j.error) || 'Ошибка проверки.'); return; }
      if (res.j.solved) {
        data.solvedCount = Math.min(data.total, data.solvedCount + (s.solved ? 0 : 1));
        s.solved = true;
        if (res.j.done) { verdict(true, 'Все задания выполнены!'); data.done = true; showDone(); return; }
        verdict(true, 'Верно! Переходим к следующему заданию.');
        idx = Math.min(res.j.nextIndex, data.steps.length - 1);
        setTimeout(function () { el('ltt-verdict').hidden = true; showStep(); input.focus(); }, 900);
      } else {
        verdict(false, 'Проверьте задание и выполните недостающее.', res.j.results);
      }
    });
  });
})();
