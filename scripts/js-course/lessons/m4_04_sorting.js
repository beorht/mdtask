const T = (id, title, statement, solution, inputs, extra = {}) => ({ id, title, statement, solution, inputs, ...extra });
const NO_SORT = ['.sort', '.toSorted'];
module.exports = {
  dir: 'm4/04-sorting',
  tasks: [
    T('so-01', 'Пузырёк', 'Отсортируйте числа пузырьком (без sort): проходите по массиву, меняя местами соседей в неправильном порядке; если за проход не было обменов — остановитесь. Выведите отсортированный массив, число обменов и число проходов.', () => {
      const a = input().split(' ').map(Number);
      let swaps = 0;
      let passes = 0;
      let swapped = true;
      while (swapped) {
        swapped = false;
        passes++;
        for (let i = 0; i + 1 < a.length; i++) {
          if (a[i] > a[i + 1]) {
            [a[i], a[i + 1]] = [a[i + 1], a[i]];
            swaps++;
            swapped = true;
          }
        }
      }
      console.log(a.join(' '));
      console.log('обменов: ' + swaps + ', проходов: ' + passes);
    }, [['5 1 4 2 8'], ['1 2 3'], ['3 2 1'], ['7']], { forbid: NO_SORT }),
    T('so-02', 'Сортировка выбором', 'Отсортируйте числа выбором (без sort): на шаге i найдите минимум в части с i до конца и поменяйте его с элементом i. После каждого шага, на котором был обмен, выведите массив через пробел.', () => {
      const a = input().split(' ').map(Number);
      for (let i = 0; i < a.length - 1; i++) {
        let min = i;
        for (let j = i + 1; j < a.length; j++) if (a[j] < a[min]) min = j;
        if (min !== i) {
          [a[i], a[min]] = [a[min], a[i]];
          console.log(a.join(' '));
        }
      }
    }, [['29 10 14 37 13'], ['4 3 2 1']], { forbid: NO_SORT }),
    T('so-03', 'Сортировка вставками', 'Отсортируйте числа вставками (без sort) и посчитайте сдвиги — сколько раз элемент передвигался на одну позицию вправо. Выведите массив и «сдвигов: K».', () => {
      const a = input().split(' ').map(Number);
      let shifts = 0;
      for (let i = 1; i < a.length; i++) {
        const cur = a[i];
        let j = i - 1;
        while (j >= 0 && a[j] > cur) {
          a[j + 1] = a[j];
          j--;
          shifts++;
        }
        a[j + 1] = cur;
      }
      console.log(a.join(' '));
      console.log('сдвигов: ' + shifts);
    }, [['5 2 4 6 1 3'], ['1 2 3 4'], ['2 1']], { forbid: NO_SORT }),
    T('so-04', 'Двоичный поиск', 'Дан отсортированный по возрастанию массив и затем числа-запросы одной строкой. Для каждого найдите его позицию (с 1) двоичным поиском или выведите «нет»; через пробел — число сравнений с серединой. Без indexOf, includes, find.', () => {
      const a = input().split(' ').map(Number);
      for (const x of input().split(' ').map(Number)) {
        let lo = 0;
        let hi = a.length - 1;
        let steps = 0;
        let pos = -1;
        while (lo <= hi) {
          const mid = Math.floor((lo + hi) / 2);
          steps++;
          if (a[mid] === x) {
            pos = mid;
            break;
          }
          if (a[mid] < x) lo = mid + 1;
          else hi = mid - 1;
        }
        console.log((pos === -1 ? 'нет' : pos + 1) + ' ' + steps);
      }
    }, [['2 5 8 12 16 23 38 56 72 91', '23 2 91 50'], ['7', '7 8']], { forbid: ['.indexOf', '.includes', '.find', '.findIndex'] }),
    T('so-05', 'Ловушка sort', 'Даны числа одной строкой. Выведите три строки: результат sort() без функции сравнения, по возрастанию как числа, по убыванию как числа. Каждый раз сортируйте копию исходного массива.', () => {
      const a = input().split(' ').map(Number);
      console.log([...a].sort().join(' '));
      console.log([...a].sort((x, y) => x - y).join(' '));
      console.log([...a].sort((x, y) => y - x).join(' '));
    }, [['10 9 1 100 25'], ['-1 -10 2']], { require: ['.sort'] }),
    T('so-06', 'Рейтинг по двум полям', 'Дано N, затем N строк «имя балл». Выведите рейтинг: по убыванию балла, при равном балле — по имени по алфавиту (обычным сравнением строк). Формат строки: «место. имя — балл».', () => {
      const n = Number(input());
      const rows = Array.from({ length: n }, () => {
        const [name, score] = input().split(' ');
        return { name, score: Number(score) };
      });
      rows.sort((a, b) => b.score - a.score || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
      rows.forEach((r, i) => console.log(i + 1 + '. ' + r.name + ' — ' + r.score));
    }, [['5', 'Бек 80', 'Аня 95', 'Дима 80', 'Ира 70', 'Вика 95'], ['1', 'Оля 50']], { require: ['.sort'] }),
    T('so-07', 'Сортировка подсчётом', 'Даны оценки от 1 до 5 одной строкой. Отсортируйте их подсчётом: посчитайте, сколько раз встречается каждая оценка, и выпишите их по порядку — без sort и без сравнений элементов между собой. Выведите отсортированные оценки и «самая частая: X» (при равенстве — большая).', () => {
      const count = [0, 0, 0, 0, 0, 0];
      for (const m of input().split(' ').map(Number)) count[m]++;
      const out = [];
      let best = 5;
      for (let m = 1; m <= 5; m++) for (let k = 0; k < count[m]; k++) out.push(m);
      for (let m = 5; m >= 1; m--) if (count[m] > count[best]) best = m;
      console.log(out.join(' '));
      console.log('самая частая: ' + best);
    }, [['5 3 4 5 2 3 5 4'], ['1'], ['4 4 3 3']], { forbid: NO_SORT }),
    T('so-08', 'Сортировка слиянием', 'Напишите рекурсивную mergeSort(arr): массив из 0–1 элемента уже отсортирован; иначе — разделить пополам, отсортировать половины и слить двумя указателями. Без sort. Выведите результат и количество сравнений при слияниях.', () => {
      let comparisons = 0;
      function mergeSort(arr) {
        if (arr.length <= 1) return arr;
        const mid = Math.floor(arr.length / 2);
        const left = mergeSort(arr.slice(0, mid));
        const right = mergeSort(arr.slice(mid));
        const out = [];
        let i = 0;
        let j = 0;
        while (i < left.length && j < right.length) {
          comparisons++;
          out.push(left[i] <= right[j] ? left[i++] : right[j++]);
        }
        return out.concat(left.slice(i), right.slice(j));
      }
      console.log(mergeSort(input().split(' ').map(Number)).join(' '));
      console.log('сравнений: ' + comparisons);
    }, [['38 27 43 3 9 82 10'], ['1'], ['5 4 3 2 1 0']], { require: ['recursion', 'def:mergeSort'], forbid: NO_SORT }),
    T('so-09', 'Медиана', 'Даны числа одной строкой. Отсортируйте копию и выведите медиану: средний элемент, а при чётном количестве — среднее двух средних. Затем выведите, сколько чисел строго меньше медианы.', () => {
      const a = input().split(' ').map(Number);
      const s = [...a].sort((x, y) => x - y);
      const m = s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
      console.log(m);
      console.log(a.filter((x) => x < m).length);
    }, [['7 1 3 9 5'], ['4 1 2 3'], ['10']]),
    T('so-10', 'Сколько не больше', 'Дан отсортированный массив (могут быть повторы), затем запросы одной строкой. Для каждого x выведите, сколько элементов не больше x, — найдите двоичным поиском первую позицию с элементом больше x. Без циклов по всему массиву на каждый запрос.', () => {
      const a = input().split(' ').map(Number);
      const upper = (x) => {
        let lo = 0;
        let hi = a.length;
        while (lo < hi) {
          const mid = Math.floor((lo + hi) / 2);
          if (a[mid] <= x) lo = mid + 1;
          else hi = mid;
        }
        return lo;
      };
      console.log(input().split(' ').map((s) => upper(Number(s))).join(' '));
    }, [['1 2 2 2 5 7 7 9', '2 0 7 100 6'], ['3 3 3', '3 2']], { forbid: ['.filter', '.indexOf', '.lastIndexOf'] }),
  ],
};
