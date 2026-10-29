const T = (id, title, statement, solution, inputs, extra = {}) => ({ id, title, statement, solution, inputs, ...extra });
module.exports = {
  dir: 'm4/02-loops-arrays',
  tasks: [
    T('la-01', 'Чётные и нечётные', 'Даны числа одной строкой. Разложите их циклом for…of в два массива и выведите две строки: «чётные: …» и «нечётные: …» (через пробел; если нет — «нет»).', () => {
      const even = [];
      const odd = [];
      for (const x of input().split(' ').map(Number)) (x % 2 === 0 ? even : odd).push(x);
      console.log('чётные: ' + (even.length ? even.join(' ') : 'нет'));
      console.log('нечётные: ' + (odd.length ? odd.join(' ') : 'нет'));
    }, [['1 2 3 4 5 6'], ['7 9'], ['0 -2']], { require: ['for-of'] }),
    T('la-02', 'Второй по величине', 'Даны числа одной строкой. Найдите второе по величине различное значение за один проход (без сортировки). Если его нет — «нет».', () => {
      let first = -Infinity;
      let second = -Infinity;
      for (const x of input().split(' ').map(Number)) {
        if (x > first) {
          second = first;
          first = x;
        } else if (x < first && x > second) second = x;
      }
      console.log(second === -Infinity ? 'нет' : second);
    }, [['3 9 7 9 1'], ['5 5 5'], ['-1 -8'], ['4']], { forbid: ['.sort'] }),
    T('la-03', 'Скользящее среднее', 'Даны температуры за дни одной строкой и размер окна k. Для каждого окна из k подряд идущих дней выведите среднее с одним знаком (через пробел). Сумму окна сдвигайте, а не считайте заново.', () => {
      const t = input().split(' ').map(Number);
      const k = Number(input());
      let sum = 0;
      for (let i = 0; i < k; i++) sum += t[i];
      const out = [(sum / k).toFixed(1)];
      for (let i = k; i < t.length; i++) {
        sum += t[i] - t[i - k];
        out.push((sum / k).toFixed(1));
      }
      console.log(out.join(' '));
    }, [['20 22 24 23 19 18 25', '3'], ['5 6', '2'], ['1 2 3 4', '1']]),
    T('la-04', 'Самый длинный рост', 'Даны числа одной строкой. Найдите самый длинный участок подряд идущих элементов, где каждый следующий больше предыдущего. Выведите его длину и сам участок через пробел (если таких несколько — первый).', () => {
      const a = input().split(' ').map(Number);
      let bestStart = 0;
      let bestLen = 1;
      let start = 0;
      for (let i = 1; i <= a.length; i++) {
        if (i === a.length || a[i] <= a[i - 1]) {
          if (i - start > bestLen) {
            bestLen = i - start;
            bestStart = start;
          }
          start = i;
        }
      }
      console.log(bestLen);
      console.log(a.slice(bestStart, bestStart + bestLen).join(' '));
    }, [['1 2 1 2 3 4 0 5'], ['5 4 3'], ['1 2 3']]),
    T('la-05', 'Суммы на отрезках', 'Даны числа одной строкой, затем количество запросов q и q строк «l r» (номера с 1, включительно). Посчитайте префиксные суммы один раз и ответьте на каждый запрос суммой на отрезке.', () => {
      const a = input().split(' ').map(Number);
      const pre = [0];
      for (const x of a) pre.push(pre[pre.length - 1] + x);
      const q = Number(input());
      for (let i = 0; i < q; i++) {
        const [l, r] = input().split(' ').map(Number);
        console.log(pre[r] - pre[l - 1]);
      }
    }, [['3 1 4 1 5 9 2 6', '4', '1 8', '2 4', '5 5', '3 6'], ['10', '1', '1 1']]),
    T('la-06', 'Частота цифр', 'Дана строка. Посчитайте, сколько раз встречается каждая цифра 0–9, в массиве-счётчике из 10 элементов. Выведите «цифра: количество» для встретившихся цифр по возрастанию, или «цифр нет».', () => {
      const count = new Array(10).fill(0);
      for (const ch of input()) if (ch >= '0' && ch <= '9') count[Number(ch)]++;
      let any = false;
      count.forEach((c, d) => {
        if (c) {
          console.log(d + ': ' + c);
          any = true;
        }
      });
      if (!any) console.log('цифр нет');
    }, [['Телефон +998 90 123-45-67'], ['без цифр'], ['000111']]),
    T('la-07', 'Лидеры', 'Лидер — элемент, который больше всех элементов правее него (последний — всегда лидер). Даны числа одной строкой. Найдите лидеров одним проходом справа налево и выведите их в исходном порядке.', () => {
      const a = input().split(' ').map(Number);
      const leaders = [];
      let max = -Infinity;
      for (let i = a.length - 1; i >= 0; i--) {
        if (a[i] > max) {
          leaders.unshift(a[i]);
          max = a[i];
        }
      }
      console.log(leaders.join(' '));
    }, [['16 17 4 3 5 2'], ['1 2 3'], ['3 2 1']]),
    T('la-08', 'Нумерованный список', 'Даны покупки через запятую с пробелом. С помощью forEach выведите их нумерованным списком «1. хлеб» и т. д., а в конце — «Всего: N».', () => {
      const items = input().split(', ');
      items.forEach((item, i) => console.log(i + 1 + '. ' + item));
      console.log('Всего: ' + items.length);
    }, [['хлеб, молоко, сыр'], ['вода']], { require: ['.forEach'] }),
    T('la-09', 'Решето Эратосфена', 'Дано N. Найдите все простые числа до N решетом Эратосфена (массив флагов; вычёркивайте кратные каждого простого p, начиная с p × p). Выведите количество простых и последние пять из них через пробел (или все, если их меньше).', () => {
      const n = Number(input());
      const prime = new Array(n + 1).fill(true);
      prime[0] = false;
      prime[1] = false;
      for (let p = 2; p * p <= n; p++) {
        if (!prime[p]) continue;
        for (let k = p * p; k <= n; k += p) prime[k] = false;
      }
      const list = [];
      for (let k = 2; k <= n; k++) if (prime[k]) list.push(k);
      console.log(list.length);
      console.log(list.slice(-5).join(' '));
    }, [['30'], ['2'], ['100000']]),
    T('la-10', 'Обход по спирали', 'Дано число строк n, затем n строк таблицы (числа через пробел). Выведите все элементы в порядке обхода по спирали по часовой стрелке, начиная с левого верхнего угла, через пробел.', () => {
      const n = Number(input());
      const m = [];
      for (let i = 0; i < n; i++) m.push(input().split(' '));
      let top = 0;
      let bottom = n - 1;
      let left = 0;
      let right = m[0].length - 1;
      const out = [];
      while (top <= bottom && left <= right) {
        for (let c = left; c <= right; c++) out.push(m[top][c]);
        top++;
        for (let r = top; r <= bottom; r++) out.push(m[r][right]);
        right--;
        if (top <= bottom) {
          for (let c = right; c >= left; c--) out.push(m[bottom][c]);
          bottom--;
        }
        if (left <= right) {
          for (let r = bottom; r >= top; r--) out.push(m[r][left]);
          left++;
        }
      }
      console.log(out.join(' '));
    }, [['3', '1 2 3', '4 5 6', '7 8 9'], ['2', '1 2 3 4', '5 6 7 8'], ['1', '7']]),
  ],
};
