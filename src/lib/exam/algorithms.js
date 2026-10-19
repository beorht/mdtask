// Stage 3.1–3.2 of the IB final exam: write a classic algorithm by hand — linear search,
// selection sort or bubble sort — on records of the student's theme. Each student gets two of
// the three algorithms in one of two wordings (a, b) per theme; test data is generated from the
// variant seed and the expected output comes from the reference implementations below. Besides
// the result the program prints a counter (comparisons, swaps or passes) that only the asked
// algorithm produces. Built-in shortcuts (sorted, min, `in` ...) are refused (forbidden.py).
const { createRng } = require('./rng');

const ALGORITHMS = {
  linear: {
    label: 'Линейный поиск',
    about:
      'Линейный поиск просматривает записи по очереди — с первой до последней — и сравнивает каждую с искомым значением. ' +
      'Если нужна первая подходящая запись, поиск останавливается, как только нашёл её; если нужны все — проходит список до конца.',
  },
  selection: {
    label: 'Сортировка выбором',
    about:
      'Сортировка выбором: на каждом шаге среди ещё не отсортированных записей находим запись с наименьшим значением ' +
      '(при сортировке по убыванию — с наибольшим) и меняем её местами с первой неотсортированной. После шага i первые i записей стоят на своих местах. ' +
      '**Обмен считается, только если записи действительно меняются местами**: если нужная запись уже стоит на месте, обмена нет.',
  },
  bubble: {
    label: 'Пузырьковая сортировка',
    about:
      'Пузырьковая сортировка: идём по списку слева направо и сравниваем соседние записи; если они стоят в неправильном порядке — меняем их местами. ' +
      'За один проход запись с самым большим значением (при сортировке по убыванию — с самым маленьким) «всплывает» в конец. ' +
      'Проходы повторяются, пока за целый проход не случится ни одного обмена. **Считается каждый проход, включая последний — без обменов.**',
  },
};

const ALGORITHM_KEYS = Object.keys(ALGORITHMS);
// The three pairs a student can get.
const PAIRS = [['linear', 'selection'], ['linear', 'bubble'], ['selection', 'bubble']];

const LOGINS = ['aziz', 'marina', 'oleg', 'lola', 'timur', 'dina', 'sergey', 'yana', 'bobur', 'nina', 'artur', 'sevara', 'gleb', 'madina', 'roman', 'kamila'];
const DOCTOR_LOGINS = ['karimova', 'li', 'orlov', 'hamidova', 'safarov', 'mironova', 'yusupov', 'kim', 'aliev', 'popova'];

