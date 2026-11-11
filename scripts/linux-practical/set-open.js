// Задать/снять время открытия практической работы «Терминал» (web-1), таблица linux_practical_window.
// Пусто = открыта сразу. До времени открытия практическая закрыта («откроется в …»).
//
//   DB_PATH=./data/mdtask.db node scripts/linux-practical/set-open.js --date 2026-11-10 --time 12:40
//   DB_PATH=./data/mdtask.db node scripts/linux-practical/set-open.js --time 12:40            # сегодня, 12:40 (+05)
//   DB_PATH=./data/mdtask.db node scripts/linux-practical/set-open.js --clear                 # открыть сразу
const db = require('../../src/db');

function opt(argv, name) { const i = argv.indexOf(name); return i !== -1 ? argv[i + 1] : null; }

// Местное время (+05) ГГГГ-ММ-ДД ЧЧ:ММ -> ISO UTC.
function toUtcIso(date, time) {
  const [h, m] = time.split(':').map(Number);
  const utcH = h - 5; // +05 -> UTC
  const hh = String(((utcH % 24) + 24) % 24).padStart(2, '0');
  return `${date}T${hh}:${String(m).padStart(2, '0')}:00.000Z`;
}

function main(argv) {
  if (argv.includes('--clear')) {
    db.clearLinuxPracticalOpen();
    console.log('Практическая «Терминал» открыта сразу (время снято).');
    return;
  }
  const time = opt(argv, '--time') || '12:40';
  if (!/^\d{1,2}:\d{2}$/.test(time)) throw new Error('время в формате ЧЧ:ММ, напр. 12:40');
  let date = opt(argv, '--date');
  if (!date) {
    const d = new Date(Date.now() + 5 * 3600000); // сегодня в поясе +05
    date = d.toISOString().slice(0, 10);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('дата в формате ГГГГ-ММ-ДД');
  const iso = toUtcIso(date, time);
  db.setLinuxPracticalOpen(iso);
  console.log(`Практическая «Терминал» откроется ${date} в ${time} (+05).`);
}

try { main(process.argv.slice(2)); } catch (err) { console.error(`Ошибка: ${err.message}`); process.exit(1); }
