#!/usr/bin/env node
// Итоговая контрольная: отчёты по результатам в results_exam/ (папка в .gitignore — там личные данные).
//   README.md                 — общий отчёт по группе: баллы, трудные задания, частые ошибки, устройства;
//   <студент>.md + img/<студент>.svg — отчёт и «портрет» результата каждого студента:
//     баллы по этапам и заданиям, на что опирался (решено сразу), где ошибался больше всего,
//     терминал, SQL, код, поведение (время, вставки, уходы со страницы, ПК).
// Только читает базу (DB_PATH, data/mdtask.db) и журналы (EXAM_DIR, data/exam).
//   node scripts/exam/report.js [--exam ib-final-1] [--out results_exam]
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? def : args[i + 1];
};

const db = require('../../src/db');
const exam = require('../../src/lib/exam');
const examAdmin = require('../../src/lib/exam/admin');
const { readLog } = require('../../src/lib/exam/log');
const { changedLines } = require('../../src/routes/exam');

const def = exam.getExamDef(opt('exam', 'ib-final-1'));
const OUT = path.resolve(opt('out', path.join(__dirname, '..', '..', 'results_exam')));
const KIND = { flag: 'вопрос', algorithm: 'алгоритм', bug: 'ошибка в программе', sql: 'SQL', report: 'отчёт' };
const TERM_ERRORS = /нет такого файла|команда не найдена|синтаксическая ошибка|Отказано в доступе|неверный пароль|не является каталогом|недопустим|неверн|Это каталог|двоичный файл/i;

