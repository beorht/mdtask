// Данные админки тренажёра Emmet (/admin/emmet, src/routes/admin-emmet.js): сводка, матрица
// «студент × работа» по разделам (обучение — общее; работы с условием и без подсказок — весь банк,
// у каждого свой набор), сигналы для устной проверки, карточка студента и CSV.
const db = require('../../db');
const emmet = require('./index');

// Разделы плана в порядке прохождения: ключ — section у работ.
const SECTIONS = [
  { key: 'lesson', label: 'Обучение', bank: emmet.LESSONS },
  { key: 'emmet', label: 'С условием', bank: emmet.EXERCISES },
  { key: 'blind', label: 'Без подсказок', bank: emmet.BLIND },
];

function students(group) {
  return db
    .getUsers()
    .filter((u) => u.role === 'student' && emmet.emmetGroups().includes(u.group) && (!group || u.group === group))
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'));
}

function cellState(stats) {
  if (!stats) return 'none';
  if (stats.solvedAt) return 'solved';
  if (stats.attempts) return stats.lastStatus === 'partial' ? 'partial' : 'tried';
  return 'opened';
}

function rowFor(student) {
  const plan = emmet.planOf(student.id); // наборы выдаются заранее — видны до первого входа
  const progress = emmet.progressMap(student.id);
  const sum = { attempts: 0, handwritten: 0, pastes: 0, aways: 0, awayMs: 0, afterAway: 0, clientMismatch: 0, solutions: 0 };
  let lastAt = null;
  for (const id of plan) {
    const s = progress.get(id);
    if (!s) continue;
    sum.attempts += s.attempts;
    sum.handwritten += s.handwritten;
    sum.pastes += s.pastes;
    sum.aways += s.aways;
    sum.awayMs += s.awayMs;
    sum.afterAway += s.solvedAfterAway ? 1 : 0;
    sum.clientMismatch += s.clientMismatch || 0;
    sum.solutions += s.solutionShown ? 1 : 0;
    if (s.lastAt && (!lastAt || s.lastAt > lastAt)) lastAt = s.lastAt;
  }
  const isSolved = (id) => Boolean(progress.get(id) && progress.get(id).solvedAt);
  const signals = [];
  if (sum.handwritten) signals.push(`HTML вручную: ${sum.handwritten}`);
  if (sum.pastes) signals.push(`вставки: ${sum.pastes}`);
  if (sum.afterAway) signals.push(`решено сразу после ухода: ${sum.afterAway}`);
  if (sum.clientMismatch) signals.push(`браузер ≠ сервер: ${sum.clientMismatch}`);
  if (sum.solutions) signals.push(`открыл ответ в обучении: ${sum.solutions}`);
  if (sum.awayMs >= 5 * 60000) signals.push(`вне страницы ${Math.round(sum.awayMs / 60000)} мин`);
  const typed = require('../typing-check').typingSignal(progress);
  if (typed) signals.push(typed);
  const cells = {};
  const solved = {};
  const total = {};
  for (const { key, bank } of SECTIONS) {
    const mine = plan.filter((id) => emmet.BY_ID.get(id).section === key);
    cells[key] = bank.map((e) => (mine.includes(e.id) ? cellState(progress.get(e.id)) : 'off'));
    solved[key] = mine.filter(isSolved).length;
    total[key] = mine.length;
  }
  return {
    student,
    cells,
    solved,
    total,
    solvedAll: plan.filter(isSolved).length,
    sum,
    lastAt,
    signals,
  };
}

function overview(filters = {}) {
  const rows = students(filters.group).map(rowFor);
  const q = (filters.q || '').toLowerCase();
  const shown = rows.filter((r) => !q || r.student.name.toLowerCase().includes(q) || r.student.id.toLowerCase().includes(q));
  let picked = null;
  if (filters.pick) {
    const pool = shown.filter((r) => r.solved.emmet + r.solved.blind > 0);
    const withSignals = pool.filter((r) => r.signals.length);
    const rest = pool.filter((r) => !r.signals.length).sort(() => Math.random() - 0.5);
    picked = [...withSignals.sort(() => Math.random() - 0.5), ...rest].slice(0, 4);
  }
  return {
    rows: shown,
    picked,
    sections: SECTIONS.map(({ key, label, bank }) => ({
      key,
      label,
      bank,
      size: key === 'lesson' ? bank.length : emmet.SET_SIZE,
      finished: rows.filter((r) => r.total[key] && r.solved[key] === r.total[key]).length,
    })),
    started: rows.filter((r) => r.lastAt).length,
    sessions: emmet.emmetGroups().map((group) => ({ group, closedAt: db.getEmmetSessionClosedAt(group) })),
  };
}

function studentDetail(studentId) {
  const student = db.getUserById(studentId);
  if (!student || student.role !== 'student') return null;
  const progress = emmet.progressMap(student.id);
  const items = emmet.planOf(student.id).map((id, i) => {
    const e = emmet.BY_ID.get(id);
    return { number: i + 1, exercise: e, stats: progress.get(id) || null, state: cellState(progress.get(id)) };
  });
  return { student, row: rowFor(student), items, events: db.getEmmetEvents(student.id, 300) };
}

function csv() {
  const head = ['ФИО', 'ID', 'Группа', ...SECTIONS.map((s) => `${s.label}: решено`), 'Попыток', 'HTML вручную', 'Вставок', 'Уходов', 'Вне страницы, мин', 'Решено сразу после ухода', 'Браузер ≠ сервер', 'Открыл ответ в обучении', 'Последнее действие'];
  const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = students().map(rowFor).map((r) => [
    r.student.name, r.student.id, r.student.group,
    ...SECTIONS.map((s) => `${r.solved[s.key]}/${r.total[s.key]}`),
    r.sum.attempts, r.sum.handwritten, r.sum.pastes, r.sum.aways, Math.round(r.sum.awayMs / 60000), r.sum.afterAway, r.sum.clientMismatch, r.sum.solutions, r.lastAt || '',
  ]);
  return '﻿' + [head, ...lines].map((l) => l.map(cell).join(';')).join('\r\n') + '\r\n';
}

module.exports = { SECTIONS, overview, studentDetail, csv };
