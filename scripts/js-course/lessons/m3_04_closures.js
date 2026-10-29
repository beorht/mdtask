const T = (id, title, statement, solution, inputs, extra = {}) => ({ id, title, statement, solution, inputs, ...extra });
module.exports = {
  dir: 'm3/04-closures',
  tasks: [
    T('cl-01', 'Счётчики', 'Напишите функцию makeCounter(start), которая возвращает функцию: каждый её вызов возвращает следующее число (start + 1, start + 2 …). Даны два старта, затем команды «a» или «b» до «конец» — вызывайте соответствующий счётчик и выводите «a: N» или «b: N».', () => {
      function makeCounter(start) {
        let n = start;
        return () => ++n;
      }
      const counters = { a: makeCounter(Number(input())), b: makeCounter(Number(input())) };
      while (true) {
        const c = input();
        if (c === 'конец') break;
        console.log(c + ': ' + counters[c]());
      }
    }, [['0', '100', 'a', 'a', 'b', 'a', 'b', 'конец'], ['-3', '7', 'b', 'b', 'b', 'a', 'конец']], { require: ['def:makeCounter'] }),
    T('cl-02', 'Кошелёк', 'Напишите makeWallet(balance), которая возвращает объект с функциями deposit(x), withdraw(x) и getBalance(); сам баланс снаружи недоступен. withdraw возвращает false, если денег не хватает. Дан начальный баланс, затем команды «+ сумма», «- сумма», «?» до «конец». На «-» без денег выведите «недостаточно средств», на «?» — баланс.', () => {
      function makeWallet(balance) {
        return {
          deposit: (x) => { balance += x; },
          withdraw: (x) => {
            if (x > balance) return false;
            balance -= x;
            return true;
          },
          getBalance: () => balance,
        };
      }
      const w = makeWallet(Number(input()));
      while (true) {
        const line = input();
        if (line === 'конец') break;
        const [op, sum] = line.split(' ');
        if (op === '+') w.deposit(Number(sum));
        else if (op === '-') {
          if (!w.withdraw(Number(sum))) console.log('недостаточно средств');
        } else console.log(w.getBalance());
      }
    }, [['100', '+ 50', '?', '- 120', '- 50', '?', '+ 5', '?', 'конец'], ['0', '- 1', '+ 10', '- 10', '?', 'конец']], { require: ['def:makeWallet'] }),
    T('cl-03', 'Генератор номеров', 'Напишите makeIdGenerator(prefix), которая возвращает функцию, выдающую «prefix-1», «prefix-2» … Вводятся префиксы до «конец»; для каждого префикса нужен свой генератор (создайте его при первой встрече). Выведите выданный номер.', () => {
      function makeIdGenerator(prefix) {
        let n = 0;
        return () => prefix + '-' + ++n;
      }
      const gens = {};
      while (true) {
        const p = input();
        if (p === 'конец') break;
        if (!gens[p]) gens[p] = makeIdGenerator(p);
        console.log(gens[p]());
      }
    }, [['user', 'user', 'order', 'user', 'order', 'item', 'конец'], ['a', 'b', 'c', 'a', 'конец']], { require: ['def:makeIdGenerator'] }),
    T('cl-04', 'Множители', 'Напишите makeMultiplier(k), которая возвращает функцию умножения на k. Дано число N — создайте множители на 1…N и выведите таблицу N×N: в строке i — результаты умножения i на 1…N через пробел, полученные вызовом созданных функций.', () => {
      function makeMultiplier(k) {
        return (x) => x * k;
      }
      const n = Number(input());
      const mult = [];
      for (let k = 1; k <= n; k++) mult.push(makeMultiplier(k));
      for (let i = 1; i <= n; i++) {
        let row = '';
        for (const m of mult) row += m(i) + ' ';
        console.log(row.trim());
      }
    }, [['4'], ['1'], ['6']], { require: ['def:makeMultiplier'] }),
    T('cl-05', 'Кэш для медленной функции', 'Сумма делителей числа считается перебором. Напишите memoize(fn): возвращает функцию, которая запоминает результаты fn в объекте внутри замыкания. Вводятся числа до «конец»: выводите «n: сумма» и « (из кэша)», если ответ уже был. В конце — «вычислений: K».', () => {
      let computed = 0;
      function divisorSum(n) {
        computed++;
        let s = 0;
        for (let d = 1; d <= n; d++) if (n % d === 0) s += d;
        return s;
      }
      function memoize(fn) {
        const cache = {};
        return (n) => {
          if (n in cache) return [cache[n], true];
          cache[n] = fn(n);
          return [cache[n], false];
        };
      }
      const fast = memoize(divisorSum);
      while (true) {
        const s = input();
        if (s === 'конец') break;
        const [value, cached] = fast(Number(s));
        console.log(s + ': ' + value + (cached ? ' (из кэша)' : ''));
      }
      console.log('вычислений: ' + computed);
    }, [['12', '28', '12', '100', '28', '12', 'конец'], ['1', '1', '1', 'конец']], { require: ['def:memoize'] }),
    T('cl-06', 'Ограничитель вызовов', 'Напишите limit(fn, max): возвращает функцию, которая первые max раз вызывает fn и возвращает её результат, а дальше возвращает «лимит исчерпан». Дано max, затем числа до «конец»; fn возводит число в квадрат. Выведите ответ на каждое число.', () => {
      function limit(fn, max) {
        let calls = 0;
        return (x) => {
          if (calls >= max) return 'лимит исчерпан';
          calls++;
          return fn(x);
        };
      }
      const sq = limit((x) => x * x, Number(input()));
      while (true) {
        const s = input();
        if (s === 'конец') break;
        console.log(sq(Number(s)));
      }
    }, [['3', '2', '5', '9', '4', 'конец'], ['0', '7', 'конец']], { require: ['def:limit'] }),
    T('cl-07', 'Скользящее среднее', 'Напишите makeAverager(): возвращает функцию add(x), которая добавляет число и возвращает среднее всех добавленных — без массива, только сумма и количество в замыкании. Вводятся числа до «конец»; после каждого выведите среднее с двумя знаками.', () => {
      function makeAverager() {
        let sum = 0;
        let count = 0;
        return (x) => {
          sum += x;
          count++;
          return sum / count;
        };
      }
      const add = makeAverager();
      while (true) {
        const s = input();
        if (s === 'конец') break;
        console.log(add(Number(s)).toFixed(2));
      }
    }, [['5', '4', '3', '5', 'конец'], ['-1', '1', '10', 'конец']], { require: ['def:makeAverager'], forbid: ['.push'] }),
    T('cl-08', 'Последние N событий', 'Напишите makeHistory(size): объект с add(text) и show() — история помнит только последние size записей. Дан size, затем команды «+ текст» и «?» до «конец». На «?» выведите записи через « | » (от старых к новым) или «пусто».', () => {
      function makeHistory(size) {
        const items = [];
        return {
          add: (t) => {
            items.push(t);
            if (items.length > size) items.shift();
          },
          show: () => (items.length ? items.join(' | ') : 'пусто'),
        };
      }
      const h = makeHistory(Number(input()));
      while (true) {
        const line = input();
        if (line === 'конец') break;
        if (line === '?') console.log(h.show());
        else h.add(line.slice(2));
      }
    }, [['3', '?', '+ вход', '+ поиск', '?', '+ корзина', '+ оплата', '?', 'конец'], ['1', '+ а', '+ б', '?', 'конец']], { require: ['def:makeHistory'] }),
  ],
};
