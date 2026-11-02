// Ограничение частоты запросов (защита от «простреливания» сервера залогиненными пользователями).
// In-memory счётчики с фиксированным окном: писать в БД на каждый запрос дорого, а для защиты от
// флуда память процесса достаточна (после перезапуска счётчики сбрасываются — это нормально).
// Ключ — id пользователя из сессии, иначе IP. В тестах (DB_PATH=:memory:) лимитер выключен.
const ENABLED = process.env.DB_PATH !== ':memory:';

function identity(req) {
  const u = req.session && req.session.user;
  return u ? `u:${u.id}` : `ip:${(req.ip || (req.connection && req.connection.remoteAddress) || 'unknown')}`;
}

// Чистая функция фиксированного окна: мутирует store, возвращает { limited, retryAfterSec }.
function hit(store, key, now, windowMs, max) {
  let e = store.get(key);
  if (!e || now >= e.resetAt) {
    e = { count: 0, resetAt: now + windowMs };
    store.set(key, e);
  }
  e.count += 1;
  if (e.count > max) return { limited: true, retryAfterSec: Math.max(1, Math.ceil((e.resetAt - now) / 1000)) };
  return { limited: false, retryAfterSec: 0 };
}

function createLimiter({ windowMs, max }) {
  const store = new Map();
  let lastPrune = 0;
  return function limiter(req, res, next) {
    if (!ENABLED) return next();
    const now = Date.now();
    if (now - lastPrune > windowMs) {
      for (const [k, e] of store) if (now >= e.resetAt) store.delete(k);
      lastPrune = now;
    }
    const { limited, retryAfterSec } = hit(store, identity(req), now, windowMs, max);
    if (limited) {
      res.set('Retry-After', String(retryAfterSec));
      return res.status(429).send('Слишком много запросов. Подождите немного и повторите.');
    }
    return next();
  };
}

const MINUTE = 60 * 1000;
// Общий лимит — режет только явный флуд, обычную работу (страницы + XHR) не трогает.
const globalLimiter = createLimiter({ windowMs: MINUTE, max: 600 });
// Строгий лимит для тяжёлых эндпоинтов (SQL-тренажёр, прокси IB-терминала, предпросмотр Markdown).
const heavyLimiter = createLimiter({ windowMs: MINUTE, max: 120 });

module.exports = { createLimiter, hit, identity, globalLimiter, heavyLimiter, ENABLED };
