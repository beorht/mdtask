// Teacher side of the IB final exam: issuing variants, the results table, one student's work and
// the map of their actions built from their log file (src/lib/exam/log.js), CSV export.
const db = require('../../db');
const { hasFullAccess, TEST_GROUP } = require('../test-access');
const exam = require('./index');
const { readLog } = require('./log');
const { DEVICE_MODES } = require('./devices');
const { writeSandbox, sandboxExists } = require('./sandbox');

function studentsOf(def) {
  return db
    .getUsers()
    .filter((u) => u.role === 'student' && u.group === def.group)
    .sort((a, b) => a.id.localeCompare(b.id));
}

// Variants for every student of the group who has none yet (by position in the list, so
// 18 students get 18 different combinations), and their sandboxes.
function issueForGroup(def) {
  const students = studentsOf(def);
  const issued = [];
  students.forEach((s, index) => {
    let variant = db.getExamVariant(def.id, s.id);
    if (!variant) {
      variant = exam.issueVariant(def, s.id, index);
      issued.push(s.id);
    }
    if (!sandboxExists(def.id, s.id)) writeSandbox(def.id, s.id, exam.scenarioOf(variant));
  });
  return { issued, total: students.length };
}

// A new variant (new data, progress forgotten): only for TEST accounts or before the start.
function reissue(def, studentId, index) {
  const user = db.getUserById(studentId);
  if (!user || user.role !== 'student') throw new Error('Нет такого студента.');
  const phase = exam.phaseOf(exam.examWindow(def));
  if (!hasFullAccess(user) && phase !== 'before') throw new Error('Выдать заново можно только до начала контрольной (или тестовому аккаунту).');
  if (!hasFullAccess(user) && user.group !== def.group) throw new Error(`Студент не из группы ${def.group}.`);
  const variant = exam.issueVariant(def, studentId, index);
  writeSandbox(def.id, studentId, exam.scenarioOf(variant));
  return variant;
}

// The sandbox again from the same seed (files only; answers and progress stay).
function rebuildSandbox(def, studentId) {
  const variant = db.getExamVariant(def.id, studentId);
  if (!variant) throw new Error('У студента нет варианта.');
  writeSandbox(def.id, studentId, exam.scenarioOf(variant));
}

const THEME_LABELS = Object.fromEntries(Object.entries(exam.THEMES).map(([k, t]) => [k, t.label]));

function cellOf(task, row) {
  if (!row) return { state: 'none', text: '—' };
  if (task.kind === 'report') {
    if (row.teacherScore !== null && row.teacherScore !== undefined) return { state: 'done', text: `${row.teacherScore}` };
    return row.submittedAt ? { state: 'pending', text: 'ждёт оценки' } : row.draft ? { state: 'muted', text: 'черновик' } : { state: 'none', text: '—' };
  }
  if (task.kind === 'bug') {
    if (!row.submittedAt) return row.runs ? { state: 'muted', text: `${row.runs} зап.` } : { state: 'none', text: '—' };
    if (!row.result) return { state: 'warning', text: 'нет прогона' };
    return row.solved ? { state: 'done', text: '✓' } : { state: 'failed', text: `${row.result.passed}/${row.result.total}` };
  }
  if (row.solved) return { state: 'done', text: '✓' };
  return row.attempts ? { state: 'failed', text: `✗ ${row.attempts}` } : { state: 'muted', text: '…' };
}

const DEVICE_TYPES = ['device', 'device_change', 'device_blocked'];

// Devices each student used, from the short copies of the device events (ip and pc come first).
function devicesByStudent(def) {
  const out = new Map();
  for (const e of db.getExamEventsOfType(def.id, DEVICE_TYPES)) {
    const ip = (e.summary.match(/"ip":"([^"]*)"/) || [])[1] || '';
    const pc = (e.summary.match(/"pc":"([^"]*)"/) || [])[1] || null;
    const d = out.get(e.student_id) || { pcs: new Set(), ips: new Set(), blocked: 0, macMismatch: false };
    if (e.type === 'device_blocked') d.blocked += 1;
    else {
      if (pc) d.pcs.add(pc);
      if (ip) d.ips.add(ip);
      if (/"macMismatch":true/.test(e.summary)) d.macMismatch = true;
    }
    out.set(e.student_id, d);
  }
  const owners = new Map();
  for (const [studentId, d] of out) for (const pc of d.pcs) owners.set(pc, [...(owners.get(pc) || []), studentId]);
  for (const [studentId, d] of out) {
    d.shared = [...d.pcs].filter((pc) => owners.get(pc).length > 1).map((pc) => ({ pc, with: owners.get(pc).filter((s) => s !== studentId) }));
    d.pcs = [...d.pcs];
    d.ips = [...d.ips];
    d.outside = d.ips.length > d.pcs.length;
  }
  return out;
}

