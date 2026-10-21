// Защита заданий ИБ от решения «через нейросеть» (терминал, страница задания, детектор).
// window.IB_GUARD = { task, clip, log } задаёт сервер (src/lib/ib-guard.js).
//  - вставка (Ctrl+V, Shift+Insert, меню, перетаскивание) отключена везде, кроме полей логина и пароля;
//  - к скопированному тексту добавляется абзац-ловушка: если его вставят в чат нейросети, её ответ
//    будет содержать характерную ошибку, по которой преподаватель увидит это в админке;
//  - ритм набора в терминале: длинная команда, появившаяся без нажатий клавиш или набранная быстрее
//    25 знаков в секунду без единого исправления, записывается (autotype) — это сигнал, а не запрет;
//  - попытки вставки, копирование, уход со страницы и autotype отправляются на сервер пачками.
(function () {
  var cfg = window.IB_GUARD;
  if (!cfg) return;
  var ALLOW_PASTE = ['user-input', 'pass-input'];
  var queue = [];
  var noticeTimer = null;

  function flush(beacon) {
    if (!queue.length) return;
    var body = JSON.stringify({ events: queue.splice(0, queue.length) });
    if (beacon && navigator.sendBeacon) {
      navigator.sendBeacon(cfg.log, new Blob([body], { type: 'application/json' }));
      return;
    }
    fetch(cfg.log, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body, credentials: 'same-origin', keepalive: true })
      .catch(function () {});
  }

  function report(type, data) {
    queue.push({ type: type, data: data || {} });
    if (queue.length >= 10) flush(false);
  }
  setInterval(function () { flush(false); }, 15000);

  function where(target) {
    if (!target || !target.closest) return 'page';
    if (target.closest('.CodeMirror')) return 'editor';
    return target.id || target.tagName.toLowerCase();
  }

  function notice(text) {
    var el = document.getElementById('ib-guard-notice');
    if (!el) {
      el = document.createElement('div');
      el.id = 'ib-guard-notice';
      el.setAttribute('role', 'status');
      el.style.cssText = 'position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:9999;' +
        'background:#7f1d1d;color:#fff;padding:8px 14px;border-radius:6px;font:14px/1.4 system-ui,sans-serif;' +
        'max-width:90vw;box-shadow:0 4px 12px rgba(0,0,0,.3)';
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.hidden = false;
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(function () { el.hidden = true; }, 3500);
  }

  function allowed(target) {
    return target && ALLOW_PASTE.indexOf(target.id) !== -1;
  }

  document.addEventListener('paste', function (e) {
    if (allowed(e.target)) return;
    var text = (e.clipboardData && e.clipboardData.getData('text')) || '';
    e.preventDefault();
    e.stopImmediatePropagation();
    report('paste_blocked', { chars: text.length, lines: text ? text.split('\n').length : 0, where: where(e.target) });
    notice('Вставка в этом задании отключена — набирайте сами. Попытка записана.');
  }, true);

  document.addEventListener('drop', function (e) {
    if (allowed(e.target)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    report('drop_blocked', { where: where(e.target) });
    notice('Перетаскивание текста в этом задании отключено.');
  }, true);

  document.addEventListener('copy', function (e) {
    var sel = String(window.getSelection ? window.getSelection() : '');
    if (e.target && (e.target.value !== undefined) && typeof e.target.selectionStart === 'number') {
      sel = e.target.value.slice(e.target.selectionStart, e.target.selectionEnd) || sel;
    }
    report('copy', { chars: sel.length, where: where(e.target) });
    if (!sel || !cfg.clip || !e.clipboardData) return;
    e.clipboardData.setData('text/plain', sel + '\n\n' + cfg.clip);
    e.preventDefault();
  }, true);

  // Ритм набора строки терминала (#term-input). История (↑/↓) и Tab вставляют текст без нажатий —
  // такие строки не оцениваются.
  var AUTOTYPE_MIN_CHARS = 25;
  var AUTOTYPE_CPS = 25;
  var line = null;
  function resetLine() { line = { first: 0, keys: 0, edits: 0, recalled: false }; }
  resetLine();
  document.addEventListener('keydown', function (e) {
    var t = e.target;
    if (!t || t.id !== 'term-input') return;
    if (e.key === 'Enter') {
      var chars = (t.value || '').length;
      if (chars >= AUTOTYPE_MIN_CHARS && !line.recalled) {
        var ms = line.first ? Date.now() - line.first : 0;
        var cps = ms > 0 ? (chars * 1000) / ms : Infinity;
        var missing = chars - line.keys;
        if (missing > 10 || (cps > AUTOTYPE_CPS && line.edits === 0)) {
          report('autotype', { chars: chars, ms: ms, keys: line.keys, edits: line.edits });
        }
      }
      resetLine();
      return;
    }
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'Tab') line.recalled = true;
    else if (e.key === 'Backspace' || e.key === 'Delete') line.edits += 1;
    else if (e.key && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (!line.first) line.first = Date.now();
      line.keys += 1;
    }
  }, true);

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') {
      report('hidden', {});
      flush(true);
    }
  });
  window.addEventListener('pagehide', function () { flush(true); });
})();
