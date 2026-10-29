const T = (id, title, statement, solution, inputs, extra = {}) => ({ id, title, statement, solution, inputs, ...extra });
module.exports = {
  dir: 'm3/01-functions',
  tasks: [
    T('fn-01', 'Функция isPrime', 'Напишите функцию isPrime(n), которая возвращает true для простого числа и false для остальных (делители — до корня из n). Первая строка ввода — количество чисел k, дальше k чисел. Для каждого выведите «n: простое» или «n: не простое».', () => {
      function isPrime(n) {
        if (n < 2) return false;
        for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
        return true;
      }
      const k = Number(input());
      for (let i = 0; i < k; i++) {
        const n = Number(input());
        console.log(n + ': ' + (isPrime(n) ? 'простое' : 'не простое'));
      }
    }, [['4', '2', '15', '1', '97'], ['2', '1000003', '1000001']], { require: ['def:isPrime'] }),
    T('fn-02', 'НОД и НОК', 'Напишите функции gcd(a, b) (алгоритм Евклида) и lcm(a, b), которая использует gcd. Даны два числа — выведите «НОД = …» и «НОК = …».', () => {
      function gcd(a, b) {
        while (b !== 0) {
          const r = a % b;
          a = b;
          b = r;
        }
        return a;
      }
      function lcm(a, b) {
        return a / gcd(a, b) * b;
      }
      const a = Number(input());
      const b = Number(input());
      console.log('НОД = ' + gcd(a, b));
      console.log('НОК = ' + lcm(a, b));
    }, [['12', '18'], ['7', '13'], ['100', '25']], { require: ['def:gcd', 'def:lcm'] }),
    T('fn-03', 'Палиндром', 'Напишите функцию isPalindrome(s), которая проверяет, читается ли фраза одинаково с обеих сторон без учёта регистра и пробелов. Строки вводятся до слова «конец»; для каждой выведите «да» или «нет». Готовый .reverse не используйте — сравнивайте символы с двух концов.', () => {
      function isPalindrome(s) {
        const t = s.toLowerCase().replaceAll(' ', '');
        for (let i = 0, j = t.length - 1; i < j; i++, j--) if (t[i] !== t[j]) return false;
        return true;
      }
      while (true) {
        const s = input();
        if (s === 'конец') break;
        console.log(isPalindrome(s) ? 'да' : 'нет');
      }
    }, [['Шалаш', 'А роза упала на лапу Азора', 'кошка', 'конец'], ['12321', 'ab', 'конец']], { require: ['def:isPalindrome'], forbid: ['.reverse'] }),
    T('fn-04', 'Цифровой корень через функцию', 'Напишите функцию digitSum(n) — сумма цифр числа (арифметикой), и функцию digitalRoot(n), которая повторяет digitSum, пока не останется одна цифра. Для данного числа выведите обе величины через пробел.', () => {
      function digitSum(n) {
        let s = 0;
        while (n > 0) {
          s += n % 10;
          n = Math.floor(n / 10);
        }
        return s;
      }
      function digitalRoot(n) {
        while (n > 9) n = digitSum(n);
        return n;
      }
      const n = Number(input());
      console.log(digitSum(n), digitalRoot(n));
    }, [['9875'], ['7'], ['999999999999']], { require: ['def:digitSum', 'def:digitalRoot'], forbid: ['String', '.split'] }),
    T('fn-05', 'Максимум из четырёх', 'Напишите функцию max2(a, b) без Math.max и с её помощью найдите наибольшее из четырёх чисел.', () => {
      function max2(a, b) {
        return a > b ? a : b;
      }
      const a = Number(input());
      const b = Number(input());
      const c = Number(input());
      const d = Number(input());
      console.log(max2(max2(a, b), max2(c, d)));
    }, [['3', '9', '-1', '7'], ['-5', '-2', '-8', '-3'], ['4', '4', '4', '4']], { require: ['def:max2'], forbid: ['Math.max'] }),
    T('fn-06', 'Степень циклом', 'Напишите функцию power(base, exp), которая возводит число в целую неотрицательную степень циклом (без ** и Math.pow). Даны основание и показатель — выведите результат.', () => {
      function power(base, exp) {
        let r = 1;
        for (let i = 0; i < exp; i++) r *= base;
        return r;
      }
      const base = Number(input());
      const exp = Number(input());
      console.log(power(base, exp));
    }, [['2', '10'], ['5', '0'], ['-3', '3'], ['1.5', '2']], { require: ['def:power'], forbid: ['**', 'Math.pow'] }),
    T('fn-07', 'Гласные в словах', 'Напишите функцию countVowels(word), которая считает русские гласные (а е ё и о у ы э ю я) в слове без учёта регистра. Дана строка слов через пробел — выведите слово, в котором гласных больше всего (при равенстве — первое), и количество гласных в нём.', () => {
      function countVowels(word) {
        let c = 0;
        for (const ch of word.toLowerCase()) if ('аеёиоуыэюя'.includes(ch)) c++;
        return c;
      }
      const words = input().split(' ');
      let best = words[0];
      for (const w of words) if (countVowels(w) > countVowels(best)) best = w;
      console.log(best, countVowels(best));
    }, [['кот собака попугай ёж'], ['Аист Ива Ель'], ['программирование']], { require: ['def:countVowels'] }),
    T('jsb-12', 'Сумма двумя способами', 'Сравните два способа посчитать сумму чисел от 1 до N. Напишите функцию sumLoop(n) — циклом — и sumFormula(n) — по формуле N × (N + 1) / 2. Пусть каждая вместе с суммой считает и число выполненных шагов (у цикла — по шагу на число, у формулы — 1) и возвращает массив [сумма, шаги]. Выведите «цикл: S, шагов: K» и «формула: S, шагов: K».', () => {
      function sumLoop(n) {
        let s = 0;
        let steps = 0;
        for (let i = 1; i <= n; i++) {
          s += i;
          steps++;
        }
        return [s, steps];
      }
      function sumFormula(n) {
        return [n * (n + 1) / 2, 1];
      }
      const n = Number(input());
      const a = sumLoop(n);
      const b = sumFormula(n);
      console.log('цикл: ' + a[0] + ', шагов: ' + a[1]);
      console.log('формула: ' + b[0] + ', шагов: ' + b[1]);
    }, [['10'], ['1000000'], ['1']], { require: ['def:sumLoop', 'def:sumFormula'] }),
    T('fn-08', 'День года', 'Напишите функции isLeap(year), daysInMonth(month, year) (использует isLeap) и dayOfYear(day, month, year) (использует daysInMonth). Даны день, месяц и год — выведите номер дня в году.', () => {
      function isLeap(y) {
        return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
      }
      function daysInMonth(m, y) {
        if (m === 2) return isLeap(y) ? 29 : 28;
        return [4, 6, 9, 11].includes(m) ? 30 : 31;
      }
      function dayOfYear(d, m, y) {
        let n = d;
        for (let k = 1; k < m; k++) n += daysInMonth(k, y);
        return n;
      }
      const d = Number(input());
      const m = Number(input());
      const y = Number(input());
      console.log(dayOfYear(d, m, y));
    }, [['1', '1', '2026'], ['1', '3', '2024'], ['31', '12', '2023'], ['27', '10', '2026']], { require: ['def:isLeap', 'def:daysInMonth', 'def:dayOfYear'] }),
    T('fn-09', 'Простые-близнецы', 'Близнецы — два простых числа, которые отличаются на 2 (11 и 13). Напишите функцию isPrime(n) и функцию nextPrime(n) — наименьшее простое больше n. Дано N — выведите все пары близнецов, не превышающих N, по одной в строке через пробел, а в конце — «пар: K».', () => {
      function isPrime(n) {
        if (n < 2) return false;
        for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
        return true;
      }
      function nextPrime(n) {
        let k = n + 1;
        while (!isPrime(k)) k++;
        return k;
      }
      const n = Number(input());
      let pairs = 0;
      for (let p = 2; nextPrime(p) <= n; p = nextPrime(p)) {
        if (nextPrime(p) - p === 2) {
          console.log(p, p + 2);
          pairs++;
        }
      }
      console.log('пар: ' + pairs);
    }, [['50'], ['5'], ['3'], ['200']], { require: ['def:isPrime', 'def:nextPrime'] }),
    T('fn-10', 'Рамка из функции', 'Напишите функцию frame(text, ch), которая возвращает строку из трёх строк: рамку из символа ch вокруг текста с одним пробелом с каждой стороны. Даны текст и символ — выведите результат функции одним console.log.', () => {
      function frame(text, ch) {
        const line = ch.repeat(text.length + 4);
        return line + '\n' + ch + ' ' + text + ' ' + ch + '\n' + line;
      }
      const text = input();
      const ch = input();
      console.log(frame(text, ch));
    }, [['Привет', '*'], ['JS', '#']], { require: ['def:frame'] }),
  ],
};
