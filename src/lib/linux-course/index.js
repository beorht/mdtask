// Предмет «Linux Terminal Trainer» (/subjects/linux): наглядный тренажёр командной строки Linux
// (план docs/todo/2026-10-31-linux-terminal-trainer-plan.md). Модули и миссии — content/linux/missions.js;
// у миссии исходная ФС, текст, подсказки и правила проверки. Движок виртуальной ФС — public/js/linux-fs.js
// (браузер + сервер); серверная перепроверка миссии — ./validate.js (повтор журнала команд студента).
// Виден группам из LINUX_GROUPS и TEST (hasFullAccess). Миссии открываются по порядку.
const path = require('path');
const db = require('../../db');
const { hasFullAccess } = require('../test-access');
const { checkMission } = require('./validate');

const LINUX_KEY = 'linux';
const LINUX_TITLE = 'Linux Terminal Trainer';
const LINUX_ICON = '🐧';
const LINUX_GROUPS = ['web-1'];
const LINUX_LEAD = 'Практика командной строки Linux: вводите команды, наблюдайте, как меняется файловая '
  + 'система в дереве справа, и проверяйте результат. Миссии открываются по порядку.';

const RAW = require(path.join(__dirname, '..', '..', '..', 'content', 'linux', 'missions.js'));
const MODULES = RAW.map((m, mi) => ({
  key: m.key,
  number: mi + 1,
  title: m.title,
  ready: !!m.ready,
  missions: (m.missions || []).map((mi2, j) => ({ ...mi2, module: m.key, moduleNumber: mi + 1, number: j + 1 })),
}));
const MISSIONS = MODULES.flatMap((m) => m.missions);
const MISSION_BY_ID = new Map(MISSIONS.map((x) => [x.id, x]));
const MAX_LOG = 400;

function canSeeLinux(user) {
  return !!user && user.role === 'student' && (hasFullAccess(user) || LINUX_GROUPS.includes(user.group));
}

const emptyStats = () => ({ attempts: 0, solvedAt: null, hints: 0, lastAt: null, lastLog: null });

function progressMap(studentId) {
  return new Map(db.getLinuxProgress(studentId).map((p) => [p.itemId, { ...emptyStats(), ...p.stats }]));
}

/** Миссии со статусом для студента: решена и открыта (по порядку; TEST — всё открыто). */
function missionsForStudent(user) {
  const full = hasFullAccess(user);
  const progress = progressMap(user.id);
  const solved = (id) => Boolean(progress.get(id) && progress.get(id).solvedAt);
  let previousDone = true;
  return MISSIONS.map((m) => {
    const open = full || previousDone;
    const isSolved = solved(m.id);
    previousDone = previousDone && isSolved;
    return { id: m.id, module: m.module, moduleNumber: m.moduleNumber, number: m.number, title: m.title, solved: isSolved, open };
  });
}

function summaryForStudent(user) {
  const list = missionsForStudent(user);
  const byId = new Map(list.map((m) => [m.id, m]));
  return {
    modules: MODULES.map((m) => ({
      key: m.key, number: m.number, title: m.title, ready: m.ready,
      missions: m.missions.map((x) => byId.get(x.id)),
    })),
    solved: list.filter((m) => m.solved).length,
    total: list.length,
    current: list.find((m) => m.open && !m.solved) || null,
  };
}

function missionStatus(user, id) {
  return missionsForStudent(user).find((m) => m.id === id) || null;
}

// Данные миссии для страницы/клиента: условие, исходная ФС, подсказки — всё нужное движку в браузере.
function missionView(user, id) {
  const m = MISSION_BY_ID.get(id);
  const st = progressMap(user.id).get(id);
  return {
    id: m.id, title: m.title, moduleNumber: m.moduleNumber, number: m.number,
    intro: m.intro, task: m.task, syntax: m.syntax, hints: m.hints,
    fs: m.fs, startCwd: m.startCwd || '~',
    solved: Boolean(st && st.solvedAt),
  };
}

class LinuxCourseError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

function markHint(user, id) {
  const st = { ...emptyStats(), ...(progressMap(user.id).get(id) || {}) };
  st.hints += 1; st.lastAt = new Date().toISOString();
  db.saveLinuxProgress(user.id, id, st);
}

/** «Проверить»: сервер повторяет журнал команд и проверяет итог по правилам миссии. */
function check(user, id, body, now = new Date().toISOString()) {
  const mission = MISSION_BY_ID.get(id);
  if (!mission) throw new LinuxCourseError(404, 'Миссия не найдена.');
  const log = Array.isArray(body && body.log) ? body.log.slice(0, MAX_LOG).map((l) => String(l || '')) : [];
  const res = checkMission(mission, log);
  const st = { ...emptyStats(), ...(progressMap(user.id).get(id) || {}) };
  st.attempts += 1; st.lastAt = now; st.lastLog = log.slice(-200);
  if (res.solved && !st.solvedAt) st.solvedAt = now;
  db.saveLinuxProgress(user.id, id, st);
  db.addLinuxEvent({ studentId: user.id, itemId: id, type: 'check', solved: res.solved, at: now });
  return { solved: res.solved, results: res.results, passed: res.passed, total: res.total, everSolved: Boolean(st.solvedAt) };
}

function recordEvent(user, id, body, now = new Date().toISOString()) {
  const type = body && body.type;
  if (!['open', 'reset'].includes(type)) throw new LinuxCourseError(400, 'Некорректное событие.');
  db.addLinuxEvent({ studentId: user.id, itemId: id, type, solved: false, at: now });
  return { ok: true };
}

module.exports = {
  LINUX_KEY, LINUX_TITLE, LINUX_ICON, LINUX_GROUPS, LINUX_LEAD,
  MODULES, MISSIONS, MISSION_BY_ID, LinuxCourseError,
  canSeeLinux, progressMap, missionsForStudent, summaryForStudent, missionStatus, missionView,
  markHint, check, recordEvent,
};