function overview(def) {
  const win = exam.examWindow(def);
  const variants = new Map(db.getExamVariants(def.id).map((v) => [v.studentId, v]));
  const rows = db.getExamTasks(def.id);
  const events = new Map(db.getExamEventCounts(def.id).map((e) => [e.studentId, e]));
  const devices = devicesByStudent(def);
  const users = db.getUsers();
  const people = [
    ...studentsOf(def),
    ...users.filter((u) => u.role === 'student' && u.group === TEST_GROUP && variants.has(u.id)),
  ];
  let taskHeads = null;
  const list = people.map((student) => {
    const variant = variants.get(student.id) || null;
    if (!variant) return { student, variant: null };
    const tasks = exam.tasksOf(variant);
    if (!taskHeads) taskHeads = tasks.map((t) => ({ id: t.id, stage: t.stage, kind: t.kind, points: t.points }));
    const own = rows.filter((r) => r.studentId === student.id);
    const byTask = new Map(own.map((r) => [r.taskId, r]));
    const score = exam.scoreTasks(tasks, own);
    const ev = events.get(student.id);
    return {
      student,
      variant,
      themeLabel: THEME_LABELS[variant.theme],
      cells: tasks.map((t) => ({ task: t, ...cellOf(t, byTask.get(t.id)) })),
      score,
      grade: score.pending ? null : exam.gradeOf(score.total),
      events: ev ? ev.events : 0,
      lastAt: ev ? ev.lastAt : null,
      needsRecheck: own.some((r) => r.submittedAt && !r.result && r.taskId.startsWith('3.')),
      device: devices.get(student.id) || null,
      sandbox: sandboxExists(def.id, student.id),
    };
  });
  return {
    win,
    phase: exam.phaseOf(win),
    list,
    taskHeads: taskHeads || [],
    issued: list.filter((r) => r.variant).length,
    total: list.length,
    pcs: db.getExamPcs(),
    deviceModes: DEVICE_MODES,
    deviceWarnings: list.filter((r) => r.device && (r.device.blocked || r.device.pcs.length > 1 || r.device.shared.length || r.device.outside || r.device.macMismatch)).length,
  };
}

// ----------------------------------------------------------- one student ---

const EVENT_LABELS = {
  session_start: 'Вход на страницу контрольной',
  page_view: 'Открыл страницу',
  page_leave: 'Ушёл со страницы',
  visibility: 'Вкладка',
  blur: 'Ушёл из окна',
  focus: 'Вернулся в окно',
  paste: 'Вставка из буфера',
  terminal_paste: 'Вставка в терминал',
  copy: 'Копирование',
  idle: 'Бездействие',
  timer_end: 'Время вышло (таймер)',
  terminal_login: 'Вход в терминал',
  terminal_logout: 'Выход из терминала',
  terminal_cmd: 'Команда',
  flag_answer: 'Ответ на вопрос',
  draft_save: 'Сохранение кода',
  code_run: 'Запуск программы',
  code_run_result: 'Результат запуска',
  code_run_denied: 'Запуск отклонён',
  code_check: 'Проверка алгоритма',
  bug_submit: 'Отправка программы',
  code_reset: 'Возврат исходного кода',
  sql_run: 'SQL: выполнить',
  sql_check: 'SQL: проверить',
  report_save: 'Отчёт: сохранение',
  report_submit: 'Отчёт: отправка',
  device: 'Устройство',
  device_change: 'Смена устройства',
  device_blocked: 'Вход не с ПК аудитории',
  device_info: 'Данные устройства',
  blocked_action: 'Действие отклонено',
};

