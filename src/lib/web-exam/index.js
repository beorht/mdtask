// Итоговая контрольная работа группы WEB «Веб-приложение по техническому заданию» (plan: docs/web-exam-plan.md).
// One task for the whole exam: a small application (index.html, style.css, script.js) written in the on-site
// editor and run in a sandboxed preview in the student's browser. Every student gets a theme and personal data
// and rules (variantOf); the teacher grades 10 requirements by hand (0 / 5 / 10 points each) on /admin/web-exam.
// Files autosave into exam_tasks (task 'app'), and every minute (and on «Сохранить») a full snapshot is kept in
// data/exam/<exam>/snapshots/<student>/ next to the action log (src/lib/exam/log.js) for the teacher.
// The window, practice lock, device check and variants reuse the IB exam tables (exams, exam_variants, exam_tasks).
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const db = require('../../db');
const { hasFullAccess } = require('../test-access');
const { examDir } = require('../exam/log');
const { createZip } = require('../code-submission');

const EXAMS = {
  'web-final-1': {
    id: 'web-final-1',
    kind: 'web',
    title: 'Итоговая контрольная работа',
    subtitle: 'Веб-приложение по техническому заданию',
    group: 'web-2', // группа WEB переименована 27.10.2026 (scripts/fixes/2026-10-27-regroup.js)
    // По умолчанию — 27 ноября 2026, 9:00–11:50 (+05); точное время ставит преподаватель в админке.
    startsAt: '2026-11-27T04:00:00.000Z',
    endsAt: '2026-11-27T06:50:00.000Z',
  },
};

const TASK_ID = 'app';
const FILES = ['index.html', 'style.css', 'script.js'];
const MAX_FILE = 60000;
const SNAPSHOT_EVERY_MS = 60 * 1000;
const SUBMIT_GRACE_MS = 2 * 60 * 1000;
const MARKS = [0, 5, 10];

// --------------------------------------------------------------- themes ---

