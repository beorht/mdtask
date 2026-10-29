// Запуск программы студента в курсе «JavaScript: от синтаксиса до DOM» (src/lib/js-course): один и тот же код работает
// в браузере (public/js/js-worker.js — Web Worker без доступа к странице) и в Node при сборке эталонов
// (scripts/js-course/build.js), поэтому вывод у студента и у эталона совпадает символ в символ.
//   input()       — следующая строка ввода теста (строки кончились — ошибка);
//   console.log   — вывод: строки как есть, массивы / объекты / Map / Set — в одном предсказуемом виде (format);
//   setTimeout / setInterval / Promise / async-await — таймеры на «виртуальном» времени: программа не ждёт
//                   по-настоящему, а порядок срабатывания всегда одинаковый;
//   fetch         — учебный API на самом сайте (без интернета): /api/cities, /api/weather?city=, /api/rates (ключ),
//                   /api/students/<id>, /api/notes (GET/POST).
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.JsRunner = api;
})(typeof self !== 'undefined' ? self : typeof window !== 'undefined' ? window : null, () => {
  const MAX_OUTPUT = 20000;
  const MAX_TIMERS = 20000;
  const MAX_DEPTH = 4;

  // ─── Вывод ────────────────────────────────────────────────────────────────────────────────────────────
  function quote(s) {
    return "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n') + "'";
  }

  function format(value, depth = 0, seen = new Set(), nested = false) {
    const t = typeof value;
    if (t === 'string') return nested ? quote(value) : value;
    if (t === 'number') return Object.is(value, -0) ? '-0' : String(value);
    if (t === 'bigint') return `${value}n`;
    if (t === 'boolean' || value === undefined || value === null) return String(value);
    if (t === 'symbol') return value.toString();
    if (t === 'function') {
      if (/^class\b/.test(Function.prototype.toString.call(value))) return `[class ${value.name || '(anonymous)'}]`;
      return value.name ? `[Function: ${value.name}]` : '[Function (anonymous)]';
    }
    if (seen.has(value)) return '[Circular]';
    if (value instanceof Error) return `${value.name}: ${value.message}`;
    if (value instanceof Date) return isNaN(value) ? 'Invalid Date' : value.toISOString();
    if (value instanceof RegExp) return String(value);
    if (depth >= MAX_DEPTH) return Array.isArray(value) ? '[Array]' : '[Object]';
    seen.add(value);
    try {
      const inner = (v) => format(v, depth + 1, seen, true);
      if (Array.isArray(value)) {
        if (!value.length) return '[]';
        const items = [];
        for (let i = 0; i < value.length; i += 1) items.push(i in value ? inner(value[i]) : '<empty>');
        return `[ ${items.join(', ')} ]`;
      }
      if (value instanceof Map) {
        if (!value.size) return 'Map(0) {}';
        return `Map(${value.size}) { ${[...value].map(([k, v]) => `${inner(k)} => ${inner(v)}`).join(', ')} }`;
      }
      if (value instanceof Set) {
        if (!value.size) return 'Set(0) {}';
        return `Set(${value.size}) { ${[...value].map(inner).join(', ')} }`;
      }
      if (typeof value.then === 'function') return 'Promise { … }';
      const keys = Object.keys(value);
      const name = value.constructor && value.constructor !== Object && value.constructor.name ? value.constructor.name + ' ' : '';
      if (!keys.length) return `${name}{}`;
      const key = (k) => (/^[A-Za-z_$][\w$]*$/.test(k) ? k : quote(k));
      return `${name}{ ${keys.map((k) => `${key(k)}: ${inner(value[k])}`).join(', ')} }`;
    } finally {
      seen.delete(value);
    }
  }

  // ─── Учебный API (как в курсе Python: content/python-course/shims/requests.py) ────────────────────────
  const API_KEYS = new Set(['edu-key-2026', 'demo-key-123']);
  const WEATHER = {
    'Ташкент': { temp: 24, sky: 'ясно', wind: 3 },
    'Самарканд': { temp: 21, sky: 'облачно', wind: 5 },
    'Бухара': { temp: 27, sky: 'ясно', wind: 2 },
    'Нукус': { temp: 18, sky: 'дождь', wind: 7 },
    'Фергана': { temp: 22, sky: 'облачно', wind: 4 },
    'Андижан': { temp: 23, sky: 'ясно', wind: 3 },
  };
  const RATES = { USD: { EUR: 0.92, RUB: 92.5, UZS: 12650 }, EUR: { USD: 1.09, RUB: 100.6, UZS: 13760 }, RUB: { USD: 0.0108, EUR: 0.0099, UZS: 136.8 } };
  const STUDENTS = { 1: { id: 1, name: 'Аня', group: 'web-2', scores: [5, 4, 5] }, 2: { id: 2, name: 'Бек', group: 'web-2', scores: [3, 4, 4] }, 3: { id: 3, name: 'Лола', group: 'web-1', scores: [5, 5, 4] } };

  function makeFetch() {
    const notes = [];
    function response(status, body) {
      return {
        ok: status >= 200 && status < 300,
        status,
        json: () => Promise.resolve(JSON.parse(JSON.stringify(body))),
        text: () => Promise.resolve(JSON.stringify(body)),
      };
    }
    return function fetch(url, options = {}) {
      return Promise.resolve().then(() => {
        const u = new URL(String(url), 'http://api.edu');
        if (u.hostname !== 'api.edu') throw new TypeError('Failed to fetch: в учебной сети доступен только http://api.edu');
        const method = (options.method || 'GET').toUpperCase();
        const headers = options.headers || {};
        const p = u.pathname;
        if (p === '/cities' && method === 'GET') return response(200, Object.keys(WEATHER).sort());
        if (p === '/weather' && method === 'GET') {
          const city = u.searchParams.get('city');
          if (!city) return response(400, { error: 'укажите параметр city' });
          return WEATHER[city] ? response(200, { city, ...WEATHER[city] }) : response(404, { error: 'город не найден' });
        }
        if (p === '/rates' && method === 'GET') {
          const key = headers['X-API-Key'] || headers['x-api-key'];
          if (!API_KEYS.has(key)) return response(401, { error: 'нужен ключ API в заголовке X-API-Key' });
          const base = (u.searchParams.get('base') || 'USD').toUpperCase();
          return RATES[base] ? response(200, { base, rates: RATES[base] }) : response(400, { error: 'неизвестная валюта' });
        }
        const m = /^\/students\/(\d+)$/.exec(p);
        if (m && method === 'GET') return STUDENTS[m[1]] ? response(200, STUDENTS[m[1]]) : response(404, { error: 'студент не найден' });
        if (p === '/notes' && method === 'GET') return response(200, notes);
        if (p === '/notes' && method === 'POST') {
          let body;
          try { body = JSON.parse(options.body || '{}'); } catch (e) { return response(400, { error: 'тело запроса — не JSON' }); }
          if (!body.text) return response(400, { error: 'нужно поле text' });
          const note = { id: notes.length + 1, text: String(body.text) };
          notes.push(note);
          return response(201, note);
        }
        return response(404, { error: 'нет такого адреса' });
      });
    };
  }

  // ─── Запуск ──────────────────────────────────────────────────────────────────────────────────────────
  /**
   * Выполнить программу. inputs — строки ввода теста. tick(fn) — дать отработать микрозадачам (в браузере и в Node
   * по-разному). Возвращает Promise<{ stdout, error }>; error — «ИмяОшибки: сообщение» или null.
   */
  async function run(code, inputs = [], { tick } = {}) {
    const out = [];
    let size = 0;
    let line = 0;
    const write = (text) => {
      if (size > MAX_OUTPUT) return;
      size += text.length + 1;
      out.push(size > MAX_OUTPUT ? text.slice(0, 200) + '…' : text);
    };
    const log = (...args) => write(args.map((a) => format(a)).join(' '));
    const consoleObj = { log, info: log, warn: log, error: log, debug: log, table: log };
    const input = () => {
      if (line >= inputs.length) throw new Error('input(): строки ввода закончились — программа читает больше, чем дано в тесте');
      return String(inputs[line++]);
    };
    // Таймеры на виртуальном времени.
    let now = 0;
    let seq = 0;
    let fired = 0;
    const timers = new Map();
    const setTimeoutV = (fn, ms = 0, ...args) => {
      seq += 1;
      timers.set(seq, { at: now + Math.max(0, Number(ms) || 0), fn, args, every: null, order: seq });
      return seq;
    };
    const setIntervalV = (fn, ms = 0, ...args) => {
      const id = setTimeoutV(fn, ms, ...args);
      timers.get(id).every = Math.max(1, Number(ms) || 0);
      return id;
    };
    const clear = (id) => { timers.delete(id); };
    const pass = tick || (() => new Promise((r) => setTimeout(r, 0)));
    let error = null;
    const fail = (e) => {
      if (!error) error = e && e.name ? `${e.name}: ${e.message}` : String(e);
    };
    const fn = new Function('console', 'input', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'fetch',
      `return (async () => {\n${code}\n})();`);
    // Программа и таймеры идут вместе: пока программа ждёт (await таймера или fetch), срабатывают таймеры.
    let done = false;
    try {
      fn(consoleObj, input, setTimeoutV, clear, setIntervalV, clear, makeFetch()).catch(fail).finally(() => { done = true; });
    } catch (e) {
      fail(e);
      done = true;
    }
    await pass();
    let idle = 0;
    while (!error && !done && !timers.size && idle < 50) { await pass(); idle += 1; }
    while (!error && timers.size && fired < MAX_TIMERS) {
      const [id, t] = [...timers.entries()].sort((a, b) => a[1].at - b[1].at || a[1].order - b[1].order)[0];
      now = t.at;
      if (t.every) { t.at += t.every; t.order = ++seq; } else timers.delete(id);
      fired += 1;
      try {
        const r = t.fn(...t.args);
        if (r && typeof r.then === 'function') r.catch(fail);
      } catch (e) {
        fail(e);
      }
      await pass();
    }
    if (fired >= MAX_TIMERS && !error) error = 'Ошибка: слишком много срабатываний таймеров — setInterval не остановлен (clearInterval)?';
    return { stdout: out.join('\n'), error };
  }

  return { run, format };
});