// Where the student was: a "visit" per page view, until the next page view or leaving.
function visitsOf(events) {
  const visits = [];
  let current = null;
  const close = (ts) => {
    if (current) {
      current.end = ts;
      current.seconds = Math.max(0, Math.round((Date.parse(ts) - Date.parse(current.start)) / 1000));
      visits.push(current);
      current = null;
    }
  };
  events.forEach((e) => {
    if (e.type === 'page_view') {
      close(e.ts);
      current = { place: e.task || (e.stage ? `этап ${e.stage}` : 'обзор'), stage: e.stage || (e.task ? Number(e.task[0]) : null), start: e.ts, actions: 0 };
    } else if (e.type === 'page_leave' || e.type === 'session_start') {
      close(e.ts);
    } else if (current && !['visibility', 'blur', 'focus', 'idle', 'code_run_result'].includes(e.type)) {
      current.actions += 1;
    }
  });
  if (events.length) close(events[events.length - 1].ts);
  return visits;
}

// The path between places (consecutive repeats merged) and how often each move happened.
function pathOf(visits) {
  const steps = [];
  visits.forEach((v) => {
    const last = steps[steps.length - 1];
    if (last && last.place === v.place) {
      last.seconds += v.seconds;
      last.actions += v.actions;
    } else steps.push({ place: v.place, stage: v.stage, seconds: v.seconds, actions: v.actions });
  });
  const moves = new Map();
  for (let i = 1; i < steps.length; i += 1) {
    const key = `${steps[i - 1].place} → ${steps[i].place}`;
    moves.set(key, (moves.get(key) || 0) + 1);
  }
  return { steps, moves: [...moves.entries()].map(([move, count]) => ({ move, count })).sort((a, b) => b.count - a.count) };
}

// Timeline marks: what happened when (for the SVG strip on the student page).
function marksOf(events) {
  const marks = [];
  events.forEach((e) => {
    const d = e.data || {};
    let kind = null;
    if (e.type === 'flag_answer' || e.type === 'sql_check' || e.type === 'code_check') kind = d.ok || d.isCorrect || d.solved ? 'ok' : 'bad';
    else if (e.type === 'bug_submit' || e.type === 'report_submit') kind = 'sent';
    else if (e.type === 'code_run') kind = 'run';
    else if (e.type === 'paste' || e.type === 'terminal_paste') kind = d.chars > 200 ? 'paste-big' : 'paste';
    else if (e.type === 'blur' || (e.type === 'visibility' && d.state === 'hidden')) kind = 'away';
    else if (e.type === 'terminal_cmd') kind = 'cmd';
    else if (e.type === 'blocked_action' || e.type === 'code_run_denied' || e.type === 'device_blocked' || e.type === 'device_change') kind = 'blocked';
    if (kind) marks.push({ ts: e.ts, kind, stage: e.stage || (e.task ? Number(e.task[0]) : null), title: `${e.ts.slice(11, 19)} ${EVENT_LABELS[e.type] || e.type}${e.task ? ' ' + e.task : ''}` });
  });
  return marks;
}

function describe(e) {
  const d = e.data || {};
  switch (e.type) {
    case 'terminal_cmd': return `$ ${d.cmd}`;
    case 'flag_answer': return `«${d.answer}» — ${d.already ? 'уже принят' : d.ok ? 'верно' : 'неверно'}`;
    case 'code_run': return d.of ? `запуск ${d.run} из ${d.of}${d.last ? ' (последний)' : ''}, изменено строк: ${d.changedLines}` : `символов: ${d.chars}`;
    case 'code_run_result': return d.timeout ? 'превышено время' : d.error ? `ошибка: ${d.error}` : `вывод: ${String(d.stdout || '').slice(0, 120)}`;
    case 'code_check': return `тестов ${d.passed}/${d.total}${d.forbidden && d.forbidden.length ? ', запрещено: ' + d.forbidden.join(', ') : ''}${d.solved ? ' — решено' : ''}`;
    case 'bug_submit': return `${d.kind === 'manual' ? 'вручную' : d.kind === 'runs' ? 'после 4-го запуска' : 'по окончании времени'}, тестов ${d.passed}/${d.total}, изменено строк: ${d.changedLines}`;
    case 'sql_run':
    case 'sql_check': return `${String(d.sql || '').replace(/\s+/g, ' ').slice(0, 160)}${d.error ? ' — ошибка: ' + d.error : e.type === 'sql_check' ? (d.isCorrect ? ' — верно' : ' — неверно') : ''}`;
    case 'paste':
    case 'terminal_paste': return `${d.chars} символов, ${d.lines || 0} строк (${d.target || 'терминал'})`;
    case 'idle': return `${d.seconds} с`;
    case 'page_view': return d.path;
    case 'page_leave': return `${d.path}, ${d.seconds} с`;
    case 'visibility': return d.state === 'hidden' ? 'скрыта' : 'снова видна';
    case 'blocked_action':
    case 'code_run_denied': return d.reason;
    case 'device':
    case 'device_change':
    case 'device_blocked': return `${d.ip}${d.pc ? ' — ' + d.pc : ' — не ПК аудитории'}${d.mac ? ', MAC ' + d.mac : ''}${d.macMismatch ? ' (MAC не совпадает!)' : ''}`;
    case 'device_info': return `${d.platform}, экран ${d.screen}, ядер ${d.cores || '?'}, память ${d.memory || '?'} ГБ, ${d.timeZone}${d.touch ? ', сенсорный' : ''}`;
    case 'draft_save': return `строк ${d.lines}${d.changedLines !== undefined ? ', изменено: ' + d.changedLines : ''}`;
    default: return '';
  }
}