const THEMES = {
  library: {
    app: 'Каталог библиотеки', item: 'книга', items: 'книги', name: 'Название', category: 'Жанр',
    categories: ['Роман', 'Фантастика', 'Детектив', 'Поэзия'],
    number: 'Страниц', unit: 'стр.', range: [96, 880], extra: 'Автор',
    names: ['Тихий Дон', 'Мастер и Маргарита', 'Пикник на обочине', 'Шум времени', 'Белая гвардия', 'Солярис',
      'Десять негритят', 'Евгений Онегин', 'Мцыри', 'Аэлита', 'Собака Баскервилей', 'Обломов', 'Дюна', 'Вишнёвый сад'],
    extras: ['Шолохов', 'Булгаков', 'Стругацкие', 'Лем', 'Кристи', 'Пушкин', 'Лермонтов', 'Толстой', 'Конан Дойл', 'Гончаров'],
    hot: 'толстые', hotClass: 'is-thick',
  },
  shop: {
    app: 'Магазин электроники', item: 'товар', items: 'товары', name: 'Название', category: 'Категория',
    categories: ['Ноутбуки', 'Телефоны', 'Наушники', 'Мониторы'],
    number: 'Цена', unit: 'сум', range: [150000, 12000000], step: 10000, extra: 'Бренд',
    names: ['Aero 14', 'Nova X', 'Pulse Buds', 'View 27', 'Swift 5', 'Note 13', 'Bass One', 'Pro Display', 'Zen Air',
      'Pixel Lite', 'Studio Max', 'Wide 32', 'Book S', 'Phone Mini'],
    extras: ['Acer', 'Samsung', 'Sony', 'LG', 'Asus', 'Xiaomi', 'Lenovo', 'JBL', 'Huawei', 'Dell'],
    hot: 'дорогие', hotClass: 'is-expensive',
  },
  cinema: {
    app: 'Афиша кинотеатра', item: 'фильм', items: 'фильмы', name: 'Название', category: 'Жанр',
    categories: ['Комедия', 'Драма', 'Мультфильм', 'Боевик'],
    number: 'Длительность', unit: 'мин', range: [72, 185], extra: 'Режиссёр',
    names: ['Небо над городом', 'Последний рейс', 'Кот в сапогах', 'Тёплый вечер', 'Тихая гавань', 'Погоня',
      'Пять друзей', 'Лабиринт', 'Снежная сказка', 'Город огней', 'Долгий путь', 'Шторм', 'Каникулы', 'Маяк'],
    extras: ['Иванов', 'Каримов', 'Петрова', 'Юсупов', 'Смирнова', 'Алиев', 'Орлов', 'Рахимова', 'Ким', 'Лебедев'],
    hot: 'длинные', hotClass: 'is-long',
  },
  recipes: {
    app: 'Книга рецептов', item: 'блюдо', items: 'блюда', name: 'Название', category: 'Раздел',
    categories: ['Супы', 'Салаты', 'Выпечка', 'Горячее'],
    number: 'Калорийность', unit: 'ккал', range: [80, 920], extra: 'Основной продукт',
    names: ['Шурпа', 'Ачичук', 'Самса', 'Плов', 'Мастава', 'Винегрет', 'Лагман', 'Манты', 'Оливье', 'Борщ',
      'Шарлотка', 'Нарын', 'Лепёшка', 'Цезарь'],
    extras: ['говядина', 'помидоры', 'тыква', 'рис', 'баранина', 'свёкла', 'мука', 'курица', 'яблоки', 'картофель'],
    hot: 'калорийные', hotClass: 'is-heavy',
  },
  team: {
    app: 'Задачи команды', item: 'задача', items: 'задачи', name: 'Задача', category: 'Приоритет',
    categories: ['Срочно', 'Высокий', 'Обычный', 'Низкий'],
    number: 'Оценка', unit: 'ч', range: [1, 40], extra: 'Исполнитель',
    names: ['Вёрстка главной', 'Форма входа', 'Поиск по сайту', 'Корзина', 'Отчёт за месяц', 'Тесты API',
      'Тёмная тема', 'Импорт данных', 'Страница профиля', 'Рассылка', 'Резервные копии', 'Меню', 'Логотип', 'Каталог'],
    extras: ['Азиз', 'Мадина', 'Олег', 'Дилноза', 'Тимур', 'Анна', 'Жасур', 'Камила', 'Илья', 'Севара'],
    hot: 'долгие', hotClass: 'is-long',
  },
  sport: {
    app: 'Спортивный клуб', item: 'секция', items: 'секции', name: 'Секция', category: 'Вид спорта',
    categories: ['Футбол', 'Плавание', 'Шахматы', 'Бокс'],
    number: 'Цена в месяц', unit: 'сум', range: [90000, 650000], step: 5000, extra: 'Тренер',
    names: ['Юниоры', 'Старт', 'Профи', 'Утренняя', 'Вечерняя', 'Детская', 'Взрослая', 'Олимп', 'Чемпион',
      'Новички', 'Выходного дня', 'Сборная', 'Лига', 'Рекорд'],
    extras: ['Бахтиёр', 'Елена', 'Шерзод', 'Ольга', 'Рустам', 'Гульноза', 'Сергей', 'Нодира', 'Фарход', 'Мария'],
    hot: 'дорогие', hotClass: 'is-expensive',
  },
};
const THEME_KEYS = Object.keys(THEMES);
const TOTALS = [
  { key: 'sum', label: 'сумма' },
  { key: 'avg', label: 'среднее (округлить до целого)' },
  { key: 'max', label: 'наибольшее значение' },
];

// ------------------------------------------------------------ variants ---

function rngFrom(seed) {
  let h = crypto.createHash('sha256').update(String(seed)).digest();
  let i = 0;
  return () => {
    if (i + 4 > h.length) {
      h = crypto.createHash('sha256').update(h).digest();
      i = 0;
    }
    const v = h.readUInt32LE(i) / 0x100000000;
    i += 4;
    return v;
  };
}

function pick(rnd, list) {
  return list[Math.floor(rnd() * list.length)];
}

