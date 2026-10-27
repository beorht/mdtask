// Ожидаемый HTML каждого задания (развёртывание emmetExpression тем же пакетом emmet, что в редакторе) —
// в src/lib/emmet/data/expected.json. Сервер mdtask сравнивает с ним попытки и не зависит от пакета emmet.
// Запускается из scripts/vendor/emmet.sh вместе со сборкой клиента.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expandAbbreviation } from '../src/services/EmmetService.js';

const dir = fileURLToPath(new URL('../../src/lib/emmet/data/', import.meta.url));
const read = (name) => JSON.parse(readFileSync(dir + name, 'utf8'));
const expected = {};
for (const exercise of [...read('lessons.json'), ...read('exercises.json'), ...read('blind.json')]) {
  expected[exercise.id] = exercise.expectedHtml ?? expandAbbreviation(exercise.emmetExpression).html;
}
writeFileSync(dir + 'expected.json', `${JSON.stringify(expected, null, 2)}\n`);
console.log(`src/lib/emmet/data/expected.json: ${Object.keys(expected).length} заданий`);