// key(rng, used) — a unique record name; value — a value generator; kind: what to do.
const SPECS = {
  shop: {
    linear: {
      a: {
        title: 'Первый заказ клиента',
        task: 'Дан журнал заказов: номер заказа и логин клиента. Найдите **первый** заказ клиента с заданным логином.',
        keyLabel: 'номер заказа', valueLabel: 'логин клиента', queryLabel: 'логин клиента',
        key: num('ORD-', 1000, 99999), value: fromList(LOGINS), kind: 'first',
      },
      b: {
        title: 'Крупные заказы',
        task: 'Дан журнал заказов: номер заказа и его сумма. Найдите **все** заказы, сумма которых больше заданной.',
        keyLabel: 'номер заказа', valueLabel: 'сумма', queryLabel: 'пороговая сумма S',
        key: num('ORD-', 1000, 99999), value: range(10000, 9000000), kind: 'greater',
      },
    },
    selection: {
      a: { title: 'Заказы по сумме', task: 'Отсортируйте заказы **по убыванию суммы**.', keyLabel: 'номер заказа', valueLabel: 'сумма', key: num('ORD-', 1000, 99999), value: range(10000, 9000000), order: 'desc' },
      b: { title: 'Товары по цене', task: 'Отсортируйте товары **по возрастанию цены**.', keyLabel: 'артикул', valueLabel: 'цена', key: num('SKU-', 100, 9999), value: range(5000, 9000000), order: 'asc' },
    },
    bubble: {
      a: { title: 'Клиенты по числу заказов', task: 'Отсортируйте клиентов **по возрастанию числа заказов**.', keyLabel: 'номер клиента', valueLabel: 'число заказов', key: num('CL-', 100, 9999), value: range(1, 5000), order: 'asc' },
      b: { title: 'Доставки по расстоянию', task: 'Отсортируйте доставки **по убыванию расстояния** (в метрах).', keyLabel: 'номер заказа', valueLabel: 'расстояние, м', key: num('ORD-', 1000, 99999), value: range(300, 90000), order: 'desc' },
    },
  },
  library: {
    linear: {
      a: {
        title: 'Первая выдача книги',
        task: 'Дан журнал выдач: номер выдачи и шифр книги. Найдите **первую** выдачу книги с заданным шифром.',
        keyLabel: 'номер выдачи', valueLabel: 'шифр книги', queryLabel: 'шифр книги',
        key: num('V-', 1000, 99999), value: fromList(Array.from({ length: 14 }, (_, i) => `KN-${101 + i * 7}`)), kind: 'first',
      },
      b: {
        title: 'Все выдачи читателю',
        task: 'Дан журнал выдач: номер выдачи и номер читательского билета. Найдите **все** выдачи читателю с заданным билетом.',
        keyLabel: 'номер выдачи', valueLabel: 'читательский билет', queryLabel: 'читательский билет',
        key: num('V-', 1000, 99999), value: fromList(Array.from({ length: 12 }, (_, i) => `CH-${2001 + i * 13}`)), kind: 'equal',
      },
    },
    selection: {
      a: { title: 'Книги по популярности', task: 'Отсортируйте книги **по убыванию числа выдач**.', keyLabel: 'шифр книги', valueLabel: 'число выдач', key: num('KN-', 100, 9999), value: range(1, 6000), order: 'desc' },
      b: { title: 'Книги по объёму', task: 'Отсортируйте книги **по возрастанию числа страниц**.', keyLabel: 'шифр книги', valueLabel: 'страниц', key: num('KN-', 100, 9999), value: range(20, 3000), order: 'asc' },
    },
    bubble: {
      a: { title: 'Читатели по числу книг', task: 'Отсортируйте читателей **по убыванию числа книг на руках** за год.', keyLabel: 'читательский билет', valueLabel: 'книг за год', key: num('CH-', 1000, 9999), value: range(1, 5000), order: 'desc' },
      b: { title: 'Выдачи по просрочке', task: 'Отсортируйте выдачи **по возрастанию просрочки** (в часах).', keyLabel: 'номер выдачи', valueLabel: 'просрочка, ч', key: num('V-', 1000, 99999), value: range(1, 9000), order: 'asc' },
    },
  },
  clinic: {
    linear: {
      a: {
        title: 'Первый талон к врачу',
        task: 'Дан список талонов: номер талона и логин врача. Найдите **первый** талон к врачу с заданным логином.',
        keyLabel: 'номер талона', valueLabel: 'логин врача', queryLabel: 'логин врача',
        key: num('T-', 1000, 99999), value: fromList(DOCTOR_LOGINS), kind: 'first',
      },
      b: {
        title: 'Долгие приёмы',
        task: 'Дан список приёмов: номер талона и длительность приёма в минутах. Найдите **все** приёмы длиннее заданного числа минут.',
        keyLabel: 'номер талона', valueLabel: 'длительность, мин', queryLabel: 'число минут M',
        key: num('T-', 1000, 99999), value: range(5, 90), kind: 'greater',
      },
    },
    selection: {
      a: { title: 'Врачи по нагрузке', task: 'Отсортируйте врачей **по убыванию числа пациентов** за год.', keyLabel: 'код врача', valueLabel: 'пациентов', key: num('DR-', 100, 9999), value: range(10, 9000), order: 'desc' },
      b: { title: 'Пациенты по ожиданию', task: 'Отсортируйте пациентов **по возрастанию времени ожидания** (в секундах).', keyLabel: 'номер карты', valueLabel: 'ожидание, с', key: num('P-', 1000, 99999), value: range(30, 20000), order: 'asc' },
    },
    bubble: {
      a: { title: 'Талоны по стоимости', task: 'Отсортируйте талоны **по возрастанию стоимости** приёма.', keyLabel: 'номер талона', valueLabel: 'стоимость', key: num('T-', 1000, 99999), value: range(10000, 990000), order: 'asc' },
      b: { title: 'Кабинеты по посещаемости', task: 'Отсортируйте кабинеты **по убыванию числа посещений** за год.', keyLabel: 'номер кабинета', valueLabel: 'посещений', key: num('K-', 100, 9999), value: range(50, 20000), order: 'desc' },
    },
  },
};

function num(prefix, min, max) {
  return (rng, used) => {
    for (;;) {
      const k = `${prefix}${rng.int(min, max)}`;
      if (!used.has(k)) {
        used.add(k);
        return k;
      }
    }
  };
}