function shuffle(rnd, list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function roundTo(n, step) {
  return step ? Math.round(n / step) * step : Math.round(n);
}

// Everything personal, rebuilt from the variant (theme + seed): data, rules, storage key.
function variantOf(variant) {
  const th = THEMES[variant.theme] || THEMES.library;
  const rnd = rngFrom(`${variant.seed}/${variant.theme}`);
  const [lo, hi] = th.range;
  const span = hi - lo;
  const names = shuffle(rnd, th.names).slice(0, 8);
  const cats = shuffle(rnd, th.categories);
  const items = names.map((name, i) => ({
    name,
    category: i < cats.length ? cats[i] : pick(rnd, th.categories),
    number: roundTo(lo + rnd() * span, th.step),
    extra: pick(rnd, th.extras),
  }));
  const shuffled = shuffle(rnd, items);
  const sortedNums = shuffled.map((x) => x.number).sort((a, b) => a - b);
  const threshold = roundTo((sortedNums[4] + sortedNums[5]) / 2, th.step);
  const minValue = roundTo(lo - span * (0.05 + rnd() * 0.1), th.step);
  const maxValue = roundTo(hi + span * (0.05 + rnd() * 0.2), th.step);
  const code = crypto.createHash('sha256').update(String(variant.seed)).digest('hex').slice(0, 4);
  return {
    theme: variant.theme,
    ...th,
    data: shuffled,
    threshold,
    minValue: Math.max(th.step || 1, minValue),
    maxValue,
    minName: 2 + Math.floor(rnd() * 3),
    total: TOTALS[Math.floor(rnd() * TOTALS.length)],
    storageKey: `${variant.theme}-${code}`,
  };
}

// The student's position in the group picks the theme, so neighbours get different themes.
function issueVariant(exam, studentId, index) {
  const theme = THEME_KEYS[((index % THEME_KEYS.length) + THEME_KEYS.length) % THEME_KEYS.length];
  const seed = `${exam.id}:${studentId}:${crypto.randomBytes(6).toString('hex')}`;
  db.saveExamVariant(exam.id, studentId, theme, seed, { index });
  return db.getExamVariant(exam.id, studentId);
}

// --------------------------------------------------------- requirements ---

function fmt(n, v) {
  return `${Number(n).toLocaleString('ru-RU')} ${v.unit}`;
}

// The 10 requirements the teacher grades (each 0 / 5 / 10). Text only — no code, as in every assignment.
function requirementsOf(v) {
  return [
    { id: 1, title: 'Одностраничное приложение и разметка', text: `«${v.app}» — одностраничное приложение: вся работа в одном index.html, других страниц и ссылок на них нет, страница ни разу не перезагружается. В шапке — название и меню из трёх разделов: «Список» (поиск, фильтр, сортировка, карточки и итог), «Добавить» (форма) и «Избранное» (только карточки, отмеченные «★»). На экране виден только выбранный раздел, его пункт меню выделен; разделы переключает скрипт. Выбранный раздел записывается в адрес после «#» — #list, #add, #favorites: кнопки «Назад» и «Вперёд» переключают разделы, адрес с «#» сразу открывает нужный раздел, без «#» открывается «Список». После добавления записи открывается «Список». Теги header, nav, main, section, form; у каждого поля формы — подпись label.` },
    { id: 2, title: 'Оформление', text: 'Свой style.css: карточки выстроены сеткой (grid или flex) — на широком экране не меньше двух в ряд, при ширине окна меньше 600 пикселей — по одной. Цвета, отступы, шрифты — на ваш вкус, интерфейс должен быть аккуратным.' },
    { id: 3, title: 'Данные', text: `Исходные ${v.items} из таблицы ниже хранятся в script.js как массив объектов. Список карточек строится из этого массива через DOM (создание элементов, textContent) — не вписан в HTML вручную.` },
    { id: 4, title: 'Карточка', text: `Карточка показывает все поля записи: ${v.name.toLowerCase()}, ${v.category.toLowerCase()}, ${v.number.toLowerCase()} (с единицей «${v.unit}»), ${v.extra.toLowerCase()}. Записи, у которых «${v.number}» больше ${fmt(v.threshold, v)} (${v.hot}), выделены: у карточки класс ${v.hotClass} и заметное оформление.` },
    { id: 5, title: 'Поиск', text: `Поле поиска по полю «${v.name}»: без учёта регистра, список обновляется сразу при вводе (не по кнопке).` },
    { id: 6, title: 'Фильтр', text: `Выпадающий список «${v.category}»: «Все» и каждая категория (${v.categories.join(', ')}). Работает вместе с поиском.` },
    { id: 7, title: 'Сортировка', text: `Выпадающий список сортировки: по полю «${v.name}» (А–Я), по полю «${v.number}» по возрастанию и по убыванию. Работает вместе с поиском и фильтром.` },
    { id: 8, title: 'Итог', text: `Под списком строка «Показано: K из N» и ${v.total.label} поля «${v.number}» — только по показанным карточкам. Пересчитывается при любом изменении списка.` },
    { id: 9, title: 'Форма добавления', text: `Все поля обязательные; «${v.name}» — не короче ${v.minName} символов; «${v.number}» — число от ${fmt(v.minValue, v)} до ${fmt(v.maxValue, v)}; «${v.category}» — из списка. При ошибке рядом с полем появляется сообщение, запись не добавляется, страница не перезагружается. После добавления форма очищается.` },
    { id: 10, title: 'Удаление, избранное, сохранение', text: `У каждой карточки кнопки «Удалить» и «★» (избранное, карточка отмечается). Нажатия обрабатывает один обработчик на весь список (делегирование событий). Все изменения — добавленные, удалённые записи и избранное — сохраняются в localStorage под ключом «${v.storageKey}» и восстанавливаются после перезагрузки страницы.` },
  ];
}

const MAX_SCORE = 100;

function gradeOf(total) {
  if (total >= 86) return 5;
  if (total >= 71) return 4;
  if (total >= 56) return 3;
  return 2;
}

// ---------------------------------------------------------------- window ---

function getExamDef(id) {
  return EXAMS[id] || null;
}

function examWindow(exam) {
  const fresh = !db.examExists(exam.id);
  const win = db.ensureExam(exam.id, exam.startsAt, exam.endsAt);
  // The classroom PC list (exam_pcs) is the IB room's; for WEB the check starts in «warn» mode.
  if (fresh) {
    db.setExamDeviceMode(exam.id, 'warn');
    return db.ensureExam(exam.id, exam.startsAt, exam.endsAt);
  }
  return win;
}

function phaseOf(win, now = Date.now()) {
  if (now < Date.parse(win.startsAt)) return 'before';
  if (now >= Date.parse(win.endsAt)) return 'closed';
  return 'open';
}

function phaseFor(exam, user, win = examWindow(exam)) {
  return hasFullAccess(user) ? 'open' : phaseOf(win);
}

// ----------------------------------------------------------------- files ---

function emptyFiles() {
  return Object.fromEntries(FILES.map((f) => [f, '']));
}

function filesOf(row) {
  if (!row || !row.draft) return emptyFiles();
  try {
    const parsed = JSON.parse(row.draft);
    return Object.fromEntries(FILES.map((f) => [f, typeof parsed[f] === 'string' ? parsed[f] : '']));
  } catch (err) {
    return emptyFiles();
  }
}

// Only the three files, strings, each within the limit; null if the body is wrong.
function parseFiles(body) {
  const files = body && body.files;
  if (!files || typeof files !== 'object') return null;
  const out = {};
  for (const f of FILES) {
    const text = files[f];
    if (typeof text !== 'string' || text.length > MAX_FILE) return null;
    out[f] = text;
  }
  return out;
}

function snapshotDir(examId, studentId) {
  if (!/^[A-Za-z0-9._-]+$/.test(studentId)) throw new Error(`bad student id: ${studentId}`);
  return path.join(examDir(examId), 'snapshots', studentId);
}

function saveSnapshot(examId, studentId, seq, files) {
  const name = `${String(seq).padStart(5, '0')}-app.json`;
  const dir = snapshotDir(examId, studentId);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), JSON.stringify({ at: new Date().toISOString(), files }));
  return name;
}

