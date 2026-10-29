const T = (id, title, statement, solution, inputs, extra = {}) => ({ id, title, statement, solution, inputs, ...extra });
module.exports = {
  dir: 'm4/08-data-practice',
  tasks: [
    T('jsd-04', 'Оценки группы', 'Дано N, затем N строк «имя балл». Соберите объект «имя → балл». Выведите «среднее: X» (одна цифра после точки), «лучший: имя» (при равенстве — первый) и «ниже среднего: имена через запятую с пробелом» или «ниже среднего: нет».', () => {
      const n = Number(input());
      const score = {};
      for (let i = 0; i < n; i++) {
        const [name, s] = input().split(' ');
        score[name] = Number(s);
      }
      const names = Object.keys(score);
      const avg = names.reduce((s, k) => s + score[k], 0) / names.length;
      let best = names[0];
      for (const k of names) if (score[k] > score[best]) best = k;
      const low = names.filter((k) => score[k] < avg);
      console.log('среднее: ' + avg.toFixed(1));
      console.log('лучший: ' + best);
      console.log('ниже среднего: ' + (low.length ? low.join(', ') : 'нет'));
    }, [['3', 'Аня 4', 'Боря 5', 'Витя 3'], ['2', 'Оля 5', 'Петя 5']]),
    T('jsd-09', 'Товары по категориям', 'Дано N, затем N строк «название;категория;цена». Сгруппируйте товары по категориям. Для каждой категории в порядке первого появления выведите «категория: товар, товар — сумма S».', () => {
      const n = Number(input());
      const groups = new Map();
      for (let i = 0; i < n; i++) {
        const [name, cat, price] = input().split(';');
        if (!groups.has(cat)) groups.set(cat, { names: [], sum: 0 });
        groups.get(cat).names.push(name);
        groups.get(cat).sum += Number(price);
      }
      for (const [cat, g] of groups) console.log(cat + ': ' + g.names.join(', ') + ' — сумма ' + g.sum);
    }, [['3', 'яблоко;фрукты;50', 'морковь;овощи;30', 'банан;фрукты;40'], ['4', 'ручка;канцелярия;15', 'тетрадь;канцелярия;25', 'мяч;спорт;300', 'кеды;спорт;900']]),
    T('jsd-10', 'Старые и новые цены', 'Даны старые цены и новые цены — каждые одной строкой JSON «товар → цена». Для товаров из старого прайса в его порядке выведите: «товар: +разница» или «товар: -разница», «товар: 0 (не изменилась)», «товар: убран из прайса». Затем — «новые: товар, товар» для товаров, которых не было раньше, или «новые: нет».', () => {
      const old = JSON.parse(input());
      const fresh = JSON.parse(input());
      for (const item in old) {
        if (!(item in fresh)) console.log(item + ': убран из прайса');
        else {
          const d = fresh[item] - old[item];
          console.log(item + ': ' + (d === 0 ? '0 (не изменилась)' : (d > 0 ? '+' : '') + d));
        }
      }
      const added = Object.keys(fresh).filter((k) => !(k in old));
      console.log('новые: ' + (added.length ? added.join(', ') : 'нет'));
    }, [['{"хлеб":40,"молоко":70,"сыр":350}', '{"хлеб":45,"молоко":70,"масло":200}'], ['{"чай":120}', '{"чай":100}']]),
    T('jsd-11', 'База студентов по группам', 'Дано N, затем N строк «имя группа балл». Постройте объект «группа → массив студентов». Для каждой группы в порядке первого появления выведите «группа: имя(балл), имя(балл)», «  среднее: X» (одна цифра после точки) и «  лучший: имя» (при равенстве — первый).', () => {
      const n = Number(input());
      const groups = {};
      for (let i = 0; i < n; i++) {
        const [name, group, score] = input().split(' ');
        if (!groups[group]) groups[group] = [];
        groups[group].push({ name, score: Number(score) });
      }
      for (const [group, list] of Object.entries(groups)) {
        const avg = list.reduce((s, x) => s + x.score, 0) / list.length;
        const best = list.reduce((b, x) => (x.score > b.score ? x : b));
        console.log(group + ': ' + list.map((x) => x.name + '(' + x.score + ')').join(', '));
        console.log('  среднее: ' + avg.toFixed(1));
        console.log('  лучший: ' + best.name);
      }
    }, [['3', 'Аня ИС-21 90', 'Боря ИС-21 75', 'Витя ПКС-22 80'], ['4', 'Оля web-2 70', 'Ира web-1 88', 'Дима web-2 91', 'Петя web-1 88']]),
    T('jsd-14', 'Чек покупки', 'Дано N, затем N строк «товар количество цена» (товар может повторяться — с той же ценой). Сгруппируйте покупки по товарам и выведите чек: «товар K шт × цена = сумма» в порядке первого появления, затем «ИТОГО: S», «позиций: P», «штук: Q».', () => {
      const n = Number(input());
      const lines = new Map();
      for (let i = 0; i < n; i++) {
        const [name, qty, price] = input().split(' ');
        if (!lines.has(name)) lines.set(name, { qty: 0, price: Number(price) });
        lines.get(name).qty += Number(qty);
      }
      let total = 0;
      let pieces = 0;
      for (const [name, { qty, price }] of lines) {
        console.log(name + ' ' + qty + ' шт × ' + price + ' = ' + qty * price);
        total += qty * price;
        pieces += qty;
      }
      console.log('ИТОГО: ' + total);
      console.log('позиций: ' + lines.size);
      console.log('штук: ' + pieces);
    }, [['3', 'яблоко 3 50', 'яблоко 2 50', 'сыр 1 350'], ['1', 'вода 6 25']]),
    T('jsd-15', 'Анализ текста', 'Дан текст. Приведите к нижнему регистру, уберите знаки препинания (оставьте буквы, цифры, дефис внутри слова и пробелы), разбейте на слова. Посчитайте частоту слов. Выведите «уникальных: N», «самое частое: слово (K)» (при равенстве — встретившееся раньше), «средняя длина: X» (одна цифра после точки, по всем словам текста) и «топ-3: слово, слово, слово» (по убыванию частоты, при равенстве — по первому появлению).', () => {
      let clean = '';
      for (const ch of input().toLowerCase()) {
        const letter = ch.toLowerCase() !== ch.toUpperCase();
        clean += letter || (ch >= '0' && ch <= '9') || ch === '-' ? ch : ' ';
      }
      const words = clean.split(' ').map((w) => w.replace(/^-+|-+$/g, '')).filter((w) => w !== '');
      const freq = new Map();
      for (const w of words) freq.set(w, (freq.get(w) || 0) + 1);
      const ranked = [...freq].sort((a, b) => b[1] - a[1]);
      const avgLen = words.reduce((s, w) => s + w.length, 0) / words.length;
      console.log('уникальных: ' + freq.size);
      console.log('самое частое: ' + ranked[0][0] + ' (' + ranked[0][1] + ')');
      console.log('средняя длина: ' + avgLen.toFixed(1));
      console.log('топ-3: ' + ranked.slice(0, 3).map((e) => e[0]).join(', '));
    }, [['Кот и пёс. Кот спит, а пёс гуляет.'], ['Раз, два, три — четыре-пять! Раз-два... РАЗ?'], ['Привет']]),
    T('jsb-10', 'Статистика массива', 'Напишите функцию stats(numbers), которая возвращает объект { min, max, avg, median } — min и max одним циклом без Math.min/Math.max, медиана по отсортированной копии. Вводятся строки чисел до «конец»; для каждой выведите объект через console.log (avg округлите до сотых: Math.round(x * 100) / 100).', () => {
      function stats(numbers) {
        let min = numbers[0];
        let max = numbers[0];
        let sum = 0;
        for (const x of numbers) {
          if (x < min) min = x;
          if (x > max) max = x;
          sum += x;
        }
        const s = [...numbers].sort((a, b) => a - b);
        const mid = Math.floor(s.length / 2);
        const median = s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
        return { min, max, avg: Math.round(sum / numbers.length * 100) / 100, median };
      }
      while (true) {
        const line = input();
        if (line === 'конец') break;
        console.log(stats(line.split(' ').map(Number)));
      }
    }, [['3 8 1 9 4 7 2 10 5 6', '5', '-1 2 2 -7', 'конец'], ['100 1', '2 2 2 2', 'конец']], { require: ['def:stats'], forbid: ['Math.min', 'Math.max'] }),
    T('dp-01', 'Продажи по месяцам', 'Дано N, затем N строк «дата сумма» (дата — ГГГГ-ММ-ДД). Посчитайте выручку по месяцам «ГГГГ-ММ». Выведите месяцы по возрастанию «месяц: сумма», затем «лучший месяц: …» (при равенстве — более ранний) и «рост к прошлому месяцу» для каждого месяца кроме первого — «месяц: +X%» или «-X%» (целые проценты, Math.round).', () => {
      const n = Number(input());
      const months = new Map();
      for (let i = 0; i < n; i++) {
        const [date, sum] = input().split(' ');
        const m = date.slice(0, 7);
        months.set(m, (months.get(m) || 0) + Number(sum));
      }
      const list = [...months].sort((a, b) => (a[0] < b[0] ? -1 : 1));
      for (const [m, s] of list) console.log(m + ': ' + s);
      let best = list[0];
      for (const e of list) if (e[1] > best[1]) best = e;
      console.log('лучший месяц: ' + best[0]);
      for (let i = 1; i < list.length; i++) {
        const p = Math.round((list[i][1] - list[i - 1][1]) / list[i - 1][1] * 100);
        console.log(list[i][0] + ': ' + (p > 0 ? '+' : '') + p + '%');
      }
    }, [['6', '2026-09-03 1200', '2026-10-01 800', '2026-09-20 300', '2026-08-15 1000', '2026-10-27 900', '2026-10-30 100'], ['1', '2026-01-01 50']]),
    T('dp-02', 'Топ покупателей', 'Дано N, затем N строк «покупатель сумма» и число K. Выведите K покупателей с наибольшей суммой всех покупок: «место. имя — сумма (покупок: P)»; при равной сумме — у кого больше покупок, затем по имени по алфавиту (обычное сравнение строк).', () => {
      const n = Number(input());
      const buyers = new Map();
      for (let i = 0; i < n; i++) {
        const [name, sum] = input().split(' ');
        const b = buyers.get(name) || { name, sum: 0, count: 0 };
        b.sum += Number(sum);
        b.count++;
        buyers.set(name, b);
      }
      const k = Number(input());
      const top = [...buyers.values()].sort((a, b) => b.sum - a.sum || b.count - a.count || (a.name < b.name ? -1 : 1)).slice(0, k);
      top.forEach((b, i) => console.log(i + 1 + '. ' + b.name + ' — ' + b.sum + ' (покупок: ' + b.count + ')'));
    }, [['7', 'Аня 500', 'Бек 300', 'Аня 100', 'Лола 600', 'Бек 300', 'Дима 50', 'Ира 600', '3'], ['2', 'Оля 1', 'Петя 2', '5']]),
  ],
};
