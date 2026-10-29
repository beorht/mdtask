const T = (id, title, statement, solution, inputs, extra = {}) => ({ id, title, statement, solution, inputs, ...extra });
module.exports = {
  dir: 'm4/01-arrays',
  tasks: [
    T('arr-01', 'Сумма, минимум, максимум', 'Даны числа одной строкой. Найдите сумму, минимум и максимум одним проходом циклом (без Math.min/max и reduce). Выведите три числа через пробел.', () => {
      const a = input().split(' ').map(Number);
      let sum = 0;
      let min = a[0];
      let max = a[0];
      for (let i = 0; i < a.length; i++) {
        sum += a[i];
        if (a[i] < min) min = a[i];
        if (a[i] > max) max = a[i];
      }
      console.log(sum, min, max);
    }, [['3 8 -2 7'], ['5'], ['-1 -1 -1']], { forbid: ['Math.min', 'Math.max', '.reduce', '.sort'] }),
    T('arr-02', 'Разворот на месте', 'Даны элементы одной строкой. Разверните массив на месте — меняя местами элементы с двух концов (без .reverse и без нового массива). Выведите через пробел.', () => {
      const a = input().split(' ');
      for (let i = 0, j = a.length - 1; i < j; i++, j--) {
        const t = a[i];
        a[i] = a[j];
        a[j] = t;
      }
      console.log(a.join(' '));
    }, [['1 2 3 4 5'], ['а б'], ['x']], { forbid: ['.reverse'] }),
    T('arr-03', 'Вычеркнуть значение', 'Даны числа одной строкой и число x. Удалите из массива все x на месте через splice (идите с конца, чтобы индексы не сбивались). Выведите оставшиеся через пробел (или «пусто») и сколько удалено.', () => {
      const a = input().split(' ').map(Number);
      const x = Number(input());
      let removed = 0;
      for (let i = a.length - 1; i >= 0; i--) {
        if (a[i] === x) {
          a.splice(i, 1);
          removed++;
        }
      }
      console.log(a.length ? a.join(' ') : 'пусто');
      console.log(removed);
    }, [['1 2 1 3 1', '1'], ['5 5', '5'], ['4 7', '9']], { require: ['.splice'], forbid: ['.filter'] }),
    T('arr-04', 'Электронная очередь', 'Даны имена в очереди через пробел. Затем команды до «конец»: «next» — вызвать первого (вывести «вызван: имя» или «очередь пуста»), «join имя» — встать в конец, «vip имя» — встать в начало, «pos имя» — вывести номер в очереди (с 1) или «нет в очереди». В конце выведите очередь через пробел или «пусто».', () => {
      const q = input().split(' ');
      while (true) {
        const [cmd, name] = input().split(' ');
        if (cmd === 'конец') break;
        if (cmd === 'next') console.log(q.length ? 'вызван: ' + q.shift() : 'очередь пуста');
        else if (cmd === 'join') q.push(name);
        else if (cmd === 'vip') q.unshift(name);
        else {
          const i = q.indexOf(name);
          console.log(i === -1 ? 'нет в очереди' : i + 1);
        }
      }
      console.log(q.length ? q.join(' ') : 'пусто');
    }, [['Аня Бек Лола', 'pos Лола', 'next', 'join Дима', 'vip Ира', 'pos Дима', 'pos Аня', 'конец'], ['Оля', 'next', 'next', 'конец']]),
    T('arr-05', 'Циклический сдвиг', 'Даны элементы одной строкой и число k (может быть больше длины). Сдвиньте массив вправо на k позиций по кругу: последний элемент встаёт в начало. Выведите результат через пробел.', () => {
      const a = input().split(' ');
      const k = Number(input()) % a.length;
      const out = [];
      for (let i = 0; i < a.length; i++) out[(i + k) % a.length] = a[i];
      console.log(out.join(' '));
    }, [['1 2 3 4 5', '2'], ['a b c', '0'], ['a b c', '7']]),
    T('arr-06', 'Слияние отсортированных', 'Даны два массива чисел, каждый уже отсортирован по возрастанию. Слейте их в один отсортированный двумя указателями, без sort. Выведите через пробел.', () => {
      const a = input().split(' ').map(Number);
      const b = input().split(' ').map(Number);
      const out = [];
      let i = 0;
      let j = 0;
      while (i < a.length && j < b.length) out.push(a[i] <= b[j] ? a[i++] : b[j++]);
      while (i < a.length) out.push(a[i++]);
      while (j < b.length) out.push(b[j++]);
      console.log(out.join(' '));
    }, [['1 4 9', '2 3 10 11'], ['5', '1 2 3'], ['1 1', '1']], { forbid: ['.sort'] }),
    T('arr-07', 'Без повторов', 'Даны слова одной строкой. Выведите их без повторов, сохранив порядок первого появления, — проверяя includes по массиву результата (Set пока не используйте). Второй строкой — сколько слов было удалено.', () => {
      const words = input().split(' ');
      const out = [];
      for (const w of words) if (!out.includes(w)) out.push(w);
      console.log(out.join(' '));
      console.log(words.length - out.length);
    }, [['кот пёс кот ёж пёс кот'], ['a b c']], { forbid: ['Set'] }),
    T('arr-08', 'Пары с суммой', 'Даны числа одной строкой и число target. Выведите все пары элементов (с разными индексами i < j), сумма которых равна target, — «a + b» по одной в строке в порядке i, затем j; в конце «пар: K».', () => {
      const a = input().split(' ').map(Number);
      const target = Number(input());
      let count = 0;
      for (let i = 0; i < a.length; i++) {
        for (let j = i + 1; j < a.length; j++) {
          if (a[i] + a[j] === target) {
            console.log(a[i] + ' + ' + a[j]);
            count++;
          }
        }
      }
      console.log('пар: ' + count);
    }, [['1 5 3 7 4 2', '8'], ['2 2 2', '4'], ['1 2', '10']]),
    T('arr-09', 'Лучший отрезок', 'Даны изменения курса за дни (числа одной строкой). Найдите отрезок подряд идущих дней с наибольшей суммой (алгоритм Кадане: идём слева направо и держим лучшую сумму, заканчивающуюся в текущем дне). Выведите сумму и номера первого и последнего дня (с 1).', () => {
      const a = input().split(' ').map(Number);
      let best = a[0];
      let bestFrom = 0;
      let bestTo = 0;
      let cur = 0;
      let from = 0;
      for (let i = 0; i < a.length; i++) {
        if (cur <= 0) {
          cur = a[i];
          from = i;
        } else cur += a[i];
        if (cur > best) {
          best = cur;
          bestFrom = from;
          bestTo = i;
        }
      }
      console.log(best, bestFrom + 1, bestTo + 1);
    }, [['-2 1 -3 4 -1 2 1 -5 4'], ['5'], ['-3 -1 -2'], ['2 -1 2 -1 2']]),
    T('arr-10', 'Поворот таблицы', 'Дано число строк n, затем n строк таблицы (числа через пробел, строки одной длины). Выведите таблицу, отражённую по диагонали (транспонированную): строка i результата — столбец i исходной.', () => {
      const n = Number(input());
      const m = [];
      for (let i = 0; i < n; i++) m.push(input().split(' '));
      for (let c = 0; c < m[0].length; c++) {
        const row = [];
        for (let r = 0; r < n; r++) row.push(m[r][c]);
        console.log(row.join(' '));
      }
    }, [['2', '1 2 3', '4 5 6'], ['3', '1', '2', '3']]),
  ],
};