function range(min, max) {
  const gen = (rng) => rng.int(min, max);
  gen.numeric = true;
  return gen;
}

function fromList(list) {
  const gen = (rng) => rng.pick(list);
  gen.list = list;
  return gen;
}

// ------------------------------------------------------------- reference ---

function referenceOutput(algo, spec, records, query) {
  if (algo === 'linear') {
    if (spec.kind === 'first') {
      for (let i = 0; i < records.length; i += 1) {
        if (records[i][1] === query) return `Найдено: строка ${i + 1}, ${records[i][0]}\nСравнений: ${i + 1}`;
      }
      return `Не найдено\nСравнений: ${records.length}`;
    }
    const found = records.filter(([, v]) => (spec.kind === 'greater' ? Number(v) > Number(query) : v === query));
    return [...found.map(([k]) => k), `Найдено: ${found.length}`].join('\n');
  }
  const desc = spec.order === 'desc';
  const before = (a, b) => (desc ? a[1] > b[1] : a[1] < b[1]);
  const list = records.map(([k, v]) => [k, v]);
  let counter = 0;
  if (algo === 'selection') {
    for (let i = 0; i < list.length - 1; i += 1) {
      let best = i;
      for (let j = i + 1; j < list.length; j += 1) if (before(list[j], list[best])) best = j;
      if (best !== i) {
        [list[i], list[best]] = [list[best], list[i]];
        counter += 1;
      }
    }
  } else {
    let swapped = true;
    let end = list.length - 1;
    while (swapped) {
      swapped = false;
      counter += 1;
      for (let j = 0; j < end; j += 1) {
        if (before(list[j + 1], list[j])) {
          [list[j], list[j + 1]] = [list[j + 1], list[j]];
          swapped = true;
        }
      }
      end -= 1;
    }
  }
  return [...list.map(([k, v]) => `${k} ${v}`), `${algo === 'selection' ? 'Обменов' : 'Проходов'}: ${counter}`].join('\n');
}

// ----------------------------------------------------------------- tests ---

function makeRecords(rng, spec, n, { unique = false } = {}) {
  const used = new Set();
  const values = new Set();
  const out = [];
  while (out.length < n) {
    const v = spec.value(rng);
    if (unique && values.has(v)) continue;
    values.add(v);
    out.push([spec.key(rng, used), v]);
  }
  return out;
}

function input(records, query) {
  const lines = [String(records.length), ...records.map(([k, v]) => `${k} ${v}`)];
  if (query !== undefined) lines.push(String(query));
  return lines;
}

function searchTests(rng, spec) {
  const tests = [];
  const values = spec.value.list;
  const pickPresent = (recs) => rng.pick(recs.slice(Math.floor(recs.length / 3)))[1];
  const absent = (recs) => (values ? values.find((v) => !recs.some(([, x]) => x === v)) : null);
  if (spec.kind === 'greater') {
    const sizes = [7, 8, 40, 150, 300, 1];
    sizes.forEach((n, i) => {
      const recs = makeRecords(rng, spec, n);
      const sorted = recs.map(([, v]) => v).sort((a, b) => a - b);
      let q;
      if (i === 4) q = sorted[sorted.length - 1]; // nothing is greater than the maximum
      else if (i === 5) q = sorted[0] - 1;
      else q = sorted[Math.floor(sorted.length * (i === 1 ? 0.3 : 0.6))];
      tests.push({ records: recs, query: q });
    });
  } else {
    const plan = ['middle', 'absent', 'late', 'first', 'absent', 'single'];
    const sizes = [7, 8, 50, 200, 300, 1];
    plan.forEach((how, i) => {
      let recs = makeRecords(rng, spec, sizes[i]);
      let q;
      if (how === 'absent') {
        q = absent(recs);
        if (q === null || q === undefined) {
          q = values[0];
          recs = recs.map(([k, v]) => [k, v === q ? values[1] : v]);
        }
      } else if (how === 'first') q = recs[0][1];
      else if (how === 'late') {
        // Only the last record has the value: the search goes through the whole list.
        q = recs[recs.length - 1][1];
        const other = values.find((v) => v !== q);
        recs = recs.map(([k, v], idx) => [k, idx < recs.length - 1 && v === q ? other : v]);
      } else q = pickPresent(recs);
      tests.push({ records: recs, query: q });
    });
  }
  return tests;
}

