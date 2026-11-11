// Назначить/снять окно ИБ-контрольной (таблица ib_mid_window). Окно по умолчанию 09:00–14:00 (+05).
// Пока окно задано и открыто — у группы ib-2 закрыта остальная практика, открыта только контрольная.
//
//   DB_PATH=./data/mdtask.db node scripts/ib-mid/set-window.js --date 2026-11-10            # 09:00–14:00 (+05)
//   DB_PATH=./data/mdtask.db node scripts/ib-mid/set-window.js --date 2026-11-10 --open 9 --close 14
//   DB_PATH=./data/mdtask.db node scripts/ib-mid/set-window.js --clear                      # снять окно
const db = require('../../src/db');
const { windowFromDate, fmt } = require('../../src/lib/assignment-window');

function opt(argv, name) {
  const i = argv.indexOf(name);
  return i !== -1 ? argv[i + 1] : null;
}

function main(argv) {
  if (argv.includes('--clear')) {
    db.clearMidWindow();
    console.log('Окно ИБ-контрольной снято (группа ib-2 не блокируется).');
    return;
  }
  const date = opt(argv, '--date');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) {
    throw new Error('укажите дату: --date ГГГГ-ММ-ДД (или --clear)');
  }
  const openH = Number(opt(argv, '--open') || 9);
  const closeH = Number(opt(argv, '--close') || 14);
  const { opensAt, closesAt } = windowFromDate(date, openH, closeH);
  db.setMidWindow(opensAt, closesAt);
  console.log(`Окно ИБ-контрольной: ${fmt(opensAt)} — ${fmt(closesAt)} (+05).`);
  console.log('В это время у группы ib-2 закрыта остальная практика, открыта только контрольная.');
}

try {
  main(process.argv.slice(2));
} catch (err) {
  console.error(`Ошибка: ${err.message}`);
  process.exit(1);
}
