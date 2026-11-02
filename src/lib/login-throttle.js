// Защита входа от перебора пароля (брутфорса). Без внешних зависимостей: неудачные попытки
// пишутся в таблицу login_attempts (src/db), блокировка — по скользящему окну.
//
// Политика (пороги настраиваются здесь):
//   - на пару (IP + логин): после PER_ACCOUNT_MAX неудач за WINDOW_MS — вход по этому логину с этого
//     IP блокируется, пока старые неудачи не выйдут из окна (целит точечный подбор одного аккаунта);
//   - на IP целиком: после PER_IP_MAX неудач за WINDOW_MS — блок всего IP (целит «распыление» по
//     многим логинам). Порог высокий: класс за одним NAT-адресом в норме его не достигает.
// При блокировке попытка отклоняется БЕЗ проверки пароля и БЕЗ новой записи — иначе атакующий
// продлевал бы окно сам себе. Успешный вход очищает счётчик для (IP + логин).
const db = require('../db');

const WINDOW_MS = 15 * 60 * 1000;   // окно подсчёта неудач
const PER_ACCOUNT_MAX = 5;          // неудач на (IP + логин) до блокировки
const PER_IP_MAX = 50;              // неудач на IP до блокировки (класс за NAT не задеть)

function clientIp(req) {
  return (req && (req.ip || (req.connection && req.connection.remoteAddress))) || 'unknown';
}

function normLogin(login) {
  return String(login || '').trim().toLowerCase();
}

// Можно ли пытаться войти сейчас. -> { blocked, retryAfterSec, ip }.
function check(req, login, now = Date.now()) {
  const ip = clientIp(req);
  const since = now - WINDOW_MS;
  try {
    db.pruneLoginAttempts(since);
    const perAccount = db.countLoginFailures({ ip, login: normLogin(login), since });
    const perIp = db.countLoginFailures({ ip, since });
    const blocked = perAccount >= PER_ACCOUNT_MAX || perIp >= PER_IP_MAX;
    return { blocked, retryAfterSec: blocked ? Math.ceil(WINDOW_MS / 1000) : 0, ip };
  } catch (err) {
    // Защита не должна ронять вход: при сбое просто не блокируем.
    return { blocked: false, retryAfterSec: 0, ip };
  }
}

function recordFailure(req, login, now = Date.now()) {
  try {
    db.recordLoginFailure(clientIp(req), normLogin(login), now);
  } catch (err) { /* не критично */ }
}

function recordSuccess(req, login) {
  try {
    db.clearLoginFailures(clientIp(req), normLogin(login));
  } catch (err) { /* не критично */ }
}

module.exports = { check, recordFailure, recordSuccess, clientIp, WINDOW_MS, PER_ACCOUNT_MAX, PER_IP_MAX };
