// Итоговая контрольная, задания 4.1–4.4 (src/views/exam/sql.ejs): «Выполнить» shows the result
// on a fresh copy of the database, «Проверить» also says whether it is right. The query is
// autosaved; every run is logged by the server.
(function () {
  var root = document.getElementById('examSql');
  if (!root) return;
  var post = window.examPost;
  var area = root.querySelector('[data-sql]');
  var statusEl = root.querySelector('[data-status]');
  var resultEl = root.querySelector('[data-result]');
  var chipEl = document.querySelector('[data-exam-chip]');
  var runBtn = root.querySelector('[data-action="run"]');
  var checkBtn = root.querySelector('[data-action="check"]');
  var busy = false;
  var saveTimer = null;

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function saveDraft() {
    clearTimeout(saveTimer);
    return post(root.dataset.draftUrl, { code: area.value }).catch(function () {});
  }

  area.addEventListener('input', function () {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveDraft, 4000);
  });
  area.addEventListener('keydown', function (e) {
    if (e.key === 'Tab' && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault();
      area.setRangeText('    ', area.selectionStart, area.selectionEnd, 'end');
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      send(e.shiftKey);
    }
  });

  function table(columns, rows) {
    var wrap = el('div', 'sql-table-wrap');
    var t = el('table', 'sql-result-table');
    var head = el('tr');
    columns.forEach(function (c) { head.appendChild(el('th', '', c)); });
    var thead = el('thead');
    thead.appendChild(head);
    t.appendChild(thead);
    var body = el('tbody');
    rows.forEach(function (r) {
      var tr = el('tr');
      columns.forEach(function (c) { tr.appendChild(el('td', '', r[c] === null ? 'NULL' : String(r[c]))); });
      body.appendChild(tr);
    });
    t.appendChild(body);
    wrap.appendChild(t);
    return wrap;
  }

  function show(data, check) {
    resultEl.textContent = '';
    if (!data.success) {
      resultEl.appendChild(el('div', 'sql-alert sql-alert-error', '✕ Ошибка: ' + data.error));
      return;
    }
    if (check) {
      resultEl.appendChild(el('div', 'sql-alert ' + (data.isCorrect ? 'sql-alert-success' : 'sql-alert-error'),
        data.isCorrect ? '✓ Верно! Задание засчитано.' : data.notice ? '✕ Не засчитано: ' + data.notice : '✕ Результат не совпадает с ожидаемым.'));
      if (data.isCorrect && chipEl) { chipEl.textContent = 'Решено'; chipEl.className = 'sql-chip exam-state-done'; }
    }
    if (data.stateCaption) resultEl.appendChild(el('p', 'sql-result-count', 'Изменено строк: ' + (data.changes || 0) + '. Состояние таблицы после запроса (то, что проверяется):'));
    else if (typeof data.changes === 'number' && !data.columns.length) resultEl.appendChild(el('p', 'sql-result-count', 'Изменено строк: ' + data.changes));
    else resultEl.appendChild(el('p', 'sql-result-count', 'Строк в результате: ' + data.rowCount));
    if (data.columns && data.columns.length) resultEl.appendChild(table(data.columns, data.rows));
  }

  function send(check) {
    if (busy || !runBtn) return;
    if (!area.value.trim()) { statusEl.textContent = 'Введите запрос.'; return; }
    busy = true;
    runBtn.disabled = checkBtn.disabled = true;
    statusEl.textContent = check ? 'Проверяю…' : 'Выполняю…';
    clearTimeout(saveTimer);
    post(root.dataset.url, { sql: area.value, check: !!check })
      .then(function (data) { show(data, check); statusEl.textContent = ''; })
      .catch(function (err) { statusEl.textContent = err.message; })
      .then(function () {
        busy = false;
        runBtn.disabled = checkBtn.disabled = false;
      });
  }

  if (runBtn) runBtn.addEventListener('click', function () { send(false); });
  if (checkBtn) checkBtn.addEventListener('click', function () { send(true); });
})();
