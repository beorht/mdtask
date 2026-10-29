const T = (id, title, statement, solution, inputs, extra = {}) => ({ id, title, statement, solution, inputs, ...extra });
const RANDOM = 'Случайные числа берите из генератора с зерном (как в теории): seed = seed × 16807 % 2147483647, случайное число = seed / 2147483647.';
module.exports = {
  dir: 'm5/04-date-math',
  tasks: [
    T('dt-01', 'Дней до события', 'Даны две даты ГГГГ-ММ-ДД: сегодня и дата события. Выведите «осталось N дн.», «событие сегодня» или «прошло N дн.». Используйте разницу Date.', () => {
      const DAY = 24 * 60 * 60 * 1000;
      const today = new Date(input());
      const event = new Date(input());
      const n = Math.round((event - today) / DAY);
      console.log(n > 0 ? 'осталось ' + n + ' дн.' : n === 0 ? 'событие сегодня' : 'прошло ' + -n + ' дн.');
    }, [['2026-10-27', '2026-11-20'], ['2026-10-27', '2026-10-27'], ['2026-10-27', '2026-01-01'], ['2026-12-31', '2027-03-01']], { require: ['Date'] }),
    T('dt-02', 'День недели', 'Даны даты ГГГГ-ММ-ДД до «конец». Для каждой выведите «ДД.ММ.ГГГГ — день недели» (понедельник … воскресенье) и в конце сколько из них выходных.', () => {
      const names = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
      const pad = (n) => String(n).padStart(2, '0');
      let weekend = 0;
      while (true) {
        const s = input();
        if (s === 'конец') break;
        const d = new Date(s);
        const w = d.getUTCDay();
        if (w === 0 || w === 6) weekend++;
        console.log(pad(d.getUTCDate()) + '.' + pad(d.getUTCMonth() + 1) + '.' + d.getUTCFullYear() + ' — ' + names[w]);
      }
      console.log('выходных: ' + weekend);
    }, [['2026-10-27', '2026-11-01', '2000-01-01', '2026-12-31', 'конец'], ['2024-02-29', '2026-10-31', 'конец']], { require: ['.getUTCDay'] }),
    T('dt-03', 'Срок сдачи', 'Дана дата выдачи задания ГГГГ-ММ-ДД и число рабочих дней N. Срок сдачи — через N рабочих дней (суббота и воскресенье не считаются; сам день выдачи не считается). Выведите дату срока «ДД.ММ.ГГГГ» и её день недели одним словом.', () => {
      const names = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
      const d = new Date(input());
      let left = Number(input());
      while (left > 0) {
        d.setUTCDate(d.getUTCDate() + 1);
        const w = d.getUTCDay();
        if (w !== 0 && w !== 6) left--;
      }
      const pad = (n) => String(n).padStart(2, '0');
      console.log(pad(d.getUTCDate()) + '.' + pad(d.getUTCMonth() + 1) + '.' + d.getUTCFullYear() + ' ' + names[d.getUTCDay()]);
    }, [['2026-10-27', '5'], ['2026-10-30', '1'], ['2026-12-28', '7']], { require: ['.setUTCDate'] }),
    T('dt-04', 'Возраст', 'Даны дата рождения и сегодняшняя дата (ГГГГ-ММ-ДД). Выведите полных лет и сколько дней до следующего дня рождения (если сегодня — «с днём рождения!» вместо числа дней). Для родившихся 29 февраля в невисокосный год день рождения — 1 марта.', () => {
      const DAY = 24 * 60 * 60 * 1000;
      const [by, bm, bd] = input().split('-').map(Number);
      const [ty, tm, td] = input().split('-').map(Number);
      let age = ty - by;
      if (tm < bm || (tm === bm && td < bd)) age--;
      console.log(age);
      const today = Date.UTC(ty, tm - 1, td);
      let next = Date.UTC(ty, bm - 1, bd);
      if (next < today) next = Date.UTC(ty + 1, bm - 1, bd);
      console.log(next === today ? 'с днём рождения!' : (next - today) / DAY);
    }, [['2009-03-15', '2026-10-27'], ['2008-10-27', '2026-10-27'], ['2010-12-31', '2026-01-01'], ['2008-02-29', '2026-02-28']], { require: ['Date.UTC'] }),
    T('dt-05', 'Кубики', 'Дано зерно и число бросков N. Бросайте два кубика (значение = 1 + Math.floor(random() × 6) для каждого). ' + RANDOM + ' Выведите броски «a b» по строке, затем «дублей: K» и самую частую сумму (при равенстве — меньшую).', () => {
      let seed = Number(input());
      const random = () => {
        seed = (seed * 16807) % 2147483647;
        return seed / 2147483647;
      };
      const n = Number(input());
      const count = new Array(13).fill(0);
      let doubles = 0;
      for (let i = 0; i < n; i++) {
        const a = 1 + Math.floor(random() * 6);
        const b = 1 + Math.floor(random() * 6);
        console.log(a, b);
        if (a === b) doubles++;
        count[a + b]++;
      }
      let best = 2;
      for (let s = 2; s <= 12; s++) if (count[s] > count[best]) best = s;
      console.log('дублей: ' + doubles);
      console.log(best);
    }, [['42', '8'], ['2026', '12']], { forbid: ['Math.random'] }),
    T('dt-06', 'Перемешать карточки', 'Дано зерно и слова одной строкой. Перемешайте их алгоритмом Фишера — Йейтса: для i от последнего индекса до 1 возьмите j = Math.floor(random() × (i + 1)) и поменяйте элементы i и j. ' + RANDOM + ' Выведите перемешанные слова через пробел. Без .sort.', () => {
      let seed = Number(input());
      const random = () => {
        seed = (seed * 16807) % 2147483647;
        return seed / 2147483647;
      };
      const words = input().split(' ');
      for (let i = words.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [words[i], words[j]] = [words[j], words[i]];
      }
      console.log(words.join(' '));
    }, [['42', 'кот пёс ёж мышь сова лиса'], ['7', 'a b'], ['123', '1 2 3 4 5 6 7 8 9 10']], { forbid: ['Math.random', '.sort'] }),
    T('jsb-11', 'Генератор паролей', 'Напишите функцию generatePassword(length, random): пароль из символов строки «abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%», каждый символ — по индексу Math.floor(random() × длина_алфавита). Затем «надёжность»: есть ли строчная, заглавная, цифра, спецсимвол — «надёжный», если все четыре и длина ≥ 12, «средний» — если три, иначе «слабый». ' + RANDOM + ' Дано зерно, затем длины паролей до «конец». Выведите «пароль — надёжность».', () => {
      const ABC = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
      function generatePassword(length, random) {
        let p = '';
        for (let i = 0; i < length; i++) p += ABC[Math.floor(random() * ABC.length)];
        return p;
      }
      function strength(p) {
        const kinds = [/[a-z]/, /[A-Z]/, /[0-9]/, /[!@#$%]/].filter((re) => re.test(p)).length;
        if (kinds === 4 && p.length >= 12) return 'надёжный';
        return kinds >= 3 ? 'средний' : 'слабый';
      }
      let seed = Number(input());
      const random = () => {
        seed = (seed * 16807) % 2147483647;
        return seed / 2147483647;
      };
      while (true) {
        const s = input();
        if (s === 'конец') break;
        const p = generatePassword(Number(s), random);
        console.log(p + ' — ' + strength(p));
      }
    }, [['42', '12', '16', '4', '8', 'конец'], ['2026', '20', '3', 'конец']], { require: ['def:generatePassword'], forbid: ['Math.random'] }),
    T('dt-07', 'Метод Монте-Карло', 'Оцените число π: бросайте N случайных точек (x, y) в квадрат [0, 1) × [0, 1) (сначала x, потом y), посчитайте долю попавших в четверть круга x² + y² < 1 и умножьте на 4. ' + RANDOM + ' Дано зерно и N. Выведите оценку с 4 знаками и отклонение от Math.PI с 4 знаками (по модулю).', () => {
      let seed = Number(input());
      const random = () => {
        seed = (seed * 16807) % 2147483647;
        return seed / 2147483647;
      };
      const n = Number(input());
      let inside = 0;
      for (let i = 0; i < n; i++) {
        const x = random();
        const y = random();
        if (x * x + y * y < 1) inside++;
      }
      const pi = 4 * inside / n;
      console.log(pi.toFixed(4));
      console.log(Math.abs(pi - Math.PI).toFixed(4));
    }, [['42', '1000'], ['7', '100000'], ['1', '10']], { forbid: ['Math.random'] }),
    T('dt-08', 'Календарь месяца', 'Даны год и месяц. Выведите календарь: строку «Пн Вт Ср Чт Пт Сб Вс», затем недели — числа по два символа (padStart) через пробел, пустые места до первого числа — по два пробела; строки без пробелов в конце.', () => {
      const y = Number(input());
      const m = Number(input());
      const first = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
      const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
      console.log('Пн Вт Ср Чт Пт Сб Вс');
      let row = new Array(first).fill('  ');
      for (let d = 1; d <= days; d++) {
        row.push(String(d).padStart(2));
        if (row.length === 7) {
          console.log(row.join(' '));
          row = [];
        }
      }
      if (row.length) console.log(row.join(' ').trimEnd());
    }, [['2026', '10'], ['2024', '2'], ['2026', '6']], { require: ['Date.UTC'] }),
  ],
};
