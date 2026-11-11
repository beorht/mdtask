// Остановить КОНТРОЛЬНУЮ и вернуть студентам доступ к практическим работам.
//
// Пока идёт «средняя контрольная», у группы закрыта остальная практика (src/lib/control-lock.js).
// Этот скрипт снимает окно(а) контрольной — и блокировка практики спадает:
//   • ИБ-контрольная (ib-mid, группа ib-2) — таблица ib_mid_window;
//   • Веб-контрольная (web-2) — окно личного задания «Каталог на XML и DOM ...» (opens_at/closes_at).
//
// Окно читается из БД на каждый запрос, поэтому ПЕРЕЗАПУСК СЕРВЕРА НЕ НУЖЕН: доступ к практике
// возвращается сразу. Итоговые экзамены (таблица exams) НЕ трогаются — у них своя кнопка в /admin.
// Сами контрольные задания и сданные работы сохраняются — закрывается только окно/блокировка.
//
//   DB_PATH=./data/mdtask.db node scripts/control/stop.js          # остановить все активные контрольные
//   DB_PATH=./data/mdtask.db node scripts/control/stop.js --dry    # только показать, ничего не менять
//   DB_PATH=./data/mdtask.db node scripts/control/stop.js --ib     # только ИБ-контрольная (ib-2)
//   DB_PATH=./data/mdtask.db node scripts/control/stop.js --web    # только веб-контрольная (web-2)
const db = require('../../src/db');
const { fmt } = require('../../src/lib/assignment-window');
const { WEB_CONTROL_TITLE } = require('../../src/lib/control-lock');

const argv = process.argv.slice(2);
const dry = argv.includes('--dry');
const onlyIb = argv.includes('--ib');
const onlyWeb = argv.includes('--web');
const doIb = !onlyWeb;
const doWeb = !onlyIb;

const f = (x) => (x ? fmt(x) : '—');
let changed = 0;

function stopIbMid() {
  const w = db.getMidWindow();
  if (!w || (!w.starts_at && !w.ends_at)) {
    console.log('ИБ-контрольная (ib-2): окно не назначено — ничего не делаю.');
    return;
  }
  console.log(`ИБ-контрольная (ib-2): окно ${f(w.starts_at)} — ${f(w.ends_at)} (+05).`);
  if (dry) {
    console.log('  [dry] окно будет снято, группа ib-2 снова увидит практику.');
    return;
  }
  db.clearMidWindow();
  changed += 1;
  console.log('  ✔ окно снято — группа ib-2 снова видит практику.');
}

function stopWebControl() {
  const list = db
    .getAssignments()
    .filter((a) => a.title === WEB_CONTROL_TITLE && (a.opensAt || a.closesAt));
  if (!list.length) {
    console.log('Веб-контрольная (web-2): заданий с окном нет — ничего не делаю.');
    return;
  }
  console.log(`Веб-контрольная (web-2): заданий с открытым окном — ${list.length}.`);
  for (const a of list) {
    console.log(`  ${a.targetStudentId || a.targetGroup}: ${f(a.opensAt)} — ${f(a.closesAt)}`);
    if (dry) {
      console.log('    [dry] окно будет снято');
      continue;
    }
    db.setAssignmentWindow(a.id, { opensAt: null, closesAt: null });
    changed += 1;
  }
  if (!dry) {
    console.log('  ✔ окна сняты — группа web-2 снова видит практику (задание остаётся доступным по сроку сдачи).');
  }
}

try {
  if (doIb) stopIbMid();
  if (doWeb) stopWebControl();
  if (dry) {
    console.log('\n[dry] изменения НЕ внесены. Уберите --dry, чтобы остановить контрольную.');
  } else {
    console.log(`\nГотово. Изменено записей: ${changed}. Перезапуск сервера не нужен — доступ к практике вернулся.`);
    if (changed) {
      console.log('Если нужно снова открыть контрольную:');
      console.log('  ИБ:  DB_PATH=./data/mdtask.db node scripts/ib-mid/set-window.js --date ГГГГ-ММ-ДД');
      console.log('  Веб: DB_PATH=./data/mdtask.db node scripts/web-dom-xml/issue.js --date ГГГГ-ММ-ДД --group web-2');
    }
  }
} catch (err) {
  console.error(`Ошибка: ${err.message}`);
  process.exit(1);
}
