const T = (id, title, statement, solution, inputs, extra = {}) => ({ id, title, statement, solution, inputs, ...extra });
module.exports = {
  dir: 'm3/03-params',
  tasks: [
    T('pr-01', 'Сумма любого числа аргументов', 'Напишите функцию sum(...nums), которая складывает сколько угодно аргументов циклом. Даны числа одной строкой через пробел — вызовите sum, разложив их spread-ом, и выведите результат. Вызов без аргументов должен давать 0 — выведите и sum() второй строкой.', () => {
      function sum(...nums) {
        let s = 0;
        for (const n of nums) s += n;
        return s;
      }
      const values = [];
      for (const p of input().split(' ')) values.push(Number(p));
      console.log(sum(...values));
      console.log(sum());
    }, [['1 2 3 4'], ['10'], ['-5 5 0.5']], { require: ['def:sum', 'spread'], forbid: ['.reduce'] }),
    T('pr-02', 'Формат цены', 'Напишите функцию formatPrice(value, currency = «сум», digits = 0), которая возвращает «значение валюта», округляя значение до digits знаков через toFixed. Вводятся строки до «конец»: в строке 1–3 части через пробел (значение, затем по желанию валюта и знаков). Выведите результат для каждой.', () => {
      function formatPrice(value, currency = 'сум', digits = 0) {
        return value.toFixed(digits) + ' ' + currency;
      }
      while (true) {
        const line = input();
        if (line === 'конец') break;
        const p = line.split(' ');
        console.log(formatPrice(Number(p[0]), p[1], p[2] === undefined ? undefined : Number(p[2])));
      }
    }, [['12650', '9.5 $ 2', '99.999 руб', '15 € 1', 'конец'], ['5 USD 1', '0', 'конец']], { require: ['def:formatPrice'] }),
    T('pr-03', 'Среднее без данных', 'Напишите функцию average(...nums): среднее арифметическое аргументов или null, если аргументов нет. Вводятся строки чисел через пробел (пустая строка — нет чисел) до «конец». Для каждой выведите среднее с двумя знаками или «нет данных».', () => {
      function average(...nums) {
        if (nums.length === 0) return null;
        let s = 0;
        for (const n of nums) s += n;
        return s / nums.length;
      }
      while (true) {
        const line = input();
        if (line === 'конец') break;
        const values = [];
        if (line !== '') for (const p of line.split(' ')) values.push(Number(p));
        const avg = average(...values);
        console.log(avg === null ? 'нет данных' : avg.toFixed(2));
      }
    }, [['5 4 3', '', '2', 'конец'], ['1 2', '-3 3 7', 'конец']], { require: ['def:average', 'spread'] }),
    T('pr-04', 'Максимум без Math.max', 'Напишите функцию maxAll(first, ...rest), которая возвращает наибольший из аргументов, без Math.max. Даны строки чисел до «конец» — для каждой выведите максимум.', () => {
      function maxAll(first, ...rest) {
        let best = first;
        for (const x of rest) if (x > best) best = x;
        return best;
      }
      while (true) {
        const line = input();
        if (line === 'конец') break;
        const values = [];
        for (const p of line.split(' ')) values.push(Number(p));
        console.log(maxAll(...values));
      }
    }, [['3 9 2', '-4 -1 -7', '42', 'конец'], ['0 -1', '100 99 101 98', 'конец']], { require: ['def:maxAll', 'spread'], forbid: ['Math.max'] }),
    T('pr-05', 'Повтор строки', 'Напишите функцию repeatText(text, times = 2, sep = « »), которая повторяет текст times раз через разделитель — циклом, без .repeat и .join. Строки ввода «текст;раз;разделитель», где «раз» и «разделитель» могут отсутствовать. Ввод до «конец».', () => {
      function repeatText(text, times = 2, sep = ' ') {
        let out = '';
        for (let i = 0; i < times; i++) out += (i ? sep : '') + text;
        return out;
      }
      while (true) {
        const line = input();
        if (line === 'конец') break;
        const p = line.split(';');
        console.log(repeatText(p[0], p[1] === undefined ? undefined : Number(p[1]), p[2]));
      }
    }, [['ха', 'да;3', 'ок;4;-', 'Эхо;1', 'конец'], ['ой;0', 'бум;2;!', 'конец']], { require: ['def:repeatText'], forbid: ['.repeat', '.join'] }),
    T('pr-06', 'Анкета', 'Напишите функцию profile(name, age = «не указан», ...hobbies), которая возвращает три строки: «Имя: …», «Возраст: …», «Увлечения: …» (через запятую с пробелом или «нет»). Ввод — строка «имя;возраст;увлечение;…», пустой возраст означает «не передан». Выведите результат.', () => {
      function profile(name, age = 'не указан', ...hobbies) {
        let list = '';
        for (const h of hobbies) list += (list ? ', ' : '') + h;
        return 'Имя: ' + name + '\nВозраст: ' + age + '\nУвлечения: ' + (list || 'нет');
      }
      const p = input().split(';');
      const hobbies = p.slice(2);
      console.log(profile(p[0], p[1] === '' || p[1] === undefined ? undefined : p[1], ...hobbies));
    }, [['Аня;17;музыка;шахматы;код'], ['Бек;;футбол'], ['Лола']], { require: ['def:profile', 'spread'] }),
    T('pr-07', 'Диапазон', 'Напишите функцию range(start, end, step = 1), которая возвращает массив чисел от start до end не включая end (шаг может быть отрицательным; при шаге 0 — пустой массив). Строки «start end [step]» до «конец»; выведите числа через пробел или «пусто».', () => {
      function range(start, end, step = 1) {
        const out = [];
        if (step === 0) return out;
        for (let x = start; step > 0 ? x < end : x > end; x += step) out.push(x);
        return out;
      }
      while (true) {
        const line = input();
        if (line === 'конец') break;
        const p = line.split(' ').map(Number);
        const r = range(p[0], p[1], p[2]);
        console.log(r.length ? r.join(' ') : 'пусто');
      }
    }, [['0 5', '1 10 3', '10 0 -2', '5 5', '1 5 0', 'конец'], ['-3 3', '0 10 5', 'конец']], { require: ['def:range'] }),
    T('pr-08', 'Сумма с весами', 'Напишите функцию weighted(weights, ...values): weights — массив весов, values — значения; результат — сумма value × weight по парам (лишние значения без веса считаются с весом 1). Даны веса одной строкой и значения другой. Выведите результат.', () => {
      function weighted(weights, ...values) {
        let s = 0;
        for (let i = 0; i < values.length; i++) s += values[i] * (i < weights.length ? weights[i] : 1);
        return s;
      }
      const w = input().split(' ').map(Number);
      const v = input().split(' ').map(Number);
      console.log(weighted(w, ...v));
    }, [['2 3', '10 20 5'], ['0.5 0.5 1', '4 6 1'], ['1', '7']], { require: ['def:weighted', 'spread'] }),
  ],
};
