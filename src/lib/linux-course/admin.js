// Данные для админ-раздела предмета «Linux Terminal Trainer» (/admin/linux):
// отчёт по «Практической работе. Терминал» (сколько шагов пройдено по каждой команде) и по миссиям
// тренажёра, плюс карточка студента с его журналом команд. Читает linux_progress/linux_events.
const path = require('path');
const db = require('../../db');
const course = require('./index');
const practical = require('./practical');

const P = require(path.join(__dirname, '..', '..', '..', 'content', 'linux', 'practical.js'));
const stepItem = (id) => `pr:${id}`;
const LOG_ITEM = 'pr:log';

// Команды в порядке появления и их шаги.
const COMMANDS = (() => {
  const order = [];
  const byCmd = new Map();
  P.steps.forEach((s) => {
    if (!byCmd.has(s.cmd)) { byCmd.set(s.cmd, []); order.push(s.cmd); }
    byCmd.get(s.cmd).push(s);
  });
  return order.map((cmd) => ({ cmd, steps: byCmd.get(cmd) }));
})();

function studentsFor(group) {
  return db
    .getUsers()
    .filter((u) => u.role === 'student' && (course.LINUX_GROUPS.includes(u.group) || u.group === 'TEST'))
    .filter((u) => !group || u.group === group)
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'));
}

function progressMap(studentId) {
  const m = new Map();
  db.getLinuxProgress(studentId).forEach((p) => m.set(p.itemId, { ...p.stats, solvedAt: p.stats.solvedAt || p.solvedAt }));
  return m;
}

function cellState(solved, total) {
  return total && solved === total ? 'solved' : solved ? 'partial' : 'none';
}

// Матрица: по студенту — на каждую команду «решено/всего» шагов, сколько миссий пройдено.
function overview({ group, q } = {}) {
  const needle = (q || '').trim().toLowerCase();
  const students = studentsFor(group).filter(
    (s) => !needle || s.name.toLowerCase().includes(needle) || s.id.toLowerCase().includes(needle)
  );
  const rows = students.map((s) => {
    const pm = progressMap(s.id);
    const cells = COMMANDS.map((c) => {
      const solved = c.steps.filter((st) => pm.get(stepItem(st.id)) && pm.get(stepItem(st.id)).solvedAt).length;
      return { cmd: c.cmd, solved, total: c.steps.length, state: cellState(solved, c.steps.length) };
    });
    const practicalSolved = cells.reduce((n, c) => n + c.solved, 0);
    const missionCells = course.MISSIONS.map((m) => ({ id: m.id, solved: !!(pm.get(m.id) && pm.get(m.id).solvedAt) }));
    const missionsSolved = missionCells.filter((m) => m.solved).length;
    return {
      student: s,
      cells,
      missionCells,
      practicalSolved,
      practicalTotal: P.steps.length,
      missionsSolved,
      missionsTotal: course.MISSIONS.length,
      startedPractical: practicalSolved > 0 || !!pm.get(LOG_ITEM),
      started: practicalSolved > 0 || missionsSolved > 0 || !!pm.get(LOG_ITEM),
    };
  });
  return {
    commands: COMMANDS.map((c) => ({ cmd: c.cmd, total: c.steps.length })),
    // Колонки миссий тренажёра, сгруппированные по модулям — для второй матрицы.
    modules: course.MODULES.map((m) => ({ number: m.number, title: m.title, missions: m.missions.map((x) => ({ id: x.id, short: `${m.number}.${x.number}`, title: x.title })) })),
    missions: course.MISSIONS.map((m) => ({ id: m.id, short: `${m.moduleNumber}.${m.number}`, title: m.title })),
    rows,
    practicalTotal: P.steps.length,
    missionsTotal: course.MISSIONS.length,
    groups: course.LINUX_GROUPS,
    window: practical.windowState(),
    startedCount: rows.filter((r) => r.started).length,
    startedPracticalCount: rows.filter((r) => r.startedPractical).length,
  };
}

// Карточка студента: шаги практической по командам + журнал команд + миссии.
function studentDetail(studentId) {
  const student = db.getUserById(studentId);
  if (!student || student.role !== 'student') return null;
  const pm = progressMap(studentId);
  const groups = COMMANDS.map((c) => ({
    cmd: c.cmd,
    steps: c.steps.map((st) => ({
      id: st.id,
      task: st.task,
      solved: !!(pm.get(stepItem(st.id)) && pm.get(stepItem(st.id)).solvedAt),
    })),
  }));
  const practicalSolved = groups.reduce((n, g) => n + g.steps.filter((s) => s.solved).length, 0);
  const journal = (pm.get(LOG_ITEM) && pm.get(LOG_ITEM).log) || [];
  const missions = course.MISSIONS.map((m) => ({
    id: m.id,
    title: `${m.moduleNumber}.${m.number}. ${m.title}`,
    solved: !!(pm.get(m.id) && pm.get(m.id).solvedAt),
  }));
  return {
    student,
    groups,
    practicalSolved,
    practicalTotal: P.steps.length,
    journal,
    missions,
    missionsSolved: missions.filter((m) => m.solved).length,
    missionsTotal: missions.length,
  };
}

module.exports = { overview, studentDetail, COMMANDS };
