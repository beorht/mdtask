// Разовая правка преподавателя: отметить задание предмета «Web-разработка: HTML» или «…: CSS» решённым у
// студента (или снять отметку через --unset). Нужна, когда ответ по сути верный, но проверка его не засчитала
// (напр. браузер сам достроил <tbody> / слэш в конце адреса) — чтобы студент мог идти дальше.
// Прогресс (html_progress/css_progress.solved_at) — единственное, что гейтит открытие следующей темы.
//
//   DB_PATH=./data/mdtask.db node scripts/fixes/mark-topic-solved.js --student stWeb-203 --item basics-03
//   DB_PATH=./data/mdtask.db node scripts/fixes/mark-topic-solved.js --subject css --student stWeb-203 --item connect-02
//   ... --item tables-03,tables-05        (несколько заданий через запятую)
//   ... --dry                             (показать и не менять)
//   ... --unset                           (снять отметку)
const db = require('../../src/db');

const SUBJECTS = {
  html: { course: require('../../src/lib/html-course'), get: 'getHtmlProgress', save: 'saveHtmlProgress', title: 'HTML' },
  css: { course: require('../../src/lib/css-course'), get: 'getCssProgress', save: 'saveCssProgress', title: 'CSS' },
};

function arg(name) { const i = process.argv.indexOf(name); return i !== -1 ? process.argv[i + 1] : null; }
const has = (name) => process.argv.includes(name);

const subjectKey = (arg('--subject') || 'html').toLowerCase();
const studentId = arg('--student');
const items = (arg('--item') || '').split(',').map((s) => s.trim()).filter(Boolean);
const dry = has('--dry');
const unset = has('--unset');

const sub = SUBJECTS[subjectKey];
if (!sub) { console.error(`--subject должен быть html или css (получено «${subjectKey}»).`); process.exit(1); }
if (!studentId || !items.length) {
  console.error('Укажите: --student <id> --item <id задания[,ещё]> [--subject html|css] [--unset] [--dry]');
  process.exit(1);
}

const user = db.getUserById(studentId);
if (!user || user.role !== 'student') {
  console.error(`Студент «${studentId}» не найден.`);
  const key = studentId.replace(/[^0-9]/g, '');
  const near = db.getUsers().filter((u) => u.role === 'student' && (key && (u.id.includes(key) || (u.name || '').includes(key))));
  if (near.length) console.error('Похожие:\n' + near.map((u) => `  ${u.id} — ${u.name} (${u.group || '—'})`).join('\n'));
  process.exit(1);
}

const course = sub.course;
const getProgress = () => db[sub.get](studentId);
const now = new Date().toISOString();

console.log(`Предмет: ${sub.title} · Студент: ${user.name} (${user.id}, группа ${user.group || '—'})`);

const affectedTopics = new Set();
for (const itemId of items) {
  const task = course.TASK_BY_ID.get(itemId);
  if (!task) { console.error(`  ✘ «${itemId}» — такого задания нет в предмете ${sub.title}. Пропускаю.`); continue; }
  const row = getProgress().find((r) => r.itemId === itemId) || null;
  const wasSolved = Boolean(row && row.solvedAt);
  if (!unset && wasSolved) { console.log(`  = ${itemId} «${task.title}» — уже решено, пропускаю.`); continue; }
  if (unset && !wasSolved) { console.log(`  = ${itemId} «${task.title}» — и так не решено, пропускаю.`); continue; }
  if (dry) { console.log(`  [dry] ${itemId} «${task.title}» — ${unset ? 'сняли бы отметку' : 'отметили бы решённым'}.`); affectedTopics.add(task.topic); continue; }
  const stats = { ...(row ? row.stats : {}), solvedAt: unset ? null : now };
  db[sub.save](studentId, itemId, stats);
  console.log(`  ✔ ${itemId} «${task.title}» — ${unset ? 'отметка снята' : 'отмечено решённым'}.`);
  affectedTopics.add(task.topic);
}

if (dry) { console.log('[dry] изменения НЕ внесены.'); process.exit(0); }

// состояние затронутых тем после правки
const topics = course.topicsForStudent({ id: user.id, role: 'student', group: user.group });
for (const topicKey of affectedTopics) {
  const idx = topics.findIndex((t) => t.key === topicKey);
  const t = topics[idx];
  const next = topics[idx + 1] || null;
  if (!t) continue;
  console.log(`Тема «${topicKey}»: решено ${t.solved}/${t.total}${t.done ? ' — тема пройдена' : ''}.`);
  if (!unset && t.done && next) {
    console.log(next.theoryOpen
      ? `  → следующая тема «${next.key}» открыта, студент может продолжать.`
      : `  → ВНИМАНИЕ: следующая тема «${next.key}» всё ещё закрыта — не пройдена какая-то из более ранних тем.`);
  }
}
console.log('Перезапуск сервера не нужен — прогресс читается из БД на каждый запрос.');