function listSnapshots(examId, studentId) {
  try {
    return fs.readdirSync(snapshotDir(examId, studentId)).filter((n) => /^\d{5}-app\.json$/.test(n)).sort();
  } catch (err) {
    return [];
  }
}

function readSnapshot(examId, studentId, name) {
  if (!/^\d{5}-app\.json$/.test(name)) return null;
  try {
    return JSON.parse(fs.readFileSync(path.join(snapshotDir(examId, studentId), name), 'utf-8'));
  } catch (err) {
    return null;
  }
}

function lastSnapshotAt(examId, studentId) {
  const names = listSnapshots(examId, studentId);
  if (!names.length) return 0;
  try {
    return fs.statSync(path.join(snapshotDir(examId, studentId), names[names.length - 1])).mtimeMs;
  } catch (err) {
    return 0;
  }
}

// ----------------------------------------------------------------- grades ---

// The teacher's marks (exam_tasks.result.marks: {1: 10, 2: 5, …}) and the total.
function gradeState(row) {
  const result = (row && row.result) || {};
  const marks = result.marks || {};
  const graded = Object.keys(marks).length > 0;
  const total = graded ? Object.values(marks).reduce((s, m) => s + (Number(m) || 0), 0) : null;
  return { marks, comment: result.comment || '', graded, total, grade: graded ? gradeOf(total) : null };
}

