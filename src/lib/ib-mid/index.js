// Средняя (промежуточная) контрольная группы ИБ — реестр блоков/заданий, окно и доступ.
// Изолирована от итоговой контрольной (src/lib/exam/*): своя таблица ib_mid_progress, свои маршруты.
// План: docs/todo/2026-11-03-ib-midterm-plan.md.
const { hasFullAccess } = require('../test-access');
const db = require('../../db');

const MID_KEY = 'ib-mid-1';
const MID_TITLE = 'ИБ-контрольная';
const MID_GROUPS = ['ib-2']; // группа ИБ (переименована из IB 27.10.2026); TEST — через hasFullAccess

// Окно проведения хранится в БД (таблица ib_mid_window, одна строка). Пусто = не назначена:
// контрольная закрыта, практика ib-2 не блокируется. Задаёт преподаватель: scripts/ib-mid/set-window.js.

// ready: false — страница задания ещё готовится (наполняется позже). short — код для матрицы админки.
const BLOCKS = [
  {
    key: 'A',
    title: 'Операции на сервере',
    desc: 'Поиск и изменение конфигов (find · grep · sed), настройка SSH, выдача прав доступа — в одной песочнице.',
    tasks: [
      { id: 'a-ops', short: 'A', title: 'Единое терминальное задание', type: 'terminal', ready: true, labTask: 'midterm-a', href: '/exam/ib-mid-1/a-ops/terminal' },
    ],
  },
  {
    key: 'B',
    title: 'Python + sqlite3: анализ таблицы',
    desc: 'По готовой структуре таблицы напишите терминальную программу анализа и вывода.',
    tasks: [
      { id: 'b1-sales', short: 'B1', title: 'Отчёт по продажам', type: 'python-sql', ready: true },
      { id: 'b2-logins', short: 'B2', title: 'Журнал входов', type: 'python-sql', ready: true },
    ],
  },
  {
    key: 'D',
    title: 'Анализ журналов',
    desc: 'По лог-файлам найдите и выведите нежелательные входы и «засветившиеся» в журналах пароли/секреты.',
    tasks: [
      { id: 'd1-logins', short: 'D1', title: 'Нежелательные входы', type: 'python-logs', ready: true },
      { id: 'd2-secrets', short: 'D2', title: 'Утечки паролей в журналах', type: 'python-logs', ready: true },
    ],
  },
  {
    key: 'C',
    title: 'Поиск и исправление ошибок',
    desc: 'Сложный код 50–60 строк с ловушками. Запусков — не больше 4, после 4-го код автоматически отправляется на проверку.',
    tasks: [
      { id: 'c1', short: 'C1', title: 'Программа с ошибкой №1', type: 'bugfix', runsLimit: 4, ready: true },
      { id: 'c2', short: 'C2', title: 'Программа с ошибкой №2', type: 'bugfix', runsLimit: 4, ready: true },
      { id: 'c3', short: 'C3', title: 'Программа с ошибкой №3', type: 'bugfix', runsLimit: 4, ready: true },
    ],
  },
];

const TASKS = BLOCKS.flatMap((b) => b.tasks.map((t) => ({ ...t, block: b.key, blockTitle: b.title })));
const TASK_BY_ID = new Map(TASKS.map((t) => [t.id, t]));
const TOTAL_TASKS = TASKS.length;

function findMidTask(id) {
  return TASK_BY_ID.get(id) || null;
}

// Доступ к предмету: группа ИБ или TEST.
function hasAccess(user) {
  return !!user && (MID_GROUPS.includes(user.group) || hasFullAccess(user));
}

// Состояние окна из БД. Не назначена (пусто) → scheduled:false, всё закрыто.
function windowState(now = Date.now()) {
  const w = db.getMidWindow();
  if (!w || !w.starts_at || !w.ends_at) {
    return { scheduled: false, startsAt: null, endsAt: null, before: false, open: false, after: false };
  }
  const s = Date.parse(w.starts_at);
  const e = Date.parse(w.ends_at);
  return { scheduled: true, startsAt: w.starts_at, endsAt: w.ends_at, before: now < s, open: now >= s && now <= e, after: now > e };
}

// Открыта ли контрольная для студента: TEST — всегда, остальные — внутри окна.
function isOpenFor(user, now = Date.now()) {
  if (hasFullAccess(user)) return true;
  return windowState(now).open;
}

module.exports = {
  MID_KEY,
  MID_TITLE,
  MID_GROUPS,
  BLOCKS,
  TASKS,
  TASK_BY_ID,
  TOTAL_TASKS,
  findMidTask,
  hasAccess,
  windowState,
  isOpenFor,
};
