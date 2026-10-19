#!/usr/bin/env node
// Итоговая контрольная: импорт списка компьютеров аудитории в базу mdtask (таблица exam_pcs).
//   node scripts/exam/import-pcs.js                       — из data/data_pc_ib.sqlite
//   node scripts/exam/import-pcs.js --file путь.sqlite
// Читается только таблица ib_pc (mac_address, pc_name, ip_address), файл открывается только для чтения.
// Компьютер с тем же именем обновляется. База — DB_PATH (data/mdtask.db); перед импортом — резервная копия.
const path = require('path');

const args = process.argv.slice(2);
const i = args.indexOf('--file');
const file = i === -1 ? path.join(__dirname, '..', '..', 'data', 'data_pc_ib.sqlite') : args[i + 1];

const { importPcs } = require('../../src/lib/exam/devices');
const { getExamPcs } = require('../../src/db');

try {
  const r = importPcs(file);
  console.log(`Импортировано: ${r.saved} из ${r.total}${r.skipped.length ? `; пропущены: ${r.skipped.join(', ')}` : ''}`);
  getExamPcs().forEach((pc) => console.log(`  ${pc.name.padEnd(12)} ${pc.ip.padEnd(16)} ${pc.mac || '—'}`));
} catch (err) {
  console.error(`Не удалось импортировать: ${err.message}`);
  process.exit(1);
}
