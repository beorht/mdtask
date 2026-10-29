// Признаки «код набран не руками» в практических работах HTML, CSS и тренажёре Emmet. Браузер присылает с попыткой
// сводку набора (public/js/typing-monitor.js); здесь она проверяется и превращается в признаки для админки.
// Признак — не приговор: решение засчитывается как обычно, а преподаватель видит сигнал и может спросить студента.
//   chunk     — код появился готовым куском (не набор, не Emmet, не черновик);
//   autotype  — слишком ровный темп нажатий (разброс пауз относительно медианы) или нечеловечески быстрый набор
//               на протяжении многих символов (программа-«автонабор»);
//   untyped   — в коде заметно больше символов, чем было набрано, развёрнуто Emmet и восстановлено из черновика;
//   refCopy   — CSS совпадает с эталоном до символа, вместе с переносами строк и пробелами (так бывает при копировании
//               эталона из инструментов разработчика; набранный вручную код почти всегда отличается оформлением).
const FLAG_LABELS = {
  chunk: 'готовый кусок кода',
  autotype: 'ровный «автонабор»',
  untyped: 'кода больше, чем набрано',
  refCopy: 'копия эталона',
};

const MIN_LEN = 40; // короткие решения не проверяем: их легко набрать быстро и ровно
const AUTOTYPE_KEYS = 40;
const AUTOTYPE_RCV = 0.15;
const AUTOTYPE_FAST_MS = 60;
const CHUNK = 20;
const UNTYPED_SHARE = 0.5;

const num = (v, max = 1e9) => (Number.isFinite(Number(v)) ? Math.max(0, Math.min(max, Math.round(Number(v)))) : 0);

/** Сводка из браузера → проверенные числа (или null, если её нет). */
function sanitize(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const s = {};
  for (const k of ['final', 'restored', 'typed', 'emmet', 'auto', 'other', 'deletes', 'undos', 'bigInserts', 'biggest', 'keys', 'meanMs', 'medianMs', 'activeMs']) s[k] = num(raw[k]);
  for (const k of ['cv', 'rcv']) s[k] = raw[k] === null || raw[k] === undefined || !Number.isFinite(Number(raw[k])) ? null : Math.max(0, Math.min(10, Number(raw[k])));
  return s;
}

const squash = (code) => String(code || '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, '').toLowerCase();

/** Признаки попытки. code — отправленный код; reference — эталон (только для CSS). */
function typingFlags(summary, code, { reference = null } = {}) {
  const flags = [];
  const length = String(code || '').replace(/\s/g, '').length;
  const lines = (text) => String(text || '').trim().split('\n').map((l) => l.trimEnd()).join('\n');
  if (reference && length >= MIN_LEN && lines(code) === lines(reference)) flags.push('refCopy');
  if (!summary) return flags;
  if (summary.biggest >= CHUNK) flags.push('chunk');
  if (summary.keys >= AUTOTYPE_KEYS && ((summary.rcv !== null && summary.rcv < AUTOTYPE_RCV) || (summary.medianMs > 0 && summary.medianMs < AUTOTYPE_FAST_MS))) flags.push('autotype');
  const produced = summary.typed + summary.emmet + summary.auto + summary.restored;
  if (summary.final >= MIN_LEN && produced < summary.final * UNTYPED_SHARE) flags.push('untyped');
  return flags;
}

/** Добавить признаки попытки в статистику задания (stats.typing — { признак: число попыток }). */
function addToStats(stats, flags) {
  stats.typing = { ...(stats.typing || {}) };
  for (const f of flags) stats.typing[f] = (stats.typing[f] || 0) + 1;
}

const describe = (typing) => Object.entries(typing || {}).filter(([, n]) => n).map(([f, n]) => `${FLAG_LABELS[f] || f}${n > 1 ? ` ×${n}` : ''}`);

/**
 * Одинаковые решения у разных студентов: { studentId: [{ taskId, others: [studentId…] }] } — только достаточно
 * длинные решения (короткие совпадают сами собой).
 */
function sameSolutions(rows, taskIds, minLength = 60) {
  const out = {};
  for (const taskId of taskIds) {
    const groups = new Map();
    for (const { studentId, progress } of rows) {
      const stats = progress.get(taskId);
      const code = stats && (stats.solvedCode || '');
      if (!code || squash(code).length < minLength) continue;
      const key = squash(code);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(studentId);
    }
    for (const ids of groups.values()) {
      if (ids.length < 2) continue;
      for (const id of ids) (out[id] = out[id] || []).push({ taskId, others: ids.filter((x) => x !== id) });
    }
  }
  return out;
}

/** Сигнал для админки по всем заданиям студента: «код не руками: готовый кусок ×2, …» или null. */
function typingSignal(progress) {
  const total = {};
  for (const stats of progress.values()) for (const [f, n] of Object.entries(stats.typing || {})) total[f] = (total[f] || 0) + n;
  const parts = describe(total);
  return parts.length ? `код не руками: ${parts.join(', ')}` : null;
}

module.exports = { FLAG_LABELS, sanitize, typingFlags, addToStats, describe, sameSolutions, squash, typingSignal };