function sortTests(rng, spec) {
  const desc = spec.order === 'desc';
  const asSorted = (recs, reverse) =>
    [...recs].sort((a, b) => ((desc !== reverse) ? b[1] - a[1] : a[1] - b[1]));
  return [
    { records: makeRecords(rng, spec, 6, { unique: true }) },
    { records: asSorted(makeRecords(rng, spec, 7, { unique: true }), true) },
    { records: makeRecords(rng, spec, 50, { unique: true }) },
    { records: makeRecords(rng, spec, 200, { unique: true }) },
    { records: asSorted(makeRecords(rng, spec, 300, { unique: true }), false) },
    { records: asSorted(makeRecords(rng, spec, 250, { unique: true }), true) },
  ];
}

const OPEN_TESTS = 2;

// The task as the pages and the checker use it. ref: { algo, form } from the variant.
function algorithmTask(themeKey, ref, seed, number) {
  const spec = SPECS[themeKey][ref.algo][ref.form];
  const algo = ALGORITHMS[ref.algo];
  const rng = createRng(`${seed}:alg:${ref.algo}:${ref.form}`);
  const raw = ref.algo === 'linear' ? searchTests(rng, spec) : sortTests(rng, spec);
  const tests = raw.map((t) => ({
    input: input(t.records, t.query),
    output: referenceOutput(ref.algo, spec, t.records, t.query),
  }));
  return {
    id: `3.${number}`,
    kind: 'algorithm',
    algo: ref.algo,
    form: ref.form,
    title: `${algo.label}: ${spec.title.toLowerCase()}`,
    statement: statement(ref.algo, spec, algo),
    tests,
    openTests: OPEN_TESTS,
    points: 7.5,
  };
}

function statement(algoKey, spec, algo) {
  const lines = [`**Что делает алгоритм.** ${algo.about}`, '', `**Задача.** ${spec.task} Запишите алгоритм «${algo.label.toLowerCase()}» сами, своим кодом.`, ''];
  lines.push('**Ввод.** Первая строка — число записей N. Дальше N строк, в каждой через пробел:', `${spec.keyLabel} и ${spec.valueLabel}.`);
  if (algoKey === 'linear') {
    lines.push(`Последняя строка — ${spec.queryLabel}.`, '');
    if (spec.kind === 'first') {
      lines.push(
        '**Вывод.** Если запись найдена — две строки: `Найдено: строка K, НОМЕР` (K — номер записи в списке, начиная с 1, НОМЕР — её ' + spec.keyLabel + ') и `Сравнений: C` — сколько записей вы сравнили с искомым значением (поиск останавливается на первой найденной).',
        'Если записи нет — `Не найдено` и `Сравнений: N`.'
      );
    } else {
      lines.push(
        `**Вывод.** ${spec.keyLabel[0].toUpperCase() + spec.keyLabel.slice(1)} каждой подходящей записи — по одному в строке, в том порядке, в каком они идут во вводе. Последняя строка — \`Найдено: K\`, где K — число найденных записей (если ничего не найдено — только \`Найдено: 0\`).`
      );
    }
  } else {
    lines.push('Все значения разные.', '');
    lines.push(
      `**Вывод.** Отсортированные записи в том же виде — \`${spec.keyLabel} ${spec.valueLabel}\` через пробел, по одной в строке. ` +
        `Последняя строка — ${algoKey === 'selection' ? '`Обменов: K` — сколько раз записи менялись местами' : '`Проходов: P` — сколько проходов по списку выполнила сортировка'}.`
    );
  }
  lines.push(
    '',
    '**Ограничения.** Нельзя пользоваться готовыми функциями, которые делают работу алгоритма за вас: `sorted()`, `.sort()`, `min()`, `max()`, ' +
      '`.index()`, `.find()`, `.count()`, проверкой `x in список` и модулями `heapq`, `bisect`. Программа с ними не засчитывается. Цикл `for x in список` — можно.'
  );
  return lines.join('\n');
}

// Pair and wordings of a student by their position in the group list: 3 themes × 3 pairs ×
// 2 wordings = 18 different combinations.
function algorithmRefs(index) {
  const pair = PAIRS[Math.floor(index / 3) % 3];
  const form = Math.floor(index / 9) % 2 === 0 ? 'a' : 'b';
  return pair.map((algo) => ({ algo, form }));
}

module.exports = { ALGORITHMS, ALGORITHM_KEYS, PAIRS, SPECS, algorithmTask, algorithmRefs, referenceOutput };