function parseMarks(body) {
  const marks = {};
  for (let id = 1; id <= 10; id += 1) {
    const raw = body && body[`m${id}`];
    if (raw === undefined || raw === '') continue;
    const n = Number(raw);
    if (!MARKS.includes(n)) return null;
    marks[id] = n;
  }
  return marks;
}

// ---------------------------------------------------------------- archives ---

function readme(student, variantRow, v, row) {
  const g = gradeState(row);
  return [
    `Итоговая контрольная WEB — ${student.name} (${student.id})`,
    `Тема: ${v.app}. Ключ localStorage: ${v.storageKey}.`,
    `Последнее сохранение: ${row && row.updatedAt ? row.updatedAt : '—'}.`,
    g.graded ? `Оценено: ${g.total} из ${MAX_SCORE}, оценка ${g.grade}.` : 'Ещё не оценено.',
    '',
    'index.html, style.css, script.js — последняя сохранённая версия; откройте index.html в браузере.',
    'snapshots/ — снимки кода по ходу контрольной (раз в минуту и при «Сохранить»), log.jsonl — журнал действий.',
    '',
  ].join('\n');
}

function studentEntries(exam, student, prefix = '') {
  const variantRow = db.getExamVariant(exam.id, student.id);
  if (!variantRow) return [];
  const v = variantOf(variantRow);
  const row = db.getExamTask(exam.id, student.id, TASK_ID);
  const files = filesOf(row);
  const entries = FILES.map((f) => ({ name: prefix + f, content: files[f] }));
  entries.push({ name: prefix + 'README.txt', content: readme(student, variantRow, v, row) });
  for (const name of listSnapshots(exam.id, student.id)) {
    const snap = readSnapshot(exam.id, student.id, name);
    if (!snap) continue;
    const dir = `${prefix}snapshots/${name.replace(/\.json$/, '')}/`;
    for (const f of FILES) entries.push({ name: dir + f, content: (snap.files && snap.files[f]) || '' });
  }
  try {
    const file = path.join(examDir(exam.id), 'logs', `${student.id}.jsonl`);
    entries.push({ name: prefix + 'log.jsonl', content: fs.readFileSync(file, 'utf-8') });
  } catch (err) {
    // no log yet
  }
  return entries;
}

function studentZip(exam, student) {
  return createZip(studentEntries(exam, student));
}

function safeFolder(student) {
  return `${student.id}_${student.name}`.replace(/[\\/:*?"<>|\s]+/g, '_');
}

function allZip(exam, students) {
  return createZip(students.flatMap((s) => studentEntries(exam, s, `${safeFolder(s)}/`)));
}

module.exports = {
  EXAMS,
  TASK_ID,
  FILES,
  MAX_FILE,
  MAX_SCORE,
  MARKS,
  SNAPSHOT_EVERY_MS,
  SUBMIT_GRACE_MS,
  THEMES,
  THEME_KEYS,
  getExamDef,
  examWindow,
  phaseOf,
  phaseFor,
  variantOf,
  issueVariant,
  requirementsOf,
  gradeOf,
  gradeState,
  parseMarks,
  filesOf,
  parseFiles,
  saveSnapshot,
  listSnapshots,
  readSnapshot,
  lastSnapshotAt,
  studentZip,
  allZip,
  safeFolder,
};
