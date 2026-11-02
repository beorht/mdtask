// Клиент тренажёра «Linux Terminal Trainer»: 3-панельный UI (задание · терминал · дерево файлов) на
// движке public/js/linux-fs.js. Команда выполняется в браузере, дерево обновляется сразу, «Проверить»
// отправляет журнал команд на сервер (он перепроверяет итог). Визуальный режим показывает «до/после».
(function () {
  'use strict';
  var root = document.getElementById('ltt');
  if (!root || !window.LinuxFS) return;
  var BASE = root.getAttribute('data-base');
  var ID = root.getAttribute('data-mission');
  var FS = window.LinuxFS;

  var el = function (id) { return document.getElementById(id); };
  var out = el('ltt-out'), input = el('ltt-input'), promptEl = el('ltt-prompt'), term = el('ltt-terminal');
  var treeEl = el('ltt-tree'), cwdEl = el('ltt-cwd'), visualEl = el('ltt-visual');

  var mission = null, state = null, log = [], history = [], hpos = -1, hintLevel = 0, visual = false;

  function api(path, opts) {
    return fetch(BASE + '/api/' + ID + path, Object.assign({ headers: { 'Content-Type': 'application/json' } }, opts))
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); });
  }

  // ---- загрузка миссии ----
  api('/me').then(function (res) {
    if (!res.ok) { out.textContent = (res.j && res.j.error) || 'Ошибка загрузки миссии.'; return; }
    mission = res.j;
    el('ltt-sub').textContent = mission.moduleNumber + '.' + mission.number + '. ' + mission.title;
    el('ltt-num').textContent = mission.moduleNumber + '.' + mission.number;
    el('ltt-title').textContent = mission.title;
    el('ltt-intro').textContent = mission.intro;
    el('ltt-goal').textContent = mission.task;
    (mission.syntax || []).forEach(function (s) { var li = document.createElement('li'); li.textContent = s; el('ltt-syntax').appendChild(li); });
    if (mission.solved) verdict(true, 'Миссия уже пройдена. Можно повторить.');
    reset();
    api('/event', { method: 'POST', body: JSON.stringify({ type: 'open' }) });
  });

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
    var before = visual ? paths(state) : null;
    var res = FS.run(state, line);
    if (res.cleared) { out.innerHTML = ''; }
    else {
      if (res.out) print(res.out, 'ltt-ok-line');
      if (res.err) print(res.err, 'ltt-err-line');
    }
    log.push(line);
    promptEl.textContent = FS.prompt(state).replace(/\s$/, '');
    renderTree();
    if (visual) showVisual(before, paths(state), line);
  }

  function submit() {
    var line = input.value;
    input.value = '';
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

  // ---- дерево файлов ----
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
      var ch = document.createElement('div');
      ch.className = 'ltt-children';
      node.children.forEach(function (c) { ch.appendChild(nodeEl(c, abspath === '/' ? '/' + c.name : abspath + '/' + c.name)); });
      wrap.appendChild(ch);
    }
    return wrap;
  }

  // ---- визуальный режим «до/после» ----
  function paths(st) {
    var set = {};
    (function walk(n, p) {
      if (!n) return;
      if (n.type === 'file') { set[p] = 'file'; return; }
      set[p] = 'dir';
      (n.children || []).forEach(function (c) { walk(c, p + '/' + c.name); });
    })(FS.snapshot(st, '/home/student'), '/home/student');
    return set;
  }
  function showVisual(before, after, line) {
    if (!before) return;
    var added = Object.keys(after).filter(function (p) { return !(p in before); });
    var removed = Object.keys(before).filter(function (p) { return !(p in after); });
    if (!added.length && !removed.length) { visualEl.hidden = true; return; }
    visualEl.hidden = false;
    visualEl.innerHTML = '<div class="ltt-visual-title">Изменения после: ' + esc(line) + '</div>'
      + added.map(function (p) { return '<div class="ltt-add">+ ' + esc(p) + '</div>'; }).join('')
      + removed.map(function (p) { return '<div class="ltt-rem">− ' + esc(p) + '</div>'; }).join('');
  }
  function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }

  // ---- управление ----
  function reset() {
    state = FS.createState(mission.fs, mission.startCwd ? { cwd: FS.resolvePath(FS.createState(mission.fs), mission.startCwd) } : {});
    log = []; out.innerHTML = ''; visualEl.hidden = true;
    promptEl.textContent = FS.prompt(state).replace(/\s$/, '');
    print('Добро пожаловать в Linux Terminal Trainer. Выполняйте команды из задания.', 'ltt-note');
    renderTree(); input.focus();
  }
  function verdict(ok, msg, results) {
    var v = el('ltt-verdict');
    v.hidden = false;
    v.className = 'ltt-verdict ' + (ok ? 'is-ok' : 'is-no');
    var html = '<strong>' + (ok ? '✔ Миссия пройдена!' : '✘ Пока не всё') + '</strong>';
    if (msg) html += '<div>' + esc(msg) + '</div>';
    if (results) html += '<ul>' + results.map(function (r) { return '<li>' + (r.ok ? '✔' : '○') + ' ' + esc(r.label) + '</li>'; }).join('') + '</ul>';
    v.innerHTML = html;
  }

  el('ltt-reset').addEventListener('click', function () { reset(); api('/event', { method: 'POST', body: JSON.stringify({ type: 'reset' }) }); });
  el('ltt-clear').addEventListener('click', function () { out.innerHTML = ''; input.focus(); });
  el('ltt-hint-btn').addEventListener('click', function () {
    if (!mission || !mission.hints || !mission.hints.length) return;
    var box = el('ltt-hint-box'); box.hidden = false;
    el('ltt-hint').textContent = mission.hints[Math.min(hintLevel, mission.hints.length - 1)];
    if (hintLevel < mission.hints.length - 1) hintLevel++;
    api('/hint', { method: 'POST', body: '{}' });
  });
  el('ltt-visual-btn').addEventListener('click', function () {
    visual = !visual; this.setAttribute('aria-pressed', String(visual));
    this.classList.toggle('is-on', visual); visualEl.hidden = true;
  });
  el('ltt-check').addEventListener('click', function () {
    api('/check', { method: 'POST', body: JSON.stringify({ log: log }) }).then(function (res) {
      if (!res.ok) { verdict(false, (res.j && res.j.error) || 'Ошибка проверки.'); return; }
      verdict(res.j.solved, res.j.solved ? 'Отлично! Можно переходить к следующей миссии.' : 'Проверьте задание и выполните недостающее.', res.j.results);
    });
  });
})();
