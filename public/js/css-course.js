// Практическая работа предмета «Web-разработка: CSS» (src/views/css-course/practice.ejs, API src/routes/css-course.js).
// Задания темы приходят из /api/<тема>/me; разметку видно во вкладке «Разметка», студент пишет только CSS. Вид с его
// CSS обновляется на лету, образец рисуется из эталонного CSS (код образца не показывается). «Проверить» —
// window.CssCheck (public/js/css-check.js); итог уходит на сервер, он проверяет правила задания и записывает попытку.
// Вставка в редактор заблокирована и записывается; уход со страницы записывается.
(function () {
  const root = document.getElementById('cssc');
  if (!root) return;
  const topicKey = root.dataset.topic;
  const base = root.dataset.base;
  const api = base + '/api/' + topicKey;
  const WIDTH_NAMES = { 375: 'Телефон', 768: 'Планшет', 1200: 'Компьютер' };
  const STATE_NAMES = { hover: 'наведение мыши', focus: 'фокус', active: 'нажатие', 'focus-within': 'фокус внутри', 'focus-visible': 'фокус', checked: 'отметка' };

  const $ = (id) => document.getElementById(id);
  const els = {
    nav: $('csscNav'), widths: $('csscWidths'), student: $('csscStudent'), expected: $('csscExpected'),
    title: $('csscTitle'), text: $('csscText'), rules: $('csscRules'), states: $('csscStates'), statesNote: $('csscStatesNote'),
    editor: $('csscEditor'), html: $('csscHtml'), check: $('csscCheck'), result: $('csscResult'), saved: $('csscSaved'),
  };

  let data = null;
  let task = null;
  let width = 800;
  let cm = null;
  let htmlView = null;
  let suppress = false;
  const solved = new Set();
  const drafts = {};

  const decode = (b64) => new TextDecoder().decode(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)));

  function post(body) {
    return fetch(api + '/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(body) })
      .then((r) => r.json().then((j) => (r.ok ? j : Promise.reject(new Error(j.error || 'Ошибка сервера')))));
  }

  // --- Черновики: на этом компьютере (localStorage), иначе — последняя попытка с сервера. ---
  const draftKey = (id) => 'css-course:' + id;
  function loadDraft(id) {
    try { const v = localStorage.getItem(draftKey(id)); if (v !== null) return v; } catch (e) { /* без хранилища */ }
    return drafts[id] || '';
  }
  function saveDraft(id, value) {
    try { localStorage.setItem(draftKey(id), value); } catch (e) { /* без хранилища */ }
  }

  // --- Окна вида: iframe нужной ширины, уменьшенный под колонку. ---
  function makeView(holder) {
    const frame = document.createElement('iframe');
    frame.setAttribute('sandbox', 'allow-same-origin');
    frame.setAttribute('title', holder === els.student ? 'Ваш результат' : 'Как должно получиться');
    holder.replaceChildren(frame);
    return frame;
  }
  const views = { student: null, expected: null };

  function render(which, css) {
    const holder = which === 'student' ? els.student : els.expected;
    const frame = views[which] || (views[which] = makeView(holder));
    frame.onload = () => fit(holder, frame);
    frame.srcdoc = window.CssCheck.documentHtml(task.html, css);
  }

  function fit(holder, frame) {
    const avail = holder.clientWidth || width;
    const scale = Math.min(1, avail / width);
    let height = 300;
    try { height = Math.max(120, Math.min(1400, frame.contentDocument.documentElement.scrollHeight)); } catch (e) { /* нет доступа */ }
    frame.style.width = width + 'px';
    frame.style.height = height + 'px';
    frame.style.transform = 'scale(' + scale + ')';
    // Узкое окно (телефон) — по центру колонки.
    frame.style.left = Math.max(0, Math.floor((avail - width * scale) / 2)) + 'px';
    holder.style.height = Math.ceil(height * scale) + 'px';
  }

  function refit() {
    if (views.student) fit(els.student, views.student);
    if (views.expected) fit(els.expected, views.expected);
  }

  let timer = null;
  function scheduleStudent() {
    clearTimeout(timer);
    timer = setTimeout(() => render('student', cm.getValue()), 250);
  }

  // --- Задание ---
  function showWidths() {
    els.widths.replaceChildren();
    els.widths.hidden = task.widths.length < 2;
    task.widths.forEach((w) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'cssc-width' + (w === width ? ' is-active' : '');
      b.textContent = (WIDTH_NAMES[w] ? WIDTH_NAMES[w] + ' · ' : '') + w + 'px';
      b.addEventListener('click', () => {
        width = w;
        showWidths();
        render('student', cm.getValue());
        render('expected', decode(task.ref));
      });
      els.widths.append(b);
    });
  }

  function showNav() {
    els.nav.replaceChildren(...data.tasks.map((t) => {
      const a = document.createElement('button');
      a.type = 'button';
      a.className = 'cssc-num' + (t.id === task.id ? ' is-active' : '') + (solved.has(t.id) ? ' is-done' : '');
      a.textContent = solved.has(t.id) ? '✓' : String(t.number);
      a.title = t.number + '. ' + t.title;
      a.addEventListener('click', () => open(t.id));
      return a;
    }));
  }

  function open(id) {
    if (task && cm) saveDraft(task.id, cm.getValue());
    task = data.tasks.find((t) => t.id === id) || data.tasks[0];
    width = task.widths[task.widths.length - 1];
    try { history.replaceState(null, '', '#' + task.id); } catch (e) { /* без истории */ }
    els.title.textContent = task.number + '. ' + task.title;
    els.text.textContent = task.description;
    const rules = [];
    if (task.require.length) rules.push('Обязательно: ' + task.require.map((r) => '«' + r + '»').join(', ') + '.');
    if (task.forbid.length) rules.push('Нельзя: ' + task.forbid.map((r) => '«' + r + '»').join(', ') + '.');
    els.rules.replaceChildren(...rules.map((r) => Object.assign(document.createElement('li'), { textContent: r })));
    els.rules.hidden = !rules.length;
    const states = task.states.map((s) => STATE_NAMES[s.state] + ' на ' + s.selector);
    els.states.textContent = states.length ? 'Проверяется и в состояниях: ' + states.join('; ') + '. Наведите мышь на образец, чтобы увидеть, как должно быть.' : '';
    els.states.hidden = !states.length;
    els.statesNote.hidden = !states.length;
    els.result.hidden = true;
    suppress = true;
    cm.setValue(loadDraft(task.id));
    cm.clearHistory();
    suppress = false;
    htmlView.setValue(task.html);
    showWidths();
    showNav();
    render('student', cm.getValue());
    render('expected', decode(task.ref));
    post({ type: 'open', exerciseId: task.id }).catch(() => {});
  }

  function showResult(kind, title, items) {
    els.result.className = 'cssc-result cssc-result-' + kind;
    const h = document.createElement('strong');
    h.textContent = title;
    const list = document.createElement('ul');
    (items || []).forEach((p) => {
      const li = document.createElement('li');
      li.textContent = [p.where, p.el, p.text].filter(Boolean).join(' · ');
      list.append(li);
    });
    els.result.replaceChildren(h, ...(items && items.length ? [list] : []));
    els.result.hidden = false;
  }

  async function check() {
    const css = cm.getValue();
    saveDraft(task.id, css);
    els.check.disabled = true;
    els.check.textContent = 'Проверяю…';
    try {
      const verdict = await window.CssCheck.check(task, css, decode(task.ref));
      const res = await post({ type: 'attempt', exerciseId: task.id, status: verdict.ok ? 'success' : 'mismatch', code: css });
      if (res.status === 'success') {
        solved.add(task.id);
        showNav();
        showResult('ok', '✓ Совпадает с образцом — задание решено!');
      } else if (res.status === 'rules') {
        showResult('warn', res.message || 'Вид совпал, но правила задания не выполнены.');
      } else {
        showResult('bad', 'Пока не как в образце. Что отличается:', verdict.problems);
      }
    } catch (err) {
      showResult('bad', err.message || 'Не удалось проверить — обновите страницу.');
    } finally {
      els.check.disabled = false;
      els.check.textContent = '✓ Проверить';
    }
  }

  // --- Редакторы ---
  function setupEditors() {
    cm = window.CodeMirror(els.editor, {
      mode: 'css', theme: 'material-darker', lineNumbers: true, indentUnit: 2, tabSize: 2,
      autoCloseBrackets: true, matchBrackets: true, lineWrapping: true,
      extraKeys: { 'Ctrl-Enter': check, 'Cmd-Enter': check },
    });
    cm.on('beforeChange', (instance, change) => {
      if (change.origin === 'paste' || change.origin === 'drop') {
        change.cancel();
        post({ type: 'paste', exerciseId: task.id, kind: change.origin === 'drop' ? 'drop' : 'paste' }).catch(() => {});
        els.saved.textContent = 'Вставка отключена — пишите CSS сами.';
      }
    });
    cm.on('change', () => {
      if (suppress) return;
      els.saved.textContent = '';
      saveDraft(task.id, cm.getValue());
      scheduleStudent();
    });
    htmlView = window.CodeMirror(els.html, { mode: 'htmlmixed', theme: 'material-darker', lineNumbers: true, readOnly: true, lineWrapping: true });
    document.querySelectorAll('.cssc-tab').forEach((tab) => tab.addEventListener('click', () => {
      const html = tab.dataset.tab === 'html';
      document.querySelectorAll('.cssc-tab').forEach((t) => { t.classList.toggle('is-active', t === tab); t.setAttribute('aria-selected', String(t === tab)); });
      els.editor.hidden = html;
      els.html.hidden = !html;
      (html ? htmlView : cm).refresh();
    }));
    els.check.addEventListener('click', check);
  }

  // --- Уход со страницы ---
  let hiddenAt = null;
  document.addEventListener('visibilitychange', () => {
    if (!task) return;
    if (document.hidden) hiddenAt = Date.now();
    else if (hiddenAt) {
      post({ type: 'away', exerciseId: task.id, ms: Date.now() - hiddenAt }).catch(() => {});
      hiddenAt = null;
    }
  });
  window.addEventListener('resize', () => { clearTimeout(refit.t); refit.t = setTimeout(refit, 150); });

  fetch(api + '/me', { credentials: 'same-origin' })
    .then((r) => r.json().then((j) => (r.ok ? j : Promise.reject(new Error(j.error || 'Ошибка')))))
    .then((json) => {
      data = json;
      json.progress.solved.forEach((id) => solved.add(id));
      Object.assign(drafts, json.progress.drafts || {});
      setupEditors();
      const fromHash = location.hash.slice(1);
      const first = data.tasks.find((t) => t.id === fromHash) || data.tasks.find((t) => !solved.has(t.id)) || data.tasks[0];
      open(first.id);
    })
    .catch((err) => { els.title.textContent = err.message; });
})();
