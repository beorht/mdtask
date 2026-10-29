const T = (id, title, statement, solution, inputs, extra = {}) => ({ id, title, statement, solution, inputs, ...extra });
module.exports = {
  dir: 'm3/06-higher',
  tasks: [
    T('hi-01', 'Свои map и filter', 'Напишите myMap(arr, fn) и myFilter(arr, fn) — без встроенных .map и .filter. Даны числа одной строкой: выведите их квадраты (myMap) и числа больше среднего (myFilter) через пробел — две строки.', () => {
      function myMap(arr, fn) {
        const out = [];
        for (let i = 0; i < arr.length; i++) out.push(fn(arr[i], i));
        return out;
      }
      function myFilter(arr, fn) {
        const out = [];
        for (const x of arr) if (fn(x)) out.push(x);
        return out;
      }
      const nums = [];
      for (const p of input().split(' ')) nums.push(Number(p));
      let s = 0;
      for (const x of nums) s += x;
      const avg = s / nums.length;
      console.log(myMap(nums, (x) => x * x).join(' '));
      console.log(myFilter(nums, (x) => x > avg).join(' '));
    }, [['1 2 3 4 5'], ['10 -3 7']], { require: ['def:myMap', 'def:myFilter'], forbid: ['.map', '.filter'] }),
    T('hi-02', 'Свой reduce', 'Напишите myReduce(arr, fn, start) без .reduce. С его помощью найдите для чисел из строки сумму, произведение и максимум. Выведите три строки «сумма: …», «произведение: …», «максимум: …».', () => {
      function myReduce(arr, fn, start) {
        let acc = start;
        for (const x of arr) acc = fn(acc, x);
        return acc;
      }
      const nums = [];
      for (const p of input().split(' ')) nums.push(Number(p));
      console.log('сумма: ' + myReduce(nums, (a, x) => a + x, 0));
      console.log('произведение: ' + myReduce(nums, (a, x) => a * x, 1));
      console.log('максимум: ' + myReduce(nums, (a, x) => (x > a ? x : a), nums[0]));
    }, [['3 1 4 1 5'], ['-2 -7'], ['10']], { require: ['def:myReduce'], forbid: ['.reduce', 'Math.max'] }),
    T('hi-03', 'Конвейер', 'Напишите pipe(...fns): возвращает функцию, которая пропускает значение через все функции слева направо. Доступные шаги: trim, upper, lower, reverse (развернуть строку), dup (повторить дважды через пробел). Дана строка, затем названия шагов через пробел. Соберите конвейер и выведите результат.', () => {
      function pipe(...fns) {
        return (x) => {
          for (const f of fns) x = f(x);
          return x;
        };
      }
      const steps = {
        trim: (s) => s.trim(),
        upper: (s) => s.toUpperCase(),
        lower: (s) => s.toLowerCase(),
        reverse: (s) => s.split('').reverse().join(''),
        dup: (s) => s + ' ' + s,
      };
      const text = input();
      const names = input().split(' ');
      const fns = [];
      for (const n of names) fns.push(steps[n]);
      console.log(pipe(...fns)(text));
    }, [['  Привет  ', 'trim upper dup'], ['JavaScript', 'reverse lower'], ['ок', 'dup dup']], { require: ['def:pipe'] }),
    T('hi-04', 'Сортировка с функцией сравнения', 'Напишите sortBy(arr, compare) — сортировку вставками, которая сравнивает элементы только через compare(a, b) (без .sort). Дана строка слов. Выведите две строки: слова по возрастанию длины (при равной длине — по алфавиту, обычным сравнением строк), и по убыванию длины (при равной — в исходном порядке).', () => {
      function sortBy(arr, compare) {
        const a = arr.slice();
        for (let i = 1; i < a.length; i++) {
          const cur = a[i];
          let j = i - 1;
          while (j >= 0 && compare(a[j], cur) > 0) {
            a[j + 1] = a[j];
            j--;
          }
          a[j + 1] = cur;
        }
        return a;
      }
      const words = input().split(' ');
      console.log(sortBy(words, (x, y) => x.length - y.length || (x < y ? -1 : x > y ? 1 : 0)).join(' '));
      console.log(sortBy(words, (x, y) => y.length - x.length).join(' '));
    }, [['кот слон ёж мышь бык жираф'], ['bb a ccc aa b']], { require: ['def:sortBy'], forbid: ['.sort'] }),
    T('hi-05', 'Сколько подходит под условие', 'Напишите countIf(arr, pred) — сколько элементов удовлетворяет условию pred. Даны числа одной строкой. Выведите «чётных: …», «положительных: …», «двузначных: …» (по модулю от 10 до 99), используя countIf с разными стрелками.', () => {
      function countIf(arr, pred) {
        let c = 0;
        for (const x of arr) if (pred(x)) c++;
        return c;
      }
      const nums = [];
      for (const p of input().split(' ')) nums.push(Number(p));
      console.log('чётных: ' + countIf(nums, (x) => x % 2 === 0));
      console.log('положительных: ' + countIf(nums, (x) => x > 0));
      console.log('двузначных: ' + countIf(nums, (x) => Math.abs(x) >= 10 && Math.abs(x) <= 99));
    }, [['12 -7 0 45 100 -33 8'], ['1 3 5']], { require: ['def:countIf'], forbid: ['.filter'] }),
    T('hi-06', 'Однократный вызов', 'Напишите once(fn): возвращает функцию, которая вызывает fn только при первом вызове и запоминает её результат, а при следующих — сразу возвращает запомненный. fn печатает «настройка…» и возвращает введённое число, умноженное на 10. Дано число и количество вызовов K — вызовите полученную функцию K раз и выводите результат каждого вызова.', () => {
      function once(fn) {
        let done = false;
        let result;
        return (...args) => {
          if (!done) {
            result = fn(...args);
            done = true;
          }
          return result;
        };
      }
      const x = Number(input());
      const k = Number(input());
      const setup = once((v) => {
        console.log('настройка…');
        return v * 10;
      });
      for (let i = 0; i < k; i++) console.log(setup(x));
    }, [['4', '3'], ['7', '1']], { require: ['def:once'] }),
    T('hi-07', 'Отложенный вывод', 'Дано количество сообщений N, затем N строк «задержка_мс текст». Для каждого запланируйте вывод текста через setTimeout с этой задержкой. Сообщения должны появиться в порядке времени (при равном — в порядке ввода); в конце программы сразу (до сообщений) выведите «запланировано: N».', () => {
      const n = Number(input());
      for (let i = 0; i < n; i++) {
        const line = input();
        const space = line.indexOf(' ');
        const ms = Number(line.slice(0, space));
        const text = line.slice(space + 1);
        setTimeout(() => console.log(text), ms);
      }
      console.log('запланировано: ' + n);
    }, [['4', '300 третье', '100 первое', '200 второе', '100 тоже первое'], ['1', '0 сразу после']], { require: ['setTimeout'] }),
    T('hi-08', 'Антидребезг', 'Функция debounce(fn, ms) возвращает обёртку: при каждом вызове она отменяет запланированный вызов (clearTimeout) и планирует fn заново через ms. Так поиск на сайте ждёт, пока человек перестанет печатать. Дано ms, затем количество событий N и N строк «момент_мс текст» — в эти моменты (через setTimeout) вызывайте обёртку с текстом. fn печатает «поиск: текст». Выведите, какие поиски реально выполнятся.', () => {
      function debounce(fn, ms) {
        let timer = null;
        return (...args) => {
          clearTimeout(timer);
          timer = setTimeout(() => fn(...args), ms);
        };
      }
      const ms = Number(input());
      const search = debounce((t) => console.log('поиск: ' + t), ms);
      const n = Number(input());
      for (let i = 0; i < n; i++) {
        const line = input();
        const space = line.indexOf(' ');
        const at = Number(line.slice(0, space));
        const text = line.slice(space + 1);
        setTimeout(() => search(text), at);
      }
    }, [['300', '6', '0 к', '100 ко', '200 кот', '700 кота', '850 котами', '1500 пёс'], ['100', '2', '0 a', '50 ab']], { require: ['def:debounce', 'clearTimeout'] }),
  ],
};