const fmtMin = (sec) => `${Math.round(sec / 60)} мин`;
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const mdCell = (s) => String(s === null || s === undefined ? '—' : s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
const time = (ts) => {
  const d = new Date(Date.parse(ts) + 5 * 3600 * 1000);
  return d.toISOString().slice(11, 16);
};

// ------------------------------------------------------------- one student ---

function analyse(student) {
  const variant = db.getExamVariant(def.id, student.id);
  const tasks = exam.tasksOf(variant);
  const rows = db.getExamTasks(def.id, student.id);
  const byTask = new Map(rows.map((r) => [r.taskId, r]));
  const score = exam.scoreTasks(tasks, rows);
  const events = readLog(def.id, student.id);
  const detail = examAdmin.detail(def, student.id);
  const scenario = exam.scenarioOf(variant);

  // Time per task: gaps between consecutive events, given to the task of the earlier one
  // (a gap over 5 minutes counts as 5: the student was away or idle).
  const spent = {};
  for (let i = 0; i + 1 < events.length; i += 1) {
    const where = events[i].task;
    if (!where) continue;
    spent[where] = (spent[where] || 0) + Math.min(300, (Date.parse(events[i + 1].ts) - Date.parse(events[i].ts)) / 1000);
  }
  // Solved right after a big paste into that task: the solution may have been brought in ready.
  const pastedSolutions = [];
  events.forEach((e, i) => {
    const solvedNow = (e.type === 'code_check' && e.data.solved) || (e.type === 'sql_check' && e.data.isCorrect) || e.type === 'bug_submit';
    if (!solvedNow || !e.task) return;
    const paste = events
      .slice(0, i)
      .reverse()
      .find((p) => p.type === 'paste' && p.task === e.task && (p.data.chars || 0) > 200 && Date.parse(e.ts) - Date.parse(p.ts) < 3 * 60 * 1000);
    if (paste && !pastedSolutions.some((x) => x.task === e.task)) pastedSolutions.push({ task: e.task, at: time(paste.ts), chars: paste.data.chars, seconds: Math.round((Date.parse(e.ts) - Date.parse(paste.ts)) / 1000) });
  });

  const wrong = {}; // task -> wrong answers / failing checks
  const notes = {}; // task -> text
  events.forEach((e) => {
    const d = e.data || {};
    if (!e.task) return;
    if (e.type === 'flag_answer' && d.ok === false) (wrong[e.task] = wrong[e.task] || []).push(String(d.answer));
    if (e.type === 'sql_check' && !d.isCorrect) (wrong[e.task] = wrong[e.task] || []).push(d.error ? `ошибка: ${d.error}` : d.notice ? d.notice : 'результат не совпал');
    if (e.type === 'code_check' && !d.solved) (wrong[e.task] = wrong[e.task] || []).push(d.forbidden && d.forbidden.length ? `запрещено: ${d.forbidden.join(', ')}` : `тестов ${d.passed}/${d.total}`);
  });

  const items = score.items.map((it) => {
    const t = it.task;
    const row = byTask.get(t.id) || null;
    const w = wrong[t.id] || [];
    let status;
    if (t.kind === 'report') status = row && row.submittedAt ? 'отправлен, ждёт оценки' : row && row.draft ? 'черновик не отправлен' : 'не писал';
    else if (t.kind === 'bug') status = !row || !row.submittedAt ? (row && row.runs ? `не отправлено, запусков ${row.runs}` : 'не начато') : row.solved ? 'исправлено' : `не исправлено (${row.result ? row.result.passed + '/' + row.result.total + ' тестов' : 'без прогона'})`;
    else status = row && row.solved ? 'решено' : row && (row.attempts || row.draft) ? 'не решено' : 'не начато';
    const attempts = row ? row.attempts : 0;
    return {
      id: t.id,
      stage: t.stage,
      kind: t.kind,
      title: t.title,
      points: it.points,
      max: t.points,
      solved: !!(row && row.solved),
      started: !!row,
      status,
      attempts,
      runs: row ? row.runs : 0,
      wrong: w,
      firstTry: !!(row && row.solved && w.length === 0),
      minutes: Math.round((spent[t.id] || 0) / 60),
      expected: scenario.answers[t.id] || null,
      answer: row ? row.answer : null,
    };
  });

  const stages = exam.STAGES.map((s) => {
    const own = items.filter((i) => i.stage === s.n);
    const got = own.reduce((a, i) => a + (i.points || 0), 0);
    const max = own.reduce((a, i) => a + i.max, 0);
    return { ...s, got: Math.round(got * 10) / 10, max, solved: own.filter((i) => i.solved).length, total: own.length };
  });

  const cmds = events.filter((e) => e.type === 'terminal_cmd');
  const termErrors = cmds.filter((e) => TERM_ERRORS.test(String(e.data.output || '').split('\n').slice(0, 3).join('\n')));
  const cmdNames = {};
  cmds.forEach((e) => {
    const words = String(e.data.cmd || '').trim().split(/\s+/);
    const name = words[0] === 'sudo' ? words[1] : words[0];
    if (name && !/^\(/.test(name)) cmdNames[name] = (cmdNames[name] || 0) + 1;
  });
  const sqlRuns = events.filter((e) => e.type === 'sql_run' || e.type === 'sql_check');
  const sqlErrors = sqlRuns.filter((e) => e.data.error).map((e) => e.data.error);
  const errKinds = {};
  sqlErrors.forEach((m) => {
    const k = /no such column/i.test(m) ? 'нет такого столбца' : /no such table/i.test(m) ? 'нет такой таблицы' : /syntax error/i.test(m) ? 'синтаксическая ошибка' : /ожидается|можно использовать только/i.test(m) ? 'не тот оператор' : /ambiguous/i.test(m) ? 'неоднозначный столбец' : /constraint|UNIQUE|FOREIGN/i.test(m) ? 'нарушено ограничение (ключ)' : 'другое';
    errKinds[k] = (errKinds[k] || 0) + 1;
  });
  const runs = events.filter((e) => e.type === 'code_run');
  const runErrors = events.filter((e) => e.type === 'code_run_result' && (e.data.error || e.data.timeout));
  const pastes = events.filter((e) => e.type === 'paste' || e.type === 'terminal_paste');
  const bigPastes = pastes.filter((e) => (e.data.chars || 0) > 200);
  const first = events.length ? events[0].ts : null;
  const last = events.length ? events[events.length - 1].ts : null;
  const active = events.filter((e) => !['visibility', 'blur', 'focus', 'idle', 'page_leave', 'device_info'].includes(e.type));

  return {
    student,
    variant,
    themeLabel: examAdmin.THEME_LABELS[variant.theme],
    score,
    grade: exam.gradeOf(score.total),
    items,
    stages,
    terminal: { count: cmds.length, errors: termErrors.length, top: Object.entries(cmdNames).sort((a, b) => b[1] - a[1]).slice(0, 8), sudo: cmds.filter((e) => /^\s*sudo\b/.test(e.data.cmd || '')).length },
    sql: { count: sqlRuns.length, errors: sqlErrors.length, kinds: errKinds },
    code: { runs: runs.length, runErrors: runErrors.length },
    behaviour: {
      first,
      last,
      minutes: first ? Math.round((Date.parse(last) - Date.parse(first)) / 60000) : 0,
      actions: active.length,
      pastes: pastes.length,
      bigPastes: bigPastes.map((e) => ({ at: time(e.ts), task: e.task, chars: e.data.chars, target: e.data.target || 'терминал' })),
      // Leaving the tab (window blur also fires on clicks into the terminal frame, too noisy to count).
      away: events.filter((e) => e.type === 'visibility' && e.data && e.data.state === 'hidden').length,
      idle: Math.round(detail.counts.idleSeconds / 60),
      pcs: [...new Set(events.filter((e) => e.type === 'device' || e.type === 'device_change').map((e) => e.data.pc || `не ПК аудитории (${e.data.ip})`))],
      blocked: events.filter((e) => e.type === 'device_blocked').length,
      servers: [...new Set(events.map((e) => e.server).filter(Boolean))],
      pastedSolutions,
    },
    path: detail.path.steps,
  };
}

// --------------------------------------------------------------- the texts ---

function summaryText(r) {
  const out = [];
  const strong = r.stages.filter((s) => s.max && s.got / s.max >= 0.8);
  const weak = r.stages.filter((s) => s.max && s.got / s.max < 0.5);
  const lead = r.score.total >= 86 ? 'Отличный результат' : r.score.total >= 71 ? 'Хороший результат' : r.score.total >= 56 ? 'Удовлетворительный результат' : r.score.total > 0 ? 'Слабый результат' : 'Контрольная фактически не выполнена';
  out.push(`${lead}: **${r.score.total} из 90** баллов за автоматически проверяемые задания (отчёт ещё не оценён).`);
  if (strong.length) out.push(`Сильные стороны — ${strong.map((s) => `этап ${s.n} «${s.title}» (${pct(s.got, s.max)}%)`).join(', ')}.`);
  if (weak.length) out.push(`Слабые места — ${weak.map((s) => `этап ${s.n} «${s.title}» (${pct(s.got, s.max)}%)`).join(', ')}.`);
  const firstTry = r.items.filter((i) => i.firstTry);
  if (firstTry.length) out.push(`С первой попытки решено ${firstTry.length} ${plural(firstTry.length, 'задание', 'задания', 'заданий')}.`);
  const hard = r.items.filter((i) => i.wrong.length >= 3).sort((a, b) => b.wrong.length - a.wrong.length);
  if (hard.length) out.push(`Больше всего ошибок: ${hard.slice(0, 3).map((i) => `${i.id} «${i.title}» — ${i.wrong.length} неверных ${plural(i.wrong.length, 'попытка', 'попытки', 'попыток')}${i.solved ? ', в итоге решено' : ', не решено'}`).join('; ')}.`);
  const untouched = r.items.filter((i) => !i.started && i.kind !== 'report');
  if (untouched.length) out.push(`Не начаты: ${untouched.map((i) => i.id).join(', ')}.`);
  return out.join(' ');
}

function plural(n, one, few, many) {
  const m10 = n % 10;
  const m100 = n % 100;
  return m10 === 1 && m100 !== 11 ? one : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? few : many;
}

function behaviourNotes(r) {
  const b = r.behaviour;
  const notes = [];
  if (b.pcs.length > 1) notes.push(`работал за ${b.pcs.length} компьютерами (${b.pcs.join(', ')})`);
  if (b.blocked) notes.push(`${b.blocked} ${plural(b.blocked, 'попытка', 'попытки', 'попыток')} открыть контрольную не с ПК аудитории`);
  if (b.bigPastes.length) notes.push(`${b.bigPastes.length} ${plural(b.bigPastes.length, 'большая вставка', 'большие вставки', 'больших вставок')} из буфера (больше 200 символов)`);
  if (b.away >= 15) notes.push(`часто переключался на другие вкладки или окна (${b.away} раз)`);
  if (b.idle >= 20) notes.push(`бездействие ${b.idle} мин`);
  if (b.pastedSolutions.length) notes.push(`решение вставлено из буфера и почти сразу засчитано (написано вне сайта или перенесено — стоит уточнить): ${b.pastedSolutions.map((p) => `${p.task} (${p.chars} симв., проверка через ${p.seconds} с)`).join(', ')}`);
  if (b.servers.length > 1) notes.push('работал на двух серверах (здесь и на временном), засчитан лучший результат');
  return notes;
}

// ------------------------------------------------------------- the portrait ---

const COLORS = { done: '#2E8B57', part: '#E0A526', fail: '#C8463D', none: '#C9C5BD', pending: '#5B7FB0' };

function portrait(r) {
  const W = 760;
  const H = 410;
  const rows = r.stages
    .map((s, i) => {
      const y = 120 + i * 30;
      const w = s.max ? Math.round((s.got / s.max) * 360) : 0;
      const color = s.n === 6 ? COLORS.pending : !s.max || s.got / s.max >= 0.8 ? COLORS.done : s.got / s.max >= 0.5 ? COLORS.part : COLORS.fail;
      return `<text x="24" y="${y + 15}" class="l">${s.n}. ${esc(s.title.split(':')[0])}</text>
  <rect x="300" y="${y + 2}" width="360" height="18" rx="4" fill="#EEEBE5"/>
  <rect x="300" y="${y + 2}" width="${s.n === 6 ? 360 : w}" height="18" rx="4" fill="${color}"${s.n === 6 ? ' opacity="0.35"' : ''}/>
  <text x="670" y="${y + 15}" class="v">${s.n === 6 ? 'ждёт оценки' : `${s.got} / ${s.max}`}</text>`;
    })
    .join('\n  ');
  const cells = r.items
    .map((it, i) => {
      const x = 24 + i * 34;
      const state = it.kind === 'report' ? 'pending' : it.solved ? 'done' : !it.started ? 'none' : it.wrong.length || it.attempts ? 'fail' : 'part';
      return `<rect x="${x}" y="${H - 64}" width="30" height="30" rx="4" fill="${COLORS[state]}"><title>${it.id} ${esc(it.title)}: ${esc(it.status)}</title></rect>
  <text x="${x + 15}" y="${H - 45}" class="c">${it.id}</text>`;
    })
    .join('\n  ');
  const ring = Math.round((r.score.total / 90) * 100);
  const circ = 2 * Math.PI * 34;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Open Sans, Arial, sans-serif">
  <style>.l{font-size:13px;fill:#2B2A28}.v{font-size:12px;fill:#55524C}.c{font-size:10px;fill:#fff;text-anchor:middle;font-weight:600}.t{font-size:20px;font-weight:700;fill:#1C1B1A}.s{font-size:13px;fill:#6F6B64}</style>
  <rect width="${W}" height="${H}" rx="14" fill="#FBF8F2" stroke="#DDD5C9"/>
  <text x="24" y="38" class="t">${esc(r.student.name)}</text>
  <text x="24" y="60" class="s">${esc(r.student.id)} · вариант №${r.variant.index + 1}, тема «${esc(r.themeLabel)}» · ${r.behaviour.minutes} мин работы</text>
  <text x="24" y="80" class="s">ПК: ${esc((r.behaviour.pcs.join(', ') || '—').slice(0, 80))}${r.behaviour.pcs.join(', ').length > 80 ? '…' : ''}</text>
  <text x="24" y="108" class="s">Баллы по этапам</text>
  <g transform="translate(${W - 64},58)">
    <circle r="34" fill="#FBF8F2" stroke="#EEEBE5" stroke-width="9"/>
    <circle r="34" fill="none" stroke="${r.score.total >= 71 ? COLORS.done : r.score.total >= 56 ? COLORS.part : COLORS.fail}" stroke-width="9" stroke-dasharray="${(circ * ring) / 100} ${circ}" transform="rotate(-90)"/>
    <text y="2" text-anchor="middle" font-size="18" font-weight="700" fill="#1C1B1A">${r.score.total}</text>
    <text y="20" text-anchor="middle" class="v" font-size="10">из 90</text>
  </g>
  ${rows}
  <text x="24" y="${H - 80}" class="s">Задания: зелёный — решено, красный — ошибки / не решено, серый — не начато, синий — отчёт ждёт оценки</text>
  ${cells}
</svg>
`;
}

// ------------------------------------------------------------ the markdown ---

function studentMd(r) {
  const b = r.behaviour;
  const lines = [
    `# ${r.student.name}`,
    '',
    `**${r.student.id}**, группа ${r.student.group} · вариант №${r.variant.index + 1}, тема «${r.themeLabel}» · ${def.title}: ${def.subtitle.toLowerCase()}`,
    '',
    `![Портрет результата](img/${r.student.id}.svg)`,
    '',
    '## Итог',
    '',
    `- Баллы: **${r.score.total} из 90** за задания с автопроверкой; отчёт (10 баллов) ещё не оценён. Предварительная оценка без отчёта: **${exam.gradeOf(r.score.total)}**, с отчётом на 10 баллов — **${exam.gradeOf(r.score.total + 10)}**.`,
    `- Работал: ${b.first ? `${time(b.first)}–${time(b.last)} (20.10.2026), ${b.minutes} мин` : '—'}, действий: ${b.actions}.`,
    `- Компьютеры: ${b.pcs.join(', ') || '—'}.`,
    '',
    summaryText(r),
    '',
    '## Баллы по этапам',
    '',
    '| Этап | Баллы | Решено заданий |',
    '|---|---|---|',
    ...r.stages.map((s) => `| ${s.n}. ${s.title} | ${s.n === 6 ? 'ждёт оценки' : `${s.got} / ${s.max} (${pct(s.got, s.max)}%)`} | ${s.n === 6 ? '—' : `${s.solved} из ${s.total}`} |`),
    '',
    '## Задания',
    '',
    '| Задание | Тип | Итог | Баллы | Попыток | Неверных | Время |',
    '|---|---|---|---|---|---|---|',
    ...r.items.map((i) => `| ${i.id}. ${mdCell(i.title)} | ${KIND[i.kind]} | ${mdCell(i.status)} | ${i.points === null ? '—' : i.points} / ${i.max} | ${i.attempts}${i.kind === 'bug' ? `, запусков ${i.runs}` : ''} | ${i.wrong.length} | ${i.minutes ? i.minutes + ' мин' : '—'} |`),
    '',
    '## На что опирался',
    '',
  ];
  const firstTry = r.items.filter((i) => i.firstTry);
  lines.push(firstTry.length ? firstTry.map((i) => `- ${i.id} «${i.title}» — решено с первой попытки`).join('\n') : '- Заданий, решённых с первой попытки, нет.');
  const strongStages = r.stages.filter((s) => s.n !== 6 && s.max && s.got === s.max);
  if (strongStages.length) lines.push(...strongStages.map((s) => `- Этап ${s.n} «${s.title}» выполнен полностью`));
  if (r.terminal.top.length) lines.push(`- Команды терминала, которыми пользовался чаще всего: ${r.terminal.top.map(([c, n]) => `\`${c}\` (${n})`).join(', ')}; через \`sudo\` — ${r.terminal.sudo}.`);
  lines.push('', '## Где было больше всего ошибок', '');
  const withErrors = r.items.filter((i) => i.wrong.length).sort((a, b) => b.wrong.length - a.wrong.length);
  if (!withErrors.length) lines.push('- Неверных ответов и проверок не было.');
  withErrors.forEach((i) => {
    const sample = [...new Set(i.wrong)].slice(0, 4).map((w) => `«${mdCell(w).slice(0, 80)}»`).join(', ');
    lines.push(`- **${i.id} «${i.title}»** — ${i.wrong.length} ${plural(i.wrong.length, 'неверная попытка', 'неверные попытки', 'неверных попыток')}${i.solved ? ', в итоге решено' : ', не решено'}. Примеры: ${sample}.${i.kind === 'flag' && !i.solved ? ` Правильный ответ: \`${i.expected}\`.` : ''}`);
  });
  const bugsFailed = r.items.filter((i) => i.kind === 'bug' && i.started && !i.solved);
  bugsFailed.forEach((i) => lines.push(`- **${i.id} «${i.title}»** (программа с ошибкой) — ${i.status}.`));
  lines.push(`- Терминал: ${r.terminal.count} команд, из них с ошибкой ${r.terminal.errors} (${pct(r.terminal.errors, r.terminal.count)}%: нет такого файла, команда не найдена, нет прав и т.п.).`);
  lines.push(`- SQL: ${r.sql.count} запусков, с ошибкой ${r.sql.errors}${Object.keys(r.sql.kinds).length ? ` — ${Object.entries(r.sql.kinds).map(([k, n]) => `${k}: ${n}`).join(', ')}` : ''}.`);
  lines.push(`- Программы: ${r.code.runs} запусков, завершились ошибкой или по времени: ${r.code.runErrors}.`);
  lines.push('', '## Поведение во время контрольной', '');
  lines.push(`- Вставок из буфера: ${b.pastes}${b.bigPastes.length ? `, из них больших: ${b.bigPastes.map((p) => `${p.at} ${p.task || ''} ${p.chars} симв. в ${p.target}`).join('; ')}` : ''}.`);
  lines.push(`- Переключений на другие вкладки или окна: ${b.away}. Бездействие: ${b.idle} мин.`);
  const notes = behaviourNotes(r);
  if (notes.length) lines.push(`- Обратить внимание: ${notes.join('; ')}.`);
  lines.push('', '## Путь по заданиям', '');
  lines.push(r.path.length ? r.path.map((s) => `${s.place} (${Math.max(1, Math.round(s.seconds / 60))} мин)`).join(' → ') : '—');
  lines.push('', `---`, `Отчёт собран ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC скриптом \`scripts/exam/report.js\` из базы и журнала действий. Подробный журнал — в админке: \`/admin/exam/${def.id}/students/${r.student.id}\`.`, '');
  return lines.join('\n');
}

function groupMd(results, absent) {
  const lines = [
    `# ${def.title}: ${def.subtitle.toLowerCase()} — итоги группы ${def.group}`,
    '',
    `Контрольная проходила 20.10.2026 (на двух серверах; работа с временного сервера перенесена в основную базу, по каждому заданию засчитан лучший результат). Писали **${results.length}** из ${results.length + absent.length} студентов.`,
    '',
    'Баллы — за задания с автопроверкой (90 из 100). Отчёт об инциденте (10 баллов) ещё не оценён преподавателем, поэтому оценка **предварительная**: «без отчёта» и «с отчётом на 10».',
    '',
    '## Рейтинг',
    '',
    '| № | Студент | Тема | Баллы (из 90) | Оценка без отчёта / с отчётом | Linux | Журнал | Код | SQL | Цезарь | Время | ПК |',
    '|---|---|---|---|---|---|---|---|---|---|---|---|',
  ];
  results
    .slice()
    .sort((a, b) => b.score.total - a.score.total)
    .forEach((r, i) => {
      const st = (n) => {
        const s = r.stages.find((x) => x.n === n);
        return `${s.got}/${s.max}`;
      };
      lines.push(`| ${i + 1} | [${mdCell(r.student.name)}](${r.student.id}.md) | ${r.themeLabel} | **${r.score.total}** | ${exam.gradeOf(r.score.total)} / ${exam.gradeOf(r.score.total + 10)} | ${st(1)} | ${st(2)} | ${st(3)} | ${st(4)} | ${st(5)} | ${r.behaviour.minutes} мин | ${r.behaviour.pcs.join(', ')} |`);
    });
  if (absent.length) lines.push('', `Не открывали контрольную: ${absent.map((s) => `${s.name} (${s.id})`).join(', ')}.`);

  // tasks over the group
  const ids = results[0].items.map((i) => i.id);
  lines.push('', '## Задания: что далось легко, что трудно', '', '| Задание | Решили | С первой попытки | Неверных попыток всего | Не начинали |', '|---|---|---|---|---|');
  const taskStats = ids.map((id) => {
    const its = results.map((r) => r.items.find((i) => i.id === id));
    return {
      id,
      title: its[0].kind === 'algorithm' || its[0].kind === 'bug' ? KIND[its[0].kind] : its[0].title,
      kind: its[0].kind,
      solved: its.filter((i) => i.solved).length,
      firstTry: its.filter((i) => i.firstTry).length,
      wrong: its.reduce((a, i) => a + i.wrong.length, 0),
      untouched: its.filter((i) => !i.started).length,
    };
  });
  taskStats.filter((t) => t.kind !== 'report').forEach((t) => lines.push(`| ${t.id}. ${mdCell(t.title)} | ${t.solved} из ${results.length} | ${t.firstTry} | ${t.wrong} | ${t.untouched} |`));
  const hardest = taskStats.filter((t) => t.kind !== 'report').sort((a, b) => a.solved - b.solved || b.wrong - a.wrong).slice(0, 5);
  const easiest = taskStats.filter((t) => t.kind !== 'report').sort((a, b) => b.firstTry - a.firstTry).slice(0, 5);
  lines.push('', `**Труднее всего:** ${hardest.map((t) => `${t.id} (${t.title}; решили ${t.solved}, неверных попыток ${t.wrong})`).join(', ')}.`);
  lines.push('', `**Легче всего:** ${easiest.map((t) => `${t.id} (${t.title}; с первой попытки ${t.firstTry})`).join(', ')}.`);

  // stages
  lines.push('', '## Этапы по группе', '', '| Этап | Средний процент | Полностью выполнили |', '|---|---|---|');
  exam.STAGES.filter((s) => s.n !== 6).forEach((s) => {
    const own = results.map((r) => r.stages.find((x) => x.n === s.n));
    lines.push(`| ${s.n}. ${s.title} | ${Math.round(own.reduce((a, x) => a + pct(x.got, x.max), 0) / own.length)}% | ${own.filter((x) => x.got === x.max).length} |`);
  });

  // common mistakes
  const sqlKinds = {};
  results.forEach((r) => Object.entries(r.sql.kinds).forEach(([k, n]) => (sqlKinds[k] = (sqlKinds[k] || 0) + n)));
  const term = results.reduce((a, r) => [a[0] + r.terminal.count, a[1] + r.terminal.errors], [0, 0]);
  lines.push('', '## Частые ошибки', '');
  lines.push(`- Терминал: ${term[0]} команд, ${term[1]} с ошибкой (${pct(term[1], term[0])}%) — чаще всего неверные пути, опечатки в командах и чтение файлов root без \`sudo\`.`);
  lines.push(`- SQL: ${Object.entries(sqlKinds).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} — ${n}`).join(', ') || 'ошибок нет'}.`);
  const bugs = taskStats.filter((t) => t.kind === 'bug');
  lines.push(`- Программы с ошибками: исправили ${bugs.reduce((a, t) => a + t.solved, 0)} из ${bugs.length * results.length} программ.`);
  // One test short: usually the program was rewritten and lost an edge case the original handled.
  bugs.forEach((t) => {
    const near = results.filter((r) => {
      const row = db.getExamTask(def.id, r.student.id, t.id);
      return row && row.submittedAt && !row.solved && row.result && row.result.passed === row.result.total - 1;
    });
    if (near.length >= 2) {
      lines.push(`- ${t.id}: ${near.length} ${plural(near.length, 'студент прошёл', 'студента прошли', 'студентов прошли')} все тесты, кроме одного (${near.map((r) => r.student.id).join(', ')}). Обычно это крайний случай (пустой ввод, нет подходящих записей), который исходная программа обрабатывала, а при переписывании программы целиком он потерялся. В описании задания этот случай отдельно не оговорён — стоит решить, засчитывать ли такие решения частично.`);
    }
  });

  // the same code at different students (comments and blank lines ignored; variants differ, so
  // only algorithms of the same theme/wording or bug programs of the same version can match)
  const norm = (code) => String(code || '').split('\n').map((l) => l.replace(/#.*$/, '').trim()).filter(Boolean).join('\n');
  const same = [];
  ids.forEach((id) => {
    const groups = new Map();
    results.forEach((r) => {
      const row = db.getExamTask(def.id, r.student.id, id);
      const it = r.items.find((i) => i.id === id);
      if (!row || !row.answer || !['algorithm', 'sql'].includes(it.kind) && !(it.kind === 'bug' && row.submittedAt)) return;
      // The same one-line fix of a bug program is expected; only rewritten programs count.
      if (it.kind === 'bug' && changedLines(row.answer, exam.findTask(r.variant, id).starter) <= 3) return;
      const key = norm(row.answer).toLowerCase().replace(/\s+/g, ' ');
      if (key.length < 40) return;
      groups.set(key, [...(groups.get(key) || []), r.student.id]);
    });
    groups.forEach((who) => who.length > 1 && same.push(`${id}: ${who.join(', ')}`));
  });

  // behaviour
  lines.push('', '## Одинаковые решения у разных студентов', '');
  lines.push('Сравниваются алгоритмы, SQL и переписанные (больше 3 изменённых строк) программы с ошибками; пустые строки и комментарии не учитываются. Одинаковое короткое исправление одной строки — норма и не показывается.', '');
  lines.push(same.length ? same.map((x) => `- ${x}`).join('\n') : '- Совпадающих решений нет.');
  lines.push('', '## На что обратить внимание', '');
  const flagged = results.map((r) => [r, behaviourNotes(r)]).filter(([, n]) => n.length);
  if (!flagged.length) lines.push('- Ничего подозрительного.');
  flagged.forEach(([r, n]) => lines.push(`- **${r.student.name}** (${r.student.id}): ${n.join('; ')}.`));
  lines.push('', '---', `Собрано ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC: \`node scripts/exam/report.js\`. Отчёты студентов — в файлах \`<id>.md\`, портреты — в \`img/\`.`, '');
  return lines.join('\n');
}

// ------------------------------------------------------------------- main ---

const students = examAdmin.studentsOf(def);
const results = [];
const absent = [];
for (const s of students) {
  if (!db.getExamVariant(def.id, s.id) || !readLog(def.id, s.id).length) {
    absent.push(s);
    continue;
  }
  results.push(analyse(s));
}
fs.mkdirSync(path.join(OUT, 'img'), { recursive: true });
for (const r of results) {
  fs.writeFileSync(path.join(OUT, `${r.student.id}.md`), studentMd(r));
  fs.writeFileSync(path.join(OUT, 'img', `${r.student.id}.svg`), portrait(r));
}
fs.writeFileSync(path.join(OUT, 'README.md'), groupMd(results, absent));
console.log(`Готово: ${OUT} — общий отчёт README.md, отчётов студентов: ${results.length}, не писали: ${absent.length}.`);
