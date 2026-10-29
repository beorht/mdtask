const T = (id, title, statement, solution, inputs, extra = {}) => ({ id, title, statement, solution, inputs, ...extra });
module.exports = {
  dir: 'm4/03-array-methods',
  tasks: [
    T('am-01', 'Цены со скидкой', 'Даны цены одной строкой и скидка в процентах. С помощью map получите новые цены, округлённые до целого (Math.round), и выведите их через пробел; второй строкой — сколько сэкономили всего (reduce).', () => {
      const prices = input().split(' ').map(Number);
      const d = Number(input());
      const fresh = prices.map((p) => Math.round(p * (100 - d) / 100));
      console.log(fresh.join(' '));
      console.log(prices.reduce((s, p) => s + p, 0) - fresh.reduce((s, p) => s + p, 0));
    }, [['1000 450 99', '10'], ['500', '0'], ['199 299', '33']], { require: ['.map', '.reduce'] }),
    T('am-02', 'Длинные слова', 'Даны слова одной строкой и число k. С помощью filter оставьте слова длиннее k символов и выведите их через пробел заглавными буквами (map) или «нет». Цикл не используйте.', () => {
      const words = input().split(' ');
      const k = Number(input());
      const long = words.filter((w) => w.length > k).map((w) => w.toUpperCase());
      console.log(long.length ? long.join(' ') : 'нет');
    }, [['кот программа ёж массив', '3'], ['а б', '5']], { require: ['.filter', '.map'], forbid: ['for', 'while'] }),
    T('am-03', 'Итог корзины', 'Дано количество товаров N, затем N строк «название цена количество». Выведите сумму каждой строки «название: сумма» (map), затем «Итого: …» (reduce) и самый дорогой по сумме товар «Дороже всего: название» (reduce).', () => {
      const n = Number(input());
      const items = Array.from({ length: n }, () => {
        const [name, price, qty] = input().split(' ');
        return { name, sum: Number(price) * Number(qty) };
      });
      items.map((it) => it.name + ': ' + it.sum).forEach((line) => console.log(line));
      console.log('Итого: ' + items.reduce((s, it) => s + it.sum, 0));
      console.log('Дороже всего: ' + items.reduce((best, it) => (it.sum > best.sum ? it : best)).name);
    }, [['3', 'хлеб 40 2', 'сыр 350 1', 'вода 25 4'], ['1', 'чай 120 3']], { require: ['.reduce'] }),
    T('am-04', 'Все ли сдали', 'Даны оценки группы одной строкой. Выведите три строки «да»/«нет»: все ли сдали (оценка ≥ 3, every), есть ли отличники (5, some), есть ли хоть одна двойка (some). Затем — номер (с 1) первой двойки (findIndex) или «нет».', () => {
      const m = input().split(' ').map(Number);
      const yes = (b) => (b ? 'да' : 'нет');
      console.log(yes(m.every((x) => x >= 3)));
      console.log(yes(m.some((x) => x === 5)));
      console.log(yes(m.some((x) => x === 2)));
      const i = m.findIndex((x) => x === 2);
      console.log(i === -1 ? 'нет' : i + 1);
    }, [['5 4 3 4'], ['3 2 5 2'], ['4 4']], { require: ['.every', '.some', '.findIndex'] }),
    T('am-05', 'Первое подходящее', 'Даны числа одной строкой и k. С помощью find найдите первое число, которое делится на k и больше 0. Выведите его или «не найдено».', () => {
      const a = input().split(' ').map(Number);
      const k = Number(input());
      const x = a.find((v) => v > 0 && v % k === 0);
      console.log(x === undefined ? 'не найдено' : x);
    }, [['-6 4 9 12 15', '3'], ['1 2', '7'], ['0 14', '7']], { require: ['.find'] }),
    T('am-06', 'Цепочка методов', 'Даны числа одной строкой. Одной цепочкой filter → map → reduce найдите сумму квадратов нечётных чисел. Выведите её.', () => {
      console.log(input().split(' ').map(Number).filter((x) => x % 2 !== 0).map((x) => x * x).reduce((s, x) => s + x, 0));
    }, [['1 2 3 4 5'], ['2 4'], ['-3 7']], { require: ['.filter', '.map', '.reduce'], forbid: ['for', 'while'] }),
    T('jsb-09', 'Простые через filter', 'Напишите функцию isPrime(n). Дано N — постройте массив чисел от 2 до N через Array.from и оставьте простые через filter(isPrime). Выведите их через пробел и количество второй строкой.', () => {
      function isPrime(n) {
        for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
        return n > 1;
      }
      const n = Number(input());
      const primes = Array.from({ length: n - 1 }, (_, i) => i + 2).filter(isPrime);
      console.log(primes.join(' '));
      console.log(primes.length);
    }, [['50'], ['2'], ['100']], { require: ['def:isPrime', 'Array.from', '.filter'] }),
    T('am-07', 'Группировка по первой букве', 'Даны слова одной строкой. С помощью reduce соберите объект «первая буква → массив слов» (в порядке появления). Выведите строки «буква: слово, слово» в порядке первого появления букв.', () => {
      const groups = input().split(' ').reduce((acc, w) => {
        const ch = w[0];
        if (!acc[ch]) acc[ch] = [];
        acc[ch].push(w);
        return acc;
      }, {});
      for (const ch in groups) console.log(ch + ': ' + groups[ch].join(', '));
    }, [['кот слон кит ёж собака кефир'], ['арбуз']], { require: ['.reduce'] }),
    T('am-08', 'Средние баллы', 'Дано N, затем N строк «имя оценки…» (оценки через пробел). С помощью map получите для каждого среднее, выведите «имя: среднее» с двумя знаками; затем «лучший: имя» (reduce, при равенстве — первый).', () => {
      const n = Number(input());
      const rows = Array.from({ length: n }, () => {
        const [name, ...marks] = input().split(' ');
        const avg = marks.map(Number).reduce((s, x) => s + x, 0) / marks.length;
        return { name, avg };
      });
      rows.forEach((r) => console.log(r.name + ': ' + r.avg.toFixed(2)));
      console.log('лучший: ' + rows.reduce((b, r) => (r.avg > b.avg ? r : b)).name);
    }, [['3', 'Аня 5 4 5', 'Бек 3 4', 'Лола 5 5 4 4'], ['1', 'Дима 2']], { require: ['.map', '.reduce'] }),
    T('am-09', 'Суммы строк и столбцов', 'Дано n, затем n строк таблицы чисел. Выведите суммы строк через пробел (map + reduce), затем суммы столбцов через пробел.', () => {
      const n = Number(input());
      const m = Array.from({ length: n }, () => input().split(' ').map(Number));
      console.log(m.map((row) => row.reduce((s, x) => s + x, 0)).join(' '));
      console.log(m[0].map((_, c) => m.reduce((s, row) => s + row[c], 0)).join(' '));
    }, [['2', '1 2 3', '4 5 6'], ['3', '1', '2', '3']], { require: ['.map', '.reduce'] }),
  ],
};
