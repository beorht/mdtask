const T = (id, title, statement, solution, inputs, extra = {}) => ({ id, title, statement, solution, inputs, ...extra });
const NO_LOOPS = ['for', 'while', 'do'];
module.exports = {
  dir: 'm3/05-recursion',
  tasks: [
    T('rc-01', 'Сумма цифр рекурсией', 'Напишите рекурсивную функцию digitSum(n) — сумма цифр натурального числа, без циклов и строк. Выведите результат.', () => {
      function digitSum(n) {
        if (n < 10) return n;
        return n % 10 + digitSum(Math.floor(n / 10));
      }
      console.log(digitSum(Number(input())));
    }, [['12345'], ['7'], ['9000000001']], { require: ['recursion', 'def:digitSum'], forbid: [...NO_LOOPS, 'String', '.split'] }),
    T('rc-02', 'Быстрая степень', 'Напишите рекурсивную power(a, n) для целого n ≥ 0: при чётном n — квадрат power(a, n / 2), при нечётном — a × power(a, n − 1). Считайте число умножений. Выведите результат и количество умножений через пробел.', () => {
      let mults = 0;
      function power(a, n) {
        if (n === 0) return 1;
        if (n % 2 === 0) {
          const half = power(a, n / 2);
          mults++;
          return half * half;
        }
        mults++;
        return a * power(a, n - 1);
      }
      const a = Number(input());
      const n = Number(input());
      console.log(power(a, n), mults);
    }, [['2', '10'], ['3', '0'], ['2', '50'], ['-1', '7']], { require: ['recursion', 'def:power'], forbid: [...NO_LOOPS, '**', 'Math.pow'] }),
    T('rc-03', 'Фибоначчи с запоминанием', 'Напишите рекурсивную fib(n) (fib(0) = 0, fib(1) = 1) с запоминанием ответов в объекте. Дано n ≤ 78 — выведите fib(n) и сколько раз функция реально что-то вычисляла (без ответа из памяти).', () => {
      const memo = {};
      let computed = 0;
      function fib(n) {
        if (n in memo) return memo[n];
        computed++;
        memo[n] = n < 2 ? n : fib(n - 1) + fib(n - 2);
        return memo[n];
      }
      const n = Number(input());
      console.log(fib(n), computed);
    }, [['10'], ['0'], ['78'], ['40']], { require: ['recursion', 'def:fib'], forbid: NO_LOOPS }),
    T('rc-04', 'Ханойские башни', 'Перенесите n дисков со стержня 1 на стержень 3 (большой диск нельзя класть на меньший). Напишите рекурсивную hanoi(n, from, to, via). Выведите каждый ход «диск k: from → to», затем «ходов: M».', () => {
      let moves = 0;
      function hanoi(n, from, to, via) {
        if (n === 0) return;
        hanoi(n - 1, from, via, to);
        console.log('диск ' + n + ': ' + from + ' → ' + to);
        moves++;
        hanoi(n - 1, via, to, from);
      }
      hanoi(Number(input()), 1, 3, 2);
      console.log('ходов: ' + moves);
    }, [['3'], ['1'], ['4']], { require: ['recursion', 'def:hanoi'], forbid: NO_LOOPS }),
    T('rc-05', 'Плоский массив', 'Дан вложенный массив строкой JSON (например, [1,[2,[3,4]],5]) — разберите его JSON.parse. Напишите рекурсивную flatten(arr), которая возвращает все числа одним массивом, без .flat. Выведите числа через пробел и глубину вложенности (у [1,2] — 1).', () => {
      function flatten(arr) {
        const out = [];
        for (const x of arr) {
          if (Array.isArray(x)) out.push(...flatten(x));
          else out.push(x);
        }
        return out;
      }
      function depth(arr) {
        let d = 0;
        for (const x of arr) if (Array.isArray(x)) d = Math.max(d, depth(x));
        return d + 1;
      }
      const data = JSON.parse(input());
      console.log(flatten(data).join(' '));
      console.log(depth(data));
    }, [['[1,[2,[3,4]],5]'], ['[1,2,3]'], ['[[[[7]]],[8,[9]]]']], { require: ['recursion', 'def:flatten'], forbid: ['.flat'] }),
    T('rc-06', 'Двоичная запись рекурсией', 'Напишите рекурсивную toBinary(n): двоичная запись натурального n как строка (без toString(2) и циклов). Выведите для данного числа.', () => {
      function toBinary(n) {
        if (n < 2) return String(n);
        return toBinary(Math.floor(n / 2)) + (n % 2);
      }
      console.log(toBinary(Number(input())));
    }, [['10'], ['1'], ['255'], ['1000']], { require: ['recursion', 'def:toBinary'], forbid: [...NO_LOOPS, '.toString'] }),
    T('rc-07', 'Все перестановки', 'Дано слово из 1–4 разных букв. Напишите рекурсивную permutations(s), которая возвращает все перестановки: для каждой буквы по порядку — эта буква плюс перестановки оставшихся. Выведите их по одной в строке в этом порядке и в конце «всего: K».', () => {
      function permutations(s) {
        if (s.length <= 1) return [s];
        const out = [];
        for (let i = 0; i < s.length; i++) {
          for (const p of permutations(s.slice(0, i) + s.slice(i + 1))) out.push(s[i] + p);
        }
        return out;
      }
      const all = permutations(input());
      for (const p of all) console.log(p);
      console.log('всего: ' + all.length);
    }, [['абв'], ['я'], ['кот'], ['abcd']], { require: ['recursion', 'def:permutations'] }),
    T('rc-08', 'Размен монет', 'Сколькими способами можно набрать сумму S монетами 1, 2, 5 и 10 (порядок монет не важен)? Напишите рекурсивную ways(sum, k) — способы набрать sum монетами с номерами от k и дальше. Выведите количество для данной суммы.', () => {
      const coins = [10, 5, 2, 1];
      function ways(sum, k) {
        if (sum === 0) return 1;
        if (sum < 0 || k === coins.length) return 0;
        return ways(sum - coins[k], k) + ways(sum, k + 1);
      }
      console.log(ways(Number(input()), 0));
    }, [['5'], ['10'], ['1'], ['50']], { require: ['recursion', 'def:ways'], forbid: NO_LOOPS }),
    T('jsd-12', 'Путь во вложенной структуре', 'Дан каталог — вложенный объект строкой JSON: значения — другие объекты (папки) или числа (размер файла). Затем дан путь «папка/подпапка/файл». Выведите значение по пути или «не найдено» (если ключа нет на любом шаге или путь упёрся в число раньше времени; если путь ведёт в папку — «папка»). Второй строкой выведите количество файлов (чисел) во всём каталоге и их общий размер через пробел — посчитайте рекурсией.', () => {
      function count(node) {
        if (typeof node === 'number') return [1, node];
        let files = 0;
        let size = 0;
        for (const key in node) {
          const [f, s] = count(node[key]);
          files += f;
          size += s;
        }
        return [files, size];
      }
      const tree = JSON.parse(input());
      let node = tree;
      for (const part of input().split('/')) {
        if (node === undefined || typeof node !== 'object') {
          node = undefined;
          break;
        }
        node = node[part];
      }
      console.log(node === undefined ? 'не найдено' : typeof node === 'object' ? 'папка' : node);
      console.log(...count(tree));
    }, [['{"a":{"b":{"c":5},"d":7}}', 'a/b/c'], ['{"a":{"b":{"c":5},"d":7}}', 'a/x'], ['{"docs":{"cv.pdf":120,"photos":{"1.jpg":800,"2.jpg":650}},"notes.txt":3}', 'docs/photos'], ['{"x":1}', 'x/y']], { require: ['recursion'] }),
    T('rc-09', 'Сумма вложенного объекта', 'Дан объект расходов строкой JSON: значения — числа или вложенные объекты категорий. Напишите рекурсивную total(node). Выведите для каждой категории верхнего уровня «категория: сумма», затем «итого: S».', () => {
      function total(node) {
        if (typeof node === 'number') return node;
        let s = 0;
        for (const key in node) s += total(node[key]);
        return s;
      }
      const data = JSON.parse(input());
      for (const key in data) console.log(key + ': ' + total(data[key]));
      console.log('итого: ' + total(data));
    }, [['{"еда":{"обед":300,"кафе":{"кофе":50,"торт":120}},"транспорт":80,"учёба":{"книги":{"JS":400}}}'], ['{"всё":10}']], { require: ['recursion', 'def:total'] }),
  ],
};
