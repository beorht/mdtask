// Предпросмотр веб-приложения контрольной WEB (страница студента и админка): index.html, style.css и script.js
// собираются в один документ и открываются в <iframe sandbox="allow-scripts allow-forms allow-modals"> без
// allow-same-origin — код студента не видит сайт, его вход и cookie. Поэтому настоящий localStorage в окне
// недоступен: его заменяет своё хранилище, которое живёт в странице-владельце (переживает «Запустить» снова,
// как перезагрузку страницы). console.log/ошибки окна передаются наружу через postMessage.
// Приложение одностраничное: над окном — кнопки «◀ ▶» и строка адреса с «#». У документа srcdoc базовый адрес —
// адрес страницы-владельца, поэтому в окно добавляется <base href="about:srcdoc">: иначе ссылка «#add» загрузила бы
// в окно страницу сайта, а history.pushState не работал бы.
(function () {
  // Выполняется внутри окна предпросмотра первым скриптом документа.
  function shim(initial, token, hash) {
    var data = {};
    Object.keys(initial || {}).forEach(function (k) { data[k] = String(initial[k]); });
    function send(type, payload) {
      try { parent.postMessage({ webExam: token, type: type, payload: payload }, '*'); } catch (e) { /* окно закрыто */ }
    }
    function save() { send('storage', data); }
    var storage = {
      getItem: function (k) { k = String(k); return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null; },
      setItem: function (k, v) { data[String(k)] = String(v); save(); },
      removeItem: function (k) { delete data[String(k)]; save(); },
      clear: function () { data = {}; save(); },
      key: function (i) { var keys = Object.keys(data); return i < keys.length ? keys[i] : null; },
      get length() { return Object.keys(data).length; },
    };
    try { Object.defineProperty(window, 'localStorage', { value: storage, configurable: true }); } catch (e) { /* старый браузер */ }
    function show(v) {
      if (typeof v === 'string') return v;
      try { return JSON.stringify(v); } catch (e) { return String(v); }
    }
    ['log', 'info', 'warn', 'error'].forEach(function (level) {
      var orig = console[level];
      console[level] = function () {
        var args = Array.prototype.slice.call(arguments).map(show);
        send('console', { level: level, text: args.join(' ') });
        if (orig) orig.apply(console, arguments);
      };
    });
    window.addEventListener('error', function (e) {
      send('console', { level: 'error', text: (e.message || 'Ошибка') + (e.lineno ? ' (строка ' + e.lineno + ')' : '') });
    });
    window.addEventListener('unhandledrejection', function (e) {
      send('console', { level: 'error', text: 'Необработанная ошибка Promise: ' + show(e.reason && e.reason.message || e.reason) });
    });

    // Навигация: номер записи истории хранится в history.state ({ we: номер, user: состояние студента }),
    // чтобы «◀» не увёл за первую запись окна (дальше — история самой страницы контрольной).
    var stateGet = Object.getOwnPropertyDescriptor(History.prototype, 'state').get;
    var push = history.pushState;
    var replace = history.replaceState;
    var idx = 0;
    var max = 0;
    function raw() { return stateGet.call(history); }
    function ours(st) { return st && typeof st === 'object' && typeof st.we === 'number'; }
    function nav() { send('nav', { hash: location.hash, back: idx > 0, forward: idx < max }); }
    try { replace.call(history, { we: 0, user: null }, '', hash || undefined); } catch (e) { /* нет истории */ }
    try {
      Object.defineProperty(history, 'state', { configurable: true, get: function () { var st = raw(); return ours(st) ? st.user : st; } });
      history.pushState = function (st, title, url) {
        push.call(history, { we: idx + 1, user: st === undefined ? null : st }, title, url);
        idx += 1;
        max = idx;
        nav();
      };
      history.replaceState = function (st, title, url) {
        replace.call(history, { we: idx, user: st === undefined ? null : st }, title, url);
        nav();
      };
    } catch (e) { /* старый браузер */ }
    var redispatch = false;
    window.addEventListener('popstate', function (e) {
      if (redispatch) return;
      var st = raw();
      if (ours(st)) {
        idx = st.we;
      } else {
        // Новая запись после перехода по «#» (ссылка или location.hash).
        idx += 1;
        max = idx;
        replace.call(history, { we: idx, user: null }, '');
      }
      if (ours(e.state)) {
        // Студент получает своё состояние, а не служебную обёртку.
        e.stopImmediatePropagation();
        redispatch = true;
        try { window.dispatchEvent(new PopStateEvent('popstate', { state: e.state.user })); } finally { redispatch = false; }
      }
      nav();
    }, true);
    window.addEventListener('hashchange', nav);
    window.addEventListener('message', function (e) {
      var m = e.data;
      if (e.source !== parent || !m || m.webExam !== token) return;
      if (m.cmd === 'back' && idx > 0) history.back();
      else if (m.cmd === 'forward' && idx < max) history.forward();
    });
    window.addEventListener('DOMContentLoaded', nav);

    window.addEventListener('submit', function (e) {
      setTimeout(function () {
        if (!e.defaultPrevented) send('console', { level: 'warn', text: 'Форма отправлена без preventDefault(): страница перезагрузится.' });
      }, 0);
    });
  }

  function escapeScript(code) {
    return String(code).replace(/<\/script/gi, '<\\/script');
  }

  function insertAt(html, re, piece, atEnd) {
    var m = html.match(re);
    if (!m) return atEnd ? html + piece : piece + html;
    var i = atEnd ? m.index : m.index + m[0].length;
    return html.slice(0, i) + piece + html.slice(i);
  }

  // Один документ из трёх файлов. Ссылки <link href="style.css"> и <script src="script.js"> заменяются
  // их содержимым; если их нет — стили добавляются в <head>, скрипт — в конец <body>.
  function buildDocument(files, store, token, hash) {
    var html = String(files['index.html'] || '');
    var css = String(files['style.css'] || '');
    var js = String(files['script.js'] || '');
    var usedCss = false;
    var usedJs = false;
    html = html.replace(/<link\b[^>]*href\s*=\s*["']\.?\/?style\.css["'][^>]*>/i, function () {
      usedCss = true;
      return '<style>\n' + css.replace(/<\/style/gi, '<\\/style') + '\n</style>';
    });
    html = html.replace(/<script\b([^>]*)\bsrc\s*=\s*["']\.?\/?script\.js["']([^>]*)>\s*<\/script>/i, function (m, a, b) {
      usedJs = true;
      var attrs = a + ' ' + b;
      var isModule = /type\s*=\s*["']module["']/i.test(attrs);
      var deferred = isModule || /\bdefer\b/i.test(attrs);
      var body = deferred && !isModule
        ? 'document.addEventListener("DOMContentLoaded", function () {\n' + js + '\n});'
        : js;
      return '<script' + (isModule ? ' type="module"' : '') + '>\n' + escapeScript(body) + '\n<\/script>';
    });
    var boot = '<base href="about:srcdoc"><script>(' + shim.toString() + ')(' +
      JSON.stringify(store || {}).replace(/</g, '\\u003c') + ', ' + JSON.stringify(token) + ', ' +
      JSON.stringify(normalizeHash(hash)).replace(/</g, '\\u003c') + ');<\/script>';
    html = insertAt(html, /<head\b[^>]*>/i, boot, false);
    if (!/<head\b/i.test(html) && html.indexOf(boot) === -1) html = boot + html;
    if (!usedCss && css.trim()) html = insertAt(html, /<\/head>/i, '<style>\n' + css + '\n</style>', true);
    if (!usedJs && js.trim()) html = insertAt(html, /<\/body>/i, '<script>\n' + escapeScript(js) + '\n<\/script>', true);
    return html;
  }

  // «add», «#add» → «#add»; пусто → ''.
  function normalizeHash(hash) {
    hash = String(hash || '').trim();
    if (!hash || hash === '#') return '';
    return (hash.charAt(0) === '#' ? hash : '#' + hash).replace(/\s+/g, '');
  }

  function button(cls, text, title) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = cls;
    b.textContent = text;
    b.title = title;
    b.setAttribute('aria-label', title);
    return b;
  }

  // Строка над окном: «◀», «▶» (история окна) и адрес «about:srcdoc#…»; Enter в адресе — открыть приложение
  // заново с этим «#», как ввод адреса в браузере.
  function addressBar(frame, onOpen, onBack, onForward) {
    var bar = document.createElement('div');
    bar.className = 'web-nav';
    var back = button('web-nav-btn', '◀', 'Назад');
    var forward = button('web-nav-btn', '▶', 'Вперёд');
    var label = document.createElement('label');
    label.className = 'web-nav-addr';
    var prefix = document.createElement('span');
    prefix.className = 'web-nav-prefix';
    prefix.textContent = 'index.html';
    var input = document.createElement('input');
    input.type = 'text';
    input.spellcheck = false;
    input.autocomplete = 'off';
    input.placeholder = '#раздел';
    input.setAttribute('aria-label', 'Адрес: часть после #');
    var go = button('web-nav-btn', '↵', 'Открыть адрес');
    label.appendChild(prefix);
    label.appendChild(input);
    bar.appendChild(back);
    bar.appendChild(forward);
    bar.appendChild(label);
    bar.appendChild(go);
    frame.parentNode.insertBefore(bar, frame);
    back.disabled = true;
    forward.disabled = true;
    back.addEventListener('click', onBack);
    forward.addEventListener('click', onForward);
    function open() { onOpen(input.value); }
    go.addEventListener('click', open);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); open(); }
    });
    return {
      show: function (nav, force) {
        if (force || document.activeElement !== input) input.value = nav.hash || '';
        back.disabled = !nav.back;
        forward.disabled = !nav.forward;
      },
      value: function () { return input.value; },
    };
  }

  // runner = WebRunner.create(iframe, { onConsole, onStorage, onNav, store })
  function create(frame, opts) {
    opts = opts || {};
    var token = 'we-' + Math.random().toString(36).slice(2);
    var store = opts.store || {};
    var lastFiles = null;
    function send(cmd) {
      try { frame.contentWindow.postMessage({ webExam: token, cmd: cmd }, '*'); } catch (e) { /* окна нет */ }
    }
    function run(files, hash) {
      lastFiles = files;
      // Новое окно на каждый запуск: присваивание srcdoc старому окну добавляло бы записи в историю страницы.
      var next = frame.cloneNode(false);
      next.removeAttribute('src');
      next.srcdoc = buildDocument(files, store, token, hash);
      frame.parentNode.replaceChild(next, frame);
      frame = next;
      if (bar) bar.show({ hash: normalizeHash(hash), back: false, forward: false }, true);
    }
    var bar = opts.addressBar === false ? null : addressBar(frame,
      function (hash) { if (lastFiles) run(lastFiles, hash); },
      function () { send('back'); },
      function () { send('forward'); });
    window.addEventListener('message', function (e) {
      var m = e.data;
      if (!m || m.webExam !== token || e.source !== frame.contentWindow) return;
      if (m.type === 'nav') {
        var nav = { hash: String((m.payload && m.payload.hash) || '').slice(0, 200), back: !!(m.payload && m.payload.back), forward: !!(m.payload && m.payload.forward) };
        if (bar) bar.show(nav);
        if (opts.onNav) opts.onNav(nav);
      } else if (m.type === 'storage') {
        store = m.payload || {};
        if (opts.onStorage) opts.onStorage(store);
      } else if (m.type === 'console' && opts.onConsole) {
        opts.onConsole(m.payload.level, String(m.payload.text || '').slice(0, 2000));
      }
    });
    return {
      // run(files) — как перезагрузка с текущим адресом; run(files, '#add') — открыть с этим «#».
      run: function (files, hash) { run(files, hash === undefined && bar ? bar.value() : hash); },
      store: function () { return store; },
      clearStore: function () { store = {}; if (opts.onStorage) opts.onStorage(store); },
    };
  }

  window.WebRunner = { create: create, buildDocument: buildDocument, normalizeHash: normalizeHash };
})();
