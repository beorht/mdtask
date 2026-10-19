// Итоговая контрольная (src/views/exam/*): what every exam page shares.
//  - the action log of what only the browser sees: leaving the page, switching tabs, focus,
//    paste/copy (with the pasted text), idle time — sent in batches to <exam>/log;
//  - the countdown to the end (at zero: 'exam:timeup' for the code page, then a reload);
//  - answers to the flag questions (stages 1, 2, 5) and the report form (stage 6).
(function () {
  var bar = document.querySelector('[data-exam-bar]');
  if (!bar) return;
  var BASE = bar.dataset.base;
  var STAGE = bar.dataset.stage ? Number(bar.dataset.stage) : null;
  var TASK = bar.dataset.task || null;
  var IDLE_MS = 3 * 60 * 1000;
  var queue = [];

  function post(url, body) {
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'same-origin',
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) {
          var err = new Error(data.error || 'Ошибка сервера (' + res.status + ')');
          err.status = res.status;
          err.data = data;
          throw err;
        }
        return data;
      });
    });
  }

  function flush(beacon) {
    if (!queue.length) return;
    var body = JSON.stringify({ events: queue.splice(0, queue.length) });
    if (beacon && navigator.sendBeacon) {
      navigator.sendBeacon(BASE + '/log', new Blob([body], { type: 'application/json' }));
      return;
    }
    fetch(BASE + '/log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body, credentials: 'same-origin', keepalive: true })
      .catch(function () {});
  }

  function logEvent(type, data) {
    queue.push({ type: type, stage: STAGE, task: TASK, data: data || {}, ts: new Date().toISOString() });
    if (queue.length >= 20) flush(false);
  }

  window.examPost = post;
  window.examLog = logEvent;
  setInterval(function () { flush(false); }, 10000);

  // --- the device, once per browser tab session ---
  try {
    if (!sessionStorage.getItem('examDeviceSent')) {
      sessionStorage.setItem('examDeviceSent', '1');
      logEvent('device_info', {
        platform: navigator.platform || '',
        screen: screen.width + 'x' + screen.height + '@' + (window.devicePixelRatio || 1),
        window: window.innerWidth + 'x' + window.innerHeight,
        cores: navigator.hardwareConcurrency || null,
        memory: navigator.deviceMemory || null,
        touch: navigator.maxTouchPoints || 0,
        language: navigator.language || '',
        timeZone: (Intl.DateTimeFormat().resolvedOptions() || {}).timeZone || '',
      });
    }
  } catch (err) {
    // sessionStorage may be unavailable
  }

  // --- time on the page, tabs, focus ---
  var opened = Date.now();
  window.addEventListener('pagehide', function () {
    logEvent('page_leave', { path: location.pathname, seconds: Math.round((Date.now() - opened) / 1000) });
    flush(true);
  });
  document.addEventListener('visibilitychange', function () {
    logEvent('visibility', { state: document.visibilityState });
    if (document.visibilityState === 'hidden') flush(true);
  });
  var away = false;
  window.addEventListener('blur', function () {
    // Clicking into the terminal frame blurs the page too: that's not leaving it.
    setTimeout(function () {
      var el = document.activeElement;
      if (el && el.tagName === 'IFRAME') return;
      away = true;
      logEvent('blur', {});
    }, 0);
  });
  window.addEventListener('focus', function () {
    if (!away) return;
    away = false;
    logEvent('focus', {});
  });

  // --- paste / copy ---
  function targetName(el) {
    if (!el || !el.closest) return '';
    if (el.closest('.CodeMirror')) return 'editor';
    if (el.closest('[data-stdin]')) return 'stdin';
    if (el.closest('[data-sql]')) return 'sql';
    if (el.closest('.exam-flag')) return 'flag';
    if (el.closest('.exam-report')) return 'report';
    return el.tagName ? el.tagName.toLowerCase() : '';
  }
  function onPaste(type) {
    return function (e) {
      var text = (e.clipboardData && e.clipboardData.getData('text')) || '';
      logEvent(type, { chars: text.length, lines: text ? text.split('\n').length : 0, target: targetName(e.target), text: text.slice(0, 2000) });
    };
  }
  document.addEventListener('paste', onPaste('paste'));
  document.addEventListener('copy', function (e) {
    var text = String(window.getSelection ? window.getSelection() : '');
    logEvent('copy', { chars: text.length, target: targetName(e.target) });
  });
  var frame = document.querySelector('.exam-terminal');
  if (frame) {
    frame.addEventListener('load', function () {
      try {
        frame.contentDocument.addEventListener('paste', onPaste('terminal_paste'));
      } catch (err) {
        // another origin: nothing to listen to
      }
      frame.focus();
    });
  }

  // --- idle time ---
  var lastActive = Date.now();
  var idleSince = null;
  function active() {
    var now = Date.now();
    if (idleSince) {
      logEvent('idle', { seconds: Math.round((now - idleSince) / 1000) });
      idleSince = null;
    }
    lastActive = now;
  }
  ['keydown', 'mousedown', 'mousemove', 'wheel', 'touchstart'].forEach(function (name) {
    document.addEventListener(name, active, { passive: true });
  });
  setInterval(function () {
    if (!idleSince && Date.now() - lastActive > IDLE_MS) idleSince = lastActive;
  }, 15000);

  // --- countdown ---
  var timerEl = bar.querySelector('[data-exam-timer]');
  var ends = Date.parse(bar.dataset.ends);
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function tick() {
    var left = Math.max(0, Math.floor((ends - Date.now()) / 1000));
    timerEl.textContent = pad(Math.floor(left / 3600)) + ':' + pad(Math.floor((left % 3600) / 60)) + ':' + pad(left % 60);
    bar.classList.toggle('is-warning', left < 600);
    if (left === 0) {
      clearInterval(timer);
      logEvent('timer_end', {});
      flush(false);
      var waitFor = [];
      window.dispatchEvent(new CustomEvent('exam:timeup', { detail: { waitFor: waitFor } }));
      Promise.all(waitFor).catch(function () {}).then(function () {
        setTimeout(function () { location.reload(); }, 1500);
      });
    }
  }
  var timer = null;
  if (timerEl) {
    tick();
    timer = setInterval(tick, 1000);
  }

  // --- flag questions ---
  document.querySelectorAll('[data-exam-flag]').forEach(function (form) {
    var msg = form.querySelector('[data-flag-msg]');
    var input = form.querySelector('input[name="answer"]');
    var state = form.querySelector('[data-flag-state]');
    if (!input) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var answer = input.value.trim();
      if (!answer) return;
      var button = form.querySelector('button');
      button.disabled = true;
      post(form.dataset.examFlag, { answer: answer })
        .then(function (data) {
          if (data.ok) {
            var row = form.querySelector('.exam-flag-row');
            var done = document.createElement('p');
            done.className = 'exam-flag-accepted';
            done.textContent = data.already ? 'Ответ уже был принят.' : '✓ Верно, ответ принят: ' + answer;
            row.replaceWith(done);
            msg.textContent = '';
            state.textContent = 'Решено';
            state.className = 'exam-state exam-state-done';
          } else {
            msg.textContent = '✕ Неверно. Попробуйте ещё раз.';
            msg.className = 'exam-flag-msg is-error';
            state.textContent = 'Попыток: ' + data.attempts;
            state.className = 'exam-state exam-state-tried';
            button.disabled = false;
          }
        })
        .catch(function (err) {
          msg.textContent = err.message;
          msg.className = 'exam-flag-msg is-error';
          button.disabled = false;
        });
    });
  });

  // --- report ---
  var report = document.querySelector('[data-exam-report]');
  if (report) {
    var statusEl = report.querySelector('[data-report-status]');
    var saveTimer = null;
    var fields = function () {
      var out = {};
      report.querySelectorAll('textarea').forEach(function (t) { out[t.name] = t.value; });
      return out;
    };
    var save = function (submit) {
      clearTimeout(saveTimer);
      return post(report.dataset.examReport, { fields: fields(), submit: !!submit })
        .then(function () {
          statusEl.textContent = submit ? '📨 Отчёт отправлен. Его можно исправить и отправить заново до конца контрольной.' : 'Черновик сохранён';
        })
        .catch(function (err) { statusEl.textContent = 'Не удалось сохранить: ' + err.message; });
    };
    report.addEventListener('input', function () {
      statusEl.textContent = 'Есть несохранённые изменения…';
      clearTimeout(saveTimer);
      saveTimer = setTimeout(function () { save(false); }, 4000);
    });
    report.addEventListener('submit', function (e) {
      e.preventDefault();
      save(true);
    });
    window.addEventListener('exam:timeup', function (ev) { ev.detail.waitFor.push(save(false)); });
  }
})();
