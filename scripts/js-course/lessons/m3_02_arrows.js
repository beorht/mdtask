const T = (id, title, statement, solution, inputs, extra = {}) => ({ id, title, statement, solution, inputs, ...extra });
module.exports = {
  dir: 'm3/02-arrows',
  tasks: [
    T('ar-01', 'Таблица значений', 'Запишите f(x) = x² − 3x + 2 стрелочной функцией. Даны a и b — выведите строки «x | f(x)» для всех целых x от a до b.', () => {
      const f = (x) => x * x - 3 * x + 2;
      const a = Number(input());
      const b = Number(input());
      for (let x = a; x <= b; x++) console.log(x + ' | ' + f(x));
    }, [['-1', '4'], ['0', '0']], { require: ['=>'] }),
    T('ar-02', 'Калькулятор без switch', 'Храните операции + − * / % в объекте «знак → стрелочная функция». Дано выражение одной строкой «a знак b» (через пробелы). Выведите результат или «неизвестная операция». Ни switch, ни цепочку if по знаку не используйте.', () => {
      const ops = {
        '+': (a, b) => a + b,
        '-': (a, b) => a - b,
        '*': (a, b) => a * b,
        '/': (a, b) => a / b,
        '%': (a, b) => a % b,
      };
      const parts = input().split(' ');
      const op = ops[parts[1]];
      console.log(op ? op(Number(parts[0]), Number(parts[2])) : 'неизвестная операция');
    }, [['6 * 7'], ['17 % 5'], ['1 / 4'], ['2 ^ 3']], { require: ['=>'], forbid: ['switch'] }),
    T('ar-03', 'Цепочка преобразований', 'Дано число, затем команды до слова «конец»: double (удвоить), inc (прибавить 1), square (квадрат), neg (сменить знак). Храните команды в объекте стрелочных функций. После каждой команды выводите «команда: значение»; неизвестную команду пропустите с сообщением «нет команды X».', () => {
      const cmds = { double: (x) => x * 2, inc: (x) => x + 1, square: (x) => x * x, neg: (x) => -x };
      let x = Number(input());
      while (true) {
        const c = input();
        if (c === 'конец') break;
        if (!cmds[c]) {
          console.log('нет команды ' + c);
          continue;
        }
        x = cmds[c](x);
        console.log(c + ': ' + x);
      }
    }, [['3', 'double', 'inc', 'square', 'конец'], ['5', 'neg', 'half', 'double', 'конец']], { require: ['=>'] }),
    T('ar-04', 'Корень делением пополам', 'Найдите корень уравнения x³ + x − k = 0 (k > 0) на отрезке [0, k] делением пополам: пока длина отрезка больше 1e-7, берите середину и оставляйте половину, где функция меняет знак. Функцию запишите стрелкой. Выведите корень с 4 знаками после точки (toFixed) и число шагов.', () => {
      const k = Number(input());
      const f = (x) => x * x * x + x - k;
      let a = 0;
      let b = k;
      let steps = 0;
      while (b - a > 1e-7) {
        const m = (a + b) / 2;
        if (f(a) * f(m) <= 0) b = m;
        else a = m;
        steps++;
      }
      console.log(((a + b) / 2).toFixed(4), steps);
    }, [['2'], ['10'], ['1000']], { require: ['=>'] }),
    T('ar-05', 'Площадь под графиком', 'Посчитайте площадь под графиком f(x) = x² на отрезке [a, b] методом трапеций: разбейте отрезок на n равных частей и сложите площади трапеций. Даны a, b, n. Выведите результат с 4 знаками после точки.', () => {
      const f = (x) => x * x;
      const a = Number(input());
      const b = Number(input());
      const n = Number(input());
      const h = (b - a) / n;
      let s = 0;
      for (let i = 0; i < n; i++) s += (f(a + i * h) + f(a + (i + 1) * h)) / 2 * h;
      console.log(s.toFixed(4));
    }, [['0', '3', '1000'], ['0', '1', '1'], ['-1', '2', '10']], { require: ['=>'] }),
    T('ar-06', 'Сколько подходит', 'Даны N и название проверки: «чётные», «простые», «палиндромы» или «квадраты». Храните проверки в объекте стрелочных функций и выведите, сколько чисел от 1 до N проходят выбранную проверку.', () => {
      const tests = {
        'чётные': (n) => n % 2 === 0,
        'простые': (n) => {
          if (n < 2) return false;
          for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
          return true;
        },
        'палиндромы': (n) => String(n) === String(n).split('').reverse().join(''),
        'квадраты': (n) => Number.isInteger(Math.sqrt(n)),
      };
      const n = Number(input());
      const check = tests[input()];
      let count = 0;
      for (let k = 1; k <= n; k++) if (check(k)) count++;
      console.log(count);
    }, [['100', 'простые'], ['1000', 'палиндромы'], ['50', 'квадраты'], ['7', 'чётные']], { require: ['=>'] }),
    T('ar-07', 'Ограничение значения', 'Напишите стрелочную функцию clamp(x, lo, hi): если x меньше lo — вернуть lo, больше hi — hi, иначе x (без Math.min/Math.max). Даны lo и hi, затем числа одной строкой через пробел — выведите их после clamp через пробел.', () => {
      const clamp = (x, lo, hi) => (x < lo ? lo : x > hi ? hi : x);
      const lo = Number(input());
      const hi = Number(input());
      const nums = input().split(' ');
      let out = '';
      for (const s of nums) out += clamp(Number(s), lo, hi) + ' ';
      console.log(out.trim());
    }, [['0', '10', '-5 3 10 15 7'], ['1', '5', '9 0 2']], { require: ['def:clamp', '=>'], forbid: ['Math.min', 'Math.max'] }),
    T('ar-08', 'Конвертер величин', 'Храните переводы в объекте стрелок: «c-f» (Цельсий → Фаренгейт), «f-c», «km-mi» (1 миля = 1.609344 км), «mi-km», «kg-lb» (1 фунт = 0.45359237 кг). Вводятся строки «перевод значение» до «конец»; выведите «значение → результат» с двумя знаками после точки у результата или «нет такого перевода».', () => {
      const conv = {
        'c-f': (v) => v * 9 / 5 + 32,
        'f-c': (v) => (v - 32) * 5 / 9,
        'km-mi': (v) => v / 1.609344,
        'mi-km': (v) => v * 1.609344,
        'kg-lb': (v) => v / 0.45359237,
      };
      while (true) {
        const line = input();
        if (line === 'конец') break;
        const [name, value] = line.split(' ');
        console.log(conv[name] ? value + ' → ' + conv[name](Number(value)).toFixed(2) : 'нет такого перевода');
      }
    }, [['c-f 100', 'f-c 32', 'km-mi 42.195', 'mi-km 1', 'kg-lb 70', 'm-ft 3', 'конец'], ['c-f -40', 'kg-lb 1', 'конец']], { require: ['=>'] }),
  ],
};