function detail(def, studentId) {
  const student = db.getUserById(studentId);
  const variant = student && db.getExamVariant(def.id, studentId);
  if (!variant) return null;
  const tasks = exam.tasksOf(variant);
  const scenario = exam.scenarioOf(variant);
  const rows = db.getExamTasks(def.id, studentId);
  const byTask = new Map(rows.map((r) => [r.taskId, r]));
  const score = exam.scoreTasks(tasks, rows);
  const events = readLog(def.id, studentId);
  const visits = visitsOf(events);
  let report = null;
  const reportRow = byTask.get(exam.REPORT_TASK);
  if (reportRow && reportRow.draft) {
    try {
      const saved = JSON.parse(reportRow.answer || reportRow.draft);
      report = exam.REPORT_FIELDS.map((f) => ({ ...f, value: saved[f.key] || '' }));
    } catch (err) {
      report = null;
    }
  }
  const first = events.length ? Date.parse(events[0].ts) : null;
  const last = events.length ? Date.parse(events[events.length - 1].ts) : null;
  return {
    student,
    variant,
    themeLabel: THEME_LABELS[variant.theme],
    scenario,
    tasks: tasks.map((t) => ({ task: t, row: byTask.get(t.id) || null, expected: scenario.answers[t.id] || null, ...cellOf(t, byTask.get(t.id)) })),
    score,
    grade: score.pending ? null : exam.gradeOf(score.total),
    report,
    reportRow,
    events: events.map((e) => ({ ...e, label: EVENT_LABELS[e.type] || e.type, text: describe(e) })),
    visits,
    path: pathOf(visits),
    marks: marksOf(events),
    span: first ? { from: first, to: Math.max(last, first + 60000) } : null,
    devices: events
      .filter((e) => DEVICE_TYPES.includes(e.type) || e.type === 'device_info')
      .map((e) => ({ ts: e.ts, type: e.type, ...e.data })),
    counts: {
      events: events.length,
      commands: events.filter((e) => e.type === 'terminal_cmd').length,
      pastes: events.filter((e) => e.type === 'paste' || e.type === 'terminal_paste').length,
      away: events.filter((e) => e.type === 'blur' || (e.type === 'visibility' && e.data && e.data.state === 'hidden')).length,
      idleSeconds: events.filter((e) => e.type === 'idle').reduce((s, e) => s + (e.data.seconds || 0), 0),
    },
  };
}

function csv(def) {
  const o = overview(def);
  const head = ['Студент', 'ФИО', 'Тема', 'Вариант', ...o.taskHeads.map((t) => `${t.id} (${t.points})`), 'Баллы', 'Оценка', 'Событий'];
  const lines = [head];
  o.list.forEach((r) => {
    if (!r.variant) {
      lines.push([r.student.id, r.student.name, '', '', ...o.taskHeads.map(() => ''), '', '', '']);
      return;
    }
    lines.push([
      r.student.id,
      r.student.name,
      r.themeLabel,
      r.variant.index + 1,
      ...r.score.items.map((it) => (it.points === null ? '' : it.points)),
      r.score.total,
      r.grade || '',
      r.events,
    ]);
  });
  return '﻿' + lines.map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\r\n') + '\r\n';
}

module.exports = { overview, detail, csv, issueForGroup, reissue, rebuildSandbox, studentsOf, THEME_LABELS, EVENT_LABELS };
